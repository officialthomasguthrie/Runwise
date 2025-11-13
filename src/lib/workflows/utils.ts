/**
 * Workflow Utility Functions
 * Helper functions for workflow serialization and management
 */

import type { WorkflowData } from './types';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';

/**
 * Validate workflow data structure
 */
export function validateWorkflowData(data: any): data is WorkflowData {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  if (!Array.isArray(data.nodes)) {
    return false;
  }
  
  if (!Array.isArray(data.edges)) {
    return false;
  }
  
  // Validate nodes
  for (const node of data.nodes) {
    if (!node.id || !node.type || !node.position || !node.data) {
      return false;
    }
  }
  
  // Validate edges
  for (const edge of data.edges) {
    if (!edge.id || !edge.source || !edge.target) {
      return false;
    }
  }
  
  return true;
}

/**
 * Convert React Flow nodes/edges to serializable format
 */
export function serializeWorkflow(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): WorkflowData {
  return {
    nodes: nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
      ...(node.width && { width: node.width }),
      ...(node.height && { height: node.height }),
      ...(node.selected && { selected: node.selected }),
      ...(node.dragging && { dragging: node.dragging }),
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      ...(edge.animated !== undefined && { animated: edge.animated }),
      ...(edge.style && { style: edge.style }),
      ...(edge.label && { label: edge.label }),
      ...(edge.sourceHandle && { sourceHandle: edge.sourceHandle }),
      ...(edge.targetHandle && { targetHandle: edge.targetHandle }),
    })),
  };
}

/**
 * Deserialize workflow data to React Flow format
 */
export function deserializeWorkflow(workflowData: WorkflowData): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} {
  return {
    nodes: workflowData.nodes.map(node => ({
      ...node,
      // Ensure required properties
      id: node.id,
      type: node.type || 'default',
      position: node.position || { x: 0, y: 0 },
      data: node.data || {},
    })),
    edges: workflowData.edges.map(edge => ({
      ...edge,
      // Ensure required properties
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'default',
    })),
  };
}

/**
 * Create a default empty workflow
 */
export function createEmptyWorkflow(): WorkflowData {
  return {
    nodes: [],
    edges: [],
  };
}

