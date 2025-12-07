/**
 * Workflow validation utilities
 * Validates that all required node configurations are properly set
 */

import type { Node } from '@xyflow/react';
import { getNodeById } from '@/lib/nodes/registry';

export interface ValidationResult {
  valid: boolean;
  message?: string;
  unconfiguredNodes?: Array<{
    nodeId: string;
    nodeLabel: string;
    missingFields: string[];
  }>;
}

/**
 * Checks if a single node is properly configured
 */
export function isNodeConfigured(node: Node): boolean {
  const nodeData = (node.data ?? {}) as any;
  const nodeDefinition = getNodeById(nodeData.nodeId ?? '');
  
  // Use custom node's configSchema if it's a CUSTOM_GENERATED node, otherwise use registry schema
  const schema = (nodeData.nodeId === 'CUSTOM_GENERATED' && nodeData.configSchema)
    ? nodeData.configSchema
    : nodeDefinition?.configSchema || {};
  
  if (!schema || Object.keys(schema).length === 0) {
    return true; // No config needed
  }
  
  // If no required fields, node is configured
  const hasRequiredFields = Object.values(schema).some((field: any) => field.required);
  if (!hasRequiredFields) {
    return true;
  }
  
  const config = nodeData.config || {};
  
  // Check if all required fields are filled with actual values
  for (const [key, fieldSchema] of Object.entries(schema)) {
    const field = fieldSchema as any;
    if (field.required) {
      const value = config[key];
      // Check for falsy values OR empty strings
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Gets the list of missing required fields for a node
 */
export function getMissingFields(node: Node): string[] {
  const nodeData = (node.data ?? {}) as any;
  const nodeDefinition = getNodeById(nodeData.nodeId ?? '');
  
  const schema = (nodeData.nodeId === 'CUSTOM_GENERATED' && nodeData.configSchema)
    ? nodeData.configSchema
    : nodeDefinition?.configSchema || {};
  
  if (!schema || Object.keys(schema).length === 0) {
    return [];
  }
  
  const config = nodeData.config || {};
  const missingFields: string[] = [];
  
  for (const [key, fieldSchema] of Object.entries(schema)) {
    const field = fieldSchema as any;
    if (field.required) {
      const value = config[key];
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field.label || key);
      }
    }
  }
  
  return missingFields;
}

/**
 * Validates that all nodes in a workflow are properly configured
 */
export function validateWorkflowConfiguration(nodes: Node[]): ValidationResult {
  if (!nodes || nodes.length === 0) {
    return {
      valid: false,
      message: 'Workflow has no nodes',
    };
  }
  
  const unconfiguredNodes: Array<{
    nodeId: string;
    nodeLabel: string;
    missingFields: string[];
  }> = [];
  
  for (const node of nodes) {
    if (!isNodeConfigured(node)) {
      const nodeData = (node.data ?? {}) as any;
      const nodeLabel = nodeData.label || nodeData.nodeId || node.id;
      const missingFields = getMissingFields(node);
      
      unconfiguredNodes.push({
        nodeId: node.id,
        nodeLabel,
        missingFields,
      });
    }
  }
  
  if (unconfiguredNodes.length > 0) {
    const nodeCount = unconfiguredNodes.length === 1 ? 'node' : 'nodes';
    const nodeLabels = unconfiguredNodes.map(n => n.nodeLabel).join(', ');
    
    return {
      valid: false,
      message: `${unconfiguredNodes.length} ${nodeCount} need configuration: ${nodeLabels}`,
      unconfiguredNodes,
    };
  }
  
  return {
    valid: true,
  };
}

