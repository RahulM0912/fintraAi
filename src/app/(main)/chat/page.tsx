"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Loader2,
  PlusCircle,
  PieChart,
  TrendingUp,
  Search,
  Trash2,
  RefreshCw,
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
  get_monthly_history: "Fetching monthly data...",
  get_yearly_history: "Fetching yearly data...",
};

const MUTATING_TOOLS = new Set([
  "add_transaction",
  "add_transactions_bulk",
  "update_transaction",
  "delete_transaction",
]);

const SUGGESTIONS = [
  {
    label: "Add expense",
    prompt: "Add ₹500 food expense today",
    icon: PlusCircle,
    description: "Log a new transaction",
  },
  {
    label: "Monthly summary",
    prompt: "Show me a summary of this month's spending",
    icon: PieChart,
    description: "Category breakdown",
  },
  {
    label: "Top spending",
    prompt: "Where did I spend the most this month?",
    icon: TrendingUp,
    description: "Spending analysis",
  },
  {
    label: "Recent transactions",
    prompt: "Show my last 10 transactions",
    icon: Search,
    description: "View transactions",
  },
  {
    label: "Bulk add",
    prompt:
      "Add these expenses: ₹500 food, ₹200 transport, ₹1000 rent — all today",
    icon: PlusCircle,
    description: "Add multiple at once",
  },
  {
    label: "Yearly trends",
    prompt: "Show my income vs expense trend for this year",
    icon: TrendingUp,
    description: "Year overview",
  },
];

const WELCOME_MESSAGE: Message = {
  role: "ai",
  content: `Hi! I'm **Fintra AI**, your personal finance assistant.

Here's what I can do for you:
• **Add transactions** — "Add ₹500 for food today"
• **Bulk add** — "Add ₹500 food, ₹200 cab, ₹1000 rent today"
• **View & filter** — "Show last week's expenses"
• **Edit / delete** — "Update my last food expense to ₹600"
• **Analytics** — "Where did I spend most this month?"
• **Trends** — "Compare my spending this year vs last"

What would you like to do?`,
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolStatus]);

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    setIsLoading(false);
    setToolStatus(null);
  };

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      const updatedMessages: Message[] = [
        ...messages,
        { role: "user", content },
      ];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);
      setToolStatus(null);

      const apiMessages = updatedMessages
        .filter((m) => !m.isStreaming)
        .map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content,
        }));

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

        if (!response.ok) throw new Error(`Server error ${response.status}`);

        const reader = response.body!.getReader();
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
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "ai", content: streamedContent, isStreaming: false },
              ]);
              if (mutationOccurred) {
                window.dispatchEvent(new Event("transaction-added"));
              }
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;

        console.error("[ChatPage]", err);
        toast.error("Something went wrong. Please try again.");

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

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Chat naturally to manage your finances
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          disabled={isLoading}
          className="gap-2 text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          New chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"
                }`}
              >
                {msg.role === "user" ? "U" : "✨"}
              </div>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm bg-muted"
                }`}
              >
                {msg.content || (
                  msg.isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                  ) : null
                )}
              </div>
            </div>
          ))}

          {/* Tool status indicator */}
          {toolStatus && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {toolStatus}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestion chips — only shown when chat is fresh */}
      {showSuggestions && (
        <div className="border-t bg-muted/20 px-6 py-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Try asking
          </p>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">
            {SUGGESTIONS.map(({ label, prompt, icon: Icon, description }, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
                className="flex items-start gap-2 rounded-xl border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    {description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-background px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me anything about your finances... (Enter to send, Shift+Enter for new line)"
            className="min-h-[48px] max-h-[120px] resize-none rounded-xl bg-muted/50 focus-visible:ring-1"
            disabled={isLoading}
            rows={1}
          />
          <Button
            onClick={() => handleSend()}
            size="icon"
            className="h-12 w-12 shrink-0 rounded-xl"
            disabled={isLoading || !input.trim()}
            aria-label="Send"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          AI can make mistakes. Verify important financial data.
        </p>
      </div>
    </div>
  );
}
