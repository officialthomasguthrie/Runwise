"use client";

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { ReactFlowEditor } from "@/components/ui/react-flow-editor";
import { AIChatSidebar } from "@/components/ui/ai-chat-sidebar";
import { ExecutionsView } from "@/components/ui/executions-view";
import { SettingsView } from "@/components/ui/settings-view";
import { saveWorkflowFromEditor } from "@/lib/workflows/client";
import { Play, Undo2, Redo2, Settings2, Plus, FlaskConical, PanelRight, MoreHorizontal, History, Save, Share2, Eraser } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

function WorkflowToggle() {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <label className="flex cursor-pointer select-none items-center gap-2" aria-label="Workflow toggle">
      <span className={cn("text-xs font-medium tracking-wide", isChecked ? "text-primary" : "text-muted-foreground")}>
        {isChecked ? "Active" : "Inactive"}
      </span>
      <div className="relative">
        <input type="checkbox" checked={isChecked} onChange={() => setIsChecked((prev) => !prev)} className="sr-only" />
        <div className={cn("block h-6 w-12 rounded-full transition-colors", isChecked ? "bg-primary" : "bg-border/70")} />
        <div className={cn("absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm transition-transform", isChecked ? "translate-x-6" : "")} />
      </div>
    </label>
  );
}

