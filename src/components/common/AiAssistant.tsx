"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  X,
  MessageSquare,
  PlusCircle,
  PieChart,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "ai";
  content: string;
  isStreaming?: boolean;
}

type SSEEvent =
  | { type: "token"; content: string }
  | { type: "tool_start"; tool: string }
  | { type: "tool_end"; tool: string }
  | { type: "done" }
  | { type: "error"; message: string };

// ─── Constants ─────────────────────────────────────────────────────────────────

const TOOL_STATUS_LABELS: Record<string, string> = {
  add_transaction: "Adding transaction...",
  add_transactions_bulk: "Adding transactions...",
  list_transactions: "Fetching transactions...",
  update_transaction: "Updating transaction...",
  delete_transaction: "Deleting transaction...",
  get_spending_summary: "Analyzing spending...",
  get_categories: "Loading categories...",
  get_monthly_history: "Fetching monthly history...",
  get_yearly_history: "Fetching yearly data...",
};

const MUTATING_TOOLS = new Set([
  "add_transaction",
  "add_transactions_bulk",
  "update_transaction",
  "delete_transaction",
]);

const SUGGESTION_CHIPS = [
  { label: "Add ₹500 food expense today", icon: PlusCircle },
  { label: "Show this month's spending", icon: PieChart },
  { label: "Where did I spend the most?", icon: TrendingUp },
];

const WELCOME_MESSAGE: Message = {
  role: "ai",
  content:
    "Hi! I'm your Fintra AI assistant. I can add transactions, show spending summaries, and help you manage your finances. What would you like to do?",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolStatus]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Cancel in-flight request when panel closes
  useEffect(() => {
    if (!isOpen) abortRef.current?.abort();
  }, [isOpen]);

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      // Append user message and clear input immediately
      const updatedMessages: Message[] = [...messages, { role: "user", content }];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);
      setToolStatus(null);

      // Build API payload: convert our format → {role, content} for the API
      const apiMessages = updatedMessages
        .filter((m) => !m.isStreaming)
        .map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content,
        }));

      // Add empty streaming placeholder for the AI reply
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "", isStreaming: true },
      ]);

      let streamedContent = "";
      let mutationOccurred = false;

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
          signal: abort.signal,
        });

        if (!response.ok) {
          throw new Error(`Server error ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let event: SSEEvent;
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }

            if (event.type === "token") {
              streamedContent += event.content;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "ai", content: streamedContent, isStreaming: true },
              ]);
            } else if (event.type === "tool_start") {
              setToolStatus(
                TOOL_STATUS_LABELS[event.tool] ?? `Running ${event.tool}...`
              );
              if (MUTATING_TOOLS.has(event.tool)) mutationOccurred = true;
            } else if (event.type === "tool_end") {
              setToolStatus(null);
            } else if (event.type === "done") {
              // Finalize the streaming message
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "ai", content: streamedContent, isStreaming: false },
              ]);
              // Notify dashboard to refresh if data was mutated
              if (mutationOccurred) {
                window.dispatchEvent(new Event("transaction-added"));
              }
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return; // panel closed mid-stream

        console.error("[AiAssistant]", err);
        toast.error("AI assistant error. Please try again.");

        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "ai",
            content: "Sorry, something went wrong. Please try again.",
            isStreaming: false,
          },
        ]);
      } finally {
        setIsLoading(false);
        setToolStatus(null);
      }
    },
    [input, isLoading, messages]
  );

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI assistant"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-300"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Side panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l bg-background shadow-2xl sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
                <span className="text-sm font-bold text-white">✨</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold">Fintra AI</h2>
                <p className="text-xs text-muted-foreground">Powered by Gemini</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.role === "user" ? "U" : "✨"}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "rounded-tr-sm bg-primary text-primary-foreground whitespace-pre-wrap"
                        : "rounded-tl-sm bg-muted"
                    }`}
                  >
                    {msg.content ? (
                      msg.role === "ai" ? (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="mb-1 ml-4 list-disc space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : msg.content
                    ) : (
                      msg.isStreaming ? (
                        <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                      ) : null
                    )}
                  </div>
                </div>
              ))}

              {/* Tool execution status */}
              {toolStatus && (
                <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {toolStatus}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="border-t bg-background p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTION_CHIPS.map(({ label, icon: Icon }, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="h-7 rounded-full px-3 text-xs"
                  onClick={() => handleSend(label)}
                  disabled={isLoading}
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Add ₹500 for food today..."
                className="rounded-full bg-muted/50 focus-visible:ring-1"
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSend()}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                disabled={isLoading || !input.trim()}
                aria-label="Send"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
}
