"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type BuilderTab = "builder" | "agent";

interface BuilderTabsProps {
  activeTab: BuilderTab;
  onTabChange?: (tab: BuilderTab) => void;
  agentId: string | null;
}

/**
 * Two tab pills: Builder and Agent.
 * - Builder: always active on /agents/new
 * - Agent: grayed out + cursor-not-allowed when agentId === null;
 *   clickable once agentId is set → navigates to /agents/[agentId]
 */
export function BuilderTabs({ activeTab, onTabChange, agentId }: BuilderTabsProps) {
  const router = useRouter();
  const agentDisabled = agentId === null;

  const handleAgentClick = () => {
    if (agentDisabled) return;
    router.push(`/agents/${agentId}`);
  };

  const handleBuilderClick = () => {
    onTabChange?.("builder");
  };

  return (
    <div
      role="tablist"
      aria-label="Builder tabs"
      className="flex items-center gap-0.5 rounded-full bg-white/[0.04] p-1 w-fit"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "builder"}
        onClick={handleBuilderClick}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-full transition-colors",
          activeTab === "builder"
            ? "bg-white/10 text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
        )}
      >
        Builder
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "agent"}
        aria-disabled={agentDisabled}
        onClick={handleAgentClick}
        disabled={agentDisabled}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-full transition-colors",
          agentDisabled && "opacity-50 cursor-not-allowed",
          !agentDisabled && activeTab === "agent"
            ? "bg-white/10 text-foreground shadow-sm"
            : !agentDisabled
            ? "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
            : "text-muted-foreground"
        )}
      >
        Agent
      </button>
    </div>
  );
}
