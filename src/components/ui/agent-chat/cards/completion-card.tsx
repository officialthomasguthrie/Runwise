"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompletionCardProps {
  agentId: string;
  summary: string;
}

/** Extract agent name from summary like "Aria is live and watching. 3 behaviour(s) active." */
function extractAgentName(summary: string): string {
  const match = summary.match(/^(.+?)\s+is\s+live/i);
  return match ? match[1].trim() : "Your agent";
}

export function CompletionCard({ agentId, summary }: CompletionCardProps) {
  const router = useRouter();
  const agentName = extractAgentName(summary);

  return (
    <div
      className={cn(
        "rounded-md border border-emerald-500/30 bg-emerald-500/5 overflow-hidden",
        "animate-in fade-in zoom-in-95 duration-300"
      )}
    >
      <div className="px-4 py-6 flex flex-col items-center text-center gap-4">
        {/* Success icon */}
        <div className="w-14 h-14 rounded-full bg-emerald-400/20 flex items-center justify-center">
          <Check className="w-7 h-7 text-emerald-400" strokeWidth={2.5} />
        </div>

        {/* Agent name + message */}
        <div>
          <p className="text-lg font-semibold text-foreground">{agentName}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your agent is live and watching.
          </p>
        </div>

        {/* View Agent button */}
        <button
          onClick={() => router.push(`/agents/${agentId}`)}
          className="inline-flex items-center gap-2 rounded-md bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 px-5 py-2.5 text-sm font-medium text-pink-300 transition-colors"
        >
          View Agent
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