export default function WorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarWidth, setSidebarWidth] = useState(320); // 80 * 4 = 320px (w-80)
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const workflowId = params?.id as string | undefined;
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [actualWorkflowId, setActualWorkflowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [workflowHasNodes, setWorkflowHasNodes] = useState(false);
  const hasProcessedPrompt = useRef(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [hasNodes, setHasNodes] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'queued' | 'running' | 'success' | 'failed'>('idle');
  const [activeView, setActiveView] = useState<'workspace' | 'executions' | 'settings'>('workspace');
  const [isChatSidebarVisible, setIsChatSidebarVisible] = useState(true);
  
  // Store reference to the workflow update function
  const updateWorkflowRef = useRef<((nodes: any[], edges: any[]) => void) | null>(null);
  const executeWorkflowRef = useRef<(() => Promise<void>) | null>(null);
  const undoRef = useRef<(() => void) | null>(null);
  const redoRef = useRef<(() => void) | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Extract prompt from URL on mount, but only use it if workflow is empty
  useEffect(() => {
    const prompt = searchParams?.get('prompt');
    if (prompt && !hasProcessedPrompt.current) {
      console.log('📝 Initial prompt from URL:', prompt);
      // Don't set immediately - wait to see if workflow loads with existing nodes
      setTimeout(() => {
        // Only use prompt if workflow is still empty after load attempt
        if (!workflowHasNodes && !hasProcessedPrompt.current) {
          console.log('✅ Workflow is empty, will use initial prompt');
          setInitialPrompt(prompt);
          hasProcessedPrompt.current = true;
          
          // Clear prompt from URL to prevent re-sending on reload
          const url = new URL(window.location.href);
          url.searchParams.delete('prompt');
          window.history.replaceState({}, '', url.toString());
        } else {
          console.log('🚫 Workflow has nodes, skipping initial prompt');
        }
      }, 1000); // Wait 1 second for workflow to load
    }
  }, [searchParams, workflowHasNodes]);

  // Detect desktop mode for sidebar margin
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 250;
      const maxWidth = 600;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Define callbacks at component level (before JSX)
  const handleRegisterUpdateCallback = useCallback((callback: any) => {
    console.log('🎯 Registering workflow update callback');
    updateWorkflowRef.current = callback;
  }, []);

  const handleRegisterExecuteCallback = useCallback((callback: () => Promise<void>) => {
    console.log('🎯 Registering execute callback');
    executeWorkflowRef.current = callback;
  }, []);

  const handleExecutionStateChange = useCallback((state: { isExecuting: boolean; executionStatus: 'idle' | 'queued' | 'running' | 'success' | 'failed'; hasNodes: boolean }) => {
    setIsExecuting(state.isExecuting);
    setExecutionStatus(state.executionStatus);
    setHasNodes(state.hasNodes);
  }, []);

  const handleRegisterUndoRedoCallbacks = useCallback((callbacks: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }) => {
    undoRef.current = callbacks.undo;
    redoRef.current = callbacks.redo;
    setCanUndo(callbacks.canUndo);
    setCanRedo(callbacks.canRedo);
  }, []);

  const handleClearWorkflow = useCallback(async () => {
    if (!updateWorkflowRef.current) {
      console.error('❌ Cannot clear workflow - updateWorkflowRef is not registered');
      return;
    }

    // Clear nodes and edges in the editor
    updateWorkflowRef.current([], []);
    setHasNodes(false);
    setWorkflowHasNodes(false);

    if (!user) {
      return;
    }

    try {
      setIsSaving(true);
      const savedWorkflow = await saveWorkflowFromEditor(
        actualWorkflowId || workflowId || null,
        workflowName,
        [],
        [],
        {
          description: `Cleared workflow: ${workflowName}`,
          status: 'draft',
        }
      );
      setActualWorkflowId(savedWorkflow.id);
    } catch (error) {
      console.error('❌ Failed to clear workflow:', error);
    } finally {
      setTimeout(() => setIsSaving(false), 600);
    }
  }, [actualWorkflowId, workflowId, workflowName, user]);

  // Handle name editing
  const startEditingName = () => {
    setEditingName(workflowName);
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setEditingName("");
    setIsSavingName(false);
  };

  const saveEditingName = async () => {
    const newName = editingName.trim();
    if (!newName) {
      cancelEditingName();
      return;
    }
    if (newName === workflowName) {
      cancelEditingName();
      return;
    }
    try {
      setIsSavingName(true);
      const supabase = createClient();
      const workflowIdToUpdate = actualWorkflowId || workflowId;
      
      if (!workflowIdToUpdate) {
        console.error('No workflow ID to update');
        cancelEditingName();
        return;
      }

      const { error } = await (supabase as any)
        .from('workflows')
        .update({ name: newName })
        .eq('id', workflowIdToUpdate)
        .eq('user_id', user!.id);
      
      if (error) {
        console.error('Failed to rename workflow:', error);
      } else {
        setWorkflowName(newName);
      }
    } catch (e) {
      console.error('Unexpected error renaming workflow:', e);
    } finally {
      cancelEditingName();
    }
  };

  // Handle workflow generation from AI
  const handleWorkflowGenerated = async (workflow: { nodes: any[]; edges: any[]; workflowName?: string }) => {
    console.log('🔥 Workflow generated in page.tsx:', workflow);
    console.log('🔥 Nodes received:', workflow.nodes);
    console.log('🔥 Edges received:', workflow.edges);
    console.log('🔥 updateWorkflowRef.current exists?', !!updateWorkflowRef.current);
    
    const newWorkflowName = workflow.workflowName || 'Untitled Workflow';
    
    // Update workflow name if provided
    if (workflow.workflowName) {
      console.log('🔥 Setting workflow name to:', workflow.workflowName);
      setWorkflowName(workflow.workflowName);
    }
    
    // Mark that workflow now has nodes (prevent re-sending prompt)
    if (workflow.nodes && workflow.nodes.length > 0) {
      setWorkflowHasNodes(true);
    }
    
    // Update the React Flow editor with new nodes/edges
    if (updateWorkflowRef.current) {
      console.log('🔥 Calling updateWorkflowRef.current with:', workflow.nodes.length, 'nodes and', workflow.edges.length, 'edges');
      updateWorkflowRef.current(workflow.nodes, workflow.edges);
      
      // 🎯 Auto-save the AI-generated workflow to database
      if (user) {
        try {
          setIsSaving(true);
          console.log('💾 Saving AI-generated workflow to database...');
          // Use actualWorkflowId if we have it (from previous save), otherwise use workflowId
          const savedWorkflow = await saveWorkflowFromEditor(
            actualWorkflowId || workflowId || null,
            newWorkflowName,
            workflow.nodes,
            workflow.edges,
            {
              description: `AI-generated workflow: ${newWorkflowName}`,
              ai_prompt: newWorkflowName,
              status: 'draft',
            }
          );
          console.log('✅ AI-generated workflow saved successfully:', savedWorkflow.id);
          
          // Store the actual workflow ID (UUID from database) for future saves
          setActualWorkflowId(savedWorkflow.id);
          
          // Keep saving indicator visible for a moment
          setTimeout(() => setIsSaving(false), 1500);
        } catch (error: any) {
          console.error('❌ Failed to save AI-generated workflow:', error);
          setIsSaving(false);
          // Don't block the UI - workflow is still visible
          // User can manually save if auto-save fails
        }
      }
    } else {
      console.error('❌ updateWorkflowRef.current is null! Cannot update workflow.');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen bg-background">
      <CollapsibleSidebar />
      <div className="flex flex-1 flex-col bg-background relative">
        {/* Header with editable workspace name */}
        <header className="sticky top-0 z-50 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex h-full items-center justify-between px-4 md:px-6">
            {/* Editable Workspace Name and Undo/Redo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                {isEditingName ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveEditingName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.currentTarget as HTMLInputElement).blur();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEditingName();
                      }
                    }}
                    className="px-2 py-1 rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium min-w-[200px] max-w-[400px]"
                  />
                ) : (
                  <button
                    onClick={startEditingName}
                    className="px-2 py-1 rounded-sm hover:bg-accent transition-colors text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {workflowName}
                  </button>
                )}
                {isSavingName && (
                  <span className="ml-2 text-xs text-muted-foreground">Saving...</span>
                )}
              </div>
              
              {/* Undo/Redo Buttons */}
              <div className="flex items-center gap-1 border-l border-border pl-3">
                <button
                  onClick={() => undoRef.current?.()}
                  disabled={!canUndo}
                  className="p-1.5 rounded-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => redoRef.current?.()}
                  disabled={!canRedo}
                  className="p-1.5 rounded-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <WorkflowToggle />
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-sm border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/50"
                title="Save workflow"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-sm border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/50"
                title="Share workflow"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center p-2 text-muted-foreground transition-colors hover:text-foreground"
                title="History"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex items-center p-2 text-muted-foreground transition-colors hover:text-foreground"
                title="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsChatSidebarVisible((prev) => !prev)}
                className={cn(
                  "inline-flex items-center p-2 text-muted-foreground transition-colors hover:text-foreground",
                  isChatSidebarVisible
                    ? "text-foreground"
                    : ""
                )}
                title={isChatSidebarVisible ? "Hide AI Chat" : "Show AI Chat"}
              >
                <PanelRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
                title="Workspace settings"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          <main
            className="flex h-full flex-1 flex-col overflow-hidden transition-[margin-right] duration-200 relative"
            style={{ marginRight: isDesktop && isChatSidebarVisible ? `${sidebarWidth}px` : '0px' }}
          >
            {/* Top Center Navigation Bar and Run Button */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            <nav className="flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-md px-2 py-1.5 shadow-sm">
              <button
                onClick={() => setActiveView('workspace')}
                className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                  activeView === 'workspace'
                    ? 'bg-muted text-foreground' 
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                Workspace
              </button>
              <div className="h-4 w-px bg-border" />
              <button
                onClick={() => setActiveView('executions')}
                className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                  activeView === 'executions'
                    ? 'bg-muted text-foreground' 
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                Executions
              </button>
              <div className="h-4 w-px bg-border" />
              <button
                onClick={() => setActiveView('settings')}
                className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                  activeView === 'settings'
                    ? 'bg-muted text-foreground' 
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                Settings
              </button>
            </nav>
            
            </div>

            <div className="absolute top-4 right-4 z-20">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/80 bg-background/95 text-white shadow-sm transition-transform hover:scale-[1.02]"
                title="Add"
              >
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="pointer-events-none absolute inset-0 z-10">
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearWorkflow}
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-background/95 text-foreground shadow-sm transition-colors hover:bg-accent"
                  title="Clear workflow canvas"
                >
                  <Eraser className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    console.log('🔴 Test Workflow button clicked');
                    console.log('🔴 executeWorkflowRef.current:', !!executeWorkflowRef.current);
                    console.log('🔴 hasNodes:', hasNodes);
                    console.log('🔴 isExecuting:', isExecuting);
                    
                    if (!executeWorkflowRef.current) {
                      console.error('❌ Execute callback not registered');
                      alert('Workflow execution not ready. Please wait a moment and try again.');
                      return;
                    }
                    
                    if (!hasNodes) {
                      console.error('❌ No nodes in workflow');
                      alert('Please add nodes to the workflow before testing.');
                      return;
                    }
                    
                    if (isExecuting) {
                      console.warn('⚠️ Workflow already executing');
                      return;
                    }
                    
                    try {
                      console.log('✅ Calling executeWorkflow...');
                      await executeWorkflowRef.current();
                    } catch (error: any) {
                      console.error('❌ Error executing workflow:', error);
                      alert(`Failed to execute workflow: ${error.message || 'Unknown error'}`);
                    }
                  }}
                  disabled={!hasNodes || isExecuting}
                  className="pointer-events-auto inline-flex items-center gap-2.5 rounded-sm border border-border bg-background/95 px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  title={
                    !hasNodes
                      ? 'Add nodes to test the workflow'
                      : isExecuting
                      ? 'Workflow is currently running'
                      : !executeWorkflowRef.current
                      ? 'Workflow execution not ready'
                      : 'Run a test execution of this workflow'
                  }
                >
                  {isExecuting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-foreground" />
                      <span>
                        {executionStatus === 'queued'
                          ? 'Queued'
                          : executionStatus === 'running'
                          ? 'Running'
                          : 'Executing'}
                      </span>
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-5 w-5" />
                      <span>Test Workflow</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Canvas Area - Shows either workspace or executions view */}
            <div className="flex-1 overflow-hidden w-full h-full">
            {activeView === 'workspace' ? (
              <ReactFlowEditor
                workflowId={actualWorkflowId || workflowId}
                workflowName={workflowName}
                autoSave={true}
                autoSaveInterval={30000}
                activeView={activeView}
                onActiveViewChange={setActiveView}
                onWorkflowLoaded={(workflow) => {
                  console.log('📂 Workflow loaded:', workflow.name, 'ID:', workflow.id);
                  setWorkflowName(workflow.name);
                  setActualWorkflowId(workflow.id);
                  
                  // Check if workflow has nodes
                  const hasNodes = workflow.workflow_data?.nodes && workflow.workflow_data.nodes.length > 0;
                  console.log('🔍 Workflow has nodes:', hasNodes);
                  setWorkflowHasNodes(hasNodes);
                }}
                onRegisterUpdateCallback={handleRegisterUpdateCallback}
                onRegisterExecuteCallback={handleRegisterExecuteCallback}
                onExecutionStateChange={handleExecutionStateChange}
                onRegisterUndoRedoCallbacks={handleRegisterUndoRedoCallbacks}
              />
            ) : activeView === 'executions' ? (
              <ExecutionsView workflowId={actualWorkflowId || workflowId || undefined} />
            ) : activeView === 'settings' ? (
              <SettingsView workflowId={actualWorkflowId || workflowId || undefined} />
            ) : null}
            </div>
          </main>
              </div>

        {/* AI Chat Sidebar - Full Height Overlay on Right (Below Header) */}
        {isChatSidebarVisible && (
          <div className="hidden md:block">
            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`fixed top-16 bottom-0 w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize z-40 ${isResizing ? 'bg-primary/50' : ''}`}
              style={{ right: `${sidebarWidth}px` }}
            />
            {/* AI Chat Sidebar */}
            <div
              className="fixed top-16 right-0 bottom-0 z-30"
              style={{ width: `${sidebarWidth}px` }}
            >
              <AIChatSidebar 
                onWorkflowGenerated={handleWorkflowGenerated}
                initialPrompt={initialPrompt}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}