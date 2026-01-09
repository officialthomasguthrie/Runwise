/**
 * Generic Workflow Node Component
 * Renders any node from the node library using the same UI template
 */

import { memo, useState, useEffect, useCallback } from "react";
import { Handle, Position, useReactFlow, type Node, type Edge } from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import { Trash2, Zap, Info, Sparkles, CheckCircle2, Check, Loader2, ExternalLink } from "lucide-react";
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
import { IntegrationField } from "@/components/ui/integration-field";
import { isTemplate } from "@/lib/workflow-execution/template-resolver";
import { cn } from "@/lib/utils";
import { MentionInput } from "@/components/ui/mention-input";

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
/**
 * Find all upstream nodes (all nodes that come before the current node in the workflow)
 * Uses BFS to traverse the graph backwards from the current node
 */
function findAllUpstreamNodes(currentNodeId: string, nodes: Node[], edges: Edge[]): string[] {
  // Build reverse adjacency list: target -> [sources]
  const reverseAdjList = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!reverseAdjList.has(edge.target)) {
      reverseAdjList.set(edge.target, []);
    }
    reverseAdjList.get(edge.target)!.push(edge.source);
  });

  // BFS to find all upstream nodes
  const visited = new Set<string>();
  const queue: string[] = [currentNodeId];
  const upstreamNodes = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (visited.has(current)) continue;
    visited.add(current);

    // Get all source nodes that connect to current
    const sources = reverseAdjList.get(current) || [];
    
    sources.forEach(source => {
      if (!visited.has(source) && !upstreamNodes.has(source)) {
        upstreamNodes.add(source);
        queue.push(source);
      }
    });
  }

  return Array.from(upstreamNodes);
}

/**
 * Get available outputs from source nodes for mention input
 */
function getMentionOptions(sourceNodeIds: string[], nodes: Node[]): Array<{
  nodeId: string;
  nodeName: string;
  path: string;
  displayPath: string;
  fullPath: string;
}> {
  const outputs: Array<{
    nodeId: string;
    nodeName: string;
    path: string;
    displayPath: string;
    fullPath: string;
  }> = [];
  
  sourceNodeIds.forEach(sourceNodeId => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;
    
    const nodeData = (sourceNode.data ?? {}) as any;
    const nodeId = nodeData.nodeId;
    const nodeName = nodeData.label || sourceNode.id;
    
    // Get node definition to know actual output structure
    let outputFields: string[] = [];
    if (nodeId) {
      const nodeDef = getNodeById(nodeId);
      if (nodeDef?.outputs) {
        outputFields = nodeDef.outputs.map(output => output.name);
      }
    }
    
    // Add all data option
    outputs.push({
      nodeId: sourceNodeId,
      nodeName,
      path: 'inputData',
      displayPath: `${nodeName} (all data)`,
      fullPath: 'inputData'
    });
    
    // Add specific output fields from node definition
    if (outputFields.length > 0) {
      outputFields.forEach(field => {
        outputs.push({
          nodeId: sourceNodeId,
          nodeName,
          path: `inputData.${field}`,
          displayPath: `${nodeName} → ${field}`,
          fullPath: `inputData.${field}`
        });
      });
    } else {
      // Fallback to common fields if node definition doesn't specify outputs
      const commonFields = ['summary', 'text', 'content', 'body', 'message', 'result', 'data', 'output', 'email', 'subject', 'from', 'to', 'reply', 'response', 'id', 'status', 'success'];
      commonFields.forEach(field => {
        outputs.push({
          nodeId: sourceNodeId,
          nodeName,
          path: `inputData.${field}`,
          displayPath: `${nodeName} → ${field}`,
          fullPath: `inputData.${field}`
        });
      });
    }
  });
  
  return outputs;
}


