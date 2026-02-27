"use client";

import { Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuildStage, BuildStageStatus } from "@/lib/agents/chat-pipeline";

interface BuildProgressCardProps {
  stages: BuildStage[];
}

function StageIcon({ status }: { status: BuildStageStatus }) {
  if (status === "pending") {
    return (
      <span className="w-5 h-5 rounded-full border-2 border-white/20 flex items-center justify-center flex-shrink-0 text-white/30" />
    );
  }
  if (status === "running") {
    return (
      <Loader2 className="w-5 h-5 flex-shrink-0 text-pink-400 animate-spin" />
    );
  }
  if (status === "done") {
    return (
      <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="w-5 h-5 rounded-full bg-red-400 flex items-center justify-center flex-shrink-0">
        <X className="w-3 h-3 text-white" strokeWidth={3} />
      </span>
    );
  }
  return null;
}

export function BuildProgressCard({ stages }: BuildProgressCardProps) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Building your agent
        </h3>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        {stages.map((stage, i) => (
          <div
            key={`${stage.label}-${i}`}
            className={cn(
              "flex items-center gap-3 text-sm animate-in fade-in slide-in-from-left-2 duration-200",
              stage.status === "pending" && "text-muted-foreground/60",
              stage.status === "running" && "text-foreground",
              stage.status === "done" && "text-muted-foreground",
              stage.status === "error" && "text-red-400"
            )}
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
          >
            <StageIcon status={stage.status} />
            <span>{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
