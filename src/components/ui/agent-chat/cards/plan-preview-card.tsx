"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeployAgentPlan } from "@/lib/agents/types";

const BEHAVIOUR_ICONS: Record<string, string> = {
  "new-email-received": "📧",
  "new-message-in-slack": "💬",
  "new-discord-message": "💬",
  "new-row-in-google-sheet": "📊",
  "new-github-issue": "🐛",
  "file-uploaded": "📁",
  "new-form-submission": "📋",
  heartbeat: "📅",
  schedule: "⏰",
};

interface PlanPreviewCardProps {
  plan: DeployAgentPlan;
  onBuild: () => void;
  onAdjust: () => void;
}

export function PlanPreviewCard({ plan, onBuild, onAdjust }: PlanPreviewCardProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleBuild = () => {
    if (submitted) return;
    setSubmitted(true);
    onBuild();
  };

  const handleAdjust = () => {
    if (submitted) return;
    setSubmitted(true);
    onAdjust();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Card */}
      <div className="rounded-md border border-white/10 bg-white/[0.03] overflow-hidden">
        {/* Agent identity */}
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl flex-shrink-0">
            {plan.avatarEmoji || "🤖"}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              {plan.name}
            </h3>
            <p className="text-sm text-muted-foreground italic mt-0.5">
              {plan.persona}
            </p>
          </div>
        </div>

        {/* Will watch & act on */}
        <div className="px-4 pb-4 border-t border-white/5 pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Will watch & act on
          </p>
          <div className="flex flex-col gap-1.5">
            {plan.behaviours.map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="flex-shrink-0 mt-0.5">
                  {BEHAVIOUR_ICONS[b.triggerType ?? b.behaviourType] ?? "⚡"}
                </span>
                <span>{b.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Starting knowledge */}
        {(plan.initialMemories?.length ?? 0) > 0 && (
          <div className="px-4 pb-4 border-t border-white/5 pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Starting knowledge
            </p>
            <div className="flex flex-col gap-1.5">
              {plan.initialMemories.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="flex-shrink-0 text-xs mt-0.5 text-white/30">•</span>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTAs below card */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleBuild}
          disabled={submitted}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition-colors",
            "bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-300",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-pink-500/20"
          )}
        >
          <Bot className="h-4 w-4" />
          Build Agent
        </button>
        <button
          onClick={handleAdjust}
          disabled={submitted}
          className={cn(
            "inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Let me adjust something
        </button>
      </div>
    </div>
  );
}
