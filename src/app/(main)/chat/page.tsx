"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useChat } from "@/lib/chat/useChat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { SuggestionChips } from "@/components/chat/SuggestionChips";
import { ChatInput, type ChatInputHandle } from "@/components/chat/ChatInput";
import { PAGE_SUGGESTIONS, PAGE_WELCOME } from "@/components/chat/suggestions";

export default function ChatPage() {
  const chat = useChat({ welcomeMessage: PAGE_WELCOME, trackUsage: true });
  const [input, setInput] = useState("");
  const inputRef = useRef<ChatInputHandle>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.activityLog]);

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput("");
    inputRef.current?.resetHeight();
    await chat.send(value);
  };

  const handleReset = () => {
    chat.reset();
    setInput("");
    inputRef.current?.resetHeight();
  };

  const showSuggestions = chat.messages.length <= 1;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-6 sm:px-8 lg:pt-8">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          {/* Mobile gets the title from the app header */}
          <div>
            <div className="hidden items-center gap-3 lg:flex">
              <span aria-hidden className="h-px w-6 bg-[var(--brand)]" />
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
                The conversation
              </p>
            </div>
            <h1 className="font-display mt-3 hidden text-[32px] font-semibold tracking-tight text-[var(--ink)] lg:block">
              Chat
            </h1>
            <p className="text-sm text-[var(--ink-2)] lg:mt-1">
              Fintra reads your ledger and talks back.
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={chat.isLoading}
            className="cursor-pointer inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[var(--ink-2)] transition-colors duration-150 hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            New chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {chat.messages.map((msg, i) => {
            const isLast = i === chat.messages.length - 1;
            return (
              <MessageBubble
                key={i}
                message={msg}
                activityLog={isLast ? chat.activityLog : []}
                isLoading={chat.isLoading}
                showToolsUsed
                onResolveInterrupt={chat.resumeInterrupt}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {showSuggestions && (
        <div className="px-5 pb-4 sm:px-8">
          <div className="mx-auto max-w-3xl border-t border-[var(--hairline)] pt-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
              Try asking
            </p>
            <SuggestionChips
              suggestions={PAGE_SUGGESTIONS}
              variant="card"
              disabled={chat.isLoading}
              onSelect={handleSend}
            />
          </div>
        </div>
      )}

      <div className="border-t border-[var(--hairline)] bg-[var(--app-bg)] px-5 py-4 sm:px-8">
        <ChatInput
          ref={inputRef}
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          isLoading={chat.isLoading}
          placeholder="Ask about your money… (Enter to send, Shift+Enter for a new line)"
        />
        <div className="mx-auto mt-2 flex max-w-3xl items-center justify-between">
          {chat.lastUsage ? (
            <span className="tnum text-xs text-[var(--ink-3)]">
              {(chat.lastUsage.inputTokens + chat.lastUsage.outputTokens).toLocaleString()} tokens
              {chat.lastUsage.cost > 0 ? ` · $${chat.lastUsage.cost.toFixed(5)}` : ""}
            </span>
          ) : (
            <span />
          )}
          <p className="text-xs text-[var(--ink-3)]">
            Fintra can make mistakes — verify important numbers.
          </p>
        </div>
      </div>
    </div>
  );
}
