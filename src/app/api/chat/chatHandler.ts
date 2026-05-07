import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { fintraGraph, buildSystemPrompt } from "@/lib/langgraph/graph";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  DEFAULT_MODEL_CONFIG,
  calculateCost,
} from "@/lib/langgraph/types";
import type { InterruptPayload, InterruptResume } from "@/lib/langgraph";
import type { SSEEvent } from "./sse";

// ─── Public input shapes ───────────────────────────────────────────────────────

export interface ChatBody {
  threadId: string;
  // Either a fresh user turn (`messages`) OR a resume of a paused interrupt (`resume`)
  messages?: { role: "user" | "assistant"; content: string }[];
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

  return {
    messages: [new SystemMessage(buildSystemPrompt(today, categorySummary)), ...messages],
  };
}

// ─── Main handler — drives the graph and forwards events as SSE ────────────────

export async function runChat(
  userId: string,
  body: ChatBody,
  send: (event: SSEEvent) => void
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
      modelProvider: DEFAULT_MODEL_CONFIG.provider,
      modelName: DEFAULT_MODEL_CONFIG.modelName,
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

  const cost = calculateCost(
    DEFAULT_MODEL_CONFIG.modelName,
    totalInputTokens,
    totalOutputTokens
  );
  send({ type: "usage", inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cost });
  send({ type: "done" });
}
