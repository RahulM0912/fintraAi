"use client";

import { Loader2, CheckCircle2 } from "lucide-react";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import type { ActivityItem, InterruptResume, Message } from "@/lib/chat/types";
import { getFollowUpSuggestions } from "@/lib/chat/followUpSuggestions";
import { ActivityLog } from "./ActivityLog";
import { ChatArtifact } from "./ChatArtifact";
import { FollowUpPrompts } from "./FollowUpPrompts";
import { InterruptCard } from "./InterruptCard";

/* Correspondence, not chat balloons: the agent speaks in flat prose on the
   paper background under a small byline; the user's words sit right-aligned
   in a quiet tinted block. */

interface Props {
  message: Message;
  activityLog?: ActivityItem[];      // only used for the streaming bubble
  isLoading?: boolean;
  isLast?: boolean;                  // gates the follow-up prompt row
  variant?: "compact" | "full";
  showToolsUsed?: boolean;
  onResolveInterrupt?: (resume: InterruptResume) => void;
  onSuggestion?: (prompt: string, mode: "send" | "prefill") => void;
}

export function MessageBubble({
  message,
  activityLog = [],
  isLoading = false,
  isLast = false,
  variant = "full",
  showToolsUsed = false,
  onResolveInterrupt,
  onSuggestion,
}: Props) {
  const isCompact = variant === "compact";

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={`${isCompact ? "max-w-[85%] px-3 py-2 text-sm" : "max-w-[75%] px-4 py-3 text-sm leading-relaxed"} whitespace-pre-wrap rounded-xl rounded-br-sm bg-[var(--surface-2)] text-[var(--ink)]`}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Byline */}
      <div className={`flex items-center gap-2 ${isCompact ? "mb-1.5" : "mb-2"}`}>
        <span aria-hidden className="h-px w-4 bg-[var(--brand)]" />
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)]">
          Fintra
        </span>
      </div>

      <div className={isCompact ? "text-sm" : "text-sm leading-relaxed"}>
        {/* Live activity log while the agent works */}
        {message.isStreaming && activityLog.length > 0 && (
          <div className={message.content ? (isCompact ? "mb-2" : "mb-3") : ""}>
            <ActivityLog items={activityLog} size={isCompact ? "sm" : "md"} />
          </div>
        )}

        {/* Message text or first-token spinner */}
        {message.content ? (
          <MarkdownContent content={message.content} />
        ) : message.isStreaming && activityLog.length === 0 ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--ink-3)]" />
        ) : null}

        {/* Computed facts under the headline */}
        {message.facts && message.facts.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {message.facts.map((fact) => (
              <p key={fact} className="tnum text-[13px] text-[var(--ink-2)]">
                {fact}
              </p>
            ))}
          </div>
        )}

        {/* Structured chart/table from the render fast-path — one artifact,
            switchable between the two views when both exist. */}
        {(message.chart || message.table) && (
          <ChatArtifact chart={message.chart} table={message.table} compact={isCompact} />
        )}

        {/* Suggested next questions — only on the live turn, and only once
            any pending confirmation is out of the way. AI-generated ones
            (tied to the asked question) win; shape-derived ones are the
            fallback when the cheap model was unavailable. */}
        {isLast &&
          !message.isStreaming &&
          onSuggestion &&
          (!message.interrupt || message.interruptResolved) &&
          (() => {
            const followUps = message.suggestions?.length
              ? message.suggestions.map((s) => ({ prompt: s, mode: "send" as const }))
              : getFollowUpSuggestions(message);
            return followUps ? (
              <FollowUpPrompts items={followUps} disabled={isLoading} onSelect={onSuggestion} />
            ) : null;
          })()}

        {/* HITL prompt — only after streaming completes */}
        {!message.isStreaming && message.interrupt && onResolveInterrupt && (
          <InterruptCard
            payload={message.interrupt}
            resolved={!!message.interruptResolved}
            disabled={isLoading}
            onResolve={onResolveInterrupt}
          />
        )}

        {/* Tools-used footer */}
        {showToolsUsed &&
          !message.isStreaming &&
          message.toolsUsed &&
          message.toolsUsed.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--hairline)] pt-2 text-[11px] text-[var(--ink-3)]">
              <CheckCircle2 className="h-3 w-3 text-[var(--pos)]" aria-hidden />
              <span className="font-medium">Used:</span>
              {message.toolsUsed.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-[var(--hairline)] px-2 py-0.5 font-mono"
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
