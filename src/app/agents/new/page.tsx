"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { AgentDeployWizard } from "@/components/ui/agent-deploy-modal";

export default function NewAgentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (!user) return null;

  return (
    <div className="flex h-screen w-screen bg-background">
      <CollapsibleSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <BlankHeader />

        <main className="flex h-full grow flex-col overflow-auto scrollbar-hide">
          <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-7 pb-4">
            <button
              onClick={() => router.push("/agents")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to agents
            </button>

            <h1 className="text-4xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mb-2">
              Deploy an Agent
            </h1>
            <p className="text-sm text-muted-foreground mb-10">
              Describe what you need. We'll plan and deploy it in seconds.
            </p>

            {/* Wizard */}
            <div className="w-full max-w-xl">
              <AgentDeployWizard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
