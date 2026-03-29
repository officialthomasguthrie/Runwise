"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { ButtonColorful } from "@/components/ui/button-colorful";
import { AgentCard } from "@/components/ui/agent-card";
import type { AgentWithStats } from "@/lib/agents/types";

export default function AgentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [agents, setAgents] = useState<AgentWithStats[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Load agents
  useEffect(() => {
    if (!user) return;
    fetchAgents();
  }, [user]);

  async function fetchAgents() {
    setAgentsLoading(true);
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const json = await res.json();
        setAgents(json.agents ?? []);
      }
    } catch (e) {
      console.error("Failed to load agents:", e);
    } finally {
      setAgentsLoading(false);
    }
  }

  async function handlePause(id: string) {
    try {
      const res = await fetch(`/api/agents/${id}/pause`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setAgents((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: json.newStatus } : a))
        );
      }
    } catch (e) {
      console.error("Failed to toggle agent:", e);
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agents/${confirmDeleteId}`, { method: "DELETE" });
      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== confirmDeleteId));
      }
    } catch (e) {
      console.error("Failed to delete agent:", e);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  }

  if (!user) return null;

  return (
    <>
      <div className="flex h-screen w-screen bg-background">
        <CollapsibleSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <BlankHeader />
          <main className="flex h-full grow flex-col overflow-auto relative scrollbar-hide">
            <div className="relative pb-12">

              {/* Page header */}
              <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4 flex items-end justify-between gap-4 flex-wrap mt-7">
                <h1 className="text-4xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight">
                  Agents
                </h1>
                <ButtonColorful
                  label="Deploy New Agent"
                  onClick={() => router.push("/agents/new")}
                />
              </div>

              {/* Grid section */}
              <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
                <div className="mb-6 hidden md:block">
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">
                    Your Agents
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">
                    Autonomous AI assistants running on your behalf
                  </p>
                </div>

                {agentsLoading ? (
                  /* Loading skeleton — matches AgentCard layout */
                  <div className="w-full max-w-[1600px] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[148px] rounded-xl overflow-hidden flex flex-col px-5 py-4 gap-3 bg-stone-100 dark:bg-stone-800/50"
                      >
                        {/* Top: avatar + name + status + description */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#303030] animate-pulse flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-24 bg-gray-200 dark:bg-[#303030] rounded animate-pulse" />
                              <div className="h-4 w-14 bg-gray-200/80 dark:bg-[#303030]/80 rounded-md animate-pulse flex-shrink-0" />
                            </div>
                            <div className="h-3 w-full max-w-[160px] bg-gray-200/70 dark:bg-[#303030]/70 rounded animate-pulse" />
                          </div>
                        </div>
                        {/* Middle: metrics (Last run, Added) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <div className="h-3 w-3 rounded-full bg-gray-200 dark:bg-[#303030] animate-pulse flex-shrink-0" />
                            <div className="h-3 w-20 bg-gray-200 dark:bg-[#303030] rounded animate-pulse" />
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-3 w-3 rounded-full bg-gray-200 dark:bg-[#303030] animate-pulse flex-shrink-0" />
                            <div className="h-3 w-16 bg-gray-200 dark:bg-[#303030] rounded animate-pulse" />
                          </div>
                        </div>
                        {/* Bottom: pause/resume left, arrow right */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 bg-gray-200 dark:bg-[#303030] rounded animate-pulse" />
                            <div className="h-3 w-12 bg-gray-200 dark:bg-[#303030] rounded animate-pulse" />
                          </div>
                          <div className="h-4 w-4 bg-gray-200 dark:bg-[#303030] rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : agents.length > 0 ? (
                  /* Agent grid */
                  <div className="w-full max-w-[1600px] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {agents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        onPause={handlePause}
                        onDelete={(id) => setConfirmDeleteId(id)}
                      />
                    ))}
                  </div>
                ) : (
                  /* Empty state — modern SaaS with subtle liquid glass */
                  <div className="w-full max-w-[1600px]">
                    <div
                      onClick={() => router.push("/agents/new")}
                      className="cursor-pointer group rounded-xl overflow-hidden flex flex-col justify-center min-h-[200px] px-8 py-10 border border-stone-300/60 dark:border-white/10 bg-stone-200/40 dark:bg-white/[0.04] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all duration-200 hover:bg-stone-200/55 dark:hover:bg-white/[0.06]"
                    >
                      <div className="flex flex-col items-center text-center max-w-md mx-auto">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-stone-300/40 dark:bg-white/10 backdrop-blur-sm">
                          <Bot className="w-7 h-7 text-stone-500 dark:text-stone-400" />
                        </div>
                        <h3 className="font-semibold text-foreground text-lg md:text-xl mb-1.5">
                          No agents yet
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Deploy your first agent in 30 seconds — just describe what you want it to do
                        </p>
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-300 group-hover:text-foreground transition-colors">
                          <Plus className="w-4 h-4" />
                          Deploy an agent
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

            </div>
          </main>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-md border border-stone-200 dark:border-white/10 bg-background p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-foreground">Delete agent?</h3>
              <button
                aria-label="Close"
                onClick={() => setConfirmDeleteId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete the agent, all its memories, and its activity history. This cannot be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="inline-flex items-center rounded-md border border-stone-200 dark:border-white/10 bg-background px-3 py-1.5 text-sm text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center rounded-md border border-red-600/30 bg-red-600/10 px-3 py-1.5 text-sm text-red-500 hover:bg-red-600/20 disabled:opacity-70"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
