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
  const isThinking = content === "Thinking...";

  return (
    <div className={cn("flex justify-start", className)}>
      <div className="max-w-[95%] bg-transparent text-foreground">
        {isThinking ? (
          <p
            className="text-sm whitespace-pre-wrap inline-block"
            style={{
              background:
                "linear-gradient(90deg, hsl(var(--muted-foreground)) 0%, hsl(var(--muted-foreground) / 0.8) 25%, hsl(var(--muted-foreground) / 0.4) 50%, hsl(var(--muted-foreground) / 0.8) 75%, hsl(var(--muted-foreground)) 100%)",
              backgroundSize: "200% 100%",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 2s ease-in-out infinite",
            }}
          >
            {content}
          </p>
        ) : (
          <p className="text-sm text-black dark:text-white leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        )}
      </div>
    </div>
  );
}
