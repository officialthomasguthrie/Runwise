"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentActivity } from "@/lib/agents/types";

// ── Tool display metadata ────────────────────────────────────────────────────

const TOOL_META: Record<string, { icon: string; label: string }> = {
  send_email_gmail:        { icon: "✉️", label: "Sent email" },
  read_emails:             { icon: "📧", label: "Read emails" },
  send_slack_message:      { icon: "💬", label: "Sent Slack message" },
  send_discord_message:    { icon: "💬", label: "Sent Discord message" },
  create_notion_page:      { icon: "📝", label: "Created Notion page" },
  update_google_sheet:     { icon: "📊", label: "Updated Google Sheet" },
  search_google_sheet:     { icon: "🔍", label: "Searched Google Sheet" },
  create_calendar_event:   { icon: "📅", label: "Created calendar event" },
  http_request:            { icon: "🌐", label: "Made HTTP request" },
  remember:                { icon: "🧠", label: "Remembered something" },
  recall:                  { icon: "🔍", label: "Recalled memory" },
  send_notification_to_user:{ icon: "🔔", label: "Sent you a notification" },
  do_nothing:              { icon: "💤", label: "Decided to wait" },
};

function toolMeta(name: string) {
  return TOOL_META[name] ?? { icon: "⚡", label: name.replace(/_/g, " ") };
}

// ── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

// ── Action row ───────────────────────────────────────────────────────────────

function ActionRow({ tool, params }: { tool: string; params: Record<string, any> }) {
  const { icon, label } = toolMeta(tool);

  // Build a brief detail string from params
  let detail = "";
  if (params.to || params.subject) detail = params.subject ?? params.to ?? "";
  else if (params.message) detail = (params.message as string).slice(0, 60);
  else if (params.content) detail = (params.content as string).slice(0, 60);
  else if (params.query) detail = params.query as string;

  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <span className="flex-shrink-0 mt-0.5 text-sm leading-none">{icon}</span>
      <span>
        {label}
        {detail && (
          <span className="text-muted-foreground/60 ml-1 italic">
            "{detail}{detail.length >= 60 ? "…" : ""}"
          </span>
        )}
      </span>
    </div>
  );
}

// ── Activity entry ────────────────────────────────────────────────────────────

function ActivityEntry({ entry }: { entry: AgentActivity }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    success: "text-emerald-400",
    error:   "text-red-400",
    skipped: "text-amber-400",
  };

  const hasActions =
    (entry.actions_taken?.length ?? 0) > 0 ||
    (entry.memories_created?.length ?? 0) > 0;

  return (
    <div className="border border-white/5 rounded-md bg-white/[0.02] px-4 py-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Expand toggle */}
        <button
          onClick={() => hasActions && setExpanded((v) => !v)}
          className={cn(
            "mt-0.5 flex-shrink-0 transition-colors",
            hasActions
              ? "text-muted-foreground hover:text-foreground cursor-pointer"
              : "text-muted-foreground/30 cursor-default"
          )}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {/* Trigger summary */}
          <p className="text-sm text-foreground leading-snug">
            {entry.trigger_summary ?? "Agent ran"}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/60">
            <span>{relativeTime(entry.created_at)}</span>
            {entry.tokens_used != null && (
              <span>{entry.tokens_used.toLocaleString()} tokens</span>
            )}
            <span
              className={cn(
                "font-medium",
                statusColors[entry.status] ?? "text-muted-foreground"
              )}
            >
              {entry.status}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded: actions taken */}
      {expanded && hasActions && (
        <div className="mt-3 ml-6 flex flex-col gap-1.5 border-l border-white/5 pl-3">
          {(entry.actions_taken ?? []).map((action, i) => (
            <ActionRow key={i} tool={action.tool} params={action.params ?? {}} />
          ))}

          {(entry.memories_created ?? []).map((mem, i) => (
            <div
              key={`mem-${i}`}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <span className="flex-shrink-0 mt-0.5 text-sm leading-none">🧠</span>
              <span>
                Remembered:{" "}
                <span className="italic text-muted-foreground/70">
                  "{(mem as string).slice(0, 80)}{(mem as string).length > 80 ? "…" : ""}"
                </span>
              </span>
            </div>
          ))}

          {entry.status === "error" && entry.error_message && (
            <div className="flex items-start gap-2 text-xs text-red-400">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>{entry.error_message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════

interface AgentActivityFeedProps {
  agentId: string;
  isActive: boolean;
}

export function AgentActivityFeed({ agentId, isActive }: AgentActivityFeedProps) {
  const [activity, setActivity] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/activity?limit=50`);
      if (res.ok) {
        const json = await res.json();
        setActivity(json.activity ?? []);
      }
    } catch (e) {
      console.error("Failed to load activity:", e);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchActivity();
    intervalRef.current = setInterval(fetchActivity, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActivity]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Panel header */}
      <div className="flex items-center gap-2">
        {/* Live indicator */}
        <span className="relative flex h-2 w-2">
          {isActive ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500" />
          )}
        </span>
        <h2 className="text-sm font-medium text-foreground">
          Activity
        </h2>
        <span className="text-xs text-muted-foreground/50 ml-auto">
          Updates every 30s
        </span>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 scrollbar-hide">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-md border border-white/5 bg-white/[0.02] animate-pulse"
            />
          ))
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <span className="text-4xl opacity-30">👁</span>
            <p className="text-sm text-muted-foreground">
              Your agent hasn't done anything yet.
            </p>
            <p className="text-xs text-muted-foreground/50">It's watching…</p>
          </div>
        ) : (
          activity.map((entry) => (
            <ActivityEntry key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}
