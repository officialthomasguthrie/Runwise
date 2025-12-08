/**
 * AI Workflow Converter
 * Converts AI-generated workflows to React Flow format
 */

import type { Node, Edge } from '@xyflow/react';
import type { AIGeneratedWorkflow } from './types';
import { getNodeById } from '@/lib/nodes';

/**
 * Convert AI-generated workflow to React Flow format
 */
export function convertAIGeneratedWorkflowToReactFlow(
  aiWorkflow: AIGeneratedWorkflow,
  options?: {
    appendToExisting?: boolean;
    offsetX?: number;
    offsetY?: number;
  }
): { nodes: Node[]; edges: Edge[] } {
  const { appendToExisting = false, offsetX = 0, offsetY = 0 } = options || {};

  // Convert nodes
  const nodes: Node[] = aiWorkflow.nodes.map((aiNode) => {
    // Get node definition to add label (only for library nodes)
    const nodeDef = getNodeById(aiNode.data.nodeId);
    // Use AI-provided label if available, otherwise use node definition name, otherwise use nodeId
    const nodeLabel = (aiNode.data as any).label || nodeDef?.name || aiNode.data.nodeId;

    return {
      id: aiNode.id,
      type: aiNode.type || 'workflow-node',
      position: {
        x: aiNode.position.x + offsetX,
        y: aiNode.position.y + offsetY,
      },
      data: {
        ...aiNode.data,
        label: nodeLabel, // Use AI-provided label or fallback to node definition
        // Preserve configSchema for custom nodes
        configSchema: aiNode.data.configSchema || nodeDef?.configSchema,
      },
      // Optional: Set default dimensions if not provided
      width: 320, // Standard node width
      height: undefined, // Let node auto-size
    };
  });

  // Convert edges
  const edges: Edge[] = aiWorkflow.edges.map((aiEdge) => {
    return {
      id: aiEdge.id,
      source: aiEdge.source,
      target: aiEdge.target,
      type: aiEdge.type || 'buttonedge',
      animated: aiEdge.animated !== undefined ? aiEdge.animated : true,
      style: aiEdge.style || {
        stroke: 'hsl(var(--primary))',
        strokeWidth: 2,
      },
    };
  });

  return { nodes, edges };
}

/**
 * Validate that all nodes in AI workflow exist in the library
 */
export function validateAIGeneratedWorkflow(
  aiWorkflow: AIGeneratedWorkflow
): { valid: boolean; missingNodes: string[] } {
  const missingNodes: string[] = [];

  for (const node of aiWorkflow.nodes) {
    // CUSTOM_GENERATED nodes are valid even if not in registry
    if (node.data.nodeId === 'CUSTOM_GENERATED') {
      continue;
    }
    const nodeDef = getNodeById(node.data.nodeId);
    if (!nodeDef) {
      missingNodes.push(node.data.nodeId);
    }
  }

  // Validate edges reference valid nodes
  const nodeIds = new Set(aiWorkflow.nodes.map((n) => n.id));
  const invalidEdges = aiWorkflow.edges.filter(
    (e) => !nodeIds.has(e.source) || !nodeIds.has(e.target)
  );

  if (invalidEdges.length > 0) {
    console.warn('Invalid edges found:', invalidEdges);
  }

  return {
    valid: missingNodes.length === 0,
    missingNodes,
  };
}

