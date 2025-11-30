"use client";

import { useState } from "react";
import { Calendar, Mail, BarChart3, FileText, Users, Receipt, Headphones, HelpCircle, MessageSquare, Search, Twitter } from "lucide-react";
import SearchComponent from "@/components/ui/animated-glowing-search-bar";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase-client";
import { TEMPLATES } from "@/lib/templates";

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreating, setIsCreating] = useState<number | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Extended template data with more templates
  const templates = [
    {
      id: 1,
      name: "X Post Scheduler",
      description: "Auto-create & post weekly content.",
      icon: Twitter,
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
      category: "Marketing"
    },
    {
      id: 2,
      name: "Email Auto-Responder",
      description: "Automatically generate summaries and AI-powered replies to incoming emails.",
      icon: Mail,
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400",
      category: "Communication"
    }
  ];

  // Filter templates based on search query
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseTemplate = async (templateId: number, templateName: string) => {
    if (!user) return;
    
    try {
      console.log(`Creating template: ${templateId} - ${templateName}`);
      setIsCreating(templateId);
      const supabase = createClient();
      
      // Get template data or fallback
      const templateData = TEMPLATES[templateId];
      const nodes = templateData?.nodes || [
        { 
          id: '1', 
          type: 'workflow-node', 
          position: { x: 100, y: 100 }, 
          data: { label: templateName } 
        }
      ];
      const edges = templateData?.edges || [];

      // Create workflow
      const { data, error } = await (supabase as any)
        .from('workflows')
        .insert({
          name: templateName,
          user_id: user.id,
          status: 'active',
          workflow_data: {
            nodes,
            edges,
            viewport: { x: 0, y: 0, zoom: 1 }
          }
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating workflow:", error);
        return;
      }

      if (data) {
        console.log("Redirecting to workflow:", data.id);
        router.push(`/workspace/${data.id}`);
      }

    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsCreating(null);
    }
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
          <div className="relative pb-12">
            <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4">
              <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7">
                Templates
              </h1>
            </div>

            <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">
                    Browse Templates
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">
                    Search through {templates.length} available templates
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <SearchComponent value={searchQuery} onChange={setSearchQuery} placeholder="Search templates..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => {
                  const IconComponent = template.icon;
                  return (
                    <div
                      key={template.id}
                      className="group relative rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl p-6 transition-all duration-300 text-foreground hover:shadow-lg"
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          <IconComponent className="h-6 w-6 text-black dark:text-white" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUseTemplate(template.id, template.name);
                          }}
                          disabled={isCreating === template.id}
                          className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                        >
                          {isCreating === template.id ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Creating...
                            </>
                          ) : (
                            "Use Template"
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}