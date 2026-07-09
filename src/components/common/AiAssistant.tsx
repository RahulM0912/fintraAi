"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, MessageSquare } from "lucide-react";
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

  // Let other parts of the app (e.g. the dashboard insight card) open the
  // assistant and optionally seed it with a question.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const prompt = (e as CustomEvent<{ prompt?: string }>).detail?.prompt;
      setIsOpen(true);
      if (prompt) setTimeout(() => handleSend(prompt), 150);
    };
    window.addEventListener("open-assistant", onOpen);
    return () => window.removeEventListener("open-assistant", onOpen);
    // handleSend is stable enough for this fire-and-forget bridge
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI assistant"
          className="cursor-pointer fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--primary-foreground)] shadow-sm transition-colors duration-150 ease-out hover:bg-[var(--brand-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
        >
          <MessageSquare className="h-6 w-6" aria-hidden />
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="cursor-pointer fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-[var(--hairline)] bg-[var(--app-bg)] shadow-lg sm:w-[400px]">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-4">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-5 bg-[var(--brand)]" />
                <div>
                  <h2 className="font-display text-base font-semibold text-[var(--ink)]">Fintra</h2>
                  <p className="text-xs text-[var(--ink-3)]">Ask about your money</p>
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
