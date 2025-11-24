"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { ExecutionsView } from "@/components/ui/executions-view";

export default function RunsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen bg-background">
      <CollapsibleSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <BlankHeader />
        <main className="flex h-full grow flex-col overflow-hidden relative">
          <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4 pt-8 flex-none">
            <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight">
              Recent Runs
            </h1>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ExecutionsView className="pt-0 h-full" />
          </div>
        </main>
      </div>
    </div>
  );
}
