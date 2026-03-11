"use client";

import { useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeployAgentPlan } from "@/lib/agents/types";

interface PlanPreviewCardProps {
  plan: DeployAgentPlan;
  onBuild: () => void;
  onAdjust: () => void;
  /** When true, show "Update agent" instead of "Build Agent" and call onUpdate on confirm */
  isEditingAgent?: boolean;
  onUpdate?: () => void;
}

/**
 * Renders only the Build / Adjust buttons below the AI's plain-text plan.
 * The plan content is streamed as assistant text above; this card is just the CTAs.
 * Hides both buttons when either is clicked.
 */
export function PlanPreviewCard({ plan, onBuild, onAdjust, isEditingAgent, onUpdate }: PlanPreviewCardProps) {
  const [hidden, setHidden] = useState(false);

  const handlePrimary = () => {
    setHidden(true);
    if (isEditingAgent && onUpdate) {
      onUpdate();
    } else {
      onBuild();
    }
  };

  const handleAdjust = () => {
    setHidden(true);
    onAdjust();
  };

  if (hidden) return null;

  const customToolNames = plan.customTools?.length
    ? plan.customTools.map((t) => t.name).join(", ")
    : null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {customToolNames && (
        <p className="text-xs text-muted-foreground">
          Custom tools: {customToolNames}
        </p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={handlePrimary}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200",
          "bg-stone-200/40 dark:bg-white/[0.06] backdrop-blur-xl",
          "border border-stone-300/50 dark:border-white/[0.08]",
          "text-stone-600 dark:text-stone-300",
          "hover:bg-stone-200/60 dark:hover:bg-white/[0.1] hover:border-stone-300/70 dark:hover:border-white/15",
          "shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
        )}
      >
        {isEditingAgent ? "Update agent" : "Build Agent"}
        <CornerDownLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={handleAdjust}
        className="inline-flex items-center rounded-xl px-4 py-2 text-sm text-muted-foreground border border-transparent"
      >
        Let me adjust something
      </button>
      </div>
    </div>
  );
}
