"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, MessageSquare, Sparkles } from "lucide-react";
import { useChat } from "@/lib/chat/useChat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { SuggestionChips } from "@/components/chat/SuggestionChips";
import { ChatInput, type ChatInputHandle } from "@/components/chat/ChatInput";
import { ASSISTANT_SUGGESTIONS, ASSISTANT_WELCOME } from "@/components/chat/suggestions";

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const chat = useChat({ welcomeMessage: ASSISTANT_WELCOME });

  const inputRef = useRef<ChatInputHandle>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.activityLog]);

  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timeout);
    }
    chat.cancel();
    // We intentionally don't depend on `chat` — we only react to open state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput("");
    await chat.send(value);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI assistant"
          className="cursor-pointer fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white shadow-lg shadow-[var(--brand)]/30 transition-all hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[var(--brand)]/30"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="cursor-pointer fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l bg-background shadow-2xl sm:w-[400px]">
            <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)]">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Fintra AI</h2>
                  <p className="text-xs text-muted-foreground">Your finance copilot</p>
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

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-4">
                {chat.messages.map((msg, i) => {
                  const isLast = i === chat.messages.length - 1;
                  return (
                    <MessageBubble
                      key={i}
                      message={msg}
                      activityLog={isLast ? chat.activityLog : []}
                      isLoading={chat.isLoading}
                      variant="compact"
                      onResolveInterrupt={chat.resumeInterrupt}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t bg-background p-4">
              <div className="mb-3">
                <SuggestionChips
                  suggestions={ASSISTANT_SUGGESTIONS}
                  variant="pill"
                  disabled={chat.isLoading}
                  onSelect={handleSend}
                />
              </div>
              <ChatInput
                ref={inputRef}
                value={input}
                onChange={setInput}
                onSend={() => handleSend()}
                isLoading={chat.isLoading}
                placeholder="Add ₹500 for food today..."
                variant="input"
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
