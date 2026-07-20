import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { fintraGraph, buildSystemPrompt, messageText } from "@/lib/langgraph/graph";
import { createAdminClient } from "@/utils/supabase/admin";
import { calculateCost } from "@/lib/langgraph/types";
import { summarizeHistory } from "@/lib/langgraph/summarize";
import { suggestFollowUps } from "@/lib/langgraph/suggest";
import { stripHarmonyLeak } from "@/lib/chat/harmony";
import { consumeChatQuota, type EffectiveModel } from "@/lib/userSettings";
import type { InterruptPayload, InterruptResume } from "@/lib/langgraph";
import {
  buildDataView,
  RENDERABLE_READ_TOOLS,
  type ChartPayload,
  type DataTablePayload,
} from "@/lib/langgraph/render";
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
  let totalCachedTokens = 0;
  let llmCalls = 0;
  const toolsUsed: string[] = [];
  const fastPathDone = new Set<string>();
  const startedAt = Date.now();
  let sentText = false;
  let sentData = false;
  // Full answer text as streamed — used to skip a duplicate chart when the
  // model already drew its own markdown table, and as input for suggestions.
  let answerText = "";
  // Last renderable read result this turn — source for the agent-path chart.
  let lastRead: { tool: string; result: unknown; chartHint?: string } | null = null;

  const config = {
    version: "v2" as const,
    // Each node execution counts as a step (agent → tools → agent…), so 16
    // allows ~7 tool round-trips before the graph aborts. LangGraph default is
    // 25; a runaway loop burns the full prefix cost on every extra call.
    recursionLimit: 16,
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
        const startNode = event.metadata?.langgraph_node;
        if (startNode === "agent" || startNode === "gate") {
          send({ type: "status", step: "thinking", label: "Thinking..." });
        }
        break;
      }
      case "on_tool_start":
        toolsUsed.push(event.name);
        send({ type: "tool_start", tool: event.name });
        break;
      case "on_tool_end": {
        send({ type: "tool_end", tool: event.name });
        if (RENDERABLE_READ_TOOLS.has(event.name)) {
          const out = event.data?.output as { content?: unknown } | string | undefined;
          const args = event.data?.input as { chart?: string } | undefined;
          lastRead = {
            tool: event.name,
            result: typeof out === "string" ? out : out?.content,
            chartHint: args?.chart,
          };
        }
        break;
      }
      case "on_chat_model_stream": {
        if (event.metadata?.langgraph_node !== "agent") break;
        const content = messageText(event.data?.chunk?.content);
        if (content) {
          sentText = true;
          answerText += content;
          send({ type: "token", content });
        }
        break;
      }
      case "on_chat_model_end": {
        llmCalls++;
        const usage = event.data?.output?.usage_metadata;
        if (usage) {
          totalInputTokens += usage.input_tokens || 0;
          totalOutputTokens += usage.output_tokens || 0;
          totalCachedTokens += usage.input_token_details?.cache_read || 0;
        }
        break;
      }
      case "on_chain_end": {
        // Fast-path nodes synthesise their output without a model stream —
        // forward text as a single token chunk, and for render also forward
        // the structured table payload. on_chain_end can fire more than once
        // per node (wrapper + callable), so guard against double-sends.
        const node = event.metadata?.langgraph_node;
        if (
          (node === "confirm" || node === "render" || node === "gate") &&
          !fastPathDone.has(node)
        ) {
          const msgs = event.data?.output?.messages;
          const msg = Array.isArray(msgs) ? msgs[msgs.length - 1] : undefined;
          if (!msg) break;
          fastPathDone.add(node);
          const kwargs = msg.additional_kwargs as
            | {
                fintra_table?: DataTablePayload;
                fintra_chart?: ChartPayload;
                fintra_facts?: string[];
              }
            | undefined;
          if (kwargs?.fintra_table || kwargs?.fintra_chart || kwargs?.fintra_facts) {
            sentData = true;
            send({
              type: "data",
              table: kwargs.fintra_table,
              chart: kwargs.fintra_chart,
              facts: kwargs.fintra_facts,
            });
          }
          const content = messageText(msg.content);
          if (content) {
            sentText = true;
            answerText += content;
            send({ type: "token", content });
          }
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

  // Per-turn metrics (Phase A of the improvement plan) — one structured line
  // so token regressions are visible without extra tooling.
  console.log(
    "[chat-metrics]",
    JSON.stringify({
      model: model.modelName,
      llmCalls,
      inputTok: totalInputTokens,
      outputTok: totalOutputTokens,
      cachedTok: totalCachedTokens,
      tools: toolsUsed,
      resume: !!body.resume,
      ms: Date.now() - startedAt,
    })
  );

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

  // Safety net: if no token ever made it to the client (e.g. a provider chunk
  // shape we didn't anticipate, or a model that returned an empty candidate),
  // recover the final AI message from graph state; failing that, send a fixed
  // reply so the user never sees a silent, empty bubble.
  if (!sentText) {
    let recovered = "";
    const msgs = (state.values as { messages?: unknown[] } | undefined)?.messages;
    if (Array.isArray(msgs)) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i] as {
          getType?: () => string;
          _getType?: () => string;
          content?: unknown;
        };
        const kind = m?.getType?.() ?? m?._getType?.();
        if (kind === "ai") {
          recovered = messageText(m.content).trim();
          break;
        }
      }
    }
    if (recovered) answerText += recovered;
    send({
      type: "token",
      content:
        recovered ||
        "I hit a temporary glitch composing that reply — please send your message again.",
    });
  }

  // The model's prose may carry a Harmony reasoning leak; everything below
  // reasons about the clean answer only.
  const cleanAnswer = stripHarmonyLeak(answerText).trim();

  // Agent-path chart: the render fast-path only fires when the model opts in
  // with purpose:"display", which is flaky — but a chart is warranted whenever
  // a renderable read ran, even under a prose answer. Derive it from the tool
  // result (zero extra tokens) and send the chart alone: the agent already
  // rendered the numbers its own way, so table + facts would duplicate.
  // Skipped after mutations — a spending chart under "✓ updated" is noise
  // (a budget "set" result self-guards: buildDataView returns null for it) —
  // and when the model already drew its own markdown table: the same numbers
  // twice in a row reads as clutter, not insight.
  const hadMutation = toolsUsed.some(
    (t) => t === "add_transactions" || t === "edit_transaction"
  );
  const proseHasTable = /\|\s*:?-{3,}/.test(cleanAnswer);
  if (!sentData && lastRead && !hadMutation && !proseHasTable) {
    const view = buildDataView(lastRead.tool, lastRead.result, lastRead.chartHint);
    if (view?.chart) send({ type: "data", chart: view.chart });
  }

  // AI follow-up suggestions — only after a data answer (a renderable read ran
  // or the render fast-path fired), on the cheap managed model. The answer has
  // already fully streamed, so this only delays the `done` event, not the text.
  if (!body.resume && !hadMutation && (lastRead || sentData)) {
    const lastUserMsg = [...(body.messages ?? [])]
      .reverse()
      .find((m) => m.role === "user")?.content;
    if (lastUserMsg && cleanAnswer) {
      const suggestions = await suggestFollowUps(lastUserMsg, cleanAnswer);
      if (suggestions.length > 0) send({ type: "suggestions", items: suggestions });
    }
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
