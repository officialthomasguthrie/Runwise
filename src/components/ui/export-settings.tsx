"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";

import { Download, Loader2, Workflow } from "lucide-react";
interface WorkflowCircle01Icon {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

export function ExportSettings() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowCircle01Icon[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkflows = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('workflows')
          .select('id, name, status, updated_at')
          .eq('user_id', authUser.id)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error loading workflows:', error);
          setWorkflows([]);
        } else {
          setWorkflows(data ?? []);
        }
      } catch (error) {
        console.error('Unexpected error loading workflows:', error);
        setWorkflows([]);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflows();
  }, [user]);

  const handleExport = async (workflowId: string, workflowName: string) => {
    setExportingId(workflowId);
    try {
      const supabase = createClient();
      
      // Fetch the full workflow data
      const { data: workflow, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error || !workflow) {
        console.error('Error fetching workflow:', error);
        alert('Failed to export workflow. Please try again.');
        return;
      }

      // Extract nodes and edges from workflow_data
      // The workflow_data field contains the serialized nodes and edges from the canvas
      const workflowAny = workflow as any;
      let nodes: any[] = [];
      let edges: any[] = [];
      
      if (workflowAny.workflow_data && typeof workflowAny.workflow_data === 'object') {
        // workflow_data is the standard format - it contains nodes and edges
        const workflowData = workflowAny.workflow_data;
        nodes = Array.isArray(workflowData.nodes) ? workflowData.nodes : [];
        edges = Array.isArray(workflowData.edges) ? workflowData.edges : [];
      } else if (workflowAny.nodes && workflowAny.edges) {
        // Fallback: check if nodes/edges are stored directly on workflow (legacy format)
        nodes = Array.isArray(workflowAny.nodes) ? workflowAny.nodes : [];
        edges = Array.isArray(workflowAny.edges) ? workflowAny.edges : [];
      }

      // Create a comprehensive export object with all canvas data
      // This includes everything needed to recreate the workflow on the canvas
      const exportData = {
        id: workflowAny.id,
        name: workflowAny.name,
        description: workflowAny.description || null,
        status: workflowAny.status,
        // Include the full canvas structure - all node properties
        nodes: nodes.map((node: any) => ({
          id: node.id,
          type: node.type || 'workflow-node',
          position: node.position || { x: 0, y: 0 },
          data: node.data || {}, // This includes node configuration, labels, metadata, etc.
          ...(node.width !== undefined && { width: node.width }),
          ...(node.height !== undefined && { height: node.height }),
          ...(node.selected !== undefined && { selected: node.selected }),
          ...(node.dragging !== undefined && { dragging: node.dragging }),
          ...(node.style && { style: node.style }),
          ...(node.className && { className: node.className }),
          ...(node.zIndex !== undefined && { zIndex: node.zIndex }),
          ...(node.hidden !== undefined && { hidden: node.hidden }),
          ...(node.parentNode && { parentNode: node.parentNode }),
          ...(node.extent && { extent: node.extent }),
          ...(node.expandParent !== undefined && { expandParent: node.expandParent }),
          ...(node.positionAbsolute && { positionAbsolute: node.positionAbsolute }),
        })),
        // Include the full edge structure - all edge properties
        edges: edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'default',
          ...(edge.animated !== undefined && { animated: edge.animated }),
          ...(edge.style && { style: edge.style }),
          ...(edge.label && { label: edge.label }),
          ...(edge.sourceHandle && { sourceHandle: edge.sourceHandle }),
          ...(edge.targetHandle && { targetHandle: edge.targetHandle }),
          ...(edge.markerEnd && { markerEnd: edge.markerEnd }),
          ...(edge.markerStart && { markerStart: edge.markerStart }),
          ...(edge.labelStyle && { labelStyle: edge.labelStyle }),
          ...(edge.labelShowBg !== undefined && { labelShowBg: edge.labelShowBg }),
          ...(edge.labelBgStyle && { labelBgStyle: edge.labelBgStyle }),
          ...(edge.labelBgPadding && { labelBgPadding: edge.labelBgPadding }),
          ...(edge.labelBgBorderRadius && { labelBgBorderRadius: edge.labelBgBorderRadius }),
          ...(edge.data && { data: edge.data }),
        })),
        // Include any additional workflow configuration
        config: workflowAny.config || {},
        ai_prompt: workflowAny.ai_prompt || null,
        ai_generated: workflowAny.ai_generated || false,
        created_at: workflowAny.created_at,
        updated_at: workflowAny.updated_at,
        // Export metadata
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        export_format: 'react-flow-v1'
      };

      // Convert to JSON string with pretty formatting
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create a blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workflowName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${workflowId.substring(0, 8)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting workflow:', error);
      alert('Failed to export workflow. Please try again.');
    } finally {
      setExportingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Export Workflows
          </h2>
          <p className="text-sm text-muted-foreground">
            Export any of your workflows as JSON files
          </p>
        </div>

        {/* Workflow Cards Skeleton */}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-5 w-48 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-16 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                      <div className="h-3 w-1 bg-gray-200 dark:bg-[#303030] rounded-full animate-pulse" />
                      <div className="h-3 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="h-9 w-28 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse ml-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Export Workflows
        </h2>
        <p className="text-sm text-muted-foreground">
          Export any of your workflows as JSON files
        </p>
      </div>

      {workflows.length === 0 ? (
        <div className="rounded-lg bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 rounded-full bg-muted/50">
              <Workflow className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">No workflows found</h3>
              <p className="text-xs text-muted-foreground">
                Create a workflow to export it as JSON
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="rounded-lg bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {workflow.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {workflow.status === 'active' ? 'Active' : workflow.status === 'draft' ? 'Draft' : 'Inactive'}
                      </p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(workflow.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleExport(workflow.id, workflow.name)}
                  disabled={exportingId === workflow.id}
                  variant="ghost"
                  size="sm"
                  className="ml-4 bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportingId === workflow.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export JSON
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

