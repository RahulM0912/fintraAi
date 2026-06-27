import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { fintraGraph, buildSystemPrompt } from "@/lib/langgraph/graph";
import { createAdminClient } from "@/utils/supabase/admin";
import { calculateCost } from "@/lib/langgraph/types";
import { summarizeHistory } from "@/lib/langgraph/summarize";
import { consumeChatQuota, type EffectiveModel } from "@/lib/userSettings";
import type { InterruptPayload, InterruptResume } from "@/lib/langgraph";
import type { SSEEvent } from "./sse";

// ─── Conversation window ───────────────────────────────────────────────────────
//
// The client sends only the messages not yet folded into `priorSummary` (the
// "tail"). We keep the last WINDOW messages verbatim and, once the tail grows by
// FOLD_BATCH beyond that, fold the overflow into the running summary. This caps
// the transcript the model sees per turn instead of replaying the whole history.

const WINDOW = 5;
const FOLD_BATCH = 4;

// ─── Public input shapes ───────────────────────────────────────────────────────

export interface ChatBody {
  threadId: string;
  // Either a fresh user turn (`messages`) OR a resume of a paused interrupt (`resume`)
  // `messages` is the unsummarised tail; everything older lives in `priorSummary`.
  messages?: { role: "user" | "assistant"; content: string }[];
  priorSummary?: string;
  summarizedCount?: number;
  resume?: InterruptResume;
}

// ─── Category summary used in system prompt ────────────────────────────────────

async function buildCategorySummary(): Promise<string> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("categories")
      .select("name, type")
      .order("type")
      .order("name");

    if (!data?.length) return "";

    const income = data.filter((c) => c.type === "income").map((c) => c.name).join(", ");
    const expense = data.filter((c) => c.type === "expense").map((c) => c.name).join(", ");
    return `Income: ${income}\nExpense: ${expense}`;
  } catch {
    return "";
  }
}

// ─── Build the graph input — fresh turn vs. resume ─────────────────────────────

// `streamEvents` is heavily generic over the graph state, so we widen here.
// Both branches (Command + initial state) are valid inputs at runtime.
type GraphInput = Parameters<typeof fintraGraph.streamEvents>[0];

async function buildGraphInput(body: ChatBody): Promise<GraphInput> {
  if (body.resume) {
    return new Command({ resume: body.resume }) as unknown as GraphInput;
  }

  const today = new Date().toISOString().split("T")[0];
  const categorySummary = await buildCategorySummary();

  const messages = (body.messages ?? []).map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  const summaryMsg = body.priorSummary
    ? [
        new SystemMessage(
          `Earlier conversation summary (older messages, condensed):\n${body.priorSummary}`
        ),
      ]
    : [];

  return {
    messages: [
      new SystemMessage(buildSystemPrompt(today, categorySummary)),
      ...summaryMsg,
      ...messages,
    ],
  };
}

// ─── Main handler — drives the graph and forwards events as SSE ────────────────

export async function runChat(
  userId: string,
  body: ChatBody,
  send: (event: SSEEvent) => void,
  model: EffectiveModel
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const input = await buildGraphInput(body);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const config = {
    version: "v2" as const,
    configurable: {
      thread_id: body.threadId,
      userId,
      today,
      modelProvider: model.provider,
      modelName: model.modelName,
      apiKey: model.apiKey,
    },
  };

  for await (const event of fintraGraph.streamEvents(input, config)) {
    switch (event.event) {
      case "on_chain_start": {
        if (event.metadata?.langgraph_node === "agent") {
          send({ type: "status", step: "thinking", label: "Thinking..." });
        }
        break;
      }
      case "on_tool_start":
        send({ type: "tool_start", tool: event.name });
        break;
      case "on_tool_end":
        send({ type: "tool_end", tool: event.name });
        break;
      case "on_chat_model_stream": {
        if (event.metadata?.langgraph_node !== "agent") break;
        const chunk = event.data?.chunk;
        const content = typeof chunk?.content === "string" ? chunk.content : "";
        if (content) send({ type: "token", content });
        break;
      }
      case "on_chat_model_end": {
        const usage = event.data?.output?.usage_metadata;
        if (usage) {
          totalInputTokens += usage.input_tokens || 0;
          totalOutputTokens += usage.output_tokens || 0;
        }
        break;
      }
      case "on_chain_end": {
        // Fast-path confirmation is synthesised (no model stream) — forward its
        // text to the client as a single token chunk.
        if (event.metadata?.langgraph_node === "confirm") {
          const msgs = event.data?.output?.messages;
          const msg = Array.isArray(msgs) ? msgs[msgs.length - 1] : undefined;
          const content = typeof msg?.content === "string" ? msg.content : "";
          if (content) send({ type: "token", content });
        }
        break;
      }
    }
  }

  // Charge one managed message per fresh turn (resumes are part of the same
  // logical message and stay free). Done after the model ran, so a hard failure
  // before any call doesn't burn quota. Best-effort — never break the turn.
  if (model.managed && !body.resume && body.messages) {
    try {
      await consumeChatQuota(userId);
    } catch (err) {
      console.error("[chat] quota consume failed", err);
    }
  }

  // After the run, check whether the graph paused on an interrupt.
  const state = await fintraGraph.getState({ configurable: { thread_id: body.threadId } });
  const pendingInterrupts = (state.tasks ?? [])
    .flatMap((t) => t.interrupts ?? [])
    .map((i) => i.value as InterruptPayload | undefined)
    .filter((v): v is InterruptPayload => !!v && typeof v === "object" && "kind" in v);

  if (pendingInterrupts.length > 0) {
    send({ type: "interrupt", threadId: body.threadId, payload: pendingInterrupts[0] });
    send({ type: "done" });
    return;
  }

  // Turn completed — fold any overflow past the verbatim window into the running
  // summary and hand the updated summary back to the client. Only the messages
  // that aged out are summarised; the prior summary is reused incrementally.
  if (!body.resume && body.messages) {
    const tail = body.messages;
    if (tail.length >= WINDOW + FOLD_BATCH) {
      const foldCount = tail.length - WINDOW;
      const summarizedCount = body.summarizedCount ?? 0;
      try {
        const newSummary = await summarizeHistory(
          body.priorSummary ?? "",
          tail.slice(0, foldCount)
        );
        send({
          type: "summary",
          summary: newSummary,
          summarizedCount: summarizedCount + foldCount,
        });
      } catch (err) {
        // Summary refresh is best-effort; a failure must not break the turn.
        console.error("[chat] summary fold failed", err);
      }
    }
  }

  const cost = calculateCost(
    model.modelName,
    totalInputTokens,
    totalOutputTokens
  );
  send({ type: "usage", inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cost });
  send({ type: "done" });
}
