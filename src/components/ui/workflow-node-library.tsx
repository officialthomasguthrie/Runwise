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
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import { Trash2, Zap, Info, Sparkles, CheckCircle2 } from "lucide-react";
import { getNodeById } from "@/lib/nodes/registry";
import type { NodeDefinition } from "@/lib/nodes/types";
import { ScheduleInput } from "@/components/ui/schedule-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WorkflowNodeType = 'trigger' | 'action' | 'transform' | 'end';

interface WorkflowNodeProps {
  data: {
    nodeId?: string; // ID from node registry
    label?: string; // Fallback label
    config?: Record<string, any>; // Node configuration
    onConfigure?: () => void; // Callback to toggle configuration
    onConfigUpdate?: (nodeId: string, config: Record<string, any>) => void; // Callback to update configuration
    onAskAI?: (fieldName: string, nodeId: string, nodeType: string) => void; // Callback for Ask AI
    onAskNodeInfo?: (nodeId: string, nodeLabel: string, nodeType: string, nodeDescription?: string) => void; // Callback for node info questions
    isExpanded?: boolean; // Whether this node is expanded
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
  // Use custom node's configSchema if it's a CUSTOM_GENERATED node, otherwise use registry schema
  const configSchema = (data.nodeId === 'CUSTOM_GENERATED' && data.configSchema)
    ? data.configSchema
    : nodeDefinition?.configSchema || {};
  // Get all fields to determine if node is configurable
  const allFields = Object.entries(configSchema);
  
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

  // Local config state for form fields
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(data.config || {});
  const isExpanded = data.isExpanded || false;

  // Update local config when data.config changes externally
  useEffect(() => {
    setLocalConfig(data.config || {});
  }, [data.config]);

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    // Update immediately (live update)
    if (data.onConfigUpdate) {
      data.onConfigUpdate(id, newConfig);
    }
  };

  const handleSave = () => {
    if (data.onConfigUpdate) {
      data.onConfigUpdate(id, localConfig);
    }
    // Toggle expansion off after save
    if (data.onConfigure) {
      data.onConfigure();
    }
  };

  // Check if node is fully configured
  const isFullyConfigured = (): boolean => {
    if (!configSchema || Object.keys(configSchema).length === 0) {
      return true; // No config needed
    }

    // If no required fields, node is configured
    const hasRequiredFields = Object.values(configSchema).some((field: any) => field.required);
    if (!hasRequiredFields) {
      return true;
    }

    // Check if all required fields are filled with actual values
    for (const [key, fieldSchema] of Object.entries(configSchema)) {
      const field = fieldSchema as any;
      if (field.required) {
        const value = localConfig[key];
        // Check for falsy values OR empty strings
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          return false;
        }
      }
    }

