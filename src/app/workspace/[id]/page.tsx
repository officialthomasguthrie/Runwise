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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Play, Undo2, Redo2, Settings2, Plus, FlaskConical, PanelRight, MoreHorizontal, History, Save, Share2, Eraser, X, ChevronLeft, Search, ChevronDown, ChevronRight, Check, Link, Mail, Clock, MessageSquare, Table, FileCheck, CreditCard, GitBranch, FileText, Calendar, Smartphone, Upload, Database, MessageCircle, Equal, Minus, ArrowRight, ArrowLeft, Hourglass, Sparkles, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { nodeRegistry } from "@/lib/nodes/registry";
import * as LucideIcons from "lucide-react";

function WorkflowToggle({ workflowId, initialActive, onToggle }: { workflowId: string | null; initialActive: boolean; onToggle: (active: boolean) => Promise<void> }) {
  const [isChecked, setIsChecked] = useState(initialActive);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setIsChecked(initialActive);
  }, [initialActive]);

  const handleToggle = async () => {
    if (!workflowId || isUpdating) return;
    
    const newValue = !isChecked;
    setIsChecked(newValue);
    setIsUpdating(true);

    try {
      await onToggle(newValue);
    } catch (error) {
      // Revert on error
      setIsChecked(!newValue);
      console.error('Failed to toggle workflow:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <label className="flex cursor-pointer select-none items-center gap-2" aria-label="Workflow toggle">
      <span className={cn("text-xs font-medium tracking-wide", isChecked ? "text-primary" : "text-muted-foreground")}>
        {isChecked ? "Active" : "Inactive"}
      </span>
      <div className="relative">
        <input 
          type="checkbox" 
          checked={isChecked} 
          onChange={handleToggle}
          disabled={!workflowId || isUpdating}
          className="sr-only" 
        />
        <div className={cn(
          "block h-6 w-12 rounded-full transition-colors",
          isChecked ? "bg-primary" : "bg-stone-200/70 dark:bg-white/10",
          (!workflowId || isUpdating) && "opacity-50"
        )} />
        <div className={cn(
          "absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm transition-transform",
          isChecked ? "translate-x-6" : ""
        )} />
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
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(320);
  // Config panel state removed - using in-node expansion now
  const [externalChatMessage, setExternalChatMessage] = useState<string | null>(null);
  const [externalChatContext, setExternalChatContext] = useState<{ fieldName?: string; nodeType?: string; nodeId?: string; nodeLabel?: string; nodeDescription?: string; workflowName?: string } | null>(null);
  const [workflowActive, setWorkflowActive] = useState(false);
  const [isLoadingWorkflowStatus, setIsLoadingWorkflowStatus] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    triggers: true,
    actions: true,
    transforms: false,
    ai: false,
    database: false,
    files: false,
    utilities: false,
    integrations: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Icon name mappings for icons that don't exist or have different names in lucide-react
  const iconMappings: Record<string, string> = {
    'Table': 'Table2',
    'Trello': 'LayoutGrid',
    'Webhook': 'Link',
    'Merge': 'GitMerge',
    'FileSpreadsheet': 'FileSpreadsheet',
    'FileCheck': 'FileCheck2',
    'Smartphone': 'Phone',
  };
  
  // Get Lucide icon component by name with fallbacks
  const getIcon = (iconName: string) => {
    const mappedName = iconMappings[iconName] || iconName;
    let IconComponent = (LucideIcons as any)[mappedName];
    if (!IconComponent) {
      IconComponent = (LucideIcons as any)[`${mappedName}2`];
    }
    if (!IconComponent) {
      IconComponent = Zap;
    }
    return IconComponent;
  };
  
  // Map registry node categories to sidebar categories
  // Use the node's category field from the registry, which provides more granular organization
  const getSidebarCategory = (nodeId: string, node: typeof nodeRegistry[string]): string => {
    // Map registry categories to sidebar categories
    const categoryMap: Record<string, string> = {
      'trigger': 'triggers',
      'action': 'actions',
      'transform': 'transforms',
      'ai': 'ai',
      'utilities': 'utilities',
      'communication': 'actions',
      'productivity': 'actions',
      'data': 'database',
      'storage': 'files',
      'social': 'actions',
      'payment': 'actions',
    };
    
    // Use the node's category field, fallback to type if category doesn't exist
    const nodeCategory = node.category || node.type || 'utilities';
    return categoryMap[nodeCategory] || 'utilities';
  };
  
  // Function to check if a node matches the search query
  const nodeMatchesSearch = (nodeId: string): boolean => {
    if (!searchQuery.trim()) return true;
    const node = nodeRegistry[nodeId];
    if (!node) return false;
    const query = searchQuery.toLowerCase();
    return node.name.toLowerCase().includes(query) || 
           node.description.toLowerCase().includes(query) ||
           node.category.toLowerCase().includes(query) ||
           nodeId.toLowerCase().includes(query);
  };
  
  // Store the ID of the placeholder node that triggered the sidebar
  const [activePlaceholderId, setActivePlaceholderId] = useState<string | null>(null);

  // Helper function to render a node card if it matches search
  const renderNode = (nodeId: string) => {
    const node = nodeRegistry[nodeId];
    if (!node) {
      console.warn(`Node not found in registry: ${nodeId}`);
      return null;
    }
    if (!nodeMatchesSearch(nodeId)) return null;
    
    const IconComponent = getIcon(node.icon);
    
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
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background/50 border border-stone-200 dark:border-white/10">
          <IconComponent className="h-4 w-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground">{node.name}</h3>
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

  // Load workflow activation status
  const loadWorkflowStatus = useCallback(async () => {
    if (!actualWorkflowId) {
      setIsLoadingWorkflowStatus(false);
      return;
    }

    try {
      const response = await fetch(`/api/workflow/${actualWorkflowId}/activate`);
      if (response.ok) {
        const data = await response.json();
        console.log('[Status] Loaded workflow status:', data);
        setWorkflowActive(data.active);
      } else {
        console.error('Failed to load workflow status');
        setWorkflowActive(false);
      }
    } catch (error) {
      console.error('Error loading workflow status:', error);
      setWorkflowActive(false);
    } finally {
      setIsLoadingWorkflowStatus(false);
    }
  }, [actualWorkflowId]);

  useEffect(() => {
    loadWorkflowStatus();
  }, [loadWorkflowStatus]);

  // Handle workflow toggle
  const handleWorkflowToggle = useCallback(async (active: boolean) => {
    if (!actualWorkflowId) {
      console.error('Cannot toggle workflow - no workflow ID');
      return;
    }

    try {
      const response = await fetch(`/api/workflow/${actualWorkflowId}/activate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || 'Failed to toggle workflow';
        
        // Show user-friendly error message
        if (errorData.unconfiguredNodes && errorData.unconfiguredNodes.length > 0) {
          const nodeList = errorData.unconfiguredNodes
            .map((n: any) => `${n.nodeLabel} (missing: ${n.missingFields.join(', ')})`)
            .join('\n');
          alert(`Cannot activate workflow:\n\n${errorMessage}\n\nUnconfigured nodes:\n${nodeList}\n\nPlease configure all required fields before activating.`);
        } else {
          alert(`Cannot activate workflow: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[Toggle] Activation response:', data);
      const isActive = data.status === 'active';
      setWorkflowActive(isActive);
      
      // Refresh workflow status after a short delay to ensure it's updated
      setTimeout(async () => {
        await loadWorkflowStatus();
      }, 500);
    } catch (error: any) {
      console.error('Error toggling workflow:', error);
      // Reload status on error to get current state
      loadWorkflowStatus();
      throw error; // Re-throw so toggle component can handle it
    }
  }, [actualWorkflowId, loadWorkflowStatus]);


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
  const handleNodesConfigured = useCallback((configurations: Array<{ nodeId: string; config: Record<string, any> }>) => {
    if (!updateWorkflowRef.current) {
      console.error('❌ Cannot configure nodes - updateWorkflowRef is not registered');
      return;
    }
    
    console.log('🔧 handleNodesConfigured called with configurations:', configurations);
    
    // Get current workflow
    const currentWorkflow = getWorkflowRef.current ? getWorkflowRef.current() : { nodes: [], edges: [] };
    console.log('🔧 Current workflow has', currentWorkflow.nodes.length, 'nodes');
    
    // Update nodes with new configurations
    const updatedNodes = currentWorkflow.nodes.map((node: any) => {
      const config = configurations.find(c => c.nodeId === node.id);
      if (config) {
        const oldConfig = node.data?.config || {};
        const newConfig = { ...oldConfig, ...config.config };
        console.log('🔧 Updating node', node.id, 'config from', oldConfig, 'to', newConfig);
        return {
          ...node,
          data: {
            ...node.data,
            config: newConfig,
          },
        };
      }
      return node;
    });
    
    console.log('🔧 Calling updateWorkflowRef with', updatedNodes.length, 'updated nodes');
    // Update workflow
    updateWorkflowRef.current(updatedNodes, currentWorkflow.edges);
  }, []);

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
      <div className="relative z-50 hidden md:block">
      <CollapsibleSidebar />
      </div>
      <div className="flex flex-1 flex-col bg-background relative">
        {/* Header with editable workspace name */}
        <header className="sticky top-0 z-50 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-stone-200 dark:border-white/10">
          <div className="flex h-full items-center justify-between px-2 md:px-4 lg:px-6">
            {/* Editable Workspace Name and Undo/Redo */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <div className="flex items-center min-w-0">
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
                    className="px-2 py-1 rounded-sm border border-stone-200 dark:border-white/10 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-stone-300 dark:focus:ring-white/20 text-sm font-medium w-full max-w-[200px] md:min-w-[200px] md:max-w-[400px]"
                  />
                ) : (
                  <button
                    onClick={startEditingName}
                    className="px-2 py-1 rounded-sm hover:bg-accent transition-colors text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary truncate max-w-[120px] md:max-w-none"
                    title={workflowName}
                  >
                    {workflowName}
                  </button>
                )}
                {isSavingName && (
                  <span className="ml-2 text-xs text-muted-foreground hidden md:inline">Saving...</span>
                )}
              </div>
              
              {/* Undo/Redo Buttons */}
              <div className="hidden md:flex items-center gap-1 border-l border-stone-200 dark:border-white/10 pl-3">
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

            <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
              <WorkflowToggle 
                workflowId={actualWorkflowId} 
                initialActive={workflowActive}
                onToggle={handleWorkflowToggle}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="hidden md:inline-flex items-center gap-1.5 rounded-sm border border-stone-200 dark:border-white/10 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              {/* Mobile Save Button - Icon Only */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-sm border border-stone-200 dark:border-white/10 text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed"
                title={isSaving ? "Saving..." : saveButtonText === 'Saved' ? "Saved" : "Save workflow"}
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                ) : saveButtonText === 'Saved' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                className="hidden md:inline-flex items-center gap-1.5 rounded-sm border border-stone-200 dark:border-white/10 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/50"
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
                  "hidden md:inline-flex items-center p-2 text-muted-foreground transition-colors hover:text-foreground",
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
                className="hidden md:inline-flex items-center p-2 text-muted-foreground transition-colors hover:text-foreground"
                title="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Mobile Backdrop for Left Sidebar */}
          {isLeftSidebarVisible && activeView === 'workspace' && (
            <div
              className="fixed inset-0 bg-black/50 z-20 md:hidden"
              onClick={() => setIsLeftSidebarVisible(false)}
            />
          )}
          {/* Left Sidebar - appears when Plus button is clicked, ONLY in workspace view */}
          {isLeftSidebarVisible && activeView === 'workspace' && (
            <div
              className="fixed left-0 md:left-16 top-16 bottom-0 z-30 bg-background border-r border-stone-200 dark:border-white/10 transition-all duration-200 w-[min(90vw,320px)] md:w-auto md:max-w-none shadow-lg md:shadow-none"
              style={{ width: isDesktop ? `${leftSidebarWidth}px` : undefined }}
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
                      className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-stone-200 dark:border-white/10 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                </div>
                {/* Sidebar Content */}
                <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {/* Expandable Categories */}
                  {[
                    { id: 'triggers', label: 'Triggers' },
                    { id: 'actions', label: 'Actions' },
                    { id: 'transforms', label: 'Transforms' },
                    { id: 'ai', label: 'AI/ML' },
                    { id: 'database', label: 'Database' },
                    { id: 'files', label: 'Files' },
                    { id: 'utilities', label: 'Utilities' },
                    { id: 'integrations', label: 'Integrations' },
                  ].map((category) => {
                        // Get all nodes that belong to this sidebar category
                        // For integrations, show nodes that require external services
                        const integrationNodeIds = [
                          'new-email-received', 'new-message-in-slack', 'new-row-in-google-sheet',
                          'new-form-submission', 'new-github-issue', 'file-uploaded', 
                          'post-to-slack-channel', 'create-notion-page', 'create-calendar-event',
                          'upload-file-to-google-drive', 'update-airtable-record', 'create-trello-card',
                          'send-email', 'send-discord-message', 'send-sms-via-twilio',
                          'new-stripe-payment', 'new-paypal-payment', 'new-discord-message'
                        ];
                        
                        const categoryNodes = category.id === 'integrations'
                          ? integrationNodeIds.filter(nodeId => {
                              const node = nodeRegistry[nodeId];
                              return node && nodeMatchesSearch(nodeId);
                            })
                          : Object.entries(nodeRegistry)
                              .filter(([nodeId, node]) => {
                                if (!node) return false;
                                const sidebarCategory = getSidebarCategory(nodeId, node);
                                return sidebarCategory === category.id && nodeMatchesSearch(nodeId);
                              })
                              .map(([nodeId]) => nodeId);
                        
                        // Auto-expand categories when searching, or use manual state
                        const isExpanded = searchQuery.trim().length > 0 
                          ? categoryNodes.length > 0 
                          : (expandedCategories[category.id] ?? false);
                        
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
                                    [category.id]: !(prev[category.id] ?? false)
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
                                {categoryNodes.map(nodeId => renderNode(nodeId))}
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
              marginLeft: isDesktop && isLeftSidebarVisible 
                ? `${leftSidebarWidth}px` 
                : '0px'
            }}
          >
            {/* Hide Sidebar Button - top left of canvas area */}
            {isLeftSidebarVisible && activeView === 'workspace' && (
              <button
                onClick={() => setIsLeftSidebarVisible(false)}
                className="absolute top-4 left-4 z-40 inline-flex items-center justify-center rounded-sm p-1.5 text-muted-foreground transition-colors bg-background/95 backdrop-blur-sm border border-border/60"
                title="Hide sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {/* Top Center Navigation Bar and Run Button */}
            <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 md:gap-3">
            <nav className="flex items-center gap-0.5 md:gap-1 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-lg px-1 md:px-2 py-1 md:py-1.5 shadow-lg">
              <button
                onClick={() => setActiveView('workspace')}
                className={`px-2 md:px-3 py-1 md:py-1.5 rounded-sm text-xs md:text-sm font-medium transition-all duration-200 border ${
                  activeView === 'workspace'
                    ? 'bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 border-stone-200 dark:border-white/20 shadow-sm text-foreground' 
                    : 'border-transparent text-foreground'
                }`}
              >
                Workspace
              </button>
              <div className="h-4 w-px bg-stone-300 dark:bg-white/20" />
              <button
                onClick={() => setActiveView('executions')}
                className={`px-2 md:px-3 py-1 md:py-1.5 rounded-sm text-xs md:text-sm font-medium transition-all duration-200 border ${
                  activeView === 'executions'
                    ? 'bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 border-stone-200 dark:border-white/20 shadow-sm text-foreground' 
                    : 'border-transparent text-foreground'
                }`}
              >
                Executions
              </button>
            </nav>
            
            </div>

            <div className="absolute top-2 md:top-4 right-2 md:right-4 z-20">
              {activeView === 'workspace' && (
                <button
                  type="button"
                  onClick={() => {
                    // Reset placeholder ID when manually opening sidebar
                    setActivePlaceholderId(null);
                    setIsLeftSidebarVisible((prev) => !prev);
                  }}
                  className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-sm border border-stone-200 dark:border-white/10 bg-background/95 text-foreground shadow-sm transition-all hover:scale-[1.02] hover:bg-white dark:hover:bg-zinc-900"
                  title={isLeftSidebarVisible ? "Close sidebar" : "Add Node"}
                >
                  <Plus className="h-4 w-4 md:h-5 md:w-5 stroke-[2.5]" />
                </button>
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 z-10">
              {/* Mobile AI Chat FAB */}
              <button
                onClick={() => setIsMobileChatOpen(true)}
                className="md:hidden pointer-events-auto fixed bottom-24 right-4 z-30 h-12 w-12 rounded-full backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground flex items-center justify-center focus:ring-0 focus-visible:ring-0"
                aria-label="Open AI Chat"
              >
                <Sparkles className="h-5 w-5" />
              </button>

              {/* Mobile: Vertical toolbar on right side */}
              <div className="absolute right-2 md:right-4 bottom-4 md:bottom-6 flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-3 md:left-[calc(50%+60px)] md:-translate-x-1/2">
                <button
                  type="button"
                  onClick={handleClearWorkflow}
                  className="pointer-events-auto inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-sm border border-stone-200 dark:border-white/10 bg-background/95 text-foreground shadow-sm transition-colors hover:bg-white/40 dark:hover:bg-zinc-900/40"
                  title="Clear workflow canvas"
                >
                  <Eraser className="h-4 w-4 md:h-5 md:w-5" />
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
                  className="pointer-events-auto inline-flex items-center gap-1.5 md:gap-2.5 rounded-sm border border-stone-200 dark:border-white/10 bg-background/95 px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-white/40 dark:hover:bg-zinc-900/40 disabled:cursor-not-allowed disabled:opacity-60"
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
                      <div className="h-3 w-3 md:h-4 md:w-4 animate-spin rounded-full border-b-2 border-foreground" />
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
                      <FlaskConical className="h-4 w-4 md:h-5 md:w-5" />
                      <span className="hidden sm:inline">Test Workflow</span>
                      <span className="sm:hidden">Test</span>
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
                // Config panel visibility callback removed - using in-node expansion now
                onAskAI={(fieldName: string, nodeId: string, nodeType: string) => {
                  // Open chat if it's closed
                  if (!isChatSidebarVisible) {
                    setIsChatSidebarVisible(true);
                  }
                  // Send the message to the chat with context
                  setExternalChatMessage(`Help me with the ${fieldName}.`);
                  setExternalChatContext({
                    fieldName,
                    nodeType,
                    nodeId,
                    workflowName: workflowName,
                  });
                }}
                onAskNodeInfo={(nodeId: string, nodeLabel: string, nodeType: string, nodeDescription?: string) => {
                  // Open chat sidebar if it's not open
                  if (!isChatSidebarVisible) {
                    setIsChatSidebarVisible(true);
                  }
                  
                  // Get current workflow for context
                  const currentWorkflow = getWorkflowRef.current ? getWorkflowRef.current() : { nodes: [], edges: [] };
                  
                  // Find the specific node in the workflow
                  const targetNode = currentWorkflow.nodes.find((n: any) => n.id === nodeId);
                  
                  // Build a comprehensive prompt that asks the AI to analyze the workflow
                  let prompt = `What does the "${nodeLabel}" node do in this workflow? `;
                  
                  if (nodeDescription) {
                    prompt += `The node has this description: "${nodeDescription}". `;
                  }
                  
                  prompt += `Please analyze the entire workflow structure, including all nodes and their connections, and explain: `;
                  prompt += `1. What specific role this node plays in the workflow automation, `;
                  prompt += `2. How it connects to and interacts with other nodes, `;
                  prompt += `3. What data or actions flow through this node, and `;
                  prompt += `4. Why this node is important for the overall workflow functionality. `;
                  
                  // Send the message to the chat with context
                  setExternalChatMessage(prompt);
                  setExternalChatContext({
                    nodeId,
                    nodeLabel,
                    nodeType,
                    nodeDescription,
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

        {/* AI Chat Sidebar - Full Height Overlay on Right (Below Header) - Desktop Only */}
        {isChatSidebarVisible && (
          <div className="hidden md:block">
            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`fixed top-16 bottom-0 w-px bg-stone-200 dark:bg-white/10 z-40 cursor-col-resize hover:bg-stone-300 dark:hover:bg-white/20 transition-colors`}
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
                onNodesConfigured={handleNodesConfigured}
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

        {/* Mobile AI Chat Bottom Sheet */}
        <Sheet open={isMobileChatOpen} onOpenChange={setIsMobileChatOpen}>
          <SheetContent 
            side="bottom" 
            className="h-[90vh] max-h-[90vh] p-0 flex flex-col gap-0 rounded-t-2xl"
            showClose={true}
          >
            <SheetTitle className="sr-only">AI Assistant</SheetTitle>
            <div className="flex-1 overflow-hidden min-h-0">
              <AIChatSidebar 
                externalMessage={externalChatMessage}
                externalContext={externalChatContext}
                onExternalMessageSent={() => {
                  setExternalChatMessage(null);
                  setExternalChatContext(null);
                }} 
                onWorkflowGenerated={handleWorkflowGenerated}
                onNodesConfigured={handleNodesConfigured}
                initialPrompt={initialPrompt}
                getCurrentWorkflow={() => {
                  if (getWorkflowRef.current) {
                    return getWorkflowRef.current();
                  }
                  return { nodes: [], edges: [] };
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}