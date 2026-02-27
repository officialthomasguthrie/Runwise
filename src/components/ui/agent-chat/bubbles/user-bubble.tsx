"use client";

import { cn } from "@/lib/utils";

interface UserBubbleProps {
  content: string;
  className?: string;
}

export function UserBubble({ content, className }: UserBubbleProps) {
  return (
    <div className={cn("flex justify-end", className)}>
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-white/10 px-4 py-2.5 text-sm text-foreground">
        {content}
      </div>
    </div>
  );
}
