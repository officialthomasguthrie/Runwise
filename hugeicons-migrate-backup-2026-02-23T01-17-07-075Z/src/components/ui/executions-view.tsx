"use client";

import { useState, useEffect } from 'react';
import { loadUserExecutions, loadNodeExecutions, type WorkflowExecution, type NodeExecution } from '@/lib/workflow-executions/client';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from "@/lib/utils";
import { ExecutionErrorDisplay } from './execution-error-display';
import { normalizeError } from '@/lib/workflow-execution/error-normalization';

interface ExecutionsViewProps {
  workflowId?: string | null; // Optional: filter by workflow
  className?: string;
}

export function ExecutionsView({ workflowId, className }: ExecutionsViewProps) {
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
        console.error('Error loading executions:', err);
        setError(err);
        setExecutions([]);
      } else {
        // Filter by workflowId if provided
        const filtered = workflowId 
          ? execs.filter(e => e.workflow_id === workflowId)
          : execs;
        setExecutions(filtered);
        setError(null); // Clear any previous errors
      }
    } catch (err: any) {
      console.error('Unexpected error loading executions:', err);
      setError(err?.message || 'An unexpected error occurred');
      setExecutions([]);
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
        try {
          const { nodeExecutions: nodes, error: nodeError } = await loadNodeExecutions(executionId);
          if (nodeError) {
            console.error('Error loading node executions:', nodeError);
            // Still set empty array so UI doesn't show loading forever
            setNodeExecutions(prev => ({ ...prev, [executionId]: [] }));
          } else {
            setNodeExecutions(prev => ({ ...prev, [executionId]: nodes }));
          }
        } catch (err: any) {
          console.error('Unexpected error loading node executions:', err);
          setNodeExecutions(prev => ({ ...prev, [executionId]: [] }));
        } finally {
          setLoadingNodeExecutions(prev => ({ ...prev, [executionId]: false }));
        }
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
      <div className={cn("h-full flex flex-col pt-16", className)}>
        <div className="px-6 py-4 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl"
            >
              <div className="w-full px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Workflow name and status skeleton */}
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-32 bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
                      <div className="h-4 w-16 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                    </div>
                    {/* Date, duration, trigger skeleton */}
                    <div className="flex items-center gap-4">
                      <div className="h-3 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                      <div className="h-3 w-20 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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

  // Check if we're in a scrollable parent (runs page passes pt-0 to indicate this)
  const isInScrollableParent = className?.includes('pt-0');
  
  return (
    <div className={cn(isInScrollableParent ? "flex flex-col bg-background" : "h-full flex flex-col bg-background", className)}>
      {isInScrollableParent ? (
        <div className="px-6 py-4 space-y-2">
          {executions.map((execution) => {
            const isExpanded = expandedExecutionId === execution.id;
            const nodes = nodeExecutions[execution.id] || [];
            const isLoadingNodes = loadingNodeExecutions[execution.id];

            return (
              <div
                key={execution.id}
                className="rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl transition-all duration-300 text-foreground hover:shadow-md"
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
                        <span>
                          {execution.trigger_type === 'test' ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-medium">
                                Test
                              </span>
                            </span>
                          ) : (
                            `Trigger: ${execution.trigger_type}`
                          )}
                        </span>
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
                  <div className="px-4 pb-4 border-t border-stone-200 dark:border-white/10 pt-4 space-y-4">
                    {/* Error Message */}
                    {execution.error_message && (
                      <ExecutionErrorDisplay 
                        error={normalizeError(execution.error_message)} 
                      />
                    )}

                    {/* Node Executions */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Node Executions</h3>
                      {isLoadingNodes ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div
                              key={index}
                              className="p-3 bg-white/40 dark:bg-zinc-900/40 rounded-md"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-4 w-24 bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
                                <div className="h-3 w-16 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                              </div>
                              <div className="h-3 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse mt-1" />
                            </div>
                          ))}
                        </div>
                      ) : nodes.length > 0 ? (
                        <div className="space-y-2">
                          {nodes.map((node) => (
                            <div
                              key={node.id}
                              className="p-3 bg-white/40 dark:bg-zinc-900/40 rounded-md border border-stone-200 dark:border-white/10"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusIcon(node.status as any)}
                                <span className="text-sm font-medium">Node {node.node_id.slice(0, 8)}</span>
                                <span className={`text-xs font-medium ${getStatusColor(node.status as any)}`}>
                                  {node.status.toUpperCase()}
                                </span>
                              </div>
                              {node.error_message && (
                                <div className="mt-2">
                                  <ExecutionErrorDisplay 
                                    error={normalizeError(node.error_message, { nodeName: node.node_id })}
                                  />
                                </div>
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
                        <pre className="text-xs p-2 bg-white/40 dark:bg-zinc-900/40 rounded border border-stone-200 dark:border-white/10 overflow-auto max-h-32">
                          {JSON.stringify(execution.input_data, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium mb-2 text-muted-foreground">Output Data</h4>
                        <pre className="text-xs p-2 bg-white/40 dark:bg-zinc-900/40 rounded border border-stone-200 dark:border-white/10 overflow-auto max-h-32">
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
      ) : (
        <ScrollArea className="flex-1">
          <div className="px-6 py-4 pt-20 space-y-2">
            {executions.map((execution) => {
              const isExpanded = expandedExecutionId === execution.id;
              const nodes = nodeExecutions[execution.id] || [];
              const isLoadingNodes = loadingNodeExecutions[execution.id];

              return (
                <div
                  key={execution.id}
                  className="rounded-lg border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 dark:border-white/20 backdrop-blur-xl transition-all duration-300 text-foreground hover:shadow-md"
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
                          <span>
                            {execution.trigger_type === 'test' ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-medium">
                                  Test
                                </span>
                              </span>
                            ) : (
                              `Trigger: ${execution.trigger_type}`
                            )}
                          </span>
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
                    <div className="px-4 pb-4 border-t border-stone-200 dark:border-white/10 pt-4 space-y-4">
                      {execution.error_message && (
                        <ExecutionErrorDisplay 
                          error={normalizeError(execution.error_message)} 
                        />
                      )}

                      <div>
                        <h3 className="text-sm font-medium mb-2">Node Executions</h3>
                        {isLoadingNodes ? (
                          <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, index) => (
                              <div
                                key={index}
                                className="p-3 bg-white/40 dark:bg-zinc-900/40 rounded-md"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-4 w-24 bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
                                  <div className="h-3 w-16 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                                </div>
                                <div className="h-3 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse mt-1" />
                              </div>
                            ))}
                          </div>
                        ) : nodes.length > 0 ? (
                          <div className="space-y-2">
                            {nodes.map((node) => (
                              <div
                                key={node.id}
                                className="p-3 bg-white/40 dark:bg-zinc-900/40 rounded-md border border-stone-200 dark:border-white/10"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {getStatusIcon(node.status as any)}
                                  <span className="text-sm font-medium">Node {node.node_id.slice(0, 8)}</span>
                                  <span className={`text-xs font-medium ${getStatusColor(node.status as any)}`}>
                                    {node.status.toUpperCase()}
                                  </span>
                                </div>
                                {node.error_message && (
                                  <div className="mt-2">
                                    <ExecutionErrorDisplay 
                                      error={normalizeError(node.error_message, { nodeName: node.node_id })}
                                    />
                                  </div>
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

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-medium mb-2 text-muted-foreground">Input Data</h4>
                          <pre className="text-xs p-2 bg-white/40 dark:bg-zinc-900/40 rounded border border-stone-200 dark:border-white/10 overflow-auto max-h-32">
                            {JSON.stringify(execution.input_data, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium mb-2 text-muted-foreground">Output Data</h4>
                          <pre className="text-xs p-2 bg-white/40 dark:bg-zinc-900/40 rounded border border-stone-200 dark:border-white/10 overflow-auto max-h-32">
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
      )}
    </div>
  );
}

