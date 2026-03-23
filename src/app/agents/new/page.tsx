"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, User, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { cn } from "@/lib/utils";
import { AgentChatBuilder, AgentPlaceholder, BuilderTabs, type BuilderTab } from "@/components/ui/agent-chat";
import { AgentTabContent } from "@/components/ui/agent-tab-content";
import { AgentWorkspaceChat } from "@/components/ui/agent-workspace-chat";
import { getAgentAvatarUrl } from "@/lib/agents/avatar";

const SIDEBAR_STATUS_BADGE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  active: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Active",
  },
  paused: {
    bg: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    label: "Paused",
  },
  deploying: {
    bg: "bg-sky-500/15",
    text: "text-sky-600 dark:text-sky-400",
    label: "Deploying",
  },
  error: {
    bg: "bg-rose-500/15",
    text: "text-rose-600 dark:text-rose-400",
    label: "Error",
  },
  pending_integrations: {
    bg: "bg-violet-500/15",
    text: "text-violet-600 dark:text-violet-400",
    label: "Pending integrations",
  },
};

function NewAgentPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editAgentId = searchParams.get("agentId");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BuilderTab>("builder");
  const [agentChatSidebarOpen, setAgentChatSidebarOpen] = useState(false);
  const [agentChatTitle, setAgentChatTitle] = useState("Agent");
  const [agentChatAvatarUrl, setAgentChatAvatarUrl] = useState<string | null>(null);
  const [agentChatStatus, setAgentChatStatus] = useState<string | null>(null);
  const [agentChatLastPreview, setAgentChatLastPreview] = useState<string | null>(null);

  // When ?agentId= is present, load that agent and show agent tab (for editing triggers/config)
  useEffect(() => {
    if (editAgentId && editAgentId !== "new") {
      setAgentId(editAgentId);
      setActiveTab("agent");
    }
  }, [editAgentId]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (activeTab !== "agent") setAgentChatSidebarOpen(false);
  }, [activeTab]);

  useEffect(() => {
    setAgentChatTitle("Agent");
    setAgentChatAvatarUrl(null);
    setAgentChatStatus(null);
    setAgentChatLastPreview(null);
  }, [agentId]);

  const handleAgentChatPreviewChange = useCallback((preview: string | null) => {
    setAgentChatLastPreview(preview);
  }, []);

  if (!user) return null;

  const agentChatHeaderAvatarSrc =
    agentId != null ? agentChatAvatarUrl ?? getAgentAvatarUrl(agentId) : "";

  const sidebarStatus =
    agentChatStatus != null
      ? (SIDEBAR_STATUS_BADGE[agentChatStatus] ?? SIDEBAR_STATUS_BADGE.paused)
      : null;

  return (
    <div className="flex h-screen w-screen bg-background">
      <CollapsibleSidebar />

      <div className="relative flex flex-1 flex-col overflow-hidden min-h-0">
        <BlankHeader />

        {/* Page header: fixed bar — scrolling content goes behind and is cut off */}
        <div className="absolute top-16 left-0 right-0 z-20 flex h-16 flex-shrink-0 flex-row items-center justify-between gap-4 border-b border-stone-200 dark:border-white/10 bg-background px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => router.push("/agents")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to agents
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
            <BuilderTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              agentId={agentId}
            />
          </div>

          <div className="w-[120px] shrink-0" aria-hidden />
        </div>

        {/* Both panels always mounted — hide builder instantly when switching away to avoid visible fade of completion card */}
        <div
          className={cn(
            "absolute inset-0 z-0 flex flex-col overflow-hidden",
            activeTab !== "builder"
              ? "invisible opacity-0 pointer-events-none transition-none"
              : "transition-opacity duration-150"
          )}
          aria-hidden={activeTab !== "builder"}
        >
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 sm:px-6 lg:px-8 pb-2">
            <Suspense fallback={
              <div className="h-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-h-[140px] rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] px-5 py-4 animate-pulse"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#303030] flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#303030] rounded-md" />
                        <div className="h-3 w-full bg-gray-200 dark:bg-[#303030] rounded-md" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <div className="h-3 w-20 bg-gray-200 dark:bg-[#303030] rounded-md" />
                      <div className="h-3 w-16 bg-gray-200 dark:bg-[#303030] rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            }>
              <AgentChatBuilder
                userId={user?.id ?? null}
                onComplete={setAgentId}
                onViewAgent={() => setActiveTab("agent")}
                scrollTopOffset="9rem"
              />
            </Suspense>
          </div>
        </div>

        {/* Agent panel fades in when switching to it */}
        <div
          className={cn(
            "absolute inset-0 z-0 flex flex-col overflow-hidden",
            activeTab !== "agent"
              ? "invisible opacity-0 pointer-events-none transition-none"
              : "transition-opacity duration-150"
          )}
          aria-hidden={activeTab !== "agent"}
        >
          <div
            className={cn(
              "flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col pt-[9rem] px-4 sm:px-6 lg:px-8 transition-[margin-right] duration-300 ease-out",
              activeTab === "agent" && agentChatSidebarOpen && "md:mr-[340px]"
            )}
          >
            {agentId ? (
              <AgentTabContent
                agentId={agentId}
                onDeleted={() => router.push("/agents")}
                agentChatSidebarOpen={agentChatSidebarOpen}
                onAgentChatSidebarOpenChange={setAgentChatSidebarOpen}
                onAgentMeta={({ name, avatarUrl, status }) => {
                  setAgentChatTitle(name);
                  setAgentChatAvatarUrl(avatarUrl);
                  setAgentChatStatus(status);
                }}
              />
            ) : (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <AgentPlaceholder />
              </div>
            )}
          </div>
        </div>

        {/* Agent AI chat — from below app header (top-16), overlays Builder/Agent tab bar */}
        {activeTab === "agent" && agentId && agentChatSidebarOpen && (
          <div
            className={cn(
              "absolute z-30 flex flex-col bg-background dark:bg-[#191817] shadow-xl",
              "border-stone-200 dark:border-white/10",
              "top-16 bottom-0 left-0 right-0 w-full max-md:border-t",
              "md:left-auto md:right-0 md:w-[340px] md:border-l md:border-t-0"
            )}
          >
            <header className="flex flex-shrink-0 items-start justify-between gap-2 py-2 pl-3 pr-2 bg-stone-100 dark:bg-stone-700/40">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <div className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-stone-200/80 dark:border-stone-600/50 bg-white dark:bg-stone-900/80">
                  <img
                    src={agentChatHeaderAvatarSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                  <div className="hidden absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <User className="h-4 w-4" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {agentChatTitle}
                    </span>
                    {sidebarStatus && (
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-medium leading-none",
                          sidebarStatus.bg,
                          sidebarStatus.text
                        )}
                      >
                        {sidebarStatus.label}
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground"
                    title={agentChatLastPreview ?? undefined}
                  >
                    {agentChatLastPreview ?? "No messages yet"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAgentChatSidebarOpen(false)}
                className="flex-shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <AgentWorkspaceChat
              agentId={agentId}
              userId={user.id}
              agentName={agentChatTitle}
              className="min-h-0 flex-1"
              compact
              onConversationPreviewChange={handleAgentChatPreviewChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewAgentPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen bg-background items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    }>
      <NewAgentPageContent />
    </Suspense>
  );
}
