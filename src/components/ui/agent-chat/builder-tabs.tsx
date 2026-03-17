"use client";

import { cn } from "@/lib/utils";

export type BuilderTab = "builder" | "agent";

interface BuilderTabsProps {
  activeTab: BuilderTab;
  onTabChange?: (tab: BuilderTab) => void;
  agentId: string | null;
}

/**
 * Two tab pills: Builder and Agent.
 * Both switch tab content in-place — never navigates away.
 * When agentId is null, Agent tab shows placeholder; when set, shows embedded agent workspace.
 */
export function BuilderTabs({ activeTab, onTabChange, agentId: _agentId }: BuilderTabsProps) {
  const handleAgentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTabChange?.("agent");
  };
  const handleBuilderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTabChange?.("builder");
  };

  return (
    <div
      role="tablist"
      aria-label="Builder tabs"
      className="flex items-center gap-0.5 rounded-full bg-stone-100 dark:bg-[#141414] p-1 w-fit"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "builder"}
        onClick={handleBuilderClick}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-full transition-colors",
          activeTab === "builder"
            ? "bg-white text-foreground shadow-sm dark:bg-[#2c2c2c]"
            : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/[0.05]"
        )}
      >
        Builder
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "agent"}
        onClick={handleAgentClick}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-full transition-colors",
          activeTab === "agent"
            ? "bg-white text-foreground shadow-sm dark:bg-[#2c2c2c]"
            : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/[0.05]"
        )}
      >
        Agent
      </button>
    </div>
  );
}
