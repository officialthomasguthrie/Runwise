"use client";

import { useRouter } from "next/navigation";
import { Play, Pause, Trash2, ArrowRight, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentWithStats } from "@/lib/agents/types";
import { getAgentAvatarUrl } from "@/lib/agents/avatar";

interface AgentCardProps {
  agent: AgentWithStats;
  onPause: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export function AgentCard({ agent, onPause, onDelete }: AgentCardProps) {
  const router = useRouter();

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    active:    { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", label: "Active" },
    paused:    { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", label: "Paused" },
    deploying: { bg: "bg-sky-500/15", text: "text-sky-600 dark:text-sky-400", label: "Deploying" },
    error:     { bg: "bg-rose-500/15", text: "text-rose-600 dark:text-rose-400", label: "Error" },
  };
  const status = statusConfig[agent.status] ?? { bg: "bg-zinc-500/15", text: "text-zinc-600 dark:text-zinc-400", label: agent.status };

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
        className="absolute right-2 top-2 z-20 inline-flex items-center justify-center p-1 text-red-500 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div
        className={cn(
          "cursor-pointer h-[148px] relative flex flex-col overflow-hidden rounded-xl",
          "bg-stone-200/50 dark:bg-white/5 backdrop-blur-xl border border-stone-300/60 dark:border-white/10",
          "shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]",
          "transition-colors duration-150 hover:bg-stone-200/60 dark:hover:bg-white/[0.07]",
          "px-5 py-4"
        )}
        onClick={() => router.push(`/agents/${agent.id}`)}
      >
        <div className="relative z-10 flex flex-col h-full gap-3 min-h-0">
          {/* Top row: avatar + name + status */}
          <div className="flex items-start gap-3 min-h-0">
            {/* Profile image (same as agent tab) */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/5">
              <img
                src={agent.avatar_image ?? getAgentAvatarUrl(agent.id)}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-foreground truncate text-sm">
                  {agent.name}
                </span>
                {/* Status badge — same design as agent tab (pill with colored bg) */}
                <span
                  className={cn(
                    "inline-flex items-center flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap",
                    status.bg,
                    status.text
                  )}
                >
                  {status.label}
                </span>
              </div>

              {/* Description — always one line with ellipsis */}
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {agent.description ?? ""}
              </p>
            </div>
          </div>

          {/* Middle: activity + created — fills space, always visible */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 flex-shrink-0" />
              {agent.last_activity_at
                ? `Last run ${relativeTime(agent.last_activity_at)}`
                : "No runs yet"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              Added {relativeTime(agent.created_at)}
            </span>
          </div>

          {/* Bottom row: pause/resume (left-aligned with content) + arrow (right) — same gap as above */}
          <div className="flex items-center justify-between w-full">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPause(agent.id);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {agent.status === "active" ? (
                <><Pause className="h-3 w-3" /> Pause</>
              ) : (
                <><Play className="h-3 w-3" /> Resume</>
              )}
            </button>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        </div>
      </div>
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
