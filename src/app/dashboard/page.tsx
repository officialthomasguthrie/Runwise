"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Cancel01Icon, Clock01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";
import GradientText from "@/components/ui/GradientText";
import { GradientAIChatInput } from "@/components/ui/gradient-ai-chat-input";
import { GridCard } from "@/components/ui/grid-card";
import { ButtonColorful } from "@/components/ui/button-colorful";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { Component as AILoader } from "@/components/ui/ai-loader";
import TextType from "@/components/ui/text-type";
import { UpgradeRequiredModal } from "@/components/ui/upgrade-required-modal";
import { Button } from "@/components/ui/button";

// Animation variants matching the AI textbox
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

export default function DashboardPage() {
  const { user, loading, subscriptionTier } = useAuth();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; status: string; updated_at: string }>>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hasReachedFreeLimit, setHasReachedFreeLimit] = useState(false);
  const [upgradeModalTitle, setUpgradeModalTitle] = useState("Upgrade to run workflows");
  const [upgradeModalMessage, setUpgradeModalMessage] = useState("You're currently on the Free plan. To run workflows and use AI-powered automation, you'll need an active subscription.");
  const [showBanner, setShowBanner] = useState(true);

  const isFreePlan = !subscriptionTier || subscriptionTier === "free";

  // Check if free user has reached workflow limit
  useEffect(() => {
    const checkFreeLimit = async () => {
      if (!user || !isFreePlan) {
        setHasReachedFreeLimit(false);
        return;
      }

      try {
        const response = await fetch('/api/workflows/check-free-limit');
        if (response.ok) {
          const data = await response.json();
          setHasReachedFreeLimit(data.hasReachedLimit || false);
        }
      } catch (error) {
        console.error('Error checking free limit:', error);
      }
    };

    checkFreeLimit();
  }, [user, isFreePlan]);

  // Compute next unique "Untitled" project name for the current user
  const getNextUntitledName = async (): Promise<string> => {
    const supabase = createClient();
    const base = 'Untitled';
    const { data, error } = await (supabase as any)
      .from('workflows')
      .select('name')
      .eq('user_id', user!.id)
      .ilike('name', `${base}%`);
    if (error || !data || data.length === 0) {
      return base;
    }

    // Parse existing suffixes: "Untitled", "Untitled 2", ... find max
    let maxSuffix = 1; // if plain Untitled exists, next should be 2
    let hasPlainUntitled = false;
    for (const row of data) {
      const n = row.name?.trim() || '';
      if (n === base) {
        hasPlainUntitled = true;
        continue;
      }
      const match = n.match(/^Untitled\s+(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!Number.isNaN(val)) {
          if (val > maxSuffix) maxSuffix = val;
        }
      }
    }
    if (!hasPlainUntitled) return base;
    return `${base} ${maxSuffix + 1}`;
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setIsDeleting(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', confirmDeleteId)
        .eq('user_id', user!.id);
      if (error) {
        console.error('Failed to delete project:', error);
      } else {
        setProjects(prev => prev.filter(p => p.id !== confirmDeleteId));
      }
    } catch (e) {
      console.error('Unexpected error deleting project:', e);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const startEditingName = (projectId: string, currentName: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingProjectId(projectId);
    setEditingName(currentName);
  };

  const cancelEditingName = () => {
    setEditingProjectId(null);
    setEditingName("");
    setIsSavingName(false);
  };

  const saveEditingName = async () => {
    if (!editingProjectId) return;
    const newName = editingName.trim();
    if (!newName) {
      cancelEditingName();
      return;
    }
    try {
      setIsSavingName(true);
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from('workflows')
        .update({ name: newName })
        .eq('id', editingProjectId)
        .eq('user_id', user!.id);
      if (error) {
        console.error('Failed to rename project:', error);
      } else {
        setProjects(prev => prev.map(p => p.id === editingProjectId ? { ...p, name: newName, updated_at: new Date().toISOString() } : p));
      }
    } catch (e) {
      console.error('Unexpected error renaming project:', e);
    } finally {
      cancelEditingName();
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSend = async (message: string) => {
    if (isFreePlan && hasReachedFreeLimit) {
      // Only block if they've reached the limit
      setUpgradeModalTitle("You have reached your free limit");
      setUpgradeModalMessage("You have reached your free limit. Upgrade to continue.");
      setShowUpgradeModal(true);
      return;
    }
    // Free users can generate workflows until they hit the limit
    console.log("Message sent:", message);
    
    // Create a new project row in Supabase and get its ID
    let workflowId: string | null = null;
    try {
      const supabase = createClient();
      // Always start as Untitled (with numeric suffix if needed)
      const projectName = await getNextUntitledName();
      const { data, error } = await (supabase as any)
        .from('workflows')
        .insert({
          name: projectName,
          status: 'draft',
          user_id: user!.id,
          workflow_data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        })
        .select()
        .single();
      
      if (error) {
        console.error('Failed to create project:', error);
      } else {
        workflowId = data?.id;
        console.log('Created new workflow:', workflowId);
      }
    } catch (e) {
      console.error('Unexpected error creating project:', e);
    }
    
    // Navigate directly to workspace with the prompt (no loading screen)
    // Use the actual workflow ID from database, or fallback to generated ID
    const targetId = workflowId || `workspace_${Date.now()}`;
    router.push(`/workspace/${targetId}?prompt=${encodeURIComponent(message)}`);
  };

  const handleNewRun = async () => {
    if (isFreePlan) {
      setShowUpgradeModal(true);
      return;
    }
    // Create a new blank workflow and navigate to it in a new tab
    let workflowId: string | null = null;
    try {
      const supabase = createClient();
      const projectName = await getNextUntitledName();
      const { data, error } = await (supabase as any)
        .from('workflows')
        .insert({
          name: projectName,
          status: 'draft',
          user_id: user!.id,
          workflow_data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        })
        .select()
        .single();
      
      if (error) {
        console.error('Failed to create project:', error);
      } else {
        workflowId = data?.id;
        console.log('Created new workflow:', workflowId);
      }
    } catch (e) {
      console.error('Unexpected error creating project:', e);
    }
    
    const targetId = workflowId || `workspace_${Date.now()}`;
    window.open(`/workspace/${targetId}`, '_blank');
  };

  const handleCreateFromTemplate = () => {
    window.open('/templates', '_blank');
  };

  const handleConnectNewApp = () => {
    window.open('/integrations', '_blank');
  };

  const handleExploreIntegrations = () => {
    window.open('/integrations', '_blank');
  };

  // Load recent projects for the current user
  useEffect(() => {
    const loadProjects = async () => {
      if (loading) return;
      if (!user) return;
      setProjectsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('workflows')
          .select('id, name, status, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(6);
        if (error) {
          console.error('Failed to fetch projects:', error);
          setProjects([]);
        } else {
          console.log('Dashboard loaded workflows:', data);
          console.log('Number of workflows found:', data?.length || 0);
          setProjects(data ?? []);
        }
      } catch (e) {
        console.error('Unexpected error fetching projects:', e);
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };
    loadProjects();
  }, [user, loading]);

  // Redirect to login if not authenticated (after loading completes)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Keep a single conditional return to avoid altering hooks order between renders
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background" suppressHydrationWarning={true}>
        <div className="text-center" suppressHydrationWarning={true}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400 mx-auto mb-4" suppressHydrationWarning={true}></div>
          <p className="text-muted-foreground" suppressHydrationWarning={true}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting (or if no user after loading)
  if (!user) {
    return null;
  }

  return (
    <>
      <div className="flex h-screen w-screen bg-background" suppressHydrationWarning={true}>
        <CollapsibleSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <BlankHeader />
          {/* Free Plan Banner */}
          {isFreePlan && showBanner && (
            <div className="relative z-10 border-b border-stone-200 dark:border-white/10 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 px-4 py-3">
              <div className="container mx-auto max-w-7xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {hasReachedFreeLimit ? (
                        <>
                          You've used your <span className="font-semibold text-purple-600 dark:text-purple-400">free workflow</span>. Upgrade to unlock full features.
                        </>
                      ) : (
                        <>
                          You're on the Free plan. You can generate <span className="font-semibold text-purple-600 dark:text-purple-400">1 workflow</span> with AI. Upgrade to unlock full features.
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={() => router.push('/settings?tab=billing')}
                    size="sm"
                    className="border border-[#ffffff1a] bg-[#bd28b3ba] hover:bg-[#bd28b3da] text-white rounded-lg py-1.5 px-3 cursor-pointer flex items-center justify-center transition-all"
                  >
                    Upgrade
                  </Button>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    aria-label="Dismiss banner"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          <main className="flex h-full grow flex-col overflow-y-auto relative scrollbar-hide">
            {/* Dashboard Hero Section */}
            <section className="relative pt-6 pb-48 z-10" style={{ overflow: 'visible' }}>
              <motion.div
                className="relative z-10 p-8 pb-12"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                style={{ overflow: 'visible' }}
              >
                <div className="mx-auto max-w-4xl text-center px-4" style={{ overflow: 'visible' }}>
                  <motion.h1
                    className="mx-auto mb-4 text-4xl font-geist font-[350] tracking-tighter text-foreground leading-tight sm:text-3xl md:text-3xl lg:text-4xl xl:text-[2.75rem]"
                    variants={fadeInUp}
                    style={{ overflow: 'visible', textOverflow: 'clip', whiteSpace: 'normal', wordBreak: 'normal' }}
                  >
                    What would you like to <GradientText
                      colors={['#a855f7', '#ec4899', '#a855f7', '#ec4899', '#a855f7']}
                      animationSpeed={6}
                      className="inline"
                      style={{ overflow: 'visible' }}
                    >
                      automate
                    </GradientText> today?
                  </motion.h1>

                  <motion.p
                    className="mx-auto mb-6 max-w-2xl px-2 text-sm text-muted-foreground hidden md:block md:mb-8 md:px-4 md:text-lg"
                    variants={fadeInUp}
                  >
                    Transform your ideas into powerful AI workflows with simple, natural language commands.
                    No coding required.
                  </motion.p>

                  <motion.div
                    className="mt-6 flex justify-center px-1 md:mt-8 md:px-4"
                    variants={fadeInUp}
                  >
                    <GradientAIChatInput
                      placeholder={
                        <div className="text-left">
                          <TextType
                            text={[
                              "Send a welcome email when a user signs up",
                              "Generate and post social media content every Monday",
                              "Summarize daily sales data and send to my email",
                              "Create Slack notifications for new customer feedback",
                              "Automatically backup database files every week"
                            ]}
                            typingSpeed={40}
                            deletingSpeed={25}
                            pauseDuration={2000}
                            loop={true}
                            showCursor={false}
                            cursorCharacter="|"
                            className="text-muted-foreground"
                          />
                        </div>
                      }
                      onSend={handleSend}
                      className="w-full max-w-full md:max-w-2xl"
                      enableShadows={false}
                    />
                  </motion.div>

                  <motion.div
                    className="mt-8 hidden flex-wrap justify-center gap-4 md:flex"
                    variants={fadeInUp}
                  >
                    <ButtonColorful label="New Run" onClick={handleNewRun} />
                    <ButtonColorful label="Create from Template" onClick={handleCreateFromTemplate} />
                    <ButtonColorful label="Connect a New App" onClick={handleConnectNewApp} />
                    <ButtonColorful label="Explore Integrations" onClick={handleExploreIntegrations} />
                  </motion.div>

                  <motion.div
                    className="mt-8 md:mt-12"
                    variants={fadeInUp}
                  >
                    <div className="mb-6 text-center md:mb-8">
                      <h2 className="mb-2 text-lg font-semibold text-foreground md:text-xl">Recent Projects</h2>
                      <p className="text-sm text-muted-foreground">Your latest automation workflows</p>
                    </div>

                    {projectsLoading ? (
                      <div className="mx-auto w-full max-w-[95vw] px-4">
                        <GridCard className="flex h-24 items-center justify-center md:h-28">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-pink-400" />
                            Loading projects...
                          </div>
                        </GridCard>
                      </div>
                    ) : projects.length > 0 ? (
                      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((p) => (
                          <div key={p.id} className="group relative">
                            <button
                              aria-label="Delete project"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmDeleteId(p.id);
                              }}
                              className="absolute right-2 top-2 z-20 inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-white/10 bg-background/80 p-1 text-red-500 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                            >
                              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                            </button>
                            <GridCard
                              className="h-32 cursor-pointer transition-colors hover:border-pink-400/50"
                              onClick={() => router.push(`/workspace/${p.id}`)}
                            >
                              <div className="relative z-10">
                                <div className="mb-3 flex items-center gap-3">
                                  <div className="min-w-0 flex-1 text-left">
                                    {editingProjectId === p.id ? (
                                      <input
                                        autoFocus
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onBlur={saveEditingName}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            (e.currentTarget as HTMLInputElement).blur();
                                          } else if (e.key === "Escape") {
                                            e.preventDefault();
                                            cancelEditingName();
                                          }
                                        }}
                                        className="w-full rounded-sm border border-stone-200 dark:border-white/10 bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-stone-300 dark:focus:ring-white/20"
                                      />
                                    ) : (
                                      <button
                                        className="group/title inline-flex w-full items-center justify-start gap-1 text-left font-medium text-foreground line-clamp-1 hover:text-foreground/90"
                                        onClick={(e) => startEditingName(p.id, p.name, e)}
                                      >
                                        <span className="truncate">{p.name}</span>
                                      </button>
                                    )}
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <HugeiconsIcon icon={Clock01Icon} className="h-3 w-3" />
                                      <span>{new Date(p.updated_at).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="relative z-10 flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground capitalize">{p.status}</span>
                                  <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </GridCard>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mx-auto w-full max-w-[95vw] px-4">
                        <GridCard className="h-32 cursor-pointer transition-colors hover:border-pink-400/50 md:h-40">
                          <div className="relative z-10 flex h-full flex-col items-center justify-center p-4 text-center">
                            <h3 className="mb-2 text-sm font-medium text-foreground md:text-base">No projects yet</h3>
                            <p className="mb-3 text-xs text-muted-foreground md:mb-4 md:text-sm">
                              Create your first automation workflow using the AI textbox above
                            </p>
                            <div className="flex items-center gap-2 text-xs text-pink-400 md:text-sm">
                              <span>Get started</span>
                              <HugeiconsIcon icon={ArrowRight01Icon} className="h-3 w-3 md:h-4 md:w-4" />
                            </div>
                          </div>
                        </GridCard>
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </section>

            {/* Placeholder for future dashboard widgets */}
            <section className="flex-1 bg-background p-8" />

            {/* AI Loading Overlay */}
            {isGenerating && <AILoader text="Generating" />}
          </main>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-md border border-stone-200 dark:border-white/10 bg-background p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-foreground">Delete project?</h3>
              <button
                aria-label="Close"
                onClick={() => setConfirmDeleteId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="inline-flex items-center rounded-md border border-stone-200 dark:border-white/10 bg-background px-3 py-1.5 text-sm text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center rounded-md border border-red-600/30 bg-red-600/10 px-3 py-1.5 text-sm text-red-500 hover:bg-red-600/20 disabled:opacity-70"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade required modal for free users */}
      <UpgradeRequiredModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="ai-prompt"
        title={upgradeModalTitle}
        message={upgradeModalMessage}
        upgradePlan={hasReachedFreeLimit ? "pro-monthly" : "personal-monthly"}
      />
  </>
  );
}
