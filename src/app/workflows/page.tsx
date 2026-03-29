"use client";

import { ArrowRight, X, Clock, Trash2, Workflow, Plus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { GridCard } from "@/components/ui/grid-card";
import type { Database } from "@/types/database";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";

export default function WorkflowsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Array<{ id: string; name: string; status: string; updated_at: string }>>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [workflowStates, setWorkflowStates] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState<boolean>(false);

  // Function to refresh workflows
  const refreshWorkflows = async () => {
    if (!user) return;
    setWorkflowsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name, status, updated_at')
        .eq('user_id', authUser.id)
        .order('updated_at', { ascending: false });
      if (error) {
        console.error('Failed to refresh workflows:', error);
      } else {
        setWorkflows(data ?? []);
      }
    } catch (e) {
      console.error('Unexpected error refreshing workflows:', e);
    } finally {
      setWorkflowsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setIsDeleting(true);
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', confirmDeleteId)
        .eq('user_id', authUser.id);
      if (error) {
        console.error('Failed to delete workflow:', error);
      } else {
        setWorkflows(prev => prev.filter(w => w.id !== confirmDeleteId));
        await refreshWorkflows(); // Refresh to ensure consistency
      }
    } catch (e) {
      console.error('Unexpected error deleting project:', e);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const startEditingName = (workflowId: string, currentName: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingWorkflowId(workflowId);
    setEditingName(currentName);
  };

  const handleToggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      
      const { error } = await (supabase as any)
        .from('workflows')
        .update({ status: isActive ? 'active' : 'inactive' })
        .eq('id', workflowId)
        .eq('user_id', authUser.id);
      
      if (error) {
        console.error('Failed to toggle workflow:', error);
      } else {
        // Update local state
        setWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, status: isActive ? 'active' : 'inactive' } : w
        ));
        
        setWorkflowStates(prev => ({ ...prev, [workflowId]: isActive }));
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const cancelEditingName = () => {
    setEditingWorkflowId(null);
    setEditingName("");
    setIsSavingName(false);
  };

  const saveEditingName = async () => {
    if (!editingWorkflowId) return;
    const newName = editingName.trim();
    if (!newName) {
      cancelEditingName();
      return;
    }
    try {
      setIsSavingName(true);
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      
      const { error } = await (supabase as any)
        .from('workflows')
        .update({ name: newName })
        .eq('id', editingWorkflowId)
        .eq('user_id', authUser.id);
      if (error) {
        console.error('Failed to rename workflow:', error);
      } else {
        setWorkflows(prev => prev.map(w => w.id === editingWorkflowId ? { ...w, name: newName, updated_at: new Date().toISOString() } : w));
      }
    } catch (e) {
      console.error('Unexpected error renaming workflow:', e);
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

  // Load recent workflows for the current user
  useEffect(() => {
    const loadWorkflows = async () => {
      if (loading) return;
      if (!user) return;
      if (!user.id) {
        console.log('User ID is missing:', user);
        return;
      }
      console.log('Loading workflows for user:', user.id);
      console.log('User object:', user);
      console.log('Loading state:', loading);
      setWorkflowsLoading(true);
      try {
        const supabase = createClient();
        console.log('Supabase client created:', !!supabase);
        
        // Test basic auth first
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        console.log('Auth user:', authUser);
        console.log('Auth error:', authError);
        
        if (!authUser) {
          console.error('No authenticated user found');
          setWorkflows([]);
          return;
        }
        
        const { data, error } = await supabase
          .from('workflows')
          .select('id, name, status, updated_at')
          .eq('user_id', authUser.id)
          .order('updated_at', { ascending: false });
        if (error) {
          console.error('Failed to fetch workflows:', error);
          setWorkflows([]);
        } else {
          console.log('Loaded workflows:', data);
          console.log('Number of workflows found:', data?.length || 0);
          setWorkflows(data ?? []);
          
          // Initialize workflow states based on status
          const initialStates: Record<string, boolean> = {};
          if (data) {
            data.forEach((workflow: any) => {
              initialStates[workflow.id] = workflow.status === 'active';
            });
          }
          setWorkflowStates(initialStates);
        }
      } catch (e) {
        console.error('Unexpected error fetching workflows:', e);
        setWorkflows([]);
      } finally {
        setWorkflowsLoading(false);
      }
    };
    loadWorkflows();
  }, [user, loading]);

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="flex h-screen w-screen bg-background">
        <CollapsibleSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <BlankHeader />
        <main className="flex h-full grow flex-col overflow-auto relative scrollbar-hide">
            <div className="relative pb-12">
            <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4">
                <h1 className="text-4xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7">
                Workflows
              </h1>
            </div>

              {/* Recent Workflows */}
              <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
                <div className="mb-6 hidden md:block">
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">
                    Recent Workflows
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">
                    Your latest automation workflows
                  </p>
              </div>

                {workflowsLoading ? (
                  /* Loading skeleton — matches agents page style, customized for workflow cards */
                  <div className="w-full max-w-[1600px] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-32 rounded-xl overflow-hidden flex flex-col px-5 py-4 gap-3 bg-stone-100 dark:bg-stone-800/50"
                      >
                        {/* Top: title */}
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="h-5 w-32 max-w-[140px] bg-gray-200 dark:bg-[#303030] rounded animate-pulse" />
                          </div>
                        </div>
                        {/* Middle: timestamp (clock + text) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <div className="h-3 w-3 rounded-full bg-gray-200 dark:bg-[#303030] animate-pulse flex-shrink-0" />
                            <div className="h-3 w-24 bg-gray-200 dark:bg-[#303030] rounded animate-pulse" />
                          </div>
                        </div>
                        {/* Bottom: status left, arrow right */}
                        <div className="flex items-center justify-between mt-auto">
                          <div className="h-4 w-16 bg-gray-200 dark:bg-[#303030] rounded animate-pulse" />
                          <div className="h-4 w-4 bg-gray-200 dark:bg-[#303030] rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : workflows.length > 0 ? (
                      <div className="w-full max-w-[1600px] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {workflows.map((w) => (
                          <div key={w.id} className="group relative">
                            <button
                              aria-label="Delete workflow"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmDeleteId(w.id);
                              }}
                              className="absolute right-2 top-2 z-20 inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-white/10 bg-background/80 p-1 text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <GridCard
                              className="h-32 cursor-pointer transition-colors hover:border-pink-400/50"
                              onClick={() => router.push(`/workspace/${w.id}`)}
                            >
                              <div className="relative z-10">
                                <div className="mb-3 flex items-center gap-3">
                                  <div className="min-w-0 flex-1 text-left">
                                    {editingWorkflowId === w.id ? (
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
                                        onClick={(e) => startEditingName(w.id, w.name, e)}
                                      >
                                        <span className="truncate">{w.name}</span>
                                      </button>
                                    )}
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>{new Date(w.updated_at).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="relative z-10 flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground capitalize">{w.status}</span>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </GridCard>
                          </div>
                        ))}
                      </div>
                ) : (
                  /* Empty state — matches agents page liquid glass style */
                  <div className="w-full max-w-[1600px]">
                    <Link href="/dashboard">
                      <div
                        className="cursor-pointer group rounded-xl overflow-hidden flex flex-col justify-center min-h-[200px] px-8 py-10 border border-stone-300/60 dark:border-white/10 bg-stone-200/40 dark:bg-white/[0.04] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all duration-200 hover:bg-stone-200/55 dark:hover:bg-white/[0.06]"
                      >
                        <div className="flex flex-col items-center text-center max-w-md mx-auto">
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-stone-300/40 dark:bg-white/10 backdrop-blur-sm">
                            <Workflow className="w-7 h-7 text-stone-500 dark:text-stone-400" />
                          </div>
                          <h3 className="font-semibold text-foreground text-lg md:text-xl mb-1.5">
                            No workflows yet
                          </h3>
                          <p className="text-sm text-muted-foreground mb-6">
                            Create your first automation workflow from the dashboard
                          </p>
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-300 group-hover:text-foreground transition-colors">
                            <Plus className="w-4 h-4" />
                            Get started
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </section>

          </div>
        </main>
      </div>
    </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-md border border-stone-200 dark:border-white/10 bg-background p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-foreground">Delete workflow?</h3>
              <button
                aria-label="Close"
                onClick={() => setConfirmDeleteId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this workflow? This action cannot be undone.
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
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
