"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { GridCard } from "@/components/ui/grid-card";
import { Workflow, Clock, ArrowRight, Trash2, X } from "lucide-react";
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
                <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7">
                Workflows
              </h1>
            </div>

              {/* Recent Workflows */}
              <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl tracking-tighter font-geist text-foreground leading-tight">
                    Recent Workflows
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-2">
                    Your latest automation workflows
                  </p>
              </div>

                {workflowsLoading ? (
                  <div className="max-w-full overflow-hidden">
                    <div className="w-full" style={{ maxWidth: "1400px" }}>
                      <div className="h-24 md:h-28 flex items-center justify-center border-none bg-transparent">
                        <div className="flex items-center gap-3 text-muted-foreground text-sm">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-400" />
                          Loading workflows...
                        </div>
                      </div>
                    </div>
                  </div>
                ) : workflows.length > 0 ? (
                  <div className="max-w-full overflow-hidden">
                    <div className="w-full" style={{ maxWidth: "1400px" }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {workflows.map((w) => (
                          <div key={w.id} className="group relative">
                            <button
                              aria-label="Delete workflow"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmDeleteId(w.id);
                              }}
                              className="absolute right-2 top-2 z-20 inline-flex items-center justify-center rounded-md bg-background/80 border border-stone-200 dark:border-white/10 p-1 text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <Link href={`/workspace/${w.id}`} className="block">
                              <GridCard className="h-32 cursor-pointer hover:border-pink-400/50 transition-colors">
                                <div className="relative z-10">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-400 rounded-lg flex items-center justify-center">
                                      <Workflow className="w-4 h-4 text-white" />
                                    </div>
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
                                          className="group/title inline-flex items-center gap-1 font-medium text-foreground line-clamp-1 hover:text-foreground/90 w-full justify-start text-left"
                                          onClick={(e) => startEditingName(w.id, w.name, e)}
                                        >
                                          <span className="truncate">{w.name}</span>
                                        </button>
                                      )}
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(w.updated_at).toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="relative z-10 flex items-center justify-end">
                                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </GridCard>
                  </Link>
                          </div>
                ))}
              </div>
          </div>
      </div>
                ) : (
                  <div className="max-w-full overflow-hidden">
                    <div className="w-full" style={{ maxWidth: "calc(100vw - 200px)" }}>
                      <div className="h-32 md:h-40 cursor-pointer hover:border-pink-400/50 transition-colors border-none w-full bg-transparent rounded-sm border flex flex-col justify-center items-start">
                        <div className="relative z-10 flex flex-col items-start justify-center h-full text-left">
                          <h3 className="font-medium text-foreground mb-3 text-lg md:text-xl">No workflows yet</h3>
                          <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-5">
                            Create your first automation workflow from the dashboard
                          </p>
                          <Link href="/dashboard">
                            <div className="flex items-center gap-2 text-sm md:text-base text-pink-400 hover:text-pink-300 transition-colors cursor-pointer">
                              <span>Get started</span>
                              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
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
