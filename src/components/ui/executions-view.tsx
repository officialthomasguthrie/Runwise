"use client";

import { useState, useEffect } from 'react';
import { loadUserExecutions, loadNodeExecutions, type WorkflowExecution, type NodeExecution } from '@/lib/workflow-executions/client';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExecutionsViewProps {
  workflowId?: string | null; // Optional: filter by workflow
}

export function ExecutionsView({ workflowId }: ExecutionsViewProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedExecutionId, setExpandedExecutionId] = useState<string | null>(null);
  const [nodeExecutions, setNodeExecutions] = useState<Record<string, NodeExecution[]>>({});
  const [loadingNodeExecutions, setLoadingNodeExecutions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadExecutions();
  }, [workflowId]);

  const loadExecutions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For now, load all user executions
      // In the future, we can filter by workflowId if needed
      const { executions: execs, error: err } = await loadUserExecutions();
      
      if (err) {
        setError(err);
      } else {
        // Filter by workflowId if provided
        const filtered = workflowId 
          ? execs.filter(e => e.workflow_id === workflowId)
          : execs;
        setExecutions(filtered);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load executions');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExecution = async (executionId: string) => {
    if (expandedExecutionId === executionId) {
      setExpandedExecutionId(null);
    } else {
      setExpandedExecutionId(executionId);
      
      // Load node executions if not already loaded
      if (!nodeExecutions[executionId]) {
        setLoadingNodeExecutions(prev => ({ ...prev, [executionId]: true }));
        const { nodeExecutions: nodes } = await loadNodeExecutions(executionId);
        setNodeExecutions(prev => ({ ...prev, [executionId]: nodes }));
        setLoadingNodeExecutions(prev => ({ ...prev, [executionId]: false }));
      }
    }
  };

  const getStatusIcon = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'running':
        return 'text-blue-500';
      case 'cancelled':
        return 'text-gray-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading executions</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">No executions found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold">Execution History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {executions.length} {executions.length === 1 ? 'execution' : 'executions'}
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-2">
          {executions.map((execution) => {
            const isExpanded = expandedExecutionId === execution.id;
            const nodes = nodeExecutions[execution.id] || [];
            const isLoadingNodes = loadingNodeExecutions[execution.id];

            return (
              <div
                key={execution.id}
                className="border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <button
                  onClick={() => toggleExecution(execution.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(execution.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {execution.workflow_name || 'Untitled Workflow'}
                        </span>
                        <span className={`text-xs font-medium ${getStatusColor(execution.status)}`}>
                          {execution.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{formatDate(execution.started_at)}</span>
                        {execution.execution_time_ms && (
                          <span>Duration: {formatDuration(execution.execution_time_ms)}</span>
                        )}
                        <span>Trigger: {execution.trigger_type}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                    {/* Error Message */}
                    {execution.error_message && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                        <p className="text-sm font-medium text-red-500 mb-1">Error</p>
                        <p className="text-sm text-red-500/80">{execution.error_message}</p>
                      </div>
                    )}

                    {/* Node Executions */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Node Executions</h3>
                      {isLoadingNodes ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : nodes.length > 0 ? (
                        <div className="space-y-2">
                          {nodes.map((node) => (
                            <div
                              key={node.id}
                              className="p-3 bg-muted/50 rounded-md border border-border"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusIcon(node.status as any)}
                                <span className="text-sm font-medium">Node {node.node_id.slice(0, 8)}</span>
                                <span className={`text-xs font-medium ${getStatusColor(node.status as any)}`}>
                                  {node.status.toUpperCase()}
                                </span>
                              </div>
                              {node.error_message && (
                                <p className="text-xs text-red-500 mt-1">{node.error_message}</p>
                              )}
                              {node.execution_time_ms && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Duration: {formatDuration(node.execution_time_ms)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No node executions found</p>
                      )}
                    </div>

                    {/* Input/Output Data */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium mb-2 text-muted-foreground">Input Data</h4>
                        <pre className="text-xs p-2 bg-muted/50 rounded border border-border overflow-auto max-h-32">
                          {JSON.stringify(execution.input_data, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium mb-2 text-muted-foreground">Output Data</h4>
                        <pre className="text-xs p-2 bg-muted/50 rounded border border-border overflow-auto max-h-32">
                          {JSON.stringify(execution.output_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

