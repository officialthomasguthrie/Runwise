"use client";

import { cn } from "@/lib/utils";

export type AgentWorkspaceTab = "agent" | "chat";

interface AgentWorkspaceTabsProps {
  activeTab: AgentWorkspaceTab;
  onTabChange: (tab: AgentWorkspaceTab) => void;
}

/**
 * Two tab pills for agent workspace: Agent (activity, memory, settings) and Chat.
 */
export function AgentWorkspaceTabs({ activeTab, onTabChange }: AgentWorkspaceTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Agent workspace tabs"
      className="flex items-center gap-0.5 rounded-full bg-stone-100 dark:bg-white/[0.04] p-1 w-fit"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "agent"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTabChange("agent");
        }}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-full transition-colors",
          activeTab === "agent"
            ? "bg-white text-foreground shadow-sm dark:bg-white/10"
            : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/[0.05]"
        )}
      >
        Agent
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "chat"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTabChange("chat");
        }}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-full transition-colors",
          activeTab === "chat"
            ? "bg-white text-foreground shadow-sm dark:bg-white/10"
            : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/[0.05]"
        )}
      >
        Chat
      </button>
    </div>
  );
}
