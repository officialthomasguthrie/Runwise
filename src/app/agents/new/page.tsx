"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BotMessageSquare, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { cn } from "@/lib/utils";
import { AgentChatBuilder, AgentPlaceholder, BuilderTabs, type BuilderTab } from "@/components/ui/agent-chat";
import { AgentTabContent } from "@/components/ui/agent-tab-content";
import { AgentWorkspaceChat } from "@/components/ui/agent-workspace-chat";

function NewAgentPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editAgentId = searchParams.get("agentId");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BuilderTab>("builder");
  const [agentChatSidebarOpen, setAgentChatSidebarOpen] = useState(false);
  const [agentChatTitle, setAgentChatTitle] = useState("Agent");

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
  }, [agentId]);

  if (!user) return null;

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
                onAgentMeta={({ name }) => setAgentChatTitle(name)}
              />
            ) : (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <AgentPlaceholder />
              </div>
            )}
          </div>
        </div>

        {/* Agent AI chat — full-height fixed sidebar below app header (covers builder/agent tab bar); main column scrolls independently */}
        {activeTab === "agent" && agentId && agentChatSidebarOpen && (
          <div
            className={cn(
              "fixed z-40 flex flex-col bg-background/98 backdrop-blur-md shadow-xl",
              "border-stone-200/90 dark:border-white/10",
              "top-16 bottom-0 left-0 right-0 w-full max-md:border-t",
              "md:left-auto md:right-0 md:w-[340px] md:border-l md:border-t-0"
            )}
          >
            <header className="flex h-11 flex-shrink-0 items-center justify-between gap-2 border-b border-stone-200/70 dark:border-white/10 px-3 bg-stone-50/90 dark:bg-stone-900/50">
              <div className="flex min-w-0 items-center gap-2">
                <BotMessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium text-foreground">{agentChatTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setAgentChatSidebarOpen(false)}
                className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-stone-200/70 hover:text-foreground dark:hover:bg-white/10"
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
