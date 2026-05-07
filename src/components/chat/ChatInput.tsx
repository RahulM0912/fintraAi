"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      textareaRef.current?.focus();
    },
    resetHeight: () => {
      if (textareaRef.current) textareaRef.current.style.height = "48px";
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
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="rounded-full bg-muted/50 focus-visible:ring-1"
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
        className="min-h-[48px] max-h-[160px] resize-none overflow-y-auto rounded-xl bg-muted/50 focus-visible:ring-1"
        disabled={isLoading || disabled}
        rows={1}
      />
      <Button
        onClick={onSend}
        size="icon"
        className="h-12 w-12 shrink-0 rounded-xl"
        disabled={isLoading || disabled || !value.trim()}
        aria-label="Send"
      >
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </Button>
    </div>
  );
});
