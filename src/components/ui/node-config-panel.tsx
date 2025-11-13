"use client";

import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getNodeById } from '@/lib/nodes/registry';
import type { Node } from '@xyflow/react';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (nodeId: string, config: any) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const nodeDefinition = getNodeById(node.data.nodeId);
  const [config, setConfig] = useState(node.data.config || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setConfig(node.data.config || {});
    setHasChanges(false);
  }, [node]);

  if (!nodeDefinition) {
    return (
      <div className="fixed right-0 top-16 bottom-0 w-96 bg-background border-l border-border shadow-2xl z-50 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Node Not Found</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">
            This node type is not available in the library.
          </p>
        </div>
      </div>
    );
  }

  const configSchema = nodeDefinition.configSchema || {};

  const validateConfig = () => {
    const newErrors: Record<string, string> = {};
    
    Object.entries(configSchema).forEach(([key, schema]: [string, any]) => {
      if (schema.required && !config[key]) {
        newErrors[key] = `${schema.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateConfig()) {
      onUpdate(node.id, config);
      setHasChanges(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
    setHasChanges(true);
    // Clear error for this field
    if (errors[key]) {
      const newErrors = { ...errors };
      delete newErrors[key];
      setErrors(newErrors);
    }
  };

  const getRequiredFieldsCount = () => {
    return Object.values(configSchema).filter((schema: any) => schema.required).length;
  };

  const getConfiguredFieldsCount = () => {
    return Object.entries(configSchema).filter(([key, schema]: [string, any]) => {
      return schema.required && config[key];
    }).length;
  };

  const isFullyConfigured = getConfiguredFieldsCount() === getRequiredFieldsCount();

  return (
    <div className="fixed right-0 top-16 bottom-0 w-[450px] bg-background border-l border-border shadow-2xl z-50 overflow-auto animate-in slide-in-from-right duration-300">
      <div className="sticky top-0 bg-background border-b border-border p-4 z-10">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{node.data.label}</h2>
            <p className="text-sm text-muted-foreground mt-1">{nodeDefinition.description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Configuration Status */}
        <div className="flex items-center gap-2 mt-3">
          {isFullyConfigured ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-500 font-medium">Fully Configured</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-500 font-medium">
                Configuration Required ({getConfiguredFieldsCount()}/{getRequiredFieldsCount()} required fields)
              </span>
            </>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Node Type Badge */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20">
            {nodeDefinition.type}
          </span>
          <span className="px-2 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground">
            {nodeDefinition.category}
          </span>
        </div>

        {/* Info about variables */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-500">
              <p className="font-medium mb-1">Pro tip: Use variables</p>
              <p className="text-blue-400">
                Use <code className="bg-blue-500/20 px-1 rounded">{"{{variable}}"}</code> to reference data from previous nodes.
                Example: <code className="bg-blue-500/20 px-1 rounded">{"{{input.email}}"}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Form Fields */}
        {Object.entries(configSchema).map(([key, schema]: [string, any]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
              {schema.label}
              {schema.required && (
                <span className="text-red-500 text-xs">*</span>
              )}
            </Label>

            {/* Text Input */}
            {schema.type === 'string' && !schema.options && (
              <Input
                id={key}
                type="text"
                value={config[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={schema.description}
                className={errors[key] ? 'border-red-500' : ''}
              />
            )}

            {/* Textarea */}
            {schema.type === 'textarea' && (
              <Textarea
                id={key}
                value={config[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={schema.description}
                rows={5}
                className={errors[key] ? 'border-red-500' : ''}
              />
            )}

            {/* Number Input */}
            {schema.type === 'number' && (
              <Input
                id={key}
                type="number"
                value={config[key] || schema.default || ''}
                onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                placeholder={schema.description}
                className={errors[key] ? 'border-red-500' : ''}
              />
            )}

            {/* Select Dropdown */}
            {schema.type === 'select' && schema.options && (
              <select
                id={key}
                value={config[key] || schema.default || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                className={`w-full px-3 py-2 border rounded-md bg-background ${
                  errors[key] ? 'border-red-500' : 'border-input'
                }`}
              >
                <option value="">Select {schema.label}</option>
                {schema.options.map((option: any) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {/* Array Input (simple comma-separated) */}
            {schema.type === 'array' && (
              <Input
                id={key}
                type="text"
                value={Array.isArray(config[key]) ? config[key].join(', ') : config[key] || ''}
                onChange={(e) => handleChange(key, e.target.value.split(',').map((s: string) => s.trim()))}
                placeholder={`${schema.description} (comma-separated)`}
                className={errors[key] ? 'border-red-500' : ''}
              />
            )}

            {/* Object Input (JSON) */}
            {schema.type === 'object' && (
              <Textarea
                id={key}
                value={typeof config[key] === 'object' ? JSON.stringify(config[key], null, 2) : config[key] || '{}'}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleChange(key, parsed);
                  } catch {
                    // Invalid JSON, store as string for now
                    handleChange(key, e.target.value);
                  }
                }}
                placeholder="JSON object"
                rows={4}
                className={`font-mono text-xs ${errors[key] ? 'border-red-500' : ''}`}
              />
            )}

            {/* Description */}
            <p className="text-xs text-muted-foreground">{schema.description}</p>

            {/* Error Message */}
            {errors[key] && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[key]}
              </p>
            )}
          </div>
        ))}

        {Object.keys(configSchema).length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No configuration needed for this node.</p>
          </div>
        )}
      </div>

      {/* Sticky Footer with Actions */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4 space-y-2">
        {hasChanges && (
          <div className="text-xs text-orange-500 flex items-center gap-1 mb-2">
            <AlertCircle className="h-3 w-3" />
            Unsaved changes
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            disabled={!hasChanges}
          >
            {hasChanges ? 'Save Configuration' : 'Saved'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
          >
            {hasChanges ? 'Cancel' : 'Close'}
          </Button>
        </div>

        {Object.keys(errors).length > 0 && (
          <p className="text-xs text-red-500 text-center">
            Please fix {Object.keys(errors).length} error(s) before saving
          </p>
        )}
      </div>
    </div>
  );
}

