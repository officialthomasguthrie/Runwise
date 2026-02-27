"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorRetryCardProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorRetryCard({ message, onRetry }: ErrorRetryCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3",
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      )}
    >
      <p className="text-sm text-amber-400/90">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
            "border border-amber-500/40 text-amber-400 bg-amber-500/20",
            "hover:bg-amber-500/30 transition-colors shrink-0"
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
