"use client";

import { useState, useEffect } from 'react';
import type { Node } from '@xyflow/react';
import { getNodeById } from '@/lib/nodes/registry';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (nodeId: string, config: any) => void;
  onClose: () => void;
  onAskAI?: (fieldName: string, nodeId: string, nodeType: string) => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose, onAskAI }: NodeConfigPanelProps) {
  const nodeData = (node.data ?? {}) as any;
  const nodeDefinition = getNodeById(nodeData.nodeId ?? "");
  const config = nodeData.config || {};
  const configSchema = nodeDefinition?.configSchema || {};
  const [localConfig, setLocalConfig] = useState(config);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  // Update local config when node changes
  useEffect(() => {
    const latestData = (node.data ?? {}) as any;
    const newConfig = latestData.config || {};
    setLocalConfig(newConfig);
    setHasChanges(false);
    setIsSaved(true);
  }, [node]);

  // Check if config has changed from original
  useEffect(() => {
    const configChanged = JSON.stringify(localConfig) !== JSON.stringify(config);
    setHasChanges(configChanged);
    setIsSaved(!configChanged);
  }, [localConfig, config]);

  // Calculate required fields count
  const getRequiredFieldsCount = () => {
    return Object.values(configSchema).filter((schema: any) => schema.required).length;
  };

  // Calculate configured fields count
  const getConfiguredFieldsCount = () => {
    return Object.entries(configSchema).filter(([key, schema]: [string, any]) => {
      return schema.required && localConfig[key];
    }).length;
  };

  const requiredFieldsCount = getRequiredFieldsCount();
  const configuredFieldsCount = getConfiguredFieldsCount();

  const handleChange = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    setHasChanges(true);
    setIsSaved(false);
    // Don't auto-update - wait for Save button click
  };

  const handleSave = () => {
    onUpdate(node.id, localConfig);
    setHasChanges(false);
    setIsSaved(true);
  };

  return (
    <div className="fixed left-16 top-16 bottom-0 w-[450px] bg-background border-r border-border z-10 flex flex-col animate-in slide-in-from-left duration-300">
      <div className="flex-1 overflow-auto scrollbar-hide p-4 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">{nodeData.label || 'Node'}</h2>
          {nodeDefinition?.description && (
            <p className="text-sm text-muted-foreground">{nodeDefinition.description}</p>
          )}
          {requiredFieldsCount > 0 && (
            <p className="text-xs text-muted-foreground/70">
              Configuration required: {configuredFieldsCount}/{requiredFieldsCount} fields
            </p>
          )}
      </div>

        {/* Configuration Fields */}
        {Object.entries(configSchema).map(([key, schema]: [string, any]) => (
          <div key={key} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              {schema.label}
              {schema.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Text Input */}
            {schema.type === 'string' && !schema.options && (
              <div className="relative">
              <Input
                type="text"
                  value={localConfig[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={schema.description}
                  className="text-sm backdrop-blur-xl dark:bg-white/5 border dark:border-white/10 dark:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-border focus-visible:border-border pr-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (onAskAI) {
                      onAskAI(schema.label || key, node.id, nodeData.nodeId || '');
                    }
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs backdrop-blur-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-none dark:shadow-none hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-gray-600 dark:text-white"
                >
                  <Sparkles className="h-3 w-3 mr-1 text-gray-600 dark:text-white" />
                  Ask AI
                </Button>
              </div>
            )}

            {/* Textarea */}
            {schema.type === 'textarea' && (
              <div className="relative">
              <Textarea
                  value={localConfig[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={schema.description}
                  rows={3}
                  className="text-sm backdrop-blur-xl dark:bg-white/5 border dark:border-white/10 dark:shadow-none resize-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-border focus-visible:border-border pb-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (onAskAI) {
                      onAskAI(schema.label || key, node.id, nodeData.nodeId || '');
                    }
                  }}
                  className="absolute bottom-2 right-2 h-7 px-2 text-xs backdrop-blur-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-none dark:shadow-none hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-gray-600 dark:text-white"
                >
                  <Sparkles className="h-3 w-3 mr-1 text-gray-600 dark:text-white" />
                  Ask AI
                </Button>
              </div>
            )}

            {/* Number Input */}
            {schema.type === 'number' && (
              <Input
                type="number"
                value={localConfig[key] || schema.default || ''}
                onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                placeholder={schema.description}
                className="text-sm backdrop-blur-xl dark:bg-white/5 border dark:border-white/10 dark:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-border focus-visible:border-border"
              />
            )}

            {/* Select Dropdown */}
            {schema.type === 'select' && schema.options && (
              <select
                value={localConfig[key] || schema.default || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md backdrop-blur-xl dark:bg-white/5 border dark:border-white/10 dark:shadow-none text-foreground focus:outline-none focus:ring-0 focus:ring-offset-0"
              >
                <option value="">Select {schema.label}</option>
                {schema.options.map((option: any) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {/* Example */}
            {schema.example && (
              <p className="text-xs text-muted-foreground/60">
                e.g. {schema.example}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Save Button at Bottom */}
      <div className="p-4 bg-background/95 backdrop-blur-sm">
          <Button
            onClick={handleSave}
          variant="ghost"
          className="w-full justify-center items-center text-center backdrop-blur-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-gray-200 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
          >
          Save Configuration
          </Button>
      </div>
    </div>
  );
}

