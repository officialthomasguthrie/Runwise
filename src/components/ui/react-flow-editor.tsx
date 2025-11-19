"use client";

import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Position,
  ConnectionLineType,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowProvider,
  ControlButton,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react';
import { TriggerNodeBase, ActionNodeBase, EndNodeBase } from './workflow-nodes-base';
import { WorkflowNode } from './workflow-node-library';
import ButtonEdgeDemo from './button-edge-demo';
import PlaceholderNodeDemo from './placeholder-node-demo';
import { getWorkflow, saveWorkflowFromEditor } from '@/lib/workflows/client';
import { deserializeWorkflow } from '@/lib/workflows/utils';
import type { Workflow } from '@/lib/workflows/types';
import type { WorkflowExecutionResult } from '@/lib/workflow-execution/types';
import { getLayoutedElements } from '@/lib/workflows/layout';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Settings, AlertCircle, Play } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const HorizontalWorkflowIcon = ({ className, ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3" y="5" width="6" height="6" rx="1.5" />
    <rect x="15" y="5" width="6" height="6" rx="1.5" />
    <rect x="15" y="13" width="6" height="6" rx="1.5" />
    <path d="M9 8h6M18 11v2" />
  </svg>
);

const VerticalWorkflowIcon = ({ className, ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="9" y="3" width="6" height="6" rx="1.5" />
    <rect x="3" y="15" width="6" height="6" rx="1.5" />
    <rect x="15" y="15" width="6" height="6" rx="1.5" />
    <path d="M12 9v6M9 18h6" />
  </svg>
);
import { useAuth } from '@/contexts/auth-context';
import { NodeConfigPanel } from '@/components/ui/node-config-panel';
import { getNodeById } from '@/lib/nodes/registry';
import { useRouter, useParams, usePathname } from 'next/navigation';

// Start with empty canvas - users can add nodes via AI or manually
const defaultNodes: Node[] = [];
const defaultEdges: Edge[] = [];

// Define custom node types
const nodeTypes = {
  trigger: TriggerNodeBase,
  action: ActionNodeBase,
  end: EndNodeBase,
  placeholder: PlaceholderNodeDemo,
  'workflow-node': WorkflowNode, // Generic node from library
};

// Define custom edge types
const edgeTypes = {
  buttonedge: ButtonEdgeDemo,
};

interface ReactFlowEditorProps {
  workflowId?: string | null; // Optional: if provided, loads workflow on mount
  workflowName?: string; // Optional: workflow name for saving
  onWorkflowLoaded?: (workflow: Workflow) => void; // Optional: callback when workflow loads
  onWorkflowSaved?: (workflow: Workflow) => void; // Optional: callback when workflow saves
  autoSave?: boolean; // Optional: enable auto-save (default: false)
  autoSaveInterval?: number; // Optional: auto-save interval in ms (default: 30000)
  onRegisterUpdateCallback?: (callback: (nodes: Node[], edges: Edge[]) => void) => void; // Optional: register update callback for external updates
  onConfigurationStatusChange?: (status: { unconfiguredCount: number; configuredCount: number; totalCount: number }) => void; // Optional: callback when configuration status changes
  onRegisterConfigureCallback?: (callback: () => void) => void; // Optional: register callback to open first unconfigured node
  onRegisterExecuteCallback?: (callback: () => Promise<void>) => void; // Optional: register execute callback for external execution
  onExecutionStateChange?: (state: { isExecuting: boolean; executionStatus: 'idle' | 'queued' | 'running' | 'success' | 'failed'; hasNodes: boolean }) => void; // Optional: callback when execution state changes
  activeView?: 'workspace' | 'executions' | 'settings'; // Optional: active view to display
  onActiveViewChange?: (view: 'workspace' | 'executions' | 'settings') => void; // Optional: callback when view changes
  onRegisterUndoRedoCallbacks?: (callbacks: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }) => void; // Optional: register undo/redo callbacks
}

export const ReactFlowEditor = ({
  workflowId,
  workflowName = 'Untitled Workflow',
  onWorkflowLoaded,
  onWorkflowSaved,
  autoSave = false,
  autoSaveInterval = 30000,
  onRegisterUpdateCallback,
  onConfigurationStatusChange,
  onRegisterConfigureCallback,
  onRegisterExecuteCallback,
  onExecutionStateChange,
  activeView = 'workspace',
  onActiveViewChange,
  onRegisterUndoRedoCallbacks,
}: ReactFlowEditorProps = {}) => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const [nodes, setNodes] = useState<Node[]>(defaultNodes);
  const [edges, setEdges] = useState<Edge[]>(defaultEdges);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null); // Start as null, will be set after load
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const reactFlowInstance = useRef<ReactFlowInstance<any, any> | null>(null);
  const [reactFlowKey, setReactFlowKey] = useState(0); // Force re-render key
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');
  
  // Undo/Redo history
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([{ nodes: defaultNodes, edges: defaultEdges }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoOperation = useRef(false);
  
  const orientEdges = useCallback(
    (edgeList: Edge[], direction: 'LR' | 'TB'): Edge[] => {
      const isVertical = direction === 'TB';
      const sourcePosition = isVertical ? Position.Bottom : Position.Right;
      const targetPosition = isVertical ? Position.Top : Position.Left;

      return edgeList.map((edge) =>
        ({
          ...edge,
          sourcePosition,
          targetPosition,
          type: edge.type || 'buttonedge',
          style: {
            stroke: 'hsl(var(--primary))',
            strokeWidth: 2,
            ...(edge.style || {}),
          },
        } as any)
      ) as Edge[];
    },
    []
  );
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<WorkflowExecutionResult | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'queued' | 'running' | 'success' | 'failed'>('idle');
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Configuration state
  const [selectedNodeForConfig, setSelectedNodeForConfig] = useState<Node | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'buttonedge' as const,
      animated: true,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      sourcePosition: layoutDirection === 'TB' ? Position.Bottom : Position.Right,
      targetPosition: layoutDirection === 'TB' ? Position.Top : Position.Left,
    }),
    [layoutDirection]
  );

  // Function to update workflow from external source (like AI generation)
  const updateWorkflow = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    // Capture current historyIndex at the time of call
    const currentHistoryIndex = historyIndex;
    console.log('🔥 updateWorkflow called with:', newNodes.length, 'nodes and', newEdges.length, 'edges');
    console.log('AI Nodes structure:', JSON.stringify(newNodes, null, 2));
    console.log('AI Edges structure:', JSON.stringify(newEdges, null, 2));
    
    // Transform nodes to ensure they have all required React Flow properties
    const transformedNodes = newNodes.map((node: any) => {
      // Ensure the node has a label in data
      const nodeData = {
        ...node.data,
        label: node.data?.label || node.data?.metadata?.name || 'Untitled Node',
      };
      
      return {
        ...node,
        data: nodeData,
        // Ensure required React Flow properties exist
        type: node.type || 'workflow-node',
        position: node.position || { x: 0, y: 0 },
      };
    });
    
    console.log('Transformed nodes:', JSON.stringify(transformedNodes, null, 2));
    
    // 🎯 Apply Dagre auto-layout for optimal positioning
    console.log('🎨 Applying Dagre auto-layout...');
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      transformedNodes,
      newEdges,
      { direction: 'LR' } // Left-to-right layout
    );
    
    console.log('✨ Layout applied! New positions:', layoutedNodes.map(n => ({ 
      id: n.id, 
      position: n.position 
    })));
    console.log('🔥 About to call setNodes and setEdges SYNCHRONOUSLY...');
    
    // Use flushSync to force synchronous state updates BEFORE changing the key
    flushSync(() => {
      const layoutedNodesWithDirection = layoutedNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          layoutDirection,
        },
      }));
      setNodes([...layoutedNodesWithDirection]);
      const orientedEdges = orientEdges(layoutedEdges, layoutDirection);
      setEdges([...orientedEdges]);
      // Save to history when updating from external source (e.g., AI generation)
      setHistory((prev) => {
        const newHistory = prev.slice(0, currentHistoryIndex + 1);
        newHistory.push({ nodes: layoutedNodesWithDirection, edges: orientedEdges });
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
      setHasChanges(true);
    });
    
    console.log('🔥 State updated synchronously! Now changing key...');
    
    // NOW change the key after state is guaranteed to be updated
    flushSync(() => {
      setReactFlowKey(prev => {
        const newKey = prev + 1;
        console.log('🔥 Key changed from', prev, 'to', newKey);
        return newKey;
      });
    });
    
    console.log('🔥 React Flow should now re-mount with NEW nodes!');
    
    // Fit view to new nodes with multiple attempts to ensure visibility
    setTimeout(() => {
      if (reactFlowInstance.current) {
        console.log('🎯 First fitView attempt...');
        reactFlowInstance.current.fitView({ 
          padding: 0.2, 
          includeHiddenNodes: true,
          duration: 200 
        });
      }
    }, 100);
    
    setTimeout(() => {
      if (reactFlowInstance.current) {
        console.log('🎯 Second fitView attempt (delayed)...');
        reactFlowInstance.current.fitView({ 
          padding: 0.2, 
          includeHiddenNodes: true,
          duration: 400 
        });
      }
    }, 500);
  }, [historyIndex, layoutDirection, orientEdges]);

  // Register update callback with parent
  useEffect(() => {
    if (onRegisterUpdateCallback) {
      onRegisterUpdateCallback(updateWorkflow);
    }
  }, [onRegisterUpdateCallback, updateWorkflow]);

  // Register configure callback with parent
  useEffect(() => {
    if (onRegisterConfigureCallback) {
      const configureFirstUnconfigured = () => {
        const firstUnconfigured = getUnconfiguredNodes()[0];
        if (firstUnconfigured) {
          openNodeConfig(firstUnconfigured);
        }
      };
      onRegisterConfigureCallback(configureFirstUnconfigured);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterConfigureCallback]);


  // Notify execution state changes
  useEffect(() => {
    if (onExecutionStateChange) {
      onExecutionStateChange({
        isExecuting,
        executionStatus,
        hasNodes: nodes.length > 0,
      });
    }
  }, [isExecuting, executionStatus, nodes.length, onExecutionStateChange]);

  // Notify configuration status changes
  const lastConfigStatus = useRef({ unconfiguredCount: 0, configuredCount: 0, totalCount: 0 });
  useEffect(() => {
    if (onConfigurationStatusChange && nodes.length > 0) {
      const unconfiguredCount = getUnconfiguredNodes().length;
      const configuredCount = getConfiguredNodesCount();
      const totalCount = nodes.length;
      
      // Only call if values actually changed
      if (
        lastConfigStatus.current.unconfiguredCount !== unconfiguredCount ||
        lastConfigStatus.current.configuredCount !== configuredCount ||
        lastConfigStatus.current.totalCount !== totalCount
      ) {
        lastConfigStatus.current = { unconfiguredCount, configuredCount, totalCount };
        onConfigurationStatusChange({
          unconfiguredCount,
          configuredCount,
          totalCount,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // Debug: Log nodes state changes
  useEffect(() => {
    console.log('🟢 NODES STATE CHANGED!');
    console.log('🟢 Total nodes:', nodes.length);
    console.log('🟢 React Flow Key:', reactFlowKey);
    console.log('🟢 Nodes:', nodes.map(n => ({ id: n.id, type: n.type, label: n.data?.label })));
  }, [nodes, reactFlowKey]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const newNodes = applyNodeChanges(changes, nds);
        // Save to history if not an undo/redo operation
        if (!isUndoRedoOperation.current) {
          setHistory((prev) => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push({ nodes: newNodes, edges });
            return newHistory;
          });
          setHistoryIndex((prev) => prev + 1);
        }
        return newNodes;
      });
    },
    [edges, historyIndex]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const newEdges = applyEdgeChanges(changes, eds);
        // Save to history if not an undo/redo operation
        if (!isUndoRedoOperation.current) {
          setHistory((prev) => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push({ nodes, edges: newEdges });
            return newHistory;
          });
          setHistoryIndex((prev) => prev + 1);
        }
        return newEdges;
      });
    },
    [nodes, historyIndex]
  );

  const applyLayout = useCallback(
    (direction: 'LR' | 'TB') => {
      if (!nodes.length) {
        setLayoutDirection(direction);
        return;
      }

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, { direction });
      const currentHistoryIndex = historyIndex;

      const layoutedNodesWithDirection = layoutedNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          layoutDirection: direction,
        },
      }));

      setNodes([...layoutedNodesWithDirection]);
      const orientedEdges = orientEdges(layoutedEdges, direction);
      setEdges([...orientedEdges]);
      setHistory((prev) => {
        const newHistory = prev.slice(0, currentHistoryIndex + 1);
        newHistory.push({ nodes: layoutedNodesWithDirection, edges: orientedEdges });
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
      setHasChanges(true);
      setLayoutDirection(direction);

      requestAnimationFrame(() => {
        if (reactFlowInstance.current) {
          reactFlowInstance.current.fitView({ padding: 0.2, includeHiddenNodes: true, duration: 200 });
        }
      });
    },
    [nodes, edges, historyIndex, orientEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const orientedEdge = {
        ...params,
        id: `${params.source}-${params.target}`,
        type: 'buttonedge',
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        sourcePosition: layoutDirection === 'TB' ? Position.Bottom : Position.Right,
        targetPosition: layoutDirection === 'TB' ? Position.Top : Position.Left,
      } as any;
      setEdges((eds) => {
        const newEdges = addEdge(orientedEdge, eds);
        // Save to history
        setHistory((prev) => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push({ nodes, edges: newEdges });
          return newHistory;
        });
        setHistoryIndex((prev) => prev + 1);
        return newEdges;
      });
      setHasChanges(true);
    },
    [nodes, historyIndex, layoutDirection]
  );
  
  // Undo function
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    const prevState = history[historyIndex - 1];
    if (!prevState) return;

    isUndoRedoOperation.current = true;
    setNodes(prevState.nodes ? [...prevState.nodes] : []);
    setEdges(prevState.edges ? [...prevState.edges] : []);
    setHistoryIndex((prev) => Math.max(prev - 1, 0));
    setHasChanges(true);
    setTimeout(() => {
      isUndoRedoOperation.current = false;
    }, 0);
  }, [history, historyIndex]);
  
  // Redo function
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const nextState = history[historyIndex + 1];
    if (!nextState) return;

    isUndoRedoOperation.current = true;
    setNodes(nextState.nodes ? [...nextState.nodes] : []);
    setEdges(nextState.edges ? [...nextState.edges] : []);
    setHistoryIndex((prev) => Math.min(prev + 1, history.length - 1));
    setHasChanges(true);
    setTimeout(() => {
      isUndoRedoOperation.current = false;
    }, 0);
  }, [history, historyIndex]);
  
  // Register undo/redo callbacks
  useEffect(() => {
    if (onRegisterUndoRedoCallbacks) {
      onRegisterUndoRedoCallbacks({
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
      });
    }
  }, [onRegisterUndoRedoCallbacks, undo, redo, historyIndex, history.length]);

  // Load workflow on mount or when workflowId changes
  useEffect(() => {
    // Load if:
    // 1. We have a workflowId
    // 2. We haven't loaded it yet (currentWorkflowId is different)
    // 3. We're not already loading
    if (workflowId && workflowId !== currentWorkflowId && !isLoading) {
      console.log('🔄 WorkflowId changed or component mounted, loading workflow:', workflowId);
      loadWorkflow(workflowId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // Track changes to nodes and edges
  useEffect(() => {
    if (workflow) {
      setHasChanges(true);
    }
  }, [nodes, edges]);

  // Auto-save functionality
  useEffect(() => {
    // Don't auto-save if:
    // - Auto-save is disabled
    // - No changes to save
    // - Already saving
    // - No workflow ID
    // - No nodes (empty workflow)
    if (!autoSave || !hasChanges || isSaving || !currentWorkflowId || nodes.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      handleSave();
    }, autoSaveInterval);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, autoSave, autoSaveInterval, hasChanges, isSaving, currentWorkflowId]);

  // Load workflow from API
  const loadWorkflow = async (id: string) => {
    setIsLoading(true);
    try {
      console.log('📥 Loading workflow from database:', id);
      const loadedWorkflow = await getWorkflow(id);
      console.log('📦 Workflow loaded:', loadedWorkflow.name, 'Has data:', !!loadedWorkflow.workflow_data);
      
      if (loadedWorkflow.workflow_data) {
        const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(
          loadedWorkflow.workflow_data
        );
        console.log('📊 Deserialized:', loadedNodes.length, 'nodes,', loadedEdges.length, 'edges');
        const loadedNodesWithDirection = loadedNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            layoutDirection,
          },
        }));
        setNodes(loadedNodesWithDirection);
        const orientedEdges = orientEdges(loadedEdges, layoutDirection);
        setEdges(orientedEdges);
        // Initialize history with loaded workflow
        setHistory([{ nodes: loadedNodesWithDirection, edges: orientedEdges }]);
        setHistoryIndex(0);
      } else {
        console.log('⚠️ Workflow has no workflow_data, using empty nodes/edges');
        setNodes([]);
        setEdges([]);
        // Initialize history with empty workflow
        setHistory([{ nodes: [], edges: [] }]);
        setHistoryIndex(0);
      }
      
      setCurrentWorkflowId(loadedWorkflow.id);
      setWorkflow(loadedWorkflow);
      setHasChanges(false);
      
      // Always call onWorkflowLoaded callback, even if workflow is empty
      if (onWorkflowLoaded) {
        console.log('📢 Calling onWorkflowLoaded callback');
        onWorkflowLoaded(loadedWorkflow);
      }
    } catch (error: any) {
      console.error('❌ Error loading workflow:', error);
      // If workflow not found or error, use default nodes/edges and still notify parent
      setNodes([]);
      setEdges([]);
      
      // Still call callback with empty workflow so parent knows we tried to load
      if (onWorkflowLoaded) {
        console.log('📢 Calling onWorkflowLoaded callback (error case, empty workflow)');
        onWorkflowLoaded({
          id: id,
          name: workflowName,
          workflow_data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
          status: 'draft',
          user_id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save workflow to API
  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      console.log('💾 Saving workflow:', {
        id: currentWorkflowId,
        name: workflowName,
        nodeCount: nodes.length,
        edgeCount: edges.length
      });
      
      const savedWorkflow = await saveWorkflowFromEditor(
        currentWorkflowId,
        workflowName,
        nodes,
        edges,
        {
          description: workflow?.description || undefined,
          ai_prompt: workflow?.ai_prompt || undefined,
          status: workflow?.status || 'draft',
        }
      );
      
      console.log('✅ Workflow saved successfully:', savedWorkflow.id);
      
      setCurrentWorkflowId(savedWorkflow.id);
      setWorkflow(savedWorkflow);
      setHasChanges(false);
      
      if (onWorkflowSaved) {
        onWorkflowSaved(savedWorkflow);
      }
    } catch (error: any) {
      console.error('❌ Error saving workflow:', error);
      // Silently log errors - don't interrupt user workflow
      // The save indicator will show "Unsaved changes" which is enough feedback
    } finally {
      setIsSaving(false);
    }
  };

  // Configuration helpers
  const isNodeConfigured = (node: Node): boolean => {
    const nodeData = (node.data ?? {}) as any;
    const nodeDefinition = getNodeById(nodeData.nodeId ?? "");
    if (!nodeDefinition || !nodeDefinition.configSchema) return true; // No config needed
    
    const schema = nodeDefinition.configSchema;
    
    // If no required fields, node is configured
    const hasRequiredFields = Object.values(schema).some((field: any) => field.required);
    if (!hasRequiredFields) return true;
    
    const config = nodeData.config || {};
    
    // Check if all required fields are filled with actual values
    for (const [key, fieldSchema] of Object.entries(schema)) {
      const field = fieldSchema as any;
      if (field.required) {
        const value = config[key];
        // Check for falsy values OR empty strings
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return false;
        }
      }
    }
    
    return true;
  };

  const getUnconfiguredNodes = (): Node[] => {
    return nodes.filter(node => !isNodeConfigured(node));
  };

  const getConfiguredNodesCount = (): number => {
    return nodes.filter(node => isNodeConfigured(node)).length;
  };

  const validateWorkflowConfiguration = useCallback((): { valid: boolean; message?: string; nodes?: Node[] } => {
    const unconfigured = getUnconfiguredNodes();
    
    if (unconfigured.length > 0) {
      return {
        valid: false,
        message: `${unconfigured.length} node(s) need configuration before running`,
        nodes: unconfigured
      };
    }
    
    return { valid: true };
  }, [nodes]);

  // Open config panel for a node
  const openNodeConfig = (node: Node) => {
    setSelectedNodeForConfig(node);
    setShowConfigPanel(true);
  };

  // Update node configuration
  const handleNodeConfigUpdate = (nodeId: string, newConfig: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config: newConfig,
            },
          };
        }
        return node;
      })
    );
    setHasChanges(true);
    setShowConfigPanel(false);
    setSelectedNodeForConfig(null);
  };

  // Poll for execution status
  const pollExecutionStatus = useCallback(async (executionId: string) => {
    try {
      const response = await fetch(`/api/workflow/execution/${executionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Execution not found yet, keep polling
          return;
        }
        throw new Error('Failed to get execution status');
      }

      const result: WorkflowExecutionResult = await response.json();
      
      setExecutionResult(result);
      
      // Update status
      if (result.status === 'success' || result.status === 'failed' || result.status === 'partial') {
        setExecutionStatus(result.status === 'success' ? 'success' : 'failed');
        setIsExecuting(false);
        setShowLogs(true);
        
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else if (result.status === 'running' || result.status === 'queued') {
        setExecutionStatus('running');
        // Continue polling
      }
    } catch (error: any) {
      console.error('Error polling execution status:', error);
      // Continue polling on error
    }
  }, []);

  // Execute workflow
  const executeWorkflow = useCallback(async () => {
    console.log('🚀 executeWorkflow called', { user: !!user, isExecuting, nodeCount: nodes.length });
    
    if (!user || isExecuting || nodes.length === 0) {
      console.log('❌ Execution blocked:', { user: !!user, isExecuting, nodeCount: nodes.length });
      return;
    }

    // Validate configuration first
    const validation = validateWorkflowConfiguration();
    console.log('✅ Validation result:', validation);
    if (!validation.valid) {
      // Show which nodes need configuration
      const nodeNames = validation.nodes?.map(n => {
        const nodeData = (n.data ?? {}) as any;
        return nodeData.label || n.id;
      }).join(', ') || 'some nodes';
      alert(`${validation.message}\n\nPlease configure: ${nodeNames}`);
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setShowLogs(false);
    setExecutionStatus('queued');
    
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    try {
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: currentWorkflowId || 'temp-workflow',
          nodes,
          edges,
          triggerData: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute workflow');
      }

      const data = await response.json();
      
      // Check if workflow is scheduled (has scheduled trigger)
      if (data.scheduled && data.status === 'scheduled') {
        // Workflow is now scheduled to run automatically
        setIsExecuting(false);
        setExecutionStatus('idle');
        setExecutionResult({
          executionId: 'scheduled',
          workflowId: currentWorkflowId || 'unknown',
          status: 'success',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 0,
          nodeResults: [],
          finalOutput: null,
        });
        return;
      }
      
      // For async Inngest execution, we get queued status
      // The executionId will be generated by Inngest when it creates the execution record
      // We need to wait for the execution record to be created, then poll
      if (data.status === 'queued') {
        // Find the execution by polling for the most recent one for this workflow
        const findExecution = async (): Promise<string | null> => {
          try {
            // Get most recent execution for this workflow
            const response = await fetch(`/api/workflows/${encodeURIComponent(currentWorkflowId || 'temp-workflow')}/executions`);
            if (response.ok) {
              const executions = await response.json();
              if (executions && executions.length > 0) {
                const latestExecution = executions[0];
                // Make sure it's recent (within last 30 seconds)
                const executionTime = new Date(latestExecution.created_at || latestExecution.started_at).getTime();
                const now = Date.now();
                if (now - executionTime < 30000) {
                  return latestExecution.id;
                }
              }
            }
          } catch (error) {
            console.error('Error finding execution:', error);
          }
          return null;
        };
        
        // Start trying to find the execution immediately
        const startPolling = async () => {
          let executionId: string | null = null;
          let attempts = 0;
          const maxAttempts = 10; // Try for 10 seconds
          
          while (!executionId && attempts < maxAttempts) {
            executionId = await findExecution();
            if (executionId) {
              setCurrentExecutionId(executionId);
              
              // Start polling every 1 second for status updates
              pollingIntervalRef.current = setInterval(() => {
                pollExecutionStatus(executionId!);
              }, 1000);
              
              // Initial poll
              pollExecutionStatus(executionId);
              return;
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Couldn't find execution after max attempts
          if (!executionId) {
            setExecutionStatus('failed');
            setIsExecuting(false);
            setExecutionResult({
              executionId: 'unknown',
              workflowId: currentWorkflowId || 'unknown',
              status: 'failed',
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              duration: 0,
              nodeResults: [],
              finalOutput: null,
              error: 'Execution started but could not track status. Check Inngest dashboard.',
            });
          }
        };
        
        // Wait a moment for Inngest to create the execution record, then start polling
        setTimeout(startPolling, 1000);
      } else {
        // Direct result (shouldn't happen with Inngest, but handle it)
        setExecutionResult(data);
        setExecutionStatus(data.status === 'success' ? 'success' : 'failed');
        setIsExecuting(false);
        setShowLogs(true);
      }
    } catch (error: any) {
      console.error('Execution error:', error);
      setExecutionResult({
        executionId: 'error',
        workflowId: currentWorkflowId || 'unknown',
        status: 'failed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 0,
        nodeResults: [],
        finalOutput: null,
        error: error.message || 'Execution failed',
      });
      setExecutionStatus('failed');
      setIsExecuting(false);
      setShowLogs(true);
      
      // Clear polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [user, isExecuting, nodes, edges, currentWorkflowId, validateWorkflowConfiguration, pollExecutionStatus]);

  // Register execute callback with parent (after executeWorkflow is defined)
  useEffect(() => {
    if (onRegisterExecuteCallback) {
      const executeWrapper = async () => {
        await executeWorkflow();
      };
      onRegisterExecuteCallback(executeWrapper);
    }
  }, [onRegisterExecuteCallback, executeWorkflow]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Reset execution status when workflow changes
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setExecutionStatus('idle');
    setExecutionResult(null);
    setIsExecuting(false);
    setCurrentExecutionId(null);
  }, [currentWorkflowId]);

  // Inject onConfigure callback into all nodes
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        layoutDirection,
        onConfigure: () => openNodeConfig(node),
      }
    }));
  }, [nodes, layoutDirection]);

  useEffect(() => {
    setNodes((prev) => {
      let changed = false;

      const nextNodes = prev.map((node) => {
        const currentDirection = node.data?.layoutDirection;
        if (currentDirection === layoutDirection) {
          return node;
        }
        changed = true;
        return {
          ...node,
          data: {
            ...node.data,
            layoutDirection,
          },
        };
      });

      return changed ? nextNodes : prev;
    });
  }, [layoutDirection]);
  
  useEffect(() => {
    setEdges((prevEdges) => orientEdges(prevEdges, layoutDirection));
  }, [layoutDirection, orientEdges]);

  // Expose save function via ref or return it
  // For now, we'll just handle auto-save and manual save can be added via a button

  if (isLoading) {
    return (
      <div className="h-full w-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }} className="bg-background relative">
      <ReactFlow
        key={reactFlowKey}
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{
          stroke: 'hsl(var(--primary))',
          strokeWidth: 2,
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(event, node) => {
          // Check if the click target is a button or inside a button
          const target = event.target as HTMLElement;
          const isButton = target.tagName === 'BUTTON' || 
                          target.closest('button') !== null ||
                          target.closest('[role="button"]') !== null;
          
          // Only open config if not clicking on a button
          if (!isButton) {
            event.preventDefault();
            openNodeConfig(node);
          }
        }}
        onNodeDoubleClick={(event, node) => {
          event.preventDefault();
          openNodeConfig(node);
        }}
        onInit={(instance) => {
          console.log('🎯 React Flow instance initialized with key:', reactFlowKey);
          reactFlowInstance.current = instance;
        }}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={4}
        className="bg-background"
        proOptions={{ hideAttribution: true }}
        panOnScroll={false}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={true}
      >
        <Background />
        <Controls>
          <ControlButton
            onClick={(event) => {
              event.stopPropagation();
              applyLayout('LR');
            }}
            title="Layout horizontally"
            aria-label="Layout horizontally"
            className={layoutDirection === 'LR' ? 'bg-primary text-primary-foreground' : undefined}
          >
            <HorizontalWorkflowIcon className="h-4 w-4" />
          </ControlButton>
          <ControlButton
            onClick={(event) => {
              event.stopPropagation();
              applyLayout('TB');
            }}
            title="Layout vertically"
            aria-label="Layout vertically"
            className={layoutDirection === 'TB' ? 'bg-primary text-primary-foreground' : undefined}
          >
            <VerticalWorkflowIcon className="h-4 w-4" />
          </ControlButton>
        </Controls>
        <MiniMap />
      </ReactFlow>


      {/* Node Configuration Panel */}
      {showConfigPanel && selectedNodeForConfig && (
        <NodeConfigPanel
          node={selectedNodeForConfig}
          onUpdate={handleNodeConfigUpdate}
          onClose={() => {
            setShowConfigPanel(false);
            setSelectedNodeForConfig(null);
          }}
        />
      )}

      {/* Execution Status Indicator */}
      {(isExecuting || executionStatus === 'queued' || executionStatus === 'running') && !executionResult && (
        <div className="absolute bottom-4 left-4 z-10 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            <div>
              <h3 className="font-semibold text-sm">
                {executionStatus === 'queued' ? 'Workflow Queued' : 'Workflow Running'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {executionStatus === 'queued' 
                  ? 'Waiting for execution to start...' 
                  : 'Executing nodes...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Execution Results Panel */}
      {executionResult && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {executionResult.status === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <h3 className="font-semibold">
                  {(executionResult as any)?.message ? 'Scheduled Execution Enabled' : executionResult.status === 'success' ? 'Execution Successful' : 'Execution Failed'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {executionResult.nodeResults && executionResult.nodeResults.length > 0 ? (
                    <>Duration: {executionResult.duration}ms | {executionResult.nodeResults.length} nodes processed</>
                  ) : (
                    <>Scheduled workflow will run automatically</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {executionResult.nodeResults && executionResult.nodeResults.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogs(!showLogs)}
                  className="gap-2"
                >
                  {showLogs ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  {showLogs ? 'Hide Logs' : 'Show Logs'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExecutionResult(null)}
              >
                Close
              </Button>
            </div>
          </div>

          {/* Logs */}
          {showLogs && executionResult.nodeResults && executionResult.nodeResults.length > 0 && (
            <div className="p-4 max-h-64 overflow-y-auto space-y-2">
              {executionResult.nodeResults.map((nodeResult, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${
                    nodeResult.status === 'success'
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {nodeResult.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium text-sm">{nodeResult.nodeName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{nodeResult.duration}ms</span>
                  </div>
                  {nodeResult.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      Error: {nodeResult.error}
                    </p>
                  )}
                  {nodeResult.logs && nodeResult.logs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {nodeResult.logs.map((log, logIndex) => (
                        <p key={logIndex} className="text-xs text-muted-foreground font-mono">
                          [{log.level}] {log.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(executionResult as any)?.message && (
                <div className="p-3 rounded-md border bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {(executionResult as any).message}
                  </p>
                </div>
              )}
              {executionResult.error && (
                <div className="p-3 rounded-md border bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    <strong>Error:</strong> {executionResult.error}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Export save function for external use
export type { ReactFlowEditorProps };
