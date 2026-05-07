"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
          onClick={handleReset}
          disabled={chat.isLoading}
          className="gap-2 text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
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
        <div className="border-t bg-muted/20 px-6 py-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Try asking
          </p>
          <SuggestionChips
            suggestions={PAGE_SUGGESTIONS}
            variant="card"
            disabled={chat.isLoading}
            onSelect={handleSend}
          />
        </div>
      )}

      <div className="border-t bg-background px-6 py-4">
        <ChatInput
          ref={inputRef}
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          isLoading={chat.isLoading}
          placeholder="Ask me anything about your finances... (Enter to send, Shift+Enter for new line)"
        />
        <div className="mt-2 flex items-center justify-between">
          {chat.lastUsage ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {(chat.lastUsage.inputTokens + chat.lastUsage.outputTokens).toLocaleString()} tokens
              {chat.lastUsage.cost > 0 ? ` · $${chat.lastUsage.cost.toFixed(5)}` : ""}
            </span>
          ) : (
            <span />
          )}
          <p className="text-xs text-muted-foreground">
            AI can make mistakes. Verify important financial data.
          </p>
        </div>
      </div>
    </div>
  );
}
