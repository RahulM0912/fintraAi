import type { InterruptPayload } from "@/lib/langgraph";
import type { ChartPayload, DataTablePayload } from "@/lib/langgraph/render";

// ─── SSE event contract (server → client) ──────────────────────────────────────

export type SSEEvent =
  | { type: "token"; content: string }
  | { type: "data"; table?: DataTablePayload; chart?: ChartPayload; facts?: string[] }
  | { type: "tool_start"; tool: string }
  | { type: "tool_end"; tool: string }
  | { type: "status"; step: string; label: string }
  | { type: "usage"; inputTokens: number; outputTokens: number; cost: number }
  | { type: "summary"; summary: string; summarizedCount: number }
  | { type: "suggestions"; items: string[] }
  | { type: "interrupt"; threadId: string; payload: InterruptPayload }
  | { type: "done" }
  | { type: "error"; message: string };

// ─── Stream factory ────────────────────────────────────────────────────────────

export function createSSEStream(
  handler: (send: (event: SSEEvent) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await handler(send);
      } catch (err: unknown) {
        send({ type: "error", message: classifyError(err) });
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
      "X-Accel-Buffering": "no",
    },
  });
}

// ─── Error classification ──────────────────────────────────────────────────────

function classifyError(err: unknown): string {
  const e = err as { status?: number; code?: number; message?: string };
  const status = e?.status ?? e?.code;
  const msg = String(e?.message ?? "");

  const is404 =
    status === 404 || msg.includes("MODEL_NOT_FOUND") || msg.includes("model not found");
  const is429 =
    status === 429 ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("Rate limit");

  if (is404) return `Model not found on OpenRouter. Check the model slug. Raw: ${msg}`;
  if (is429) return "AI rate limit reached. Please wait a moment and try again.";
  if (msg.includes("Recursion limit"))
    return "That request needed too many steps — try breaking it into smaller parts.";
  return `Something went wrong: ${msg || "unknown error"}`;
}
