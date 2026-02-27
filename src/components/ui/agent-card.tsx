"use client";

import { useRouter } from "next/navigation";
import { Bot, Play, Pause, Trash2, ArrowRight, Zap, Clock } from "lucide-react";
import { GridCard } from "@/components/ui/grid-card";
import { cn } from "@/lib/utils";
import type { AgentWithStats } from "@/lib/agents/types";

interface AgentCardProps {
  agent: AgentWithStats;
  onPause: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export function AgentCard({ agent, onPause, onDelete }: AgentCardProps) {
  const router = useRouter();

  const statusConfig: Record<string, { label: string; dot: string }> = {
    active:    { label: "Active",    dot: "bg-emerald-400" },
    paused:    { label: "Paused",    dot: "bg-amber-400" },
    deploying: { label: "Deploying", dot: "bg-blue-400 animate-pulse" },
    error:     { label: "Error",     dot: "bg-red-400" },
  };

  const status = statusConfig[agent.status] ?? { label: agent.status, dot: "bg-zinc-400" };

  return (
    <div className="group relative">
      {/* Delete button — appears on hover */}
      <button
        aria-label="Delete agent"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(agent.id);
        }}
        className="absolute right-2 top-2 z-20 inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-white/10 bg-background/80 p-1 text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <GridCard
        className="cursor-pointer transition-colors hover:border-pink-400/50 min-h-[140px]"
        onClick={() => router.push(`/agents/${agent.id}`)}
      >
        <div className="relative z-10 flex flex-col h-full gap-3">
          {/* Top row: avatar + name + status */}
          <div className="flex items-start gap-3">
            {/* Emoji avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl leading-none">
              {agent.avatar_emoji || "🤖"}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground truncate text-sm">
                  {agent.name}
                </span>
                {/* Status badge */}
                <span className="inline-flex items-center gap-1.5 flex-shrink-0">
                  <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                  <span className="text-xs text-muted-foreground">{status.label}</span>
                </span>
              </div>

              {/* Description */}
              {agent.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {agent.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {agent.activity_count ?? 0} actions
            </span>
            {agent.last_activity_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {relativeTime(agent.last_activity_at)}
              </span>
            )}
          </div>

          {/* Bottom row: actions + arrow */}
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPause(agent.id);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-stone-200 dark:border-white/10 bg-background/80 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
            >
              {agent.status === "active" ? (
                <><Pause className="h-3 w-3" /> Pause</>
              ) : (
                <><Play className="h-3 w-3" /> Resume</>
              )}
            </button>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </GridCard>
    </div>
  );
}

// ── Utility ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
