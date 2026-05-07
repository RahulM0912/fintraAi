"use client";

import { Loader2, CheckCircle2 } from "lucide-react";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import type { ActivityItem, InterruptResume, Message } from "@/lib/chat/types";
import { ActivityLog } from "./ActivityLog";
import { InterruptCard } from "./InterruptCard";

interface Props {
  message: Message;
  activityLog?: ActivityItem[];      // only used for the streaming bubble
  isLoading?: boolean;
  variant?: "compact" | "full";
  showToolsUsed?: boolean;
  onResolveInterrupt?: (resume: InterruptResume) => void;
}

export function MessageBubble({
  message,
  activityLog = [],
  isLoading = false,
  variant = "full",
  showToolsUsed = false,
  onResolveInterrupt,
}: Props) {
  const isCompact = variant === "compact";
  const avatarSize = isCompact ? "h-8 w-8" : "h-9 w-9";
  const bubbleMaxW = isCompact ? "max-w-[80%]" : "max-w-[75%]";
  const padding = isCompact ? "px-3 py-2 text-sm" : "px-4 py-3 text-sm leading-relaxed";

  return (
    <div className={`flex items-start ${isCompact ? "gap-2" : "gap-3"} ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex ${avatarSize} shrink-0 items-center justify-center rounded-full text-sm ${
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"
        }`}
      >
        {message.role === "user" ? "U" : "✨"}
      </div>

      <div
        className={`${bubbleMaxW} rounded-2xl ${padding} ${
          message.role === "user"
            ? "rounded-tr-sm bg-primary text-primary-foreground whitespace-pre-wrap"
            : "rounded-tl-sm bg-muted"
        }`}
      >
        {/* Live activity log inside the streaming AI bubble */}
        {message.role === "ai" && message.isStreaming && activityLog.length > 0 && (
          <div className={message.content ? (isCompact ? "mb-2" : "mb-3") : ""}>
            <ActivityLog items={activityLog} size={isCompact ? "sm" : "md"} />
          </div>
        )}

        {/* Message text or first-token spinner */}
        {message.content ? (
          message.role === "user" ? (
            <span>{message.content}</span>
          ) : (
            <MarkdownContent content={message.content} />
          )
        ) : message.isStreaming && activityLog.length === 0 ? (
          <Loader2 className="h-4 w-4 animate-spin opacity-60" />
        ) : null}

        {/* HITL prompt — only on AI messages, only after streaming completes */}
        {message.role === "ai" &&
          !message.isStreaming &&
          message.interrupt &&
          onResolveInterrupt && (
            <InterruptCard
              payload={message.interrupt}
              resolved={!!message.interruptResolved}
              disabled={isLoading}
              onResolve={onResolveInterrupt}
            />
          )}

        {/* Tools-used footer */}
        {showToolsUsed &&
          message.role === "ai" &&
          !message.isStreaming &&
          message.toolsUsed &&
          message.toolsUsed.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-500/80" />
              <span className="font-medium">Used:</span>
              {message.toolsUsed.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full bg-background/60 px-2 py-0.5 font-mono"
                >
                  {tool}
                </span>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
