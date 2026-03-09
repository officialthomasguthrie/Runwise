"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Loader2,
  Trash2,
  Zap,
  Check,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AgentActivityFeed } from "@/components/ui/agent-activity-feed";
import { AgentMemoryPanel } from "@/components/ui/agent-memory-panel";
import { AgentWorkspaceTabs } from "@/components/ui/agent-workspace-tabs";
import { AgentWorkspaceChat } from "@/components/ui/agent-workspace-chat";
import { AgentPlaceholder } from "@/components/ui/agent-chat";
import { cn } from "@/lib/utils";
import type { Agent, AgentMemory } from "@/lib/agents/types";

interface AgentDetail extends Agent {
  behaviours: unknown[];
  memory_count: number;
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { dot: string; label: string }> = {
    active: { dot: "bg-emerald-400", label: "Active" },
    paused: { dot: "bg-amber-400", label: "Paused" },
    deploying: { dot: "bg-blue-400 animate-pulse", label: "Deploying" },
    error: { dot: "bg-red-400", label: "Error" },
  };
  const c = cfg[status] ?? { dot: "bg-zinc-400", label: status };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-white/[0.02] transition-colors"
      >
        {title}
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t border-white/5 px-4 py-4">{children}</div>
      )}
    </div>
  );
}

function AgentSettings({
  agent,
  onUpdate,
  onDelete,
}: {
  agent: AgentDetail;
  onUpdate: (patch: Partial<Agent>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(agent.name);
  const [emoji, setEmoji] = useState(agent.avatar_emoji);
  const [instructions, setInstructions] = useState(agent.instructions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        avatar_emoji: emoji.trim() || "🤖",
        instructions,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to save");
      return;
    }
    onUpdate(json.agent);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-12 text-center text-2xl bg-white/5 border border-white/10 rounded-md py-1 focus:outline-none focus:ring-1 focus:ring-white/20"
          maxLength={4}
          aria-label="Emoji"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-transparent border border-white/10 rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20"
          placeholder="Agent name"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">
          Instructions
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
          placeholder="What should this agent do?"
        />
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] px-4 py-2 text-sm text-foreground transition-colors disabled:opacity-50 w-full"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <>
            <Check className="h-4 w-4 text-emerald-400" />
            Saved
          </>
        ) : (
          "Update Agent"
        )}
      </button>
      <div className="border-t border-white/5 pt-3">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete agent
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Are you sure?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-1"
            >
              {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface AgentWorkspaceEmbedProps {
  agentId: string;
  userId: string | null;
  onDelete?: () => void;
}

export function AgentWorkspaceEmbed({ agentId, userId, onDelete }: AgentWorkspaceEmbedProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [activityCount, setActivityCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [togglingPause, setTogglingPause] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"agent" | "chat">("agent");

  useEffect(() => {
    if (!agentId) return;
    loadAll();
  }, [agentId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [agentRes, memRes, actRes] = await Promise.all([
        fetch(`/api/agents/${agentId}`),
        fetch(`/api/agents/${agentId}/memory`),
        fetch(`/api/agents/${agentId}/activity?limit=1`),
      ]);

      if (agentRes.ok) {
        const json = await agentRes.json();
        setAgent(json.agent);
      } else {
        setAgent(null);
        return;
      }

      if (memRes.ok) {
        const json = await memRes.json();
        setMemories(json.memories ?? []);
      }

      if (actRes.ok) {
        const json = await actRes.json();
        setActivityCount(json.activity?.length ?? 0);
      }
    } catch (e) {
      console.error("Failed to load agent:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePause() {
    if (!agent) return;
    setTogglingPause(true);
    const res = await fetch(`/api/agents/${agent.id}/pause`, { method: "POST" });
    if (res.ok) {
      const json = await res.json();
      setAgent((prev) => (prev ? { ...prev, status: json.newStatus } : prev));
    }
    setTogglingPause(false);
  }

  function handleUpdate(patch: Partial<Agent>) {
    setAgent((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function handleDelete() {
    onDelete?.();
    router.push("/agents");
  }

  if (loading) return <AgentPlaceholder />;
  if (!agent) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Could not load agent.
      </div>
    );
  }

  const isActive = agent.status === "active";

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      {/* Embedded header: agent identity + workspace tabs */}
      <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
              {agent.avatar_emoji || "🤖"}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
                {agent.name}
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <StatusBadge status={agent.status} />
                {activityCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    {activityCount} run{activityCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <AgentWorkspaceTabs activeTab={workspaceTab} onTabChange={setWorkspaceTab} />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(`/agents/new?agentId=${agentId}`, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Open in new tab
            </button>
          </div>
          <button
            onClick={handleTogglePause}
            disabled={togglingPause}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] px-4 py-2 text-sm text-foreground transition-colors disabled:opacity-50"
          >
            {togglingPause ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isActive ? (
              <>
                <Pause className="h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Resume
              </>
            )}
          </button>
        </div>
      </div>

      {workspaceTab === "chat" ? (
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <AgentWorkspaceChat
            agentId={agentId}
            userId={userId}
            agentName={agent.name}
            className="h-full"
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex-[3] min-w-0 overflow-y-auto scrollbar-hide border-r border-white/5 px-4 sm:px-6 lg:px-8 py-6">
            <AgentActivityFeed agentId={agentId} isActive={isActive} />
          </div>
          <div className="flex-[2] min-w-0 overflow-y-auto scrollbar-hide px-4 sm:px-6 py-6 flex flex-col gap-6">
            <CollapsibleSection title="Memory" defaultOpen>
              <AgentMemoryPanel agentId={agentId} initialMemories={memories} />
            </CollapsibleSection>
            <CollapsibleSection title="Settings" defaultOpen={false}>
              <AgentSettings agent={agent} onUpdate={handleUpdate} onDelete={handleDelete} />
            </CollapsibleSection>
          </div>
        </div>
      )}
    </div>
  );
}
