"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { newThreadId } from "./threadId";
import { parseSSE } from "./sseParser";
import { useActivityLog } from "./useActivityLog";
import type {
  DataTablePayload,
  InterruptPayload,
  InterruptResume,
  Message,
  SSEEvent,
  UsageInfo,
} from "./types";
import { MUTATING_TOOLS, TOOL_STATUS_LABELS } from "./types";

interface UseChatOptions {
  trackUsage?: boolean;
  /** Chats with the same key share one in-memory session that survives route
   *  changes (cleared on page reload or "New chat"). */
  sessionKey?: string;
}

// ─── In-memory session cache ────────────────────────────────────────────────────
// Module-level so the conversation survives navigating between app tabs within
// one browser session. Intentionally NOT sessionStorage: memory only, gone on
// reload, nothing persisted to disk.

interface ChatSession {
  messages: Message[];
  summary: string;
  summarizedCount: number;
  threadId: string;
  lastUsage: UsageInfo | null;
}

const sessionCache = new Map<string, ChatSession>();

// A restored transcript must not contain half-streamed bubbles: finalize any
// streaming flag and drop empty AI placeholders left by an aborted stream.
function restoreMessages(cached: Message[] | undefined): Message[] | null {
  if (!cached?.length) return null;
  const cleaned = cached
    .map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    .filter((m) => m.role === "user" || m.content || m.table || m.interrupt);
  return cleaned.length ? cleaned : null;
}

interface ChatRequestBody {
  threadId: string;
  messages?: { role: "user" | "assistant"; content: string }[];
  priorSummary?: string;
  summarizedCount?: number;
  resume?: InterruptResume;
}

interface StreamCtx {
  content: string;
  mutated: boolean;
  interrupt: InterruptPayload | null;
  tools: string[];
  table: DataTablePayload | null;
}

