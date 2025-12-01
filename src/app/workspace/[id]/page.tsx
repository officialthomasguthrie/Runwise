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
import { Play, Undo2, Redo2, Settings2, Plus, FlaskConical, PanelRight, MoreHorizontal, History, Save, Share2, Eraser, X, ChevronLeft, Search, ChevronDown, ChevronRight, Check, Link, Mail, Clock, MessageSquare, Table, FileCheck, CreditCard, GitBranch, FileText, Calendar, Smartphone, Upload, Database, MessageCircle, Equal, Minus, ArrowRight, ArrowLeft, Filter, Type, Code, Hourglass, Merge, Scissors, FileSpreadsheet, Sparkles, Calculator } from "lucide-react";
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
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(320);
  const [isConfigPanelVisible, setIsConfigPanelVisible] = useState(false);
  const [externalChatMessage, setExternalChatMessage] = useState<string | null>(null);
  const [externalChatContext, setExternalChatContext] = useState<{ fieldName?: string; nodeType?: string; nodeId?: string; workflowName?: string } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    triggers: true,
    actions: true,
    conditions: false,
    utilities: false,
    integrations: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Node registry for search - maps node IDs to their display names
  // This must match the actual node IDs in src/lib/nodes/registry.ts
  const nodeRegistry: Record<string, { name: string; category: string }> = {
    // Triggers (from registry)
    'webhook-trigger': { name: 'Webhook Trigger', category: 'triggers' },
    'scheduled-time-trigger': { name: 'Scheduled Time', category: 'triggers' },
    'new-email-received': { name: 'New Email', category: 'triggers' },
    'new-message-in-slack': { name: 'New Slack Message', category: 'triggers' },
    'new-row-in-google-sheet': { name: 'New Sheet Row', category: 'triggers' },
    'new-form-submission': { name: 'Form Submission', category: 'triggers' },
    'new-github-issue': { name: 'New GitHub Issue', category: 'triggers' },
    'payment-completed': { name: 'Payment Completed', category: 'triggers' },
    'new-discord-message': { name: 'New Discord Message', category: 'triggers' },
    'file-uploaded': { name: 'File Uploaded', category: 'triggers' },
    // Actions (from registry)
    'send-email': { name: 'Send Email', category: 'actions' },
    'post-to-slack-channel': { name: 'Post to Slack', category: 'actions' },
    'send-discord-message': { name: 'Send Discord', category: 'actions' },
    'create-notion-page': { name: 'Create Notion Page', category: 'actions' },
    'add-row-to-google-sheet': { name: 'Add Sheet Row', category: 'actions' },
    'create-calendar-event': { name: 'Create Calendar Event', category: 'actions' },
    'send-sms-via-twilio': { name: 'Send SMS', category: 'actions' },
    'upload-file-to-google-drive': { name: 'Upload to Drive', category: 'actions' },
    'update-airtable-record': { name: 'Update Airtable', category: 'actions' },
    'create-trello-card': { name: 'Create Trello Card', category: 'actions' },
    // Conditions (from registry - only filter-data exists)
    'filter-data': { name: 'Filter Data', category: 'conditions' },
    // Utilities (from registry)
    'format-text': { name: 'Format Text', category: 'utilities' },
    'parse-json': { name: 'Parse JSON', category: 'utilities' },
    'delay-execution': { name: 'Delay Execution', category: 'utilities' },
    'merge-data-objects': { name: 'Merge Objects', category: 'utilities' },
    'split-string': { name: 'Split String', category: 'utilities' },
    'convert-to-csv': { name: 'Convert to CSV', category: 'utilities' },
    'extract-email-addresses': { name: 'Extract Emails', category: 'utilities' },
    'generate-summary-with-ai': { name: 'AI Summary', category: 'utilities' },
    'calculate-numeric-values': { name: 'Calculate', category: 'utilities' },
  };
  
  // Function to check if a node matches the search query
  const nodeMatchesSearch = (nodeId: string): boolean => {
    if (!searchQuery.trim()) return true;
    const node = nodeRegistry[nodeId];
    if (!node) return false;
    const query = searchQuery.toLowerCase();
    return node.name.toLowerCase().includes(query) || 
           node.category.toLowerCase().includes(query) ||
           nodeId.toLowerCase().includes(query);
  };
  
  // Store the ID of the placeholder node that triggered the sidebar
  const [activePlaceholderId, setActivePlaceholderId] = useState<string | null>(null);

  // Helper function to render a node card if it matches search
  const renderNodeIfMatches = (nodeId: string, icon: React.ReactNode, name: string) => {
    if (!nodeMatchesSearch(nodeId)) return null;
    return (
      <div
        key={nodeId}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/reactflow-node-id', nodeId);
          e.dataTransfer.effectAllowed = 'move';
          
          // Create custom drag image for semi-transparent effect
          const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
          dragImage.style.opacity = '0.5';
          dragImage.style.position = 'absolute';
          dragImage.style.top = '-1000px';
          document.body.appendChild(dragImage);
          e.dataTransfer.setDragImage(dragImage, 20, 20);
          
          // Clean up drag image
          setTimeout(() => {
            document.body.removeChild(dragImage);
          }, 0);
        }}
        onClick={() => {
          // If there's an active placeholder, replace it with this node
          if (activePlaceholderId) {
            console.log('🔄 Replacing placeholder:', activePlaceholderId, 'with node:', nodeId);
            const event = new CustomEvent('replace-placeholder', { 
              detail: { placeholderId: activePlaceholderId, nodeType: nodeId } 
            });
            window.dispatchEvent(event);
            setIsLeftSidebarVisible(false);
            setActivePlaceholderId(null);
          }
        }}
        className="flex items-center gap-2.5 p-2.5 rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl transition-all duration-300 cursor-pointer cursor-grab active:cursor-grabbing text-foreground"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background/50 border border-border/20">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground">{name}</h3>
        </div>
      </div>
    );
  };
  
  // Store reference to the workflow update function
  const updateWorkflowRef = useRef<((nodes: any[], edges: any[]) => void) | null>(null);
  const getWorkflowRef = useRef<(() => { nodes: any[], edges: any[] }) | null>(null);
  const executeWorkflowRef = useRef<(() => Promise<void>) | null>(null);
  const saveWorkflowRef = useRef<(() => Promise<void>) | null>(null);
  const undoRef = useRef<(() => void) | null>(null);
  const redoRef = useRef<(() => void) | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saveButtonText, setSaveButtonText] = useState<'Save' | 'Saved'>('Save');
  
  // Hide left sidebar when switching away from workspace view
  useEffect(() => {
    if (activeView !== 'workspace') {
      setIsLeftSidebarVisible(false);
    }
  }, [activeView]);

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

  const handleRegisterGetWorkflowCallback = useCallback((callback: () => { nodes: any[], edges: any[] }) => {
    console.log('🎯 Registering get workflow callback');
    getWorkflowRef.current = callback;
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

  const handleRegisterSaveCallback = useCallback((callback: () => Promise<void>) => {
    console.log('🎯 Registering save callback');
    saveWorkflowRef.current = callback;
  }, []);


  const handleSave = useCallback(async () => {
    if (!saveWorkflowRef.current) {
      console.error('❌ Cannot save - saveWorkflowRef is not registered');
      return;
    }

    try {
      setIsSaving(true);
      await saveWorkflowRef.current();
      // Change button text to "Saved"
      setSaveButtonText('Saved');
      setTimeout(() => {
        setSaveButtonText('Save');
      }, 2000); // Revert after 2 seconds
    } catch (error: any) {
      console.error('❌ Failed to save workflow:', error);
      // Could show error message here if needed
    } finally {
      setIsSaving(false);
    }
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
      <div className="relative z-50">
        <CollapsibleSidebar />
      </div>
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
                  className="p-1.5 rounded-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground focus:outline-none"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => redoRef.current?.()}
                  disabled={!canRedo}
                  className="p-1.5 rounded-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground focus:outline-none"
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
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border/60 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save workflow"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                    <span>Saving...</span>
                  </>
                ) : saveButtonText === 'Saved' ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </>
                )}
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
                onClick={() => setActiveView('executions')}
                className={cn(
                  "inline-flex items-center p-2 text-muted-foreground transition-colors hover:text-foreground",
                  activeView === 'executions' ? "text-foreground" : ""
                )}
                title="History"
              >
                <History className="h-4 w-4" />
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
                className="inline-flex items-center p-2 text-muted-foreground transition-colors hover:text-foreground"
                title="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - appears when Plus button is clicked, ONLY in workspace view */}
          {isLeftSidebarVisible && activeView === 'workspace' && (
            <div
              className="fixed left-16 top-16 bottom-0 z-30 bg-background border-r border-border transition-all duration-200"
              style={{ width: `${leftSidebarWidth}px` }}
            >
              <div className="flex h-full flex-col">
        {/* Header */}
                <div className="p-4">
                  <h2 className="text-sm font-medium text-foreground mb-3">Add Node</h2>
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search nodes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                </div>
                {/* Sidebar Content */}
                <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {/* Expandable Categories */}
                  {[
                    { id: 'triggers', label: 'Triggers' },
                    { id: 'actions', label: 'Actions' },
                    { id: 'conditions', label: 'Conditions' },
                    { id: 'utilities', label: 'Utilities' },
                    { id: 'integrations', label: 'Integrations' },
                  ].map((category) => {
                    // Filter nodes in this category based on search query
                    // For integrations, include all integration-related nodes (nodes that use 3rd party services)
                    // Only include nodes that actually exist in the registry
                    const integrationNodeIds = [
                      'webhook-trigger', 'new-email-received', 'new-message-in-slack', 'new-row-in-google-sheet',
                      'new-form-submission', 'new-github-issue', 'payment-completed', 'new-discord-message',
                      'file-uploaded', 'send-email', 'post-to-slack-channel', 'send-discord-message',
                      'create-notion-page', 'add-row-to-google-sheet', 'create-calendar-event',
                      'send-sms-via-twilio', 'upload-file-to-google-drive', 'update-airtable-record',
                      'create-trello-card', 'generate-summary-with-ai'
                    ];
                    
                    const categoryNodes = category.id === 'integrations'
                      ? integrationNodeIds.filter(nodeId => nodeMatchesSearch(nodeId))
                      : Object.entries(nodeRegistry)
                          .filter(([nodeId, node]) => node.category === category.id && nodeMatchesSearch(nodeId))
                          .map(([nodeId]) => nodeId);
                    
                    // Auto-expand categories when searching, or use manual state
                    const isExpanded = searchQuery.trim().length > 0 
                      ? categoryNodes.length > 0 
                      : expandedCategories[category.id];
                    
                    // Only show category if it has matching nodes or search is empty
                    const shouldShowCategory = categoryNodes.length > 0 || !searchQuery.trim();
                    
                    if (!shouldShowCategory) return null;
                    
                    return (
                      <div key={category.id}>
                        {/* Category Header */}
                        <button
                          onClick={() => {
                            if (searchQuery.trim().length === 0) {
                              setExpandedCategories(prev => ({
                                ...prev,
                                [category.id]: !prev[category.id]
                              }));
                            }
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                        >
                          <span className="text-sm font-medium text-foreground">{category.label}</span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        {/* Category Content */}
                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-2">
                            {category.id === 'triggers' && (
                              <>
                                {renderNodeIfMatches('webhook-trigger', <Link className="h-4 w-4 text-foreground" />, 'Webhook Trigger')}
                                {renderNodeIfMatches('scheduled-time-trigger', <Clock className="h-4 w-4 text-foreground" />, 'Scheduled Time')}
                                {renderNodeIfMatches('new-email-received', <Mail className="h-4 w-4 text-foreground" />, 'New Email')}
                                {renderNodeIfMatches('new-message-in-slack', <MessageSquare className="h-4 w-4 text-foreground" />, 'New Slack Message')}
                                {renderNodeIfMatches('new-row-in-google-sheet', <Table className="h-4 w-4 text-foreground" />, 'New Sheet Row')}
                                {renderNodeIfMatches('new-form-submission', <FileCheck className="h-4 w-4 text-foreground" />, 'Form Submission')}
                                {renderNodeIfMatches('new-github-issue', <GitBranch className="h-4 w-4 text-foreground" />, 'New GitHub Issue')}
                                {renderNodeIfMatches('payment-completed', <CreditCard className="h-4 w-4 text-foreground" />, 'Payment Completed')}
                                {renderNodeIfMatches('new-discord-message', <MessageCircle className="h-4 w-4 text-foreground" />, 'New Discord Message')}
                                {renderNodeIfMatches('file-uploaded', <Upload className="h-4 w-4 text-foreground" />, 'File Uploaded')}
                              </>
                            )}
                            {category.id === 'actions' && (
                              <>
                                {renderNodeIfMatches('send-email', <Mail className="h-4 w-4 text-foreground" />, 'Send Email')}
                                {renderNodeIfMatches('post-to-slack-channel', <MessageSquare className="h-4 w-4 text-foreground" />, 'Post to Slack')}
                                {renderNodeIfMatches('send-discord-message', <MessageCircle className="h-4 w-4 text-foreground" />, 'Send Discord')}
                                {renderNodeIfMatches('create-notion-page', <FileText className="h-4 w-4 text-foreground" />, 'Create Notion Page')}
                                {renderNodeIfMatches('add-row-to-google-sheet', <Table className="h-4 w-4 text-foreground" />, 'Add Sheet Row')}
                                {renderNodeIfMatches('create-calendar-event', <Calendar className="h-4 w-4 text-foreground" />, 'Create Calendar Event')}
                                {renderNodeIfMatches('send-sms-via-twilio', <Smartphone className="h-4 w-4 text-foreground" />, 'Send SMS')}
                                {renderNodeIfMatches('upload-file-to-google-drive', <Upload className="h-4 w-4 text-foreground" />, 'Upload to Drive')}
                                {renderNodeIfMatches('update-airtable-record', <Database className="h-4 w-4 text-foreground" />, 'Update Airtable')}
                                {renderNodeIfMatches('create-trello-card', <Table className="h-4 w-4 text-foreground" />, 'Create Trello Card')}
                              </>
                            )}
                            {category.id === 'conditions' && (
                              <>
                                {renderNodeIfMatches('filter-data', <Filter className="h-4 w-4 text-foreground" />, 'Filter Data')}
                              </>
                            )}
                            {category.id === 'utilities' && (
                              <>
                                {renderNodeIfMatches('format-text', <Type className="h-4 w-4 text-foreground" />, 'Format Text')}
                                {renderNodeIfMatches('parse-json', <Code className="h-4 w-4 text-foreground" />, 'Parse JSON')}
                                {renderNodeIfMatches('delay-execution', <Hourglass className="h-4 w-4 text-foreground" />, 'Delay Execution')}
                                {renderNodeIfMatches('merge-data-objects', <Merge className="h-4 w-4 text-foreground" />, 'Merge Objects')}
                                {renderNodeIfMatches('split-string', <Scissors className="h-4 w-4 text-foreground" />, 'Split String')}
                                {renderNodeIfMatches('convert-to-csv', <FileSpreadsheet className="h-4 w-4 text-foreground" />, 'Convert to CSV')}
                                {renderNodeIfMatches('extract-email-addresses', <Mail className="h-4 w-4 text-foreground" />, 'Extract Emails')}
                                {renderNodeIfMatches('generate-summary-with-ai', <Sparkles className="h-4 w-4 text-foreground" />, 'AI Summary')}
                                {renderNodeIfMatches('calculate-numeric-values', <Calculator className="h-4 w-4 text-foreground" />, 'Calculate')}
                              </>
                            )}
                            {category.id === 'integrations' && (
                              <>
                                {/* Google Services */}
                                {renderNodeIfMatches('new-row-in-google-sheet', <Table className="h-4 w-4 text-foreground" />, 'New Sheet Row')}
                                {renderNodeIfMatches('add-row-to-google-sheet', <Table className="h-4 w-4 text-foreground" />, 'Add Sheet Row')}
                                {renderNodeIfMatches('new-email-received', <Mail className="h-4 w-4 text-foreground" />, 'New Email')}
                                {renderNodeIfMatches('send-email', <Mail className="h-4 w-4 text-foreground" />, 'Send Email')}
                                {renderNodeIfMatches('create-calendar-event', <Calendar className="h-4 w-4 text-foreground" />, 'Create Calendar Event')}
                                {renderNodeIfMatches('upload-file-to-google-drive', <Upload className="h-4 w-4 text-foreground" />, 'Upload to Drive')}
                                {renderNodeIfMatches('new-form-submission', <FileCheck className="h-4 w-4 text-foreground" />, 'Form Submission')}
                                {/* Slack */}
                                {renderNodeIfMatches('new-message-in-slack', <MessageSquare className="h-4 w-4 text-foreground" />, 'New Slack Message')}
                                {renderNodeIfMatches('post-to-slack-channel', <MessageSquare className="h-4 w-4 text-foreground" />, 'Post to Slack')}
                                {/* Discord */}
                                {renderNodeIfMatches('send-discord-message', <MessageCircle className="h-4 w-4 text-foreground" />, 'Send Discord')}
                                {/* Notion */}
                                {renderNodeIfMatches('create-notion-page', <FileText className="h-4 w-4 text-foreground" />, 'Create Notion Page')}
                                {/* Airtable */}
                                {renderNodeIfMatches('update-airtable-record', <Database className="h-4 w-4 text-foreground" />, 'Update Airtable')}
                                {/* Trello */}
                                {renderNodeIfMatches('create-trello-card', <Table className="h-4 w-4 text-foreground" />, 'Create Trello Card')}
                                {/* Twilio */}
                                {renderNodeIfMatches('send-sms-via-twilio', <Smartphone className="h-4 w-4 text-foreground" />, 'Send SMS')}
                                {/* GitHub */}
                                {renderNodeIfMatches('new-github-issue', <GitBranch className="h-4 w-4 text-foreground" />, 'New GitHub Issue')}
                                {/* OpenAI */}
                                {renderNodeIfMatches('generate-summary-with-ai', <Sparkles className="h-4 w-4 text-foreground" />, 'AI Summary')}
                                {/* Payment */}
                                {renderNodeIfMatches('payment-completed', <CreditCard className="h-4 w-4 text-foreground" />, 'Payment Completed')}
                                {/* Webhook */}
                                {renderNodeIfMatches('webhook-trigger', <Link className="h-4 w-4 text-foreground" />, 'Webhook Trigger')}
                                {renderNodeIfMatches('new-discord-message', <MessageCircle className="h-4 w-4 text-foreground" />, 'New Discord Message')}
                                {renderNodeIfMatches('file-uploaded', <Upload className="h-4 w-4 text-foreground" />, 'File Uploaded')}
                              </>
                            )}
                          </div>
                        )}
    </div>
  );
                  })}
                </div>
              </div>
            </div>
          )}
          <main
            className="flex h-full flex-1 flex-col overflow-hidden transition-[margin-right,margin-left] duration-200 relative"
            style={{ 
              marginRight: isDesktop && isChatSidebarVisible ? `${sidebarWidth}px` : '0px',
              marginLeft: isLeftSidebarVisible 
                ? `${leftSidebarWidth + (isConfigPanelVisible ? 514 : 0)}px` 
                : isConfigPanelVisible ? '514px' : '0px'
            }}
          >
            {/* Hide Sidebar Button - top left of canvas area */}
            {isLeftSidebarVisible && activeView === 'workspace' && (
              <button
                onClick={() => setIsLeftSidebarVisible(false)}
                className="absolute top-4 left-4 z-20 inline-flex items-center justify-center rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/50 bg-background/95 backdrop-blur-sm border border-border/60"
                title="Hide sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {/* Top Center Navigation Bar and Run Button */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            <nav className="flex items-center gap-1 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-lg px-2 py-1.5 shadow-lg">
              <button
                onClick={() => setActiveView('workspace')}
                className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-all duration-200 border ${
                  activeView === 'workspace'
                    ? 'bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 border-stone-200 dark:border-white/20 shadow-sm text-foreground' 
                    : 'border-transparent text-foreground hover:bg-accent/50'
                }`}
              >
                Workspace
              </button>
              <div className="h-4 w-px bg-stone-300 dark:bg-white/20" />
              <button
                onClick={() => setActiveView('executions')}
                className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-all duration-200 border ${
                  activeView === 'executions'
                    ? 'bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 border-stone-200 dark:border-white/20 shadow-sm text-foreground' 
                    : 'border-transparent text-foreground hover:bg-accent/50'
                }`}
              >
                Executions
              </button>
            </nav>
            
            </div>

            <div className="absolute top-4 right-4 z-20">
              {activeView === 'workspace' && (
                <button
                  type="button"
                  onClick={() => {
                    // Reset placeholder ID when manually opening sidebar
                    setActivePlaceholderId(null);
                    setIsLeftSidebarVisible((prev) => !prev);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-background/95 text-foreground shadow-sm transition-transform hover:scale-[1.02] hover:bg-accent"
                  title={isLeftSidebarVisible ? "Close sidebar" : "Add Node"}
                >
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </button>
              )}
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
                  onClick={() => {
                    console.log('🔘 Test Workflow button clicked', { 
                      hasRef: !!executeWorkflowRef.current, 
                      hasNodes, 
                      isExecuting 
                    });
                    if (executeWorkflowRef.current && hasNodes && !isExecuting) {
                      console.log('✅ Calling executeWorkflowRef.current()');
                      executeWorkflowRef.current();
                    } else {
                      console.log('❌ Cannot execute:', { 
                        hasRef: !!executeWorkflowRef.current, 
                        hasNodes, 
                        isExecuting 
                      });
                    }
                  }}
                  disabled={!hasNodes || isExecuting}
                  className="pointer-events-auto inline-flex items-center gap-2.5 rounded-sm border border-border bg-background/95 px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  title={
                    !hasNodes
                      ? 'Add nodes to test the workflow'
                      : isExecuting
                      ? 'Workflow is currently running'
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
                onRegisterGetWorkflowCallback={handleRegisterGetWorkflowCallback}
                onRegisterExecuteCallback={handleRegisterExecuteCallback}
                onExecutionStateChange={handleExecutionStateChange}
                onRegisterUndoRedoCallbacks={handleRegisterUndoRedoCallbacks}
                onRegisterSaveCallback={handleRegisterSaveCallback}
                onConfigPanelVisibilityChange={(isVisible) => {
                  setIsConfigPanelVisible(isVisible);
                  // Hide add node sidebar when config panel opens
                  if (isVisible && isLeftSidebarVisible) {
                    setIsLeftSidebarVisible(false);
                  }
                }}
                onAskAI={(fieldName: string, nodeId: string, nodeType: string) => {
                  // Open chat if it's closed
                  if (!isChatSidebarVisible) {
                    setIsChatSidebarVisible(true);
                  }
                  // Send the message to the chat with context
                  setExternalChatMessage(`Help me fill out the ${fieldName}.`);
                  setExternalChatContext({
                    fieldName,
                    nodeType,
                    nodeId,
                    workflowName: workflowName,
                  });
                }}
                onOpenAddNodeSidebar={(placeholderId?: string) => {
                  if (placeholderId) {
                    setActivePlaceholderId(placeholderId);
                  } else {
                    setActivePlaceholderId(null);
                  }
                  setIsLeftSidebarVisible(true);
                }}
              />
            ) : (
              <ExecutionsView workflowId={actualWorkflowId || workflowId || undefined} />
            )}
            </div>
          </main>
              </div>

        {/* AI Chat Sidebar - Full Height Overlay on Right (Below Header) */}
        {isChatSidebarVisible && (
          <div className="hidden md:block">
            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`fixed top-16 bottom-0 w-px bg-border z-40 cursor-col-resize`}
              style={{ right: `${sidebarWidth}px` }}
            />
            {/* AI Chat Sidebar */}
            <div
              className="fixed top-16 right-0 bottom-0 z-30"
              style={{ width: `${sidebarWidth}px` }}
            >
              <AIChatSidebar
                externalMessage={externalChatMessage}
                externalContext={externalChatContext}
                onExternalMessageSent={() => {
                  setExternalChatMessage(null);
                  setExternalChatContext(null);
                }} 
                onWorkflowGenerated={handleWorkflowGenerated}
                initialPrompt={initialPrompt}
                getCurrentWorkflow={() => {
                  if (getWorkflowRef.current) {
                    return getWorkflowRef.current();
                  }
                  return { nodes: [], edges: [] };
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}