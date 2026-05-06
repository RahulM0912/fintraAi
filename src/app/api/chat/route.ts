import { auth } from "@clerk/nextjs/server";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { fintraGraph, buildSystemPrompt } from "@/lib/langgraph/graph";
import { createAdminClient } from "@/utils/supabase/admin";
import { DEFAULT_MODEL_CONFIG, calculateCost } from "@/lib/langgraph/types";

export const dynamic = "force-dynamic";

// ─── SSE helpers ───────────────────────────────────────────────────────────────

type SSEEvent =
  | { type: "token"; content: string }
  | { type: "tool_start"; tool: string }
  | { type: "tool_end"; tool: string }
  | { type: "status"; step: string; label: string }
  | { type: "usage"; inputTokens: number; outputTokens: number; cost: number }
  | { type: "done" }
  | { type: "error"; message: string };

function createSSEStream(
  handler: (send: (event: SSEEvent) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        await handler(send);
      } catch (err: any) {
        
        const status = err?.status ?? err?.code;
        const msg = String(err?.message ?? "");

        const is404 = status === 404 || msg.includes("MODEL_NOT_FOUND") || msg.includes("model not found");
        const is429 =
          status === 429 ||
          msg.includes("429") ||
          msg.includes("quota") ||
          msg.includes("rate limit") ||
          msg.includes("Rate limit");

        send({
          type: "error",
          message: is404
            ? `Model not found on OpenRouter. Check the model slug in types.ts. Raw: ${msg}`
            : is429
            ? "AI rate limit reached. Please wait a moment and try again."
            : `Something went wrong: ${msg || "unknown error"}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering if applicable
    },
  });
}

// ─── Build category summary for system prompt ──────────────────────────────────

async function buildCategorySummary(): Promise<string> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("categories")
      .select("name, type")
      .order("type")
      .order("name");

    if (!data?.length) return "";

    const income = data
      .filter((c) => c.type === "income")
      .map((c) => c.name)
      .join(", ");
    const expense = data
      .filter((c) => c.type === "expense")
      .map((c) => c.name)
      .join(", ");

    return `Income: ${income}\nExpense: ${expense}`;
  } catch {
    return "";
  }
}

// ─── POST /api/chat ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let body: { messages: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages array is required", { status: 400 });
  }

  // Run these in parallel — both are needed before we invoke the graph
  const [categorySummary] = await Promise.all([buildCategorySummary()]);

  const today = new Date().toISOString().split("T")[0];

  // SystemMessage MUST be first — Gemini rejects any other ordering.
  // We build it here at the API layer where today + categories are available,
  // then prepend it so the graph receives a correctly ordered message list.
  const langchainMessages = [
    new SystemMessage(buildSystemPrompt(today, categorySummary)),
    ...messages.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
  ];

  return createSSEStream(async (send) => {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    const eventStream = fintraGraph.streamEvents(
      { messages: langchainMessages },
      {
        version: "v2",
        configurable: {
          userId,
          today,
          categorySummary,
          modelProvider: DEFAULT_MODEL_CONFIG.provider,
          modelName: DEFAULT_MODEL_CONFIG.modelName,
        },
      }
    );

    for await (const event of eventStream) {
      switch (event.event) {
        case "on_chain_start": {
          const node = event.metadata?.langgraph_node as string | undefined;
          if (node === "agent") {
            send({ type: "status", step: "thinking", label: "Thinking..." });
          }
          break;
        }
        case "on_tool_start": {
          send({ type: "tool_start", tool: event.name });
          break;
        }
        case "on_tool_end": {
          send({ type: "tool_end", tool: event.name });
          break;
        }
        case "on_chat_model_stream": {
          // Only stream tokens from the agent's final response turn.
          // Tool-calling turns have empty content (tool call is in additional_kwargs),
          // so the `if (content)` guard below naturally suppresses them.
          if (event.metadata?.langgraph_node !== "agent") break;
          const chunk = event.data?.chunk;
          const content =
            typeof chunk?.content === "string" ? chunk.content : "";
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

    const totalTokens = totalInputTokens + totalOutputTokens;
    const cost = calculateCost(DEFAULT_MODEL_CONFIG.modelName, totalInputTokens, totalOutputTokens);

    console.log(`\n📊 [Token Usage] Input: ${totalInputTokens} | Output: ${totalOutputTokens} | Total: ${totalTokens}`);
    console.log(`💰 [Cost] $${cost.toFixed(6)} (using ${DEFAULT_MODEL_CONFIG.modelName})\n`);

    send({ type: "usage", inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cost });
    send({ type: "done" });
  });
}