// The welcome message is UI chrome each surface renders itself — it is NOT
// part of the session, so it's never re-sent to the API and each surface can
// show a different one (long on /chat, short in the widget).
export function useChat({ trackUsage = false, sessionKey = "default" }: UseChatOptions = {}) {
  const cached = sessionCache.get(sessionKey);
  const [messages, setMessages] = useState<Message[]>(
    () => restoreMessages(cached?.messages) ?? []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(cached?.lastUsage ?? null);
  const activity = useActivityLog();

  const threadIdRef = useRef<string>(cached?.threadId ?? newThreadId());
  const abortRef = useRef<AbortController | null>(null);

  // Rolling-summary memory: everything before `summarizedCountRef` messages is
  // condensed into `summaryRef`; only the unsummarised tail is sent each turn.
  const summaryRef = useRef<string>(cached?.summary ?? "");
  const summarizedCountRef = useRef<number>(cached?.summarizedCount ?? 0);

  // Keep the session cache current so the conversation survives tab switches.
  useEffect(() => {
    sessionCache.set(sessionKey, {
      messages,
      summary: summaryRef.current,
      summarizedCount: summarizedCountRef.current,
      threadId: threadIdRef.current,
      lastUsage,
    });
  }, [sessionKey, messages, lastUsage]);

  // Abandoning the surface mid-stream (navigation/unmount) aborts the request;
  // the cached transcript is finalized by restoreMessages on the next mount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleEvent = useCallback(
    (event: SSEEvent, ctx: StreamCtx) => {
      if (event.type === "token") {
        if (!ctx.content) activity.markAllDone();
        ctx.content += event.content;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "ai",
            content: ctx.content,
            table: ctx.table ?? undefined,
            isStreaming: true,
          },
        ]);
      } else if (event.type === "data") {
        ctx.table = event.table;
      } else if (event.type === "status") {
        activity.upsert(event.step, event.label, "active");
      } else if (event.type === "tool_start") {
        activity.markDone("thinking");
        const label = TOOL_STATUS_LABELS[event.tool] ?? `Running ${event.tool}...`;
        activity.upsert(event.tool, label, "active");
        if (!ctx.tools.includes(event.tool)) ctx.tools.push(event.tool);
        if (MUTATING_TOOLS.has(event.tool)) ctx.mutated = true;
      } else if (event.type === "tool_end") {
        activity.markDone(event.tool);
      } else if (event.type === "interrupt") {
        ctx.interrupt = event.payload;
      } else if (event.type === "usage" && trackUsage) {
        setLastUsage({
          inputTokens: event.inputTokens,
          outputTokens: event.outputTokens,
          cost: event.cost,
        });
      } else if (event.type === "summary") {
        summaryRef.current = event.summary;
        summarizedCountRef.current = event.summarizedCount;
      } else if (event.type === "done") {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "ai",
            content: ctx.content,
            table: ctx.table ?? undefined,
            isStreaming: false,
            toolsUsed: ctx.tools.length > 0 ? [...ctx.tools] : undefined,
            interrupt: ctx.interrupt ?? undefined,
          },
        ]);
        activity.clear();
        if (ctx.mutated) window.dispatchEvent(new Event("transaction-added"));
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    },
    [activity, trackUsage]
  );

  const stream = useCallback(
    async (body: ChatRequestBody) => {
      setIsLoading(true);
      activity.seedThinking();
      setMessages((prev) => [...prev, { role: "ai", content: "", isStreaming: true }]);

      const ctx: StreamCtx = {
        content: "",
        mutated: false,
        interrupt: null,
        tools: [],
        table: null,
      };
      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abort.signal,
        });
        if (!response.ok) {
          let message = `Server error ${response.status}`;
          try {
            const data = await response.json();
            if (data?.message) message = data.message;
          } catch {
            // non-JSON body — keep the generic message
          }
          throw new Error(message);
        }

        for await (const event of parseSSE(response.body!.getReader())) {
          handleEvent(event, ctx);
        }
      } catch (err) {
        const e = err as { name?: string; message?: string };
        if (e?.name === "AbortError") {
          // User hit stop (or navigated away): keep whatever streamed so far
          // as a finished message instead of leaving a spinning bubble.
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              role: "ai",
              content: ctx.content || "Stopped.",
              table: ctx.table ?? undefined,
              isStreaming: false,
            },
          ]);
          return;
        }
        console.error("[useChat]", err);
        const message = e?.message || "Something went wrong. Please try again.";
        toast.error(message);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "ai",
            content: message,
            isStreaming: false,
          },
        ]);
      } finally {
        setIsLoading(false);
        activity.clear();
      }
    },
    [activity, handleEvent]
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isLoading) return;
      const updated: Message[] = [...messages, { role: "user", content }];
      setMessages(updated);
      const apiMessages = updated
        .filter((m) => !m.isStreaming)
        .map((m) => ({
          role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }));

      // Fresh turn → new graph thread so the in-process checkpointer never
      // accumulates history across turns (it only spans a turn's interrupt/resume).
      threadIdRef.current = newThreadId();

      // Send only the unsummarised tail; older messages are carried by the summary.
      const tail = apiMessages.slice(summarizedCountRef.current);
      await stream({
        threadId: threadIdRef.current,
        messages: tail,
        priorSummary: summaryRef.current || undefined,
        summarizedCount: summarizedCountRef.current,
      });
    },
    [isLoading, messages, stream]
  );

  const resumeInterrupt = useCallback(
    async (resume: InterruptResume) => {
      if (isLoading) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.interrupt && !m.interruptResolved ? { ...m, interruptResolved: true } : m
        )
      );
      await stream({ threadId: threadIdRef.current, resume });
    },
    [isLoading, stream]
  );

  // Pull the latest shared session into this hook instance. Needed by the
  // floating widget: it mounts once at app load and never remounts, so its
  // state goes stale whenever the /chat page (a separate instance on the same
  // sessionKey) advances the conversation. No-op while this instance streams.
  const resync = useCallback(() => {
    if (isLoading) return;
    const c = sessionCache.get(sessionKey);
    const restored = restoreMessages(c?.messages);
    if (restored) {
      setMessages(restored);
      setLastUsage(c?.lastUsage ?? null);
      summaryRef.current = c?.summary ?? "";
      summarizedCountRef.current = c?.summarizedCount ?? 0;
      threadIdRef.current = c?.threadId ?? threadIdRef.current;
    } else {
      // Cache cleared elsewhere ("New chat" on the other surface).
      setMessages([]);
      setLastUsage(null);
      summaryRef.current = "";
      summarizedCountRef.current = 0;
    }
  }, [isLoading, sessionKey]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    sessionCache.delete(sessionKey);
    threadIdRef.current = newThreadId();
    summaryRef.current = "";
    summarizedCountRef.current = 0;
    setMessages([]);
    activity.clear();
    setIsLoading(false);
    setLastUsage(null);
  }, [activity, sessionKey]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return {
    messages,
    activityLog: activity.items,
    isLoading,
    lastUsage,
    send,
    resumeInterrupt,
    reset,
    resync,
    cancel,
  };
}
