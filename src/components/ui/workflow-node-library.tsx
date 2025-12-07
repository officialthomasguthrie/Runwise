/**
 * Generic Workflow Node Component
 * Renders any node from the node library using the same UI template
 */

import { memo, useState, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScheduleInput } from "@/components/ui/schedule-input";
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
  const { deleteElements, setNodes } = useReactFlow();
  const [localConfig, setLocalConfig] = useState(data.config || {});
  
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
  // Use custom node's configSchema if it's a CUSTOM_GENERATED node, otherwise use registry schema
  const configSchema = (data.nodeId === 'CUSTOM_GENERATED' && data.configSchema)
    ? data.configSchema
    : nodeDefinition?.configSchema || {};
  const requiredFields = Object.entries(configSchema).filter(([, schema]: [string, any]) => schema?.required);
  // Get all fields (not just required) to match config panel
  const allFields = Object.entries(configSchema);
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

  // Update local config when node data changes
  useEffect(() => {
    setLocalConfig(data.config || {});
  }, [data.config]);

  // Handle field change
  const handleFieldChange = (key: string, value: string) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    
    // Update node data
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                config: newConfig,
              },
            }
          : node
      )
    );
  };
  
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
          className="w-3 h-3 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-2 border-background"
          style={verticalHandleStyle}
        />
      )}
      
      {/* Output Handle */}
      {hasOutput && (
        <Handle
          type="source"
          position={outputPosition}
          id="output"
          className="w-3 h-3 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-2 border-background"
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
        
        {/* Form Fields - Show all fields (matching config panel) with proper input types */}
        {allFields.length > 0 && (
          <div className="mt-3 space-y-2">
            {allFields.map(([key, schema]: [string, any]) => {
              const fieldValue = localConfig[key] || '';
              const placeholderText = schema.placeholder || schema.description || '';
              
              // Truncate placeholder to 25 chars at word boundary (for small textboxes only)
              const truncatePlaceholder = (text: string): string => {
                let truncated = text;
                if (truncated.length > 25) {
                  const eGIndex = truncated.toLowerCase().indexOf('(e.g.');
                  if (eGIndex !== -1) {
                    truncated = truncated.substring(0, eGIndex).trim();
                  }
                  if (truncated.length > 25) {
                    let truncated2 = truncated.substring(0, 25);
                    const lastSpace = truncated2.lastIndexOf(' ');
                    if (lastSpace > 10) {
                      truncated2 = truncated2.substring(0, lastSpace);
                    }
                    truncated = truncated2.replace(/[.,;:!?]+$/, '');
                  }
                }
                return truncated;
              };
              
              return (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {schema.label || key}
                    {schema.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {/* Schedule Input */}
                  {key === 'schedule' && schema.type === 'string' && (
                    <div className="nodrag" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <ScheduleInput
                        value={fieldValue}
                        onChange={(cron) => {
                          handleFieldChange(key, cron);
                        }}
                        placeholder={placeholderText}
                      />
                    </div>
                  )}
                  
                  {/* Timezone Dropdown */}
                  {key === 'timezone' && schema.type === 'string' && (
                    <select
                      value={fieldValue || schema.default || 'UTC'}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleFieldChange(key, e.target.value);
                      }}
                      className="nodrag w-full text-xs h-8 rounded-md backdrop-blur-xl !bg-white/70 dark:!bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-foreground shadow-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-stone-200 dark:focus:border-white/10 focus-visible:border-stone-200 dark:focus-visible:border-white/10"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="America/Phoenix">Arizona Time</option>
                      <option value="America/Anchorage">Alaska Time</option>
                      <option value="Pacific/Honolulu">Hawaii Time</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Europe/Berlin">Berlin (CET)</option>
                      <option value="Europe/Rome">Rome (CET)</option>
                      <option value="Europe/Madrid">Madrid (CET)</option>
                      <option value="Europe/Amsterdam">Amsterdam (CET)</option>
                      <option value="Europe/Stockholm">Stockholm (CET)</option>
                      <option value="Europe/Zurich">Zurich (CET)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                      <option value="Asia/Singapore">Singapore (SGT)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Kolkata">Mumbai (IST)</option>
                      <option value="Australia/Sydney">Sydney (AEST)</option>
                      <option value="Australia/Melbourne">Melbourne (AEST)</option>
                      <option value="Australia/Brisbane">Brisbane (AEST)</option>
                      <option value="Pacific/Auckland">Auckland (NZST)</option>
                      <option value="America/Toronto">Toronto (EST)</option>
                      <option value="America/Vancouver">Vancouver (PST)</option>
                      <option value="America/Mexico_City">Mexico City (CST)</option>
                      <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                      <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
                    </select>
                  )}
                  
                  {/* String input (small textbox) */}
                  {schema.type === 'string' && !schema.options && key !== 'schedule' && key !== 'timezone' && (
                    <Input
                      type="text"
                      value={fieldValue}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleFieldChange(key, e.target.value);
                      }}
                      placeholder={truncatePlaceholder(placeholderText)}
                      className="nodrag text-xs h-8 backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-stone-200 dark:focus:border-white/10 focus-visible:border-stone-200 dark:focus-visible:border-white/10"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  )}
                  
                  {/* Textarea (large textbox) */}
                  {schema.type === 'textarea' && (
                    <Textarea
                      value={fieldValue}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleFieldChange(key, e.target.value);
                      }}
                      placeholder={placeholderText}
                      rows={2}
                      className="nodrag text-xs backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-border focus-visible:border-border resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  )}
                  
                  {/* Number input */}
                  {schema.type === 'number' && (
                    <Input
                      type="number"
                      value={fieldValue || schema.default || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        const v = e.target.value;
                        handleFieldChange(key, v === '' ? undefined : Number(v) as any);
                      }}
                      placeholder={placeholderText}
                      className="nodrag text-xs h-8 backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-stone-200 dark:focus:border-white/10 focus-visible:border-stone-200 dark:focus-visible:border-white/10"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  )}
                  
                  {/* Select dropdown */}
                  {schema.type === 'select' && schema.options && (
                    <select
                      value={fieldValue || schema.default || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleFieldChange(key, e.target.value);
                      }}
                      className="nodrag w-full text-xs h-8 rounded-md backdrop-blur-xl !bg-white/70 dark:!bg-white/5 border border-gray-300 dark:border-white/10 px-3 py-2 text-foreground shadow-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-stone-200 dark:focus:border-white/10 focus-visible:border-stone-200 dark:focus-visible:border-white/10"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <option value="">
                        {schema.placeholder || `Select ${schema.label || key}`}
                      </option>
                      {schema.options.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {showConfigureButton && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (data.onConfigure) {
                data.onConfigure();
              }
            }}
            variant="ghost"
            className="nodrag mt-4 w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
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

