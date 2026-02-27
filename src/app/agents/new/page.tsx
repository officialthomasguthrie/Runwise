"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { AgentChatBuilder, BuilderTabs } from "@/components/ui/agent-chat";

export default function NewAgentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (!user) return null;

  return (
    <div className="flex h-screen w-screen bg-background">
      <CollapsibleSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <BlankHeader />

        <main className="flex h-full grow flex-col overflow-hidden">
          <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-7 pb-4 flex-shrink-0">
            <button
              onClick={() => router.push("/agents")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to agents
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight">
                  Deploy an Agent
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Describe what you need. We&apos;ll plan and deploy it in seconds.
                </p>
              </div>
              <BuilderTabs activeTab="builder" agentId={agentId} />
            </div>
          </div>

          <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 pb-6">
            <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading…</div>}>
              <AgentChatBuilder onComplete={setAgentId} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
