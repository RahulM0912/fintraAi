import type { SSEEvent } from "./types";

// Generic SSE line-buffered parser. Yields one SSEEvent per `data: ...` line.
export async function* parseSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      try {
        yield JSON.parse(raw) as SSEEvent;
      } catch {
        // Ignore malformed events; the next one is likely fine
      }
    }
  }
}
