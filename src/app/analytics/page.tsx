"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    usage: true,
    performance: true,
    insights: true,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen bg-background">
      <CollapsibleSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <BlankHeader />
        <main className="flex h-full grow flex-col overflow-auto relative scrollbar-hide">
          <div className="relative pb-48">
            <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4">
              <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7 mb-8">
                Analytics
              </h1>

              <div className="space-y-6">
                {/* Overview Section */}
                <div className="pb-4">
                  <button 
                    onClick={() => toggleSection('overview')}
                    className="flex items-center gap-2 w-full text-left hover:text-foreground transition-colors group"
                  >
                    {expandedSections.overview ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    )}
                    <h2 className="text-2xl sm:text-3xl tracking-tighter font-geist text-foreground group-hover:text-foreground">Overview</h2>
                  </button>
                  {expandedSections.overview && (
                    <div className="mt-4 pl-7">
                      <div className="h-32 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30 text-muted-foreground">
                        Overview content placeholder
                      </div>
                    </div>
                  )}
                </div>

                {/* Usage Section */}
                <div className="pb-4">
                  <button 
                    onClick={() => toggleSection('usage')}
                    className="flex items-center gap-2 w-full text-left hover:text-foreground transition-colors group"
                  >
                    {expandedSections.usage ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    )}
                    <h2 className="text-2xl sm:text-3xl tracking-tighter font-geist text-foreground group-hover:text-foreground">Usage</h2>
                  </button>
                  {expandedSections.usage && (
                    <div className="mt-4 pl-7">
                      <div className="h-32 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30 text-muted-foreground">
                        Usage content placeholder
                      </div>
                    </div>
                  )}
                </div>

                {/* Performance Section */}
                <div className="pb-4">
                  <button 
                    onClick={() => toggleSection('performance')}
                    className="flex items-center gap-2 w-full text-left hover:text-foreground transition-colors group"
                  >
                    {expandedSections.performance ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    )}
                    <h2 className="text-2xl sm:text-3xl tracking-tighter font-geist text-foreground group-hover:text-foreground">Performance</h2>
                  </button>
                  {expandedSections.performance && (
                    <div className="mt-4 pl-7">
                      <div className="h-32 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30 text-muted-foreground">
                        Performance content placeholder
                      </div>
                    </div>
                  )}
                </div>

                {/* Insights & Recommendations Section */}
                <div className="pb-4">
                  <button 
                    onClick={() => toggleSection('insights')}
                    className="flex items-center gap-2 w-full text-left hover:text-foreground transition-colors group"
                  >
                    {expandedSections.insights ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                    )}
                    <h2 className="text-2xl sm:text-3xl tracking-tighter font-geist text-foreground group-hover:text-foreground">Insights & Recommendations</h2>
                  </button>
                  {expandedSections.insights && (
                    <div className="mt-4 pl-7">
                      <div className="h-32 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30 text-muted-foreground">
                        Insights & Recommendations content placeholder
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