    return true;
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
      <BaseNodeHeader className="border-b border-stone-200 dark:border-white/20">
        <div className="flex items-center gap-2 flex-1">
          <IconComponent className="size-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <BaseNodeHeaderTitle>{nodeName}</BaseNodeHeaderTitle>
            {isFullyConfigured() && (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500/70 dark:text-green-400/70 flex-shrink-0" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              if (data.onAskNodeInfo) {
                data.onAskNodeInfo(id, nodeName, nodeType, nodeDescription);
              }
            }}
          >
            <Info className="h-3 w-3" />
          </Button>
          <Button
            onClick={handleDelete}
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-70 hover:opacity-100 hover:text-destructive hover:bg-transparent"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </BaseNodeHeader>

      {/* Node Content */}
      <BaseNodeContent className="pb-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {nodeDescription}
        </p>
        
        {/* Configuration Fields - Animated expansion */}
        {allFields.length > 0 && (
          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="space-y-4" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              {Object.entries(configSchema).map(([key, schema]: [string, any]) => (
                <div key={key} className="space-y-1.5" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                  <label className="text-xs font-medium text-muted-foreground">
                    {schema.label || key}
                    {schema.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {/* Schedule Input */}
                  {key === 'schedule' && schema.type === 'string' && (
                    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <ScheduleInput
                        value={localConfig[key] ?? ''}
                        onChange={(cron) => handleConfigChange(key, cron)}
                        placeholder={schema.placeholder || schema.description}
                      />
                    </div>
                  )}

                  {/* Timezone Dropdown */}
                  {key === 'timezone' && schema.type === 'string' && (
                    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <Select
                        value={localConfig[key] ?? schema.default ?? 'UTC'}
                        onValueChange={(value) => handleConfigChange(key, value)}
                      >
                        <SelectTrigger className="nodrag w-full text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 h-auto text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-lg max-h-[300px]">
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                          <SelectItem value="America/Phoenix">Arizona (MST)</SelectItem>
                          <SelectItem value="America/Anchorage">Alaska (AKST)</SelectItem>
                          <SelectItem value="Pacific/Honolulu">Hawaii (HST)</SelectItem>
                          <SelectItem value="America/Toronto">Toronto (EST)</SelectItem>
                          <SelectItem value="America/Vancouver">Vancouver (PST)</SelectItem>
                          <SelectItem value="America/Mexico_City">Mexico City (CST)</SelectItem>
                          <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                          <SelectItem value="America/Buenos_Aires">Buenos Aires (ART)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                          <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                          <SelectItem value="Europe/Madrid">Madrid (CET)</SelectItem>
                          <SelectItem value="Europe/Rome">Rome (CET)</SelectItem>
                          <SelectItem value="Europe/Amsterdam">Amsterdam (CET)</SelectItem>
                          <SelectItem value="Europe/Moscow">Moscow (MSK)</SelectItem>
                          <SelectItem value="Africa/Cairo">Cairo (EET)</SelectItem>
                          <SelectItem value="Africa/Johannesburg">Johannesburg (SAST)</SelectItem>
                          <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                          <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                          <SelectItem value="Asia/Hong_Kong">Hong Kong (HKT)</SelectItem>
                          <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                          <SelectItem value="Asia/Seoul">Seoul (KST)</SelectItem>
                          <SelectItem value="Asia/Mumbai">Mumbai (IST)</SelectItem>
                          <SelectItem value="Asia/Bangkok">Bangkok (ICT)</SelectItem>
                          <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                          <SelectItem value="Australia/Melbourne">Melbourne (AEST)</SelectItem>
                          <SelectItem value="Australia/Perth">Perth (AWST)</SelectItem>
                          <SelectItem value="Pacific/Auckland">Auckland (NZST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* String input + Ask AI */}
                  {schema.type === 'string' && !schema.options && key !== 'schedule' && key !== 'timezone' && (
                    <div className="relative" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <Input
                        type="text"
                        value={localConfig[key] ?? ''}
                        onChange={(e) => handleConfigChange(key, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder={(() => {
                          let placeholderText = schema.placeholder || schema.description || '';
                          const eGIndex = placeholderText.toLowerCase().indexOf('(e.g.');
                          if (eGIndex !== -1) {
                            placeholderText = placeholderText.substring(0, eGIndex).trim();
                          }
                          const eGIndex2 = placeholderText.toLowerCase().indexOf('(e.g');
                          if (eGIndex2 !== -1) {
                            placeholderText = placeholderText.substring(0, eGIndex2).trim();
                          }
                          return placeholderText;
                        })()}
                        className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 pr-24 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
                      />
                      {data.onAskAI && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            if (data.onAskAI) {
                              data.onAskAI(schema.label || key, id, data.nodeId || '');
                            }
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs inline-flex items-center justify-center gap-1 backdrop-blur-xl bg-neutral-200/70 text-foreground active:scale-[0.98] dark:bg-white/5 dark:border-white/10 dark:text-foreground dark:shadow-[0_4px_10px_rgba(0,0,0,0.1)] dark:hover:bg-white/10"
                        >
                          <Sparkles className="h-3 w-3" />
                          Ask AI
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Textarea + Ask AI */}
                  {schema.type === 'textarea' && (
                    <div className="relative" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <Textarea
                        value={localConfig[key] ?? ''}
                        onChange={(e) => handleConfigChange(key, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder={schema.placeholder || schema.description}
                        rows={3}
                        className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 pb-10 text-foreground placeholder:text-muted-foreground shadow-none resize-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                      />
                      {data.onAskAI && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            if (data.onAskAI) {
                              data.onAskAI(schema.label || key, id, data.nodeId || '');
                            }
                          }}
                          className="absolute bottom-2 right-2 h-7 px-2 text-xs inline-flex items-center justify-center gap-1 backdrop-blur-xl bg-neutral-200/70 text-foreground active:scale-[0.98] dark:bg-white/5 dark:border-white/10 dark:text-foreground dark:shadow-[0_4px_10px_rgba(0,0,0,0.1)] dark:hover:bg-white/10"
                        >
                          <Sparkles className="h-3 w-3" />
                          Ask AI
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Number input */}
                  {schema.type === 'number' && (
                    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <Input
                        type="number"
                        value={localConfig[key] ?? schema.default ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          handleConfigChange(key, v === '' ? undefined : Number(v));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder={schema.placeholder || schema.description}
                        className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
                      />
                    </div>
                  )}

                  {/* Select */}
                  {schema.type === 'select' && schema.options && (
                    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <Select
                        value={localConfig[key] ?? schema.default ?? ''}
                        onValueChange={(value) => handleConfigChange(key, value)}
                      >
                        <SelectTrigger className="nodrag w-full text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 h-auto text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300">
                          <SelectValue placeholder={schema.placeholder || `Select ${schema.label || key}`} />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-lg max-h-[300px]">
                          {schema.options.map((opt: any) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="pt-4 mt-4">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                variant="ghost"
                className="nodrag w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
              >
                Save Configuration
              </Button>
            </div>
          </div>
        )}

        {/* Configure Button - Show if node has configurable fields */}
        {allFields.length > 0 && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (data.onConfigure) {
                data.onConfigure();
              }
            }}
            variant="ghost"
            className={`nodrag mt-2 w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground ${isExpanded ? 'hidden' : ''}`}
          >
            {isFullyConfigured() ? 'Open Configuration' : 'Configure'}
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