export const WorkflowNode = memo(({ data, id }: WorkflowNodeProps) => {
  const { deleteElements, getNodes, getEdges } = useReactFlow();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
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
  const [integrationStatus, setIntegrationStatus] = useState<{serviceName?: 'google' | 'google-sheets' | 'google-gmail' | 'google-calendar' | 'google-drive' | 'google-forms' | 'slack' | 'github' | 'notion' | 'airtable' | 'trello' | 'openai' | 'sendgrid' | 'twilio' | 'stripe' | 'discord' | 'twitter' | 'paypal' | 'shopify' | 'hubspot' | 'asana' | 'jira'; isConnected: boolean | null; credentialType?: 'oauth' | 'api_token' | 'api_key_and_token'}>({isConnected: null});

  // Update local config when data.config changes externally
  useEffect(() => {
    setLocalConfig(data.config || {});
  }, [data.config]);

  // Map serviceName to slug for logo lookup
  const getServiceSlug = (serviceName?: string): string | null => {
    if (!serviceName) return null;
    const serviceSlugMap: Record<string, string> = {
      'google-sheets': 'googlesheets',
      'google-gmail': 'gmail',
      'google-calendar': 'googlecalendar',
      'google-drive': 'googledrive',
      'google-forms': 'googleforms',
      'slack': 'slack',
      'github': 'github',
      'notion': 'notion',
      'airtable': 'airtable',
      'trello': 'trello',
      'shopify': 'shopify',
      'hubspot': 'hubspot',
      'asana': 'asana',
      'jira': 'jira',
      'discord': 'discord',
      'twitter': 'x',
      'paypal': 'paypal',
      'stripe': 'stripe',
      'sendgrid': 'sendgrid',
      'twilio': 'twilio',
      'openai': 'openai'
    };
    return serviceSlugMap[serviceName] || null;
  };

  // Get logo URL (same logic as integrations-settings.tsx) - memoized to capture mounted and theme
  const getLogoUrl = useCallback(
    (slug: string): string | null => {
      if (!mounted || !theme) return null;
      const isDark = theme === 'dark';
      const clientId = '1dxbfHSJFAPEGdCLU4o5B';
      
      const brandfetchLogos: Record<string, { light?: string; dark?: string }> = {
        'googlesheets': { dark: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idKa2XnbFY.svg?c=${clientId}` },
        'slack': { dark: `https://cdn.brandfetch.io/idJ_HhtG0Z/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
        'gmail': { dark: `https://cdn.brandfetch.io/id5o3EIREg/theme/dark/symbol.svg?c=${clientId}` },
        'googlecalendar': { dark: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idMX2_OMSc.svg?c=${clientId}` },
        'googledrive': { dark: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idncaAgFGT.svg?c=${clientId}` },
        'github': {
          light: `https://cdn.brandfetch.io/idZAyF9rlg/theme/dark/symbol.svg?c=${clientId}`,
          dark: `https://cdn.brandfetch.io/idZAyF9rlg/theme/light/symbol.svg?c=${clientId}`
        },
        'trello': { dark: `https://cdn.brandfetch.io/idToc8bDY1/theme/dark/symbol.svg?c=${clientId}` },
        'notion': { dark: `https://cdn.brandfetch.io/idPYUoikV7/theme/dark/symbol.svg?c=${clientId}` },
        'shopify': { dark: `https://cdn.brandfetch.io/idAgPm7IvG/theme/dark/symbol.svg?c=${clientId}` },
        'hubspot': { dark: `https://cdn.brandfetch.io/idRt0LuzRf/theme/dark/symbol.svg?c=${clientId}` },
        'discord': { dark: `https://cdn.brandfetch.io/idM8Hlme1a/theme/dark/symbol.svg?c=${clientId}` },
        'airtable': { dark: `https://cdn.brandfetch.io/iddsnRzkxS/theme/dark/symbol.svg?c=${clientId}` },
        'x': {
          light: `https://cdn.brandfetch.io/idS5WhqBbM/theme/dark/logo.svg?c=${clientId}`,
          dark: `https://cdn.brandfetch.io/idS5WhqBbM/theme/light/logo.svg?c=${clientId}`
        },
      'asana': { dark: `https://cdn.brandfetch.io/idxPi2Evsk/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
      'jira': { dark: `https://cdn.brandfetch.io/idchmboHEZ/theme/dark/symbol.svg?c=${clientId}` },
      'stripe': { dark: `https://cdn.brandfetch.io/idxAg10C0L/w/480/h/480/theme/dark/icon.jpeg?c=${clientId}` },
      'sendgrid': { dark: `https://cdn.brandfetch.io/idHHcfw5Qu/theme/dark/symbol.svg?c=${clientId}` },
      'twilio': { dark: `https://cdn.brandfetch.io/idT7wVo_zL/theme/dark/symbol.svg?c=${clientId}` },
      'openai': {
        light: `https://cdn.brandfetch.io/idR3duQxYl/theme/dark/symbol.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idR3duQxYl/theme/light/symbol.svg?c=${clientId}`
      },
      'paypal': { dark: `https://cdn.brandfetch.io/id-Wd4a4TS/theme/dark/symbol.svg?c=${clientId}` },
      // Google Forms uses a custom logo URL provided by user
      'googleforms': { dark: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Google_Forms_logo_%282014-2020%29.svg/1489px-Google_Forms_logo_%282014-2020%29.svg.png' }
    };

      const logoConfig = brandfetchLogos[slug];
      if (logoConfig) {
        if (isDark && logoConfig.dark) {
          return logoConfig.dark;
        } else if (!isDark && logoConfig.light) {
          return logoConfig.light;
        } else if (logoConfig.dark) {
          return logoConfig.dark;
        }
      }
      
      return null;
    },
    [mounted, theme]
  );

  // Function to detect which integration service this node uses
  const getNodeIntegration = (): {serviceName?: 'google' | 'google-sheets' | 'google-gmail' | 'google-calendar' | 'google-drive' | 'google-forms' | 'slack' | 'github' | 'notion' | 'airtable' | 'trello' | 'openai' | 'sendgrid' | 'twilio' | 'stripe' | 'discord' | 'twitter' | 'paypal' | 'shopify' | 'hubspot' | 'asana' | 'jira'; credentialType?: 'oauth' | 'api_token' | 'api_key_and_token'} => {
    const nodeId = data.nodeId || '';
    
    // Google nodes (OAuth) - map to specific service names
    if (nodeId === 'new-row-in-google-sheet') {
      return { serviceName: 'google-sheets', credentialType: 'oauth' };
    }
    if (nodeId === 'new-form-submission') {
      return { serviceName: 'google-forms', credentialType: 'oauth' };
    }
    if (nodeId === 'new-email-received') {
      return { serviceName: 'google-gmail', credentialType: 'oauth' };
    }
    if (nodeId === 'create-calendar-event') {
      return { serviceName: 'google-calendar', credentialType: 'oauth' };
    }
    if (nodeId === 'upload-file-to-google-drive' || nodeId === 'file-uploaded') {
      return { serviceName: 'google-drive', credentialType: 'oauth' };
    }
    
    // Slack nodes (OAuth)
    if (['post-to-slack-channel', 'new-message-in-slack'].includes(nodeId)) {
      return { serviceName: 'slack', credentialType: 'oauth' };
    }
    
    // GitHub nodes (OAuth)
    if (['new-github-issue'].includes(nodeId)) {
      return { serviceName: 'github', credentialType: 'oauth' };
    }
    
    // Notion nodes (API token)
    if (['create-notion-page'].includes(nodeId)) {
      return { serviceName: 'notion', credentialType: 'oauth' };
    }
    
    // Airtable nodes (OAuth)
    if (['update-airtable-record'].includes(nodeId)) {
      return { serviceName: 'airtable', credentialType: 'oauth' };
    }
    
    // Trello nodes (OAuth)
    if (['create-trello-card'].includes(nodeId)) {
      return { serviceName: 'trello', credentialType: 'oauth' };
    }
    
    // OpenAI nodes (API key)
    if (['generate-summary-with-ai', 'generate-ai-content', 'classify-text', 'extract-entities', 'sentiment-analysis', 'translate-text', 'generate-image', 'image-recognition', 'text-to-speech', 'speech-to-text'].includes(nodeId)) {
      return { serviceName: 'openai', credentialType: 'api_token' };
    }
    
    // SendGrid nodes (API key)
    if (['send-email'].includes(nodeId)) {
      return { serviceName: 'sendgrid', credentialType: 'api_token' };
    }
    
    // Twilio nodes (Account SID + Auth Token)
    if (['send-sms-via-twilio'].includes(nodeId)) {
      return { serviceName: 'twilio', credentialType: 'api_key_and_token' };
    }
    
    // Discord nodes (Bot Token only)
    if (['send-discord-message', 'new-discord-message'].includes(nodeId)) {
      return { serviceName: 'discord', credentialType: 'api_token' };
    }
    
    // Twitter/X nodes (API token - Bearer Token)
    if (['post-to-x'].includes(nodeId)) {
      return { serviceName: 'twitter', credentialType: 'api_token' };
    }
    
    // Shopify nodes (OAuth)
    if (['new-shopify-order', 'create-shopify-product'].includes(nodeId)) {
      return { serviceName: 'shopify', credentialType: 'oauth' };
    }
    
    // HubSpot nodes (OAuth)
    if (['new-hubspot-contact', 'create-hubspot-contact'].includes(nodeId)) {
      return { serviceName: 'hubspot', credentialType: 'oauth' };
    }
    
    // Asana nodes (OAuth)
    if (['new-asana-task', 'create-asana-task'].includes(nodeId)) {
      return { serviceName: 'asana', credentialType: 'oauth' };
    }
    
    // Jira nodes (OAuth)
    if (['new-jira-issue', 'create-jira-issue'].includes(nodeId)) {
      return { serviceName: 'jira', credentialType: 'oauth' };
    }
    
    return {};
  };

  // Helper function to safely parse JSON from response
  const safeParseJSON = async (response: Response): Promise<any> => {
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    // If response is empty, return error
    if (!text || text.trim().length === 0) {
      return { error: 'Empty response from server' };
    }
    
    // If response is not JSON, return error object with text
    if (!contentType || !contentType.includes('application/json')) {
      return { error: text || 'Invalid response format' };
    }
    
    // Try to parse as JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      // If parsing fails, return the text as error
      return { error: text || 'Failed to parse response' };
    }
  };

  // Check integration status function
  const checkIntegrationStatus = useCallback(async () => {
    const integration = getNodeIntegration();
    if (!integration.serviceName) {
      setIntegrationStatus({isConnected: null});
      return;
    }
    
    try {
      const response = await fetch('/api/integrations/status');
      if (!response.ok) throw new Error('Failed to check status');
      
      const data = await safeParseJSON(response);
      if (data.error) {
        throw new Error(data.error);
      }
      
      // For Google services, check the specific service
      let isConnected = false;
      if (integration.serviceName?.startsWith('google-')) {
        const integrationData = data.integrations?.find((i: any) => i.service === integration.serviceName);
        isConnected = !!integrationData?.connected;
      } else if (integration.serviceName === 'google') {
        // Fallback: check if any Google service is connected
        const googleServices = ['google', 'google-sheets', 'google-gmail', 'google-calendar', 'google-drive'];
        isConnected = data.integrations?.some((i: any) => 
          googleServices.includes(i.service) && i.connected
        ) || false;
      } else {
        const integrationData = data.integrations?.find((i: any) => i.service === integration.serviceName);
        isConnected = !!integrationData?.connected;
      }
      
      setIntegrationStatus({
        serviceName: integration.serviceName,
        isConnected,
        credentialType: integration.credentialType
      });
    } catch (error) {
      console.error('Error checking integration status:', error);
      setIntegrationStatus({
        serviceName: integration.serviceName,
        isConnected: false,
        credentialType: integration.credentialType
      });
    }
  }, [data.nodeId]);

  // Check integration status on mount and when nodeId changes
  useEffect(() => {
    checkIntegrationStatus();
  }, [checkIntegrationStatus]);

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
    // For integration nodes, ensure integration is connected first
    const integration = getNodeIntegration();
    if (integration.serviceName) {
      // Integration node - must be connected
      if (integrationStatus.isConnected !== true) {
        return false;
      }
    }

    if (!configSchema || Object.keys(configSchema).length === 0) {
      return true; // No config needed
    }

    // If no required fields, node is configured (assuming integration is connected if it's an integration node)
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
          {(() => {
            // Check if this is an integration node (not AI-generated)
            const integration = getNodeIntegration();
            const isIntegrationNode = !!integration.serviceName && data.nodeId !== 'CUSTOM_GENERATED';
            const slug = isIntegrationNode && integration.serviceName ? getServiceSlug(integration.serviceName) : null;
            const logoUrl = slug ? getLogoUrl(slug) : null;
            
            if (isIntegrationNode && logoUrl) {
              return (
                <img 
                  src={logoUrl} 
                  alt={nodeName} 
                  className="size-4 object-contain"
                />
              );
            }
            return <IconComponent className="size-4 text-muted-foreground" />;
          })()}
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
              {/* API Token Integration Connection (no resource selection, just connection) */}
              {integrationStatus.serviceName && 
               integrationStatus.credentialType === 'api_token' && 
               integrationStatus.isConnected === false && (
                <div className="pb-4">
                  <IntegrationField
                    fieldKey={`${integrationStatus.serviceName}_connection`}
                    fieldSchema={{ 
                      label: 'Connect', 
                      description: `Connect your ${integrationStatus.serviceName === 'openai' ? 'OpenAI' : integrationStatus.serviceName === 'sendgrid' ? 'SendGrid' : integrationStatus.serviceName === 'stripe' ? 'Stripe' : integrationStatus.serviceName === 'notion' ? 'Notion' : integrationStatus.serviceName === 'airtable' ? 'Airtable' : integrationStatus.serviceName} account`, 
                      required: false 
                    }}
                    value={null}
                    onChange={() => {}}
                    nodeId={id}
                    serviceName={integrationStatus.serviceName}
                    credentialType="api_token"
                    // When connection succeeds via this node, refresh the node-level integrationStatus
                    onConnected={async () => {
                      await checkIntegrationStatus();
                    }}
                  />
                </div>
              )}
              {/* API Key + Token Integration Connection (Twilio) */}
              {integrationStatus.serviceName && 
               integrationStatus.credentialType === 'api_key_and_token' && 
               integrationStatus.isConnected === false && (
                <div className="pb-4">
                  <IntegrationField
                    fieldKey={`${integrationStatus.serviceName}_connection`}
                    fieldSchema={{ 
                      label: 'Connect', 
                      description: `Connect your ${integrationStatus.serviceName === 'twilio' ? 'Twilio' : integrationStatus.serviceName === 'trello' ? 'Trello' : integrationStatus.serviceName} account`, 
                      required: false 
                    }}
                    value={null}
                    onChange={() => {}}
                    nodeId={id}
                    serviceName={integrationStatus.serviceName}
                    credentialType="api_key_and_token"
                  />
                </div>
              )}
              {/* OAuth Integration Connection (for nodes without resource fields like PayPal, Twitter) */}
              {/* Only show generic connection if node doesn't have resource fields that handle connection */}
              {integrationStatus.serviceName && 
               integrationStatus.credentialType === 'oauth' && 
               integrationStatus.isConnected === false && 
               !(
                 // Google OAuth nodes with resource fields
                 (data.nodeId === 'new-row-in-google-sheet') ||
                 (data.nodeId === 'new-email-received') ||
                 (data.nodeId === 'create-calendar-event') ||
                 (data.nodeId === 'upload-file-to-google-drive') ||
                 (data.nodeId === 'file-uploaded') ||
                 (data.nodeId === 'new-form-submission') ||
                 // Slack OAuth nodes with resource fields
                 (data.nodeId === 'post-to-slack-channel') ||
                 (data.nodeId === 'new-message-in-slack') ||
                 // GitHub OAuth nodes with resource fields
                 (data.nodeId === 'new-github-issue')
               ) && (
                <div className="pb-4">
                  <IntegrationField
                    fieldKey={`${integrationStatus.serviceName}_connection`}
                    fieldSchema={{ 
                      label: 'Connect', 
                      description: `Connect your ${integrationStatus.serviceName === 'google' ? 'Google' : integrationStatus.serviceName === 'slack' ? 'Slack' : integrationStatus.serviceName === 'github' ? 'GitHub' : integrationStatus.serviceName === 'discord' ? 'Discord' : integrationStatus.serviceName === 'twitter' ? 'Twitter/X' : integrationStatus.serviceName === 'paypal' ? 'PayPal' : integrationStatus.serviceName} account`, 
                      required: false 
                    }}
                    value={null}
                    onChange={() => {}}
                    nodeId={id}
                    serviceName={integrationStatus.serviceName}
                    credentialType="oauth"
                  />
                </div>
              )}
              {/* Show Disconnect button for API key/token integrations if connected */}
              {integrationStatus.serviceName && 
               integrationStatus.credentialType !== 'oauth' && 
               integrationStatus.isConnected === true && (
                <div className="pb-2">
                  <ApiTokenDisconnectButton
                    serviceName={integrationStatus.serviceName}
                    onDisconnect={async () => {
                      try {
                        const response = await fetch('/api/integrations/disconnect', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ serviceName: integrationStatus.serviceName }),
                        });
                        
                        if (!response.ok) {
                          const errorData = await safeParseJSON(response);
                          const errorMessage = errorData.error || errorData.message || 'Unknown error';
                          console.error('Failed to disconnect:', errorMessage);
                          throw new Error(errorMessage);
                        }
                        
                        // Wait a bit for the API to process, then re-check status
                        setTimeout(() => {
                          checkIntegrationStatus();
                        }, 500);
                      } catch (error) {
                        console.error('Error disconnecting:', error);
                        throw error;
                      }
                    }}
                    getLogoUrl={getLogoUrl}
                    getServiceSlug={getServiceSlug}
                  />
                </div>
              )}
              {/* Show Disconnect button for OAuth integrations if connected (for nodes without resource fields) */}
              {integrationStatus.serviceName && 
               integrationStatus.credentialType === 'oauth' && 
               integrationStatus.isConnected === true && (
                <div className="pb-2">
                  <OAuthDisconnectButton 
                    serviceName={integrationStatus.serviceName}
                    onDisconnect={async () => {
                      try {
                        const response = await fetch('/api/integrations/disconnect', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ serviceName: integrationStatus.serviceName }),
                        });
                        
                        if (!response.ok) {
                          const errorData = await safeParseJSON(response);
                          const errorMessage = errorData.error || errorData.message || 'Unknown error';
                          console.error('Failed to disconnect:', errorMessage);
                          throw new Error(errorMessage);
                        }
                        
                        // Wait a bit for the API to process, then re-check status
                        setTimeout(() => {
                          checkIntegrationStatus();
                        }, 500);
                      } catch (error) {
                        console.error('Error disconnecting:', error);
                      }
                    }}
                    getLogoUrl={getLogoUrl}
                    getServiceSlug={getServiceSlug}
                  />
                </div>
              )}
              {Object.entries(configSchema).map(([key, schema]: [string, any]) => {
                // Check if this field should skip label rendering (handled by IntegrationField or excluded)
                const isIntegrationField = 
                  // Google OAuth integration fields
                  (data.nodeId === 'new-row-in-google-sheet' && (key === 'spreadsheetId' || key === 'sheetName')) ||
                  (data.nodeId === 'new-email-received' && key === 'labelId') ||
                  (data.nodeId === 'create-calendar-event' && key === 'calendarId') ||
                  ((data.nodeId === 'upload-file-to-google-drive' || data.nodeId === 'file-uploaded') && key === 'folderId') ||
                  (data.nodeId === 'new-form-submission' && key === 'formId') ||
                  // Slack OAuth integration fields
                  ((data.nodeId === 'post-to-slack-channel' || data.nodeId === 'new-message-in-slack') && key === 'channel') ||
                  // GitHub OAuth integration fields
                  (data.nodeId === 'new-github-issue' && key === 'repo') ||
                  // Notion, Airtable, Trello API key/token integration fields
                  (data.nodeId === 'create-notion-page' && key === 'databaseId') ||
                  (data.nodeId === 'update-airtable-record' && (key === 'baseId' || key === 'tableId')) ||
                  (data.nodeId === 'create-trello-card' && (key === 'boardId' || key === 'idList')) ||
                  // Discord integration fields (server & channel are handled by IntegrationField)
                  ((data.nodeId === 'send-discord-message' || data.nodeId === 'new-discord-message') && (key === 'guildId' || key === 'channelId'));
                
                const isExcludedField =
                  // Google OAuth integration nodes - remove apiKey fields
                  ((data.nodeId === 'new-row-in-google-sheet' ||
                    data.nodeId === 'new-email-received' ||
                    data.nodeId === 'create-calendar-event' ||
                    data.nodeId === 'upload-file-to-google-drive' ||
                    data.nodeId === 'new-form-submission' ||
                    data.nodeId === 'file-uploaded') && key === 'apiKey') ||
                  // Slack OAuth nodes
                  ((data.nodeId === 'post-to-slack-channel' || data.nodeId === 'new-message-in-slack') && key === 'botToken') ||
                  // GitHub OAuth node
                  (data.nodeId === 'new-github-issue' && key === 'accessToken') ||
                  // Notion, Airtable, Trello, OpenAI API key/token nodes (keep these excluded)
                  (data.nodeId === 'create-notion-page' && key === 'apiKey') ||
                  (data.nodeId === 'update-airtable-record' && key === 'apiKey') ||
                  (data.nodeId === 'create-trello-card' && (key === 'apiKey' || key === 'token')) ||
                  // OpenAI nodes - remove apiKey field
                  ((data.nodeId === 'generate-summary-with-ai' || 
                    data.nodeId === 'generate-ai-content' || 
                    data.nodeId === 'classify-text' || 
                    data.nodeId === 'extract-entities' || 
                    data.nodeId === 'sentiment-analysis' || 
                    data.nodeId === 'translate-text' ||
                    data.nodeId === 'generate-image' ||
                    data.nodeId === 'image-recognition' ||
                    data.nodeId === 'text-to-speech' ||
                    data.nodeId === 'speech-to-text') && key === 'apiKey');
                
                const shouldShowLabel = !isIntegrationField && !isExcludedField;
                
                // Skip rendering excluded fields entirely
                if (isExcludedField) {
                  return null;
                }
                
                // Check if field depends on integration and should be hidden until connected
                // This applies to ALL field types (string, textarea, etc.)
                const isIntegrationDependentField = 
                  // Google Sheets nodes - hide values until spreadsheet and sheet are selected
                  (data.nodeId === 'new-row-in-google-sheet' && key === 'values') ||
                  // Google Calendar node - hide all fields until calendar is selected
                  (data.nodeId === 'create-calendar-event' && (key === 'summary' || key === 'description' || key === 'start' || key === 'end' || key === 'attendees')) ||
                  // Google Drive nodes - hide file fields until folder is selected (for file-uploaded) or just connected (for upload-file-to-google-drive)
                  ((data.nodeId === 'upload-file-to-google-drive' || data.nodeId === 'file-uploaded') && (key === 'fileName' || key === 'fileContent' || key === 'mimeType' || key === 'driveId')) ||
                  // Google Forms node - hide pollInterval until form is selected
                  (data.nodeId === 'new-form-submission' && key === 'pollInterval') ||
                  // Gmail node - hide lastCheck until label is selected
                  (data.nodeId === 'new-email-received' && key === 'lastCheck') ||
                  // Slack nodes - hide message until channel is selected
                  ((data.nodeId === 'post-to-slack-channel' || data.nodeId === 'new-message-in-slack') && key === 'message') ||
                  // Notion node - hide databaseId until connected, hide title/content until database is selected
                  (data.nodeId === 'create-notion-page' && (key === 'databaseId' || key === 'title' || key === 'content')) ||
                  // Airtable node - hide baseId until connected, hide tableId until baseId selected, hide recordId/fields until base and table are selected
                  (data.nodeId === 'update-airtable-record' && (key === 'baseId' || key === 'tableId' || key === 'recordId' || key === 'fields')) ||
                  // Trello node - hide boardId until connected, hide idList until boardId selected, hide name/desc/dueDate until board and list are selected
                  (data.nodeId === 'create-trello-card' && (key === 'boardId' || key === 'idList' || key === 'name' || key === 'desc' || key === 'dueDate')) ||
                  // Discord nodes - hide guildId and channelId until Discord is connected
                  ((data.nodeId === 'send-discord-message' || data.nodeId === 'new-discord-message') && (key === 'guildId' || key === 'channelId'));
                
                // Hide integration-dependent fields if integration is not connected or parent resources not selected
                if (isIntegrationDependentField) {
                  const shouldShowField = integrationStatus.isConnected === true && (
                    // Google Sheets nodes - require spreadsheetId (and sheetName for values)
                    (data.nodeId === 'new-row-in-google-sheet' && 
                      (key === 'values' ? (localConfig.spreadsheetId && localConfig.sheetName) : true)) ||
                    // Google Calendar node - require calendarId
                    (data.nodeId === 'create-calendar-event' && localConfig.calendarId) ||
                    // Google Drive nodes - folderId is optional for upload-file-to-google-drive, required for file-uploaded
                    ((data.nodeId === 'upload-file-to-google-drive' || data.nodeId === 'file-uploaded') && true) ||
                    // Google Forms node - require formId
                    (data.nodeId === 'new-form-submission' && localConfig.formId) ||
                    // Gmail node - require labelId
                    (data.nodeId === 'new-email-received' && localConfig.labelId) ||
                    // Slack nodes - require channel
                    ((data.nodeId === 'post-to-slack-channel' || data.nodeId === 'new-message-in-slack') && localConfig.channel) ||
                    // Notion node - databaseId shows when connected, title/content require databaseId
                    (data.nodeId === 'create-notion-page' && 
                      (key === 'databaseId' ? true : localConfig.databaseId)) ||
                    // Airtable node - baseId shows when connected, tableId requires baseId, recordId/fields require baseId and tableId
                    (data.nodeId === 'update-airtable-record' && 
                      (key === 'baseId' ? true : 
                       key === 'tableId' ? localConfig.baseId :
                       (localConfig.baseId && localConfig.tableId))) ||
                    // Trello node - boardId shows when connected, idList requires boardId, name/desc/dueDate require boardId and idList
                    (data.nodeId === 'create-trello-card' && 
                      (key === 'boardId' ? true :
                       key === 'idList' ? localConfig.boardId :
                       (localConfig.boardId && localConfig.idList))) ||
                    // Discord nodes - require Discord connection (guildId for channelId, just connection for guildId)
                    ((data.nodeId === 'send-discord-message' || data.nodeId === 'new-discord-message') && 
                      (key === 'channelId' ? localConfig.guildId : true))
                  );
                  
                  if (!shouldShowField) {
                    return null;
                  }
                }
                
                return (
                <div key={key} className="space-y-1.5" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                  {shouldShowLabel && (
                    <label className="text-xs font-medium text-muted-foreground">
                      {schema.label || key}
                      {schema.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                  )}

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

                  {/* Integration Fields (Google Sheets, Slack, GitHub, Notion, Airtable, Trello, etc.) */}
                  {(schema.type === 'string' || schema.type === 'array' || schema.type === 'object' || schema.type === 'integration') && !schema.options && key !== 'schedule' && key !== 'timezone' && (
                    <>
                      {/* Google Sheets Integration Fields - New Row Trigger */}
                      {data.nodeId === 'new-row-in-google-sheet' && (
                        <>
                          {key === 'spreadsheetId' && (
                            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                              <IntegrationField
                                fieldKey={key}
                                fieldSchema={schema}
                                value={localConfig[key]}
                                onChange={(value) => {
                                  handleConfigChange(key, value);
                                  // Clear dependent fields when spreadsheet changes
                                  if (localConfig.sheetName) handleConfigChange('sheetName', '');
                                }}
                                nodeId={id}
                                serviceName="google-sheets"
                                resourceType="spreadsheet"
                                credentialType="oauth"
                              />
                            </div>
                          )}
                          {key === 'sheetName' && localConfig.spreadsheetId && (
                            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                              <IntegrationField
                                fieldKey={key}
                                fieldSchema={schema}
                                value={localConfig[key]}
                                onChange={(value) => handleConfigChange(key, value)}
                                nodeId={id}
                                serviceName="google-sheets"
                                resourceType="sheet"
                                parentValue={localConfig.spreadsheetId}
                                credentialType="oauth"
                              />
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Google Calendar Integration Fields */}
                      {data.nodeId === 'create-calendar-event' && key === 'calendarId' && (
                        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <IntegrationField
                            fieldKey={key}
                            fieldSchema={schema}
                            value={localConfig[key]}
                            onChange={(value) => handleConfigChange(key, value)}
                            nodeId={id}
                            serviceName="google-calendar"
                            resourceType="calendar"
                            credentialType="oauth"
                          />
                        </div>
                      )}
                      
                      {/* Google Drive Integration Fields */}
                      {(data.nodeId === 'upload-file-to-google-drive' || data.nodeId === 'file-uploaded') && key === 'folderId' && (
                        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <IntegrationField
                            fieldKey={key}
                            fieldSchema={schema}
                            value={localConfig[key]}
                            onChange={(value) => handleConfigChange(key, value)}
                            nodeId={id}
                            serviceName="google-drive"
                            resourceType="folder"
                            credentialType="oauth"
                          />
                        </div>
                      )}
                      
                      {/* Google Forms Integration Fields */}
                      {data.nodeId === 'new-form-submission' && key === 'formId' && (
                        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <IntegrationField
                            fieldKey={key}
                            fieldSchema={schema}
                            value={localConfig[key]}
                            onChange={(value) => handleConfigChange(key, value)}
                            nodeId={id}
                            serviceName="google-forms"
                            resourceType="form"
                            credentialType="oauth"
                          />
                        </div>
                      )}
                      
                      {/* Gmail Integration Fields */}
                      {data.nodeId === 'new-email-received' && key === 'labelId' && (
                        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <IntegrationField
                            fieldKey={key}
                            fieldSchema={schema}
                            value={localConfig[key]}
                            onChange={(value) => handleConfigChange(key, value)}
                            nodeId={id}
                            serviceName="google-gmail"
                            resourceType="label"
                            credentialType="oauth"
                          />
                        </div>
                      )}
                      
                      {/* Slack Integration Fields */}
                      {(data.nodeId === 'post-to-slack-channel' || data.nodeId === 'new-message-in-slack') && key === 'channel' && (
                        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <IntegrationField
                            fieldKey={key}
                            fieldSchema={schema}
                            value={localConfig[key]}
                            onChange={(value) => handleConfigChange(key, value)}
                            nodeId={id}
                            serviceName="slack"
                            resourceType="channel"
                            credentialType="oauth"
                          />
                        </div>
                      )}
                      
                      {/* Discord Integration Fields - Only show when Discord is connected */}
                      {(data.nodeId === 'send-discord-message' || data.nodeId === 'new-discord-message') && 
                       integrationStatus.serviceName === 'discord' && 
                       integrationStatus.isConnected === true && (
                        <>
                          {key === 'guildId' && (
                            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                              <IntegrationField
                                fieldKey={key}
                                fieldSchema={schema}
                                value={localConfig[key]}
                                onChange={(value) => {
                                  handleConfigChange(key, value);
                                  // Clear channel when server changes
                                  if (localConfig.channelId) handleConfigChange('channelId', '');
                                }}
                                nodeId={id}
                                serviceName="discord"
                                resourceType="guild"
                                credentialType="api_token"
                              />
                            </div>
                          )}
                          {key === 'channelId' && localConfig.guildId && (
                            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                              <IntegrationField
                                fieldKey={key}
                                fieldSchema={schema}
                                value={localConfig[key]}
                                onChange={(value) => handleConfigChange(key, value)}
                                nodeId={id}
                                serviceName="discord"
                                resourceType="channel"
                                parentValue={localConfig.guildId}
                                credentialType="api_token"
                              />
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* GitHub Integration Fields */}
                      {data.nodeId === 'new-github-issue' && key === 'repo' && (
                        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <IntegrationField
                            fieldKey={key}
                            fieldSchema={schema}
                            value={localConfig[key]}
                            onChange={(value) => {
                              // Extract repo name from full_name format if needed
                              const repoName = value.includes('/') ? value.split('/').pop() : value;
                              handleConfigChange(key, repoName);
                              // Also update owner if possible
                              if (value.includes('/')) {
                                const owner = value.split('/')[0];
                                if (localConfig.owner !== owner) {
                                  handleConfigChange('owner', owner);
                                }
                              }
                            }}
                            nodeId={id}
                            serviceName="github"
                            resourceType="repository"
                            credentialType="oauth"
                          />
                        </div>
                      )}
                      
                      {/* Notion Integration Fields */}
                      {data.nodeId === 'create-notion-page' && key === 'databaseId' && integrationStatus.isConnected === true && (
                        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <IntegrationField
                            fieldKey={key}
                            fieldSchema={schema}
                            value={localConfig[key]}
                            onChange={(value) => handleConfigChange(key, value)}
                            nodeId={id}
                            serviceName="notion"
                            resourceType="database"
                            credentialType="api_token"
                          />
                        </div>
                      )}
                      
                      {/* Airtable Integration Fields */}
                      {data.nodeId === 'update-airtable-record' && (
                        <>
                          {key === 'baseId' && integrationStatus.isConnected === true && (
                            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                              <IntegrationField
                                fieldKey={key}
                                fieldSchema={schema}
                                value={localConfig[key]}
                                onChange={(value) => {
                                  handleConfigChange(key, value);
                                  // Clear dependent fields when base changes
                                  if (localConfig.tableId) handleConfigChange('tableId', '');
                                  if (localConfig.recordId) handleConfigChange('recordId', '');
                                }}
                                nodeId={id}
                                serviceName="airtable"
                                resourceType="base"
                                credentialType="oauth"
                              />
                            </div>
                          )}
                          {key === 'tableId' && integrationStatus.isConnected === true && localConfig.baseId && (
                            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                              <IntegrationField
                                fieldKey={key}
                                fieldSchema={schema}
                                value={localConfig[key]}
                                onChange={(value) => {
                                  handleConfigChange(key, value);
                                  // Clear recordId when table changes
                                  if (localConfig.recordId) handleConfigChange('recordId', '');
                                }}
                                nodeId={id}
                                serviceName="airtable"
                                resourceType="table"
                                parentValue={localConfig.baseId}
                                credentialType="oauth"
                              />
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Trello Integration Fields */}
                      {data.nodeId === 'create-trello-card' && (
                        <>
                          {key === 'boardId' && integrationStatus.isConnected === true && (
                            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                              <IntegrationField
                                fieldKey={key}
                                fieldSchema={schema}
                                value={localConfig[key]}
                                onChange={(value) => {
                                  handleConfigChange(key, value);
                                  // Clear list when board changes
                                  if (localConfig.idList) handleConfigChange('idList', '');
                                }}
                                nodeId={id}
                                serviceName="trello"
                                resourceType="board"
                                credentialType="oauth"
                              />
                            </div>
                          )}
                          {key === 'idList' && integrationStatus.isConnected === true && localConfig.boardId && (
                            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                              <IntegrationField
                                fieldKey={key}
                                fieldSchema={schema}
                                value={localConfig[key]}
                                onChange={(value) => handleConfigChange(key, value)}
                                nodeId={id}
                                serviceName="trello"
                                resourceType="list"
                                parentValue={localConfig.boardId || localConfig.idBoard}
                                credentialType="oauth"
                              />
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Regular string input for non-integration fields */}
                      {!(
                        // Google OAuth integration fields
                        (data.nodeId === 'new-row-in-google-sheet' && (key === 'spreadsheetId' || key === 'sheetName' || key === 'apiKey')) ||
                        (data.nodeId === 'new-email-received' && (key === 'labelId' || key === 'apiKey')) ||
                        (data.nodeId === 'create-calendar-event' && (key === 'calendarId' || key === 'apiKey')) ||
                        ((data.nodeId === 'upload-file-to-google-drive' || data.nodeId === 'file-uploaded') && (key === 'folderId' || key === 'apiKey')) ||
                        (data.nodeId === 'new-form-submission' && (key === 'formId' || key === 'apiKey')) ||
                        // Slack OAuth integration fields
                        ((data.nodeId === 'post-to-slack-channel' || data.nodeId === 'new-message-in-slack') && (key === 'channel' || key === 'botToken')) ||
                        // Discord integration fields
                        ((data.nodeId === 'send-discord-message' || data.nodeId === 'new-discord-message') && (key === 'guildId' || key === 'channelId')) ||
                        // GitHub OAuth integration fields
                        (data.nodeId === 'new-github-issue' && (key === 'repo' || key === 'accessToken')) ||
                        // Notion, Airtable, Trello API key/token integration fields
                        (data.nodeId === 'create-notion-page' && (key === 'databaseId' || key === 'apiKey')) ||
                        (data.nodeId === 'update-airtable-record' && (key === 'baseId' || key === 'tableId' || key === 'apiKey')) ||
                        (data.nodeId === 'create-trello-card' && (key === 'boardId' || key === 'idList' || key === 'apiKey' || key === 'token'))
                      ) && (
                        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <div className="relative">
                            {(() => {
                              const allUpstreamNodeIds = findAllUpstreamNodes(id, getNodes(), getEdges());
                              const mentionOptions = allUpstreamNodeIds.length > 0 
                                ? getMentionOptions(allUpstreamNodeIds, getNodes())
                                : [];
                              
                              return (
                                <>
                                  <MentionInput
                                    value={localConfig[key] ?? ''}
                                    onChange={(value) => handleConfigChange(key, value)}
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
                                    className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 pr-10 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
                                    availableOutputs={mentionOptions}
                                    isNodeExpanded={isExpanded}
                                  />
                                  {data.onAskAI && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                          if (data.onAskAI) {
                                            data.onAskAI(schema.label || key, id, data.nodeId || '');
                                          }
                                        }}
                                        className="h-7 px-2 text-xs inline-flex items-center justify-center gap-1 backdrop-blur-xl bg-neutral-200/70 text-foreground active:scale-[0.98] dark:bg-white/5 dark:border-white/10 dark:text-foreground dark:shadow-[0_4px_10px_rgba(0,0,0,0.1)] dark:hover:bg-white/10"
                                      >
                                        <Sparkles className="h-3 w-3" />
                                        Ask AI
                                      </Button>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Textarea + MentionInput + Ask AI */}
                  {schema.type === 'textarea' && (
                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <div className="relative">
                        {(() => {
                          const allUpstreamNodeIds = findAllUpstreamNodes(id, getNodes(), getEdges());
                          const mentionOptions = allUpstreamNodeIds.length > 0 
                            ? getMentionOptions(allUpstreamNodeIds, getNodes())
                            : [];
                          
                          return (
                            <>
                              <MentionInput
                                value={localConfig[key] ?? ''}
                                onChange={(value) => handleConfigChange(key, value)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                placeholder={schema.placeholder || schema.description}
                                rows={3}
                                isTextarea={true}
                                className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 pr-12 pb-10 text-foreground placeholder:text-muted-foreground shadow-none resize-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-gray-300 focus-visible:border-gray-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                availableOutputs={mentionOptions}
                                isNodeExpanded={isExpanded}
                              />
                              {data.onAskAI && (
                                <div className="absolute bottom-3" style={{ right: '6px' }}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                      if (data.onAskAI) {
                                        data.onAskAI(schema.label || key, id, data.nodeId || '');
                                      }
                                    }}
                                    className="h-7 px-2 text-xs inline-flex items-center justify-center gap-1 backdrop-blur-xl bg-neutral-200/70 text-foreground active:scale-[0.98] dark:bg-white/5 dark:border-white/10 dark:text-foreground dark:shadow-[0_4px_10px_rgba(0,0,0,0.1)] dark:hover:bg-white/10"
                                  >
                                    <Sparkles className="h-3 w-3" />
                                    Ask AI
                                  </Button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
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
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onMouseMove={(e) => {
                          // Prevent node dragging during text selection
                          if (e.buttons === 1) {
                            e.stopPropagation();
                          }
                        }}
                        placeholder={schema.placeholder || schema.description}
                        className="nodrag w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
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
                );
              })}
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

// OAuth Disconnect Button Component
function OAuthDisconnectButton({ 
  serviceName, 
  onDisconnect, 
  getLogoUrl, 
  getServiceSlug 
}: { 
  serviceName: string; 
  onDisconnect: () => Promise<void>; 
  getLogoUrl: (slug: string) => string | null;
  getServiceSlug: (serviceName?: string) => string | null;
}) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const slug = getServiceSlug(serviceName);
  const logoUrl = slug ? getLogoUrl(slug) : null;

  return (
    <Button
      variant="ghost"
      onClick={handleDisconnect}
      disabled={isDisconnecting}
      className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
    >
      {isDisconnecting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Disconnecting...
        </>
      ) : (
        <>
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={serviceName} 
              className="h-4 w-4 mr-2 object-contain"
            />
          ) : (
            <ExternalLink className="h-3 w-3 mr-2" />
          )}
          Disconnect
        </>
      )}
    </Button>
  );
}

function ApiTokenDisconnectButton({ 
  serviceName, 
  onDisconnect, 
  getLogoUrl, 
  getServiceSlug 
}: { 
  serviceName: string; 
  onDisconnect: () => Promise<void>; 
  getLogoUrl: (slug: string) => string | null;
  getServiceSlug: (serviceName?: string) => string | null;
}) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const slug = getServiceSlug(serviceName);
  const logoUrl = slug ? getLogoUrl(slug) : null;

  return (
    <Button
      variant="ghost"
      onClick={handleDisconnect}
      disabled={isDisconnecting}
      className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
    >
      {isDisconnecting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Disconnecting...
        </>
      ) : (
        <>
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={serviceName} 
              className="h-4 w-4 mr-2 object-contain"
            />
          ) : (
            <ExternalLink className="h-3 w-3 mr-2" />
          )}
          Disconnect
        </>
      )}
    </Button>
  );
}

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

