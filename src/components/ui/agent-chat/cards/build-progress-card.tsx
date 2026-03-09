"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { BuildStage, BuildStageStatus } from "@/lib/agents/chat-pipeline";

interface BuildProgressCardProps {
  stages: BuildStage[];
}

/** Canonical order of build stages — always show all 6, merge with received stages */
const CANONICAL_STAGES: string[] = [
  "Intent analysed",
  "Execution logic generated",
  "Integrations validated",
  "Memory seeded",
  "Safeguards applied",
  "Agent deployed",
];

/** Maps stage label to in-progress label (for shimmer state) */
const STAGE_LABELS: Record<string, string> = {
  "Intent analysed": "Analysing intent",
  "Execution logic generated": "Generating execution logic",
  "Integrations validated": "Validating integrations",
  "Memory seeded": "Seeding memory",
  "Safeguards applied": "Applying safeguards",
  "Agent deployed": "Deploying agent",
};

function getInProgressLabel(completedLabel: string): string {
  return STAGE_LABELS[completedLabel] ?? completedLabel.replace("d", "ing").replace("ed", "ing");
}

export function BuildProgressCard({ stages }: BuildProgressCardProps) {
  const stagesByLabel = new Map((stages ?? []).map((s) => [s.label, s]));
  const mergedStages: BuildStage[] = CANONICAL_STAGES.map((label) => ({
    label,
    status: (stagesByLabel.get(label)?.status ?? "pending") as BuildStageStatus,
  }));

  return (
    <div className="flex gap-3 justify-start">
      <div className="max-w-[95%] rounded-lg px-4 py-2 bg-transparent text-foreground">
        <div className="flex flex-col gap-2">
          {mergedStages.map((stage, i) => {
              const isPending = stage.status === "pending";
              const isInProgress = stage.status === "running";
              const isCompleted = stage.status === "done";
              const isFailed = stage.status === "error";
              const inProgressLabel = getInProgressLabel(stage.label);

              return (
                <div key={`${stage.label}-${i}`} className="flex items-center gap-2">
                  {isPending && (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                  )}
                  {isInProgress && (
                    <Loader2 className="h-3.5 w-3.5 text-foreground animate-spin flex-shrink-0" />
                  )}
                  {isCompleted && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500/70 dark:text-green-400/70 flex-shrink-0" />
                  )}
                  {isFailed && (
                    <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    {isInProgress ? (
                      <p
                        className="text-sm whitespace-pre-wrap inline-block"
                        style={{
                          background:
                            "linear-gradient(90deg, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.8) 25%, hsl(var(--foreground) / 0.4) 50%, hsl(var(--foreground) / 0.8) 75%, hsl(var(--foreground)) 100%)",
                          backgroundSize: "200% 100%",
                          backgroundClip: "text",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          animation: "shimmer 2s ease-in-out infinite",
                        }}
                      >
                        {inProgressLabel}
                      </p>
                    ) : isCompleted ? (
                      <p className="text-sm text-muted-foreground">{stage.label}</p>
                    ) : isFailed ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {inProgressLabel} - Failed
                      </p>
                    ) : isPending ? (
                      <p className="text-sm text-muted-foreground/60">{stage.label}</p>
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
