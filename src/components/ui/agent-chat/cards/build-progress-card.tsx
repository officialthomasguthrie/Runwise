"use client";

import type { CSSProperties } from "react";
import { Loader2, CheckCircle2, XCircle, CornerDownRight } from "lucide-react";
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

/** Match workflow AI chat sidebar: shimmer on active step label */
const shimmerLabelClass =
  "text-sm whitespace-pre-wrap inline-block bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]";

const shimmerLabelStyle: CSSProperties = {
  background:
    "linear-gradient(90deg, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.8) 25%, hsl(var(--foreground) / 0.4) 50%, hsl(var(--foreground) / 0.8) 75%, hsl(var(--foreground)) 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

function normalizeDetail(detail: string): string {
  return detail.replace(/^\s*→\s*/, "").trim();
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
    <div className="w-full max-w-[95%] bg-transparent text-foreground">
      <div className="flex flex-col gap-2">
        {mergedStages.map((stage, i) => {
          const isPending = stage.status === "pending";
          const isInProgress = stage.status === "running";
          const isCompleted = stage.status === "done";
          const isFailed = stage.status === "error";
          const detailText = stage.detail ? normalizeDetail(stage.detail) : "";

          return (
            <div key={`${stage.label}-${i}`} className="min-w-0">
              <div className="flex items-center gap-2">
                {isPending && (
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/25"
                    aria-hidden
                  />
                )}
                {isInProgress && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-foreground" aria-hidden />
                )}
                {isCompleted && (
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0 text-green-500/70 dark:text-green-400/70"
                    aria-hidden
                  />
                )}
                {isFailed && <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden />}

                <div className="min-w-0 flex-1">
                  {isInProgress && (
                    <p className={shimmerLabelClass} style={shimmerLabelStyle}>
                      {stage.label}
                    </p>
                  )}
                  {isCompleted && (
                    <p className="text-sm text-muted-foreground">{stage.label}</p>
                  )}
                  {isFailed && (
                    <p className="text-sm text-red-600 dark:text-red-400">{stage.label} — Failed</p>
                  )}
                  {isPending && (
                    <p className="text-sm text-muted-foreground/40">{stage.label}</p>
                  )}
                </div>
              </div>

              {isCompleted && detailText ? (
                <div className="mt-0.5 flex items-start gap-1.5 pl-[22px]">
                  <CornerDownRight
                    className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/45"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="text-xs leading-snug text-muted-foreground/85">{detailText}</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
