"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { newThreadId } from "./threadId";
import { parseSSE } from "./sseParser";
import { useActivityLog } from "./useActivityLog";
import type {
  InterruptPayload,
  InterruptResume,
  Message,
  SSEEvent,
  UsageInfo,
} from "./types";
import { MUTATING_TOOLS, TOOL_STATUS_LABELS } from "./types";

interface UseChatOptions {
  welcomeMessage: Message;
  trackUsage?: boolean;
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
}

export function useChat({ welcomeMessage, trackUsage = false }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null);
  const activity = useActivityLog();

  const threadIdRef = useRef<string>(newThreadId());
  const abortRef = useRef<AbortController | null>(null);

  // Rolling-summary memory: everything before `summarizedCountRef` messages is
  // condensed into `summaryRef`; only the unsummarised tail is sent each turn.
  const summaryRef = useRef<string>("");
  const summarizedCountRef = useRef<number>(0);

  const handleEvent = useCallback(
    (event: SSEEvent, ctx: StreamCtx) => {
      if (event.type === "token") {
        if (!ctx.content) activity.markAllDone();
        ctx.content += event.content;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "ai", content: ctx.content, isStreaming: true },
        ]);
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

      const ctx: StreamCtx = { content: "", mutated: false, interrupt: null, tools: [] };
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
        if (e?.name === "AbortError") return;
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

  const reset = useCallback(() => {
    abortRef.current?.abort();
    threadIdRef.current = newThreadId();
    summaryRef.current = "";
    summarizedCountRef.current = 0;
    setMessages([welcomeMessage]);
    activity.clear();
    setIsLoading(false);
    setLastUsage(null);
  }, [activity, welcomeMessage]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return {
    messages,
    activityLog: activity.items,
    isLoading,
    lastUsage,
    send,
    resumeInterrupt,
    reset,
    cancel,
  };
}
