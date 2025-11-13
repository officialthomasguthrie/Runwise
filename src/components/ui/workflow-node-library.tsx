/**
 * Generic Workflow Node Component
 * Renders any node from the node library using the same UI template
 */

import { memo } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import { Trash2, Zap } from "lucide-react";
import { getNodeById } from "@/lib/nodes/registry";
import type { NodeDefinition } from "@/lib/nodes/types";

type WorkflowNodeType = 'trigger' | 'action' | 'transform' | 'end';

interface WorkflowNodeProps {
  data: {
    nodeId?: string; // ID from node registry
    label?: string; // Fallback label
    config?: Record<string, any>; // Node configuration
    onConfigure?: () => void; // Callback to open configuration panel
    layoutDirection?: 'LR' | 'TB';
    [key: string]: any;
  };
  id: string;
}

/**
 * Icon name mappings for icons that don't exist or have different names in lucide-react
 */
const iconMappings: Record<string, string> = {
  'Table': 'Table2',
  'Trello': 'LayoutGrid', // Trello icon doesn't exist, use LayoutGrid
  'Webhook': 'Link', // Webhook icon doesn't exist, use Link
  'Merge': 'GitMerge', // Merge icon doesn't exist, use GitMerge
  'FileSpreadsheet': 'FileSpreadsheet', // Might be FileSpreadsheet2
  'FileCheck': 'FileCheck2',
  'Smartphone': 'Phone',
};

/**
 * Get Lucide icon component by name with fallbacks
 */
const getIcon = (iconName: string) => {
  // Check mappings first
  const mappedName = iconMappings[iconName] || iconName;
  
  // Try to get the icon
  let IconComponent = (LucideIcons as any)[mappedName];
  
  // Try variations
  if (!IconComponent) {
    IconComponent = (LucideIcons as any)[`${mappedName}2`];
  }
  if (!IconComponent) {
    IconComponent = (LucideIcons as any)[iconName.replace(/([A-Z])/g, '$1')];
  }
  
  // Final fallback
  if (!IconComponent) {
    IconComponent = Zap;
  }
  
  return IconComponent;
};

/**
 * Generic Workflow Node Component
 * Automatically renders based on node definition from registry
 */
export const WorkflowNode = memo(({ data, id }: WorkflowNodeProps) => {
  const { deleteElements } = useReactFlow();
  
  console.log('🟦 WorkflowNode RENDERING:', { id, nodeId: data.nodeId, label: data.label });
  
  // Get node definition from registry
  const nodeDefinition: NodeDefinition | undefined = data.nodeId
    ? getNodeById(data.nodeId)
    : undefined;

  console.log('🟦 Node definition:', nodeDefinition ? nodeDefinition.name : 'NOT FOUND');

  // Fallback to generic node if not found in registry
  const nodeType = (nodeDefinition?.type ?? data.type ?? 'action') as WorkflowNodeType;
  const nodeName = nodeDefinition?.name || data.label || 'Unknown Node';
  // Check for AI-generated description first, then library description
  const nodeDescription = data.description || data.metadata?.description || nodeDefinition?.description || 'No description available';
  const iconName = nodeDefinition?.icon || 'Zap';
  const configSchema = nodeDefinition?.configSchema || {};
  const requiredFields = Object.entries(configSchema).filter(([, schema]: [string, any]) => schema?.required);
  const config = data.config || {};
  const isConfigured = requiredFields.every(([key, schema]: [string, any]) => {
    const value = config[key];
    if (value === undefined || value === null) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return true;
  });
  const showConfigureButton = requiredFields.length > 0 && !isConfigured;
  
  const IconComponent = getIcon(iconName);
  
  // Determine handle positions based on node type
  const hasInput = nodeType === 'action' || nodeType === 'transform' || nodeType === 'end';
  const hasOutput = nodeType === 'trigger' || nodeType === 'action' || nodeType === 'transform';
  const layoutDirection = data.layoutDirection === 'TB' ? 'TB' : 'LR';
  const inputPosition = layoutDirection === 'TB' ? Position.Top : Position.Left;
  const outputPosition = layoutDirection === 'TB' ? Position.Bottom : Position.Right;
  const verticalHandleStyle =
    layoutDirection === 'TB'
      ? { left: '50%', transform: 'translate(-50%, 0)' }
      : undefined;

  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <BaseNode 
      className="w-80"
      style={{ 
        width: '320px', 
        maxWidth: '320px',
        display: 'block'
      }}
    >
      {/* Input Handle */}
      {hasInput && (
        <Handle
          type="target"
          position={inputPosition}
          id="input"
          className="w-3 h-3 bg-primary border-2 border-background"
          style={verticalHandleStyle}
        />
      )}
      
      {/* Output Handle */}
      {hasOutput && (
        <Handle
          type="source"
          position={outputPosition}
          id="output"
          className="w-3 h-3 bg-primary border-2 border-background"
          style={verticalHandleStyle}
        />
      )}

      {/* Node Header */}
      <BaseNodeHeader className="border-b">
        <div className="flex items-center gap-2 flex-1">
          <IconComponent className="size-4 text-muted-foreground" />
          <BaseNodeHeaderTitle>{nodeName}</BaseNodeHeaderTitle>
        </div>
        <Button
          onClick={handleDelete}
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-70 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </BaseNodeHeader>

      {/* Node Content */}
      <BaseNodeContent className={showConfigureButton ? undefined : "pb-4"}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {nodeDescription}
        </p>
        {showConfigureButton && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (data.onConfigure) {
                data.onConfigure();
              }
            }}
            variant="outline"
            className="nodrag mt-4 w-full justify-center"
          >
            Configure
          </Button>
        )}
      </BaseNodeContent>
    </BaseNode>
  );
});

WorkflowNode.displayName = "WorkflowNode";

// Export node factory function for easy creation
export const createWorkflowNode = (
  nodeId: string,
  position: { x: number; y: number },
  config?: Record<string, any>
) => {
  return {
    id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position,
    data: {
      nodeId,
      config,
    },
    type: 'workflow-node',
  };
};

