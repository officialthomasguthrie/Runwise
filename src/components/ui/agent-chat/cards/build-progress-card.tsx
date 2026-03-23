"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuildStage, BuildStageStatus } from "@/lib/agents/chat-pipeline";

interface BuildProgressCardProps {
  stages: BuildStage[];
}

/** Canonical order of build stages — merge with received stages */
const CANONICAL_STAGES: string[] = [
  "Analyzing capabilities",
  "Generating execution logic",
  "Validating integrations",
  "Seeding memory",
  "Applying safeguards",
  "Deploying agent",
];

function getInProgressLabel(label: string): string {
  return label;
}

export function BuildProgressCard({ stages }: BuildProgressCardProps) {
  const stagesByLabel = new Map((stages ?? []).map((s) => [s.label, s]));
  const mergedStages: BuildStage[] = CANONICAL_STAGES.map((label) => {
    const received = stagesByLabel.get(label);
    return {
      label,
      status: (received?.status ?? "pending") as BuildStageStatus,
      detail: received?.detail,
    };
  });

  return (
    <div className="w-full max-w-[420px]">
      <div
        className={cn(
          "rounded-xl border border-stone-200/60 dark:border-white/[0.06]",
          "bg-stone-50/80 dark:bg-white/[0.02]",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
          "overflow-hidden"
        )}
      >
        <div className="px-4 py-3 border-b border-stone-200/50 dark:border-white/[0.05]">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
            Building agent
          </p>
        </div>
        <div className="divide-y divide-stone-200/40 dark:divide-white/[0.04]">
          {mergedStages.map((stage, i) => {
            const isPending = stage.status === "pending";
            const isInProgress = stage.status === "running";
            const isCompleted = stage.status === "done";
            const isFailed = stage.status === "error";
            const inProgressLabel = getInProgressLabel(stage.label);

            return (
              <div
                key={`${stage.label}-${i}`}
                className={cn(
                  "flex items-start gap-3 px-4 py-2.5 transition-colors",
                  isInProgress && "bg-stone-100/50 dark:bg-white/[0.03]"
                )}
              >
                <div className="flex-shrink-0 pt-0.5">
                  {isPending && (
                    <span className="block w-4 h-4 rounded-full border-2 border-muted-foreground/25" />
                  )}
                  {isInProgress && (
                    <Loader2 className="h-4 w-4 text-foreground/90 animate-spin" />
                  )}
                  {isCompleted && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400/90" />
                  )}
                  {isFailed && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {isInProgress ? (
                    <p className="text-sm font-medium text-foreground">
                      {inProgressLabel}
                    </p>
                  ) : isCompleted ? (
                    <>
                      <p className="text-sm font-medium text-foreground/90">
                        {stage.label}
                      </p>
                      {stage.detail && (
                        <p className="mt-0.5 text-xs text-muted-foreground/80 leading-relaxed">
                          → {stage.detail}
                        </p>
                      )}
                    </>
                  ) : isFailed ? (
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {inProgressLabel} — Failed
                    </p>
                  ) : isPending ? (
                    <p className="text-sm text-muted-foreground/50">
                      {stage.label}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
