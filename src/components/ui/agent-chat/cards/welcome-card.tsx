"use client";

import { cn } from "@/lib/utils";

interface WelcomeCardProps {
  content: string;
  chips: string[];
  onChipClick: (text: string) => void;
}

export function WelcomeCard({ content, chips, onChipClick }: WelcomeCardProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChipClick(chip)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              "border border-white/15 bg-white/[0.04] text-muted-foreground",
              "hover:border-pink-500/30 hover:bg-pink-500/10 hover:text-pink-400"
            )}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
