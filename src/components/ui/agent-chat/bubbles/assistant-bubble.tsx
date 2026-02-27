"use client";

import { cn } from "@/lib/utils";

interface AssistantBubbleProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function AssistantBubble({
  content,
  isStreaming = false,
  className,
}: AssistantBubbleProps) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="max-w-[90%] text-sm text-muted-foreground leading-relaxed">
        {content}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-pink-400 align-middle" />
        )}
      </div>
    </div>
  );
}
