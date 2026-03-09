"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Loader2,
  Trash2,
  Zap,
  Check,
  Webhook,
  Timer,
  Target,
  Settings2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { AgentActivityFeed } from "@/components/ui/agent-activity-feed";
import { AgentMemoryPanel } from "@/components/ui/agent-memory-panel";
import { AgentWorkspaceTabs } from "@/components/ui/agent-workspace-tabs";
import { AgentWorkspaceChat } from "@/components/ui/agent-workspace-chat";
import { cn } from "@/lib/utils";
import type { Agent, AgentBehaviour, AgentMemory } from "@/lib/agents/types";
import { planFromBehaviours, buildIntegrationCheckListForPolling } from "@/lib/agents/chat-pipeline";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentDetail extends Agent {
  behaviours: AgentBehaviour[];
  memory_count: number;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { dot: string; label: string }> = {
    active:    { dot: "bg-emerald-400",              label: "Active"    },
    paused:    { dot: "bg-amber-400",                label: "Paused"    },
    deploying: { dot: "bg-blue-400 animate-pulse",   label: "Deploying" },
    error:     { dot: "bg-red-400",                  label: "Error"     },
    pending_integrations: { dot: "bg-amber-400",     label: "Pending integrations" },
  };
  const c = cfg[status] ?? { dot: "bg-zinc-400", label: status };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

// ── Collapsible section wrapper ───────────────────────────────────────────────

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

// ═════════════════════════════════════════════════════════════════════════════
// Agent Settings section
// ═════════════════════════════════════════════════════════════════════════════

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
      {/* Name + emoji */}
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

      {/* Instructions */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Instructions
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={6}
          className="w-full bg-white/[0.02] border border-white/10 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
          placeholder="How should this agent behave and respond?"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Save */}
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

      {/* Danger zone */}
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

// ═════════════════════════════════════════════════════════════════════════════
// Page
// ═════════════════════════════════════════════════════════════════════════════

export default function AgentDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [activityCount, setActivityCount] = useState<number>(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [togglingPause, setTogglingPause] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [connectedServices, setConnectedServices] = useState<string[]>([]);
  const [workspaceTab, setWorkspaceTab] = useState<"agent" | "chat">("agent");

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Initial data load
  useEffect(() => {
    if (!user || !agentId) return;
    loadAll();
  }, [user, agentId]);

  // Poll integrations when agent is pending_integrations
  useEffect(() => {
    if (!agent || agent.status !== "pending_integrations") return;
    const poll = async () => {
      try {
        const res = await fetch("/api/integrations/status", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        const services: string[] = (json.integrations ?? [])
          .filter((x: { service: string; connected?: boolean }) => x.service && x.connected !== false)
          .map((x: { service: string }) => x.service);
        setConnectedServices(services);
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [agent?.id, agent?.status]);

  async function loadAll() {
    setPageLoading(true);
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
        router.push("/agents");
        return;
      }

      if (memRes.ok) {
        const json = await memRes.json();
        setMemories(json.memories ?? []);
      }

      if (actRes.ok) {
        const json = await actRes.json();
        // Use header count from activity endpoint
        setActivityCount(json.activity?.length ?? 0);
      }
    } catch (e) {
      console.error("Failed to load agent:", e);
    } finally {
      setPageLoading(false);
    }
  }

  async function handleTogglePause() {
    if (!agent) return;
    setTogglingPause(true);
    setPauseError(null);
    const res = await fetch(`/api/agents/${agent.id}/pause`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAgent((prev) =>
        prev ? { ...prev, status: data.newStatus } : prev
      );
    } else {
      setPauseError(data.error ?? "Failed to resume");
    }
    setTogglingPause(false);
  }

  async function handleActivate() {
    if (!agent || agent.status !== "pending_integrations") return;
    setActivateLoading(true);
    setActivateError(null);
    const res = await fetch(`/api/agents/${agent.id}/activate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.agent) {
      setAgent((prev) => (prev ? { ...prev, ...data.agent } : prev));
    } else if (!res.ok) {
      setActivateError(data.error ?? "Failed to activate");
    }
    setActivateLoading(false);
  }

  function handleUpdate(patch: Partial<Agent>) {
    setAgent((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function handleDelete() {
    router.push("/agents");
  }

  if (!user) return null;

  if (pageLoading) {
    return (
      <div className="flex h-screen w-screen bg-background">
        <CollapsibleSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <BlankHeader />
          <main className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </main>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  const isActive = agent.status === "active";

  return (
    <div className="flex h-screen w-screen bg-background">
      <CollapsibleSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <BlankHeader />

        <main className="relative flex flex-1 flex-col overflow-hidden">
          {/* ── Page header: sticky on top, chat scrolls behind ───────────── */}
          <div className="sticky top-0 z-10 flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-white/5 bg-background">
            {/* Back link */}
            <button
              onClick={() => router.push("/agents")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              All agents
            </button>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              {/* Agent identity + workspace tabs */}
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
                <AgentWorkspaceTabs
                  activeTab={workspaceTab}
                  onTabChange={setWorkspaceTab}
                />
              </div>

              {/* Activate (when pending_integrations) or Pause / Resume */}
              {agent.status === "pending_integrations" ? (
                <button
                  onClick={handleActivate}
                  disabled={activateLoading}
                  className="inline-flex items-center gap-2 rounded-md border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 px-4 py-2 text-sm text-foreground transition-colors disabled:opacity-50"
                >
                  {activateLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> Activate
                    </>
                  )}
                </button>
              ) : (
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
              )}
            </div>
            {(pauseError || activateError) && (
              <p className="mt-2 text-xs text-red-400" role="alert">
                {pauseError ?? activateError}
              </p>
            )}
            {/* Integration gate when pending_integrations */}
            {agent.status === "pending_integrations" && (() => {
              const plan = planFromBehaviours((agent.behaviours ?? []) as Array<{ behaviour_type: string; trigger_type?: string | null; config?: Record<string, unknown>; description?: string }>);
              const requiredIntegrations = buildIntegrationCheckListForPolling(plan, connectedServices);
              const disconnected = requiredIntegrations.filter((i) => !i.connected);
              if (disconnected.length === 0) return null;
              const origin = typeof window !== "undefined" ? window.location.origin : "";
              return (
                <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                  <p className="text-sm font-medium text-amber-200 mb-3">
                    Connect these integrations to activate your agent:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {disconnected.map((item) => (
                      <button
                        key={item.service}
                        type="button"
                        onClick={() => {
                          let url = item.connectUrl.startsWith("http") ? item.connectUrl : `${origin}${item.connectUrl}`;
                          const returnUrl = `${origin}/integrations/oauth-return?service=${encodeURIComponent(item.service)}`;
                          if (item.connectionMethod === "oauth") {
                            const sep = url.includes("?") ? "&" : "?";
                            url += `${sep}returnUrl=${encodeURIComponent(returnUrl)}${agentId ? `&agent_id=${encodeURIComponent(agentId)}` : ""}`;
                            window.location.href = url;
                          } else {
                            const sep = url.includes("?") ? "&" : "?";
                            url += `${sep}returnUrl=${encodeURIComponent(returnUrl)}`;
                            window.open(url, "ConnectIntegration", "width=600,height=700");
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-amber-500/40 bg-white/5 text-amber-100 hover:bg-amber-500/10 transition-colors"
                      >
                        <span className="text-base">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── Main content: Agent tab or Chat tab ───────────────────────── */}
          {workspaceTab === "chat" ? (
            <div className="absolute inset-0 z-0 flex flex-col overflow-hidden">
              <AgentWorkspaceChat
                agentId={agentId}
                userId={user?.id ?? null}
                agentName={agent.name}
                className="flex-1 min-w-0 min-h-0"
              />
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Activity feed (60%) */}
                <div className="flex-[3] min-w-0 overflow-y-auto scrollbar-hide border-r border-white/5 px-4 sm:px-6 lg:px-8 py-6">
                  <AgentActivityFeed
                    agentId={agentId}
                    isActive={isActive}
                  />
                </div>

                {/* Right: Triggers + Memory + Settings (40%) */}
                <div className="flex-[2] min-w-0 overflow-y-auto scrollbar-hide px-4 sm:px-6 py-6 flex flex-col gap-6">
                  {/* Triggers */}
                  <CollapsibleSection title="Triggers" defaultOpen>
                    <div className="space-y-2">
                      {(agent.behaviours?.length ?? 0) > 0 ? (
                        (agent.behaviours as AgentBehaviour[]).map((b) => {
                          const label =
                            (b as { description?: string }).description?.trim() ||
                            (b.behaviour_type === "webhook"
                              ? `Webhook: /${(b.config as { path?: string })?.path ?? "..."}`
                              : b.behaviour_type === "schedule"
                                ? `Schedule: ${(b.config as { frequency?: string })?.frequency ?? "cron"}`
                                : b.trigger_type
                                  ? b.trigger_type.replace(/-/g, " ")
                                  : b.behaviour_type);
                          const Icon =
                            b.behaviour_type === "webhook"
                              ? Webhook
                              : b.behaviour_type === "schedule"
                                ? Timer
                                : Target;
                          return (
                            <div
                              key={b.id}
                              className="flex items-center gap-2 rounded-md bg-white/[0.03] border border-white/10 px-3 py-2"
                            >
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/5">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <span className="text-sm font-medium text-foreground truncate">{label}</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">This agent runs manually. No triggers configured.</p>
                      )}
                      <a
                        href={`/agents/new?agentId=${agent.id}`}
                        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Manage triggers
                      </a>
                    </div>
                  </CollapsibleSection>

                  {/* Memory */}
                  <CollapsibleSection title="Memory" defaultOpen>
                    <AgentMemoryPanel
                      agentId={agentId}
                      initialMemories={memories}
                    />
                  </CollapsibleSection>

                  {/* Settings */}
                  <CollapsibleSection title="Settings" defaultOpen={false}>
                    <AgentSettings
                      agent={agent}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  </CollapsibleSection>
                </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
