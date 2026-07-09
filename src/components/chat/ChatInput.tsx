"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface ChatInputHandle {
  focus: () => void;
  resetHeight: () => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  variant?: "input" | "textarea";
}

export const ChatInput = forwardRef<ChatInputHandle, Props>(function ChatInput(
  { value, onChange, onSend, isLoading, disabled, placeholder, variant = "textarea" },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const compactMinHeight = 40;
  const expandedMinHeight = 48;
  const minHeight = variant === "input" ? compactMinHeight : expandedMinHeight;

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
    resetHeight: () => {
      if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
    },
  }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  if (variant === "input") {
    return (
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="min-h-[40px] max-h-[160px] resize-none overflow-y-auto rounded-lg border-[var(--hairline-strong)] bg-transparent px-4 py-2 leading-5 focus-visible:ring-2 focus-visible:ring-ring/50"
          disabled={isLoading || disabled}
        />
        <Button
          onClick={onSend}
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          disabled={isLoading || disabled || !value.trim()}
          aria-label="Send"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl items-end gap-3">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[48px] max-h-[160px] resize-none overflow-y-auto rounded-lg border-[var(--hairline-strong)] bg-transparent focus-visible:ring-2 focus-visible:ring-ring/50"
        disabled={isLoading || disabled}
        rows={1}
      />
      <Button
        onClick={onSend}
        size="icon"
        className="h-12 w-12 shrink-0 rounded-lg"
        disabled={isLoading || disabled || !value.trim()}
        aria-label="Send"
      >
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </Button>
    </div>
  );
});
