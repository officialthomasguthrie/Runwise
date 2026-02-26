"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Node, Edge } from '@xyflow/react';
import { getNodeById } from '@/lib/nodes/registry';
import { isTemplate } from '@/lib/workflow-execution/template-resolver';

import { ChevronDown, ChevronUp, Link, Eye } from "lucide-react";
interface OutputSelectorProps {
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  currentNodeId: string;
  nodes: Node[];
  edges: Edge[];
  fieldSchema?: {
    type?: string;
    label?: string;
    description?: string;
  };
}

interface OutputField {
  nodeId: string;
  nodeName: string;
  path: string;
  value: any;
  displayPath: string;
}

export function OutputSelector({
  fieldKey,
  value,
  onChange,
  currentNodeId,
  nodes,
  edges,
  fieldSchema
}: OutputSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableOutputs, setAvailableOutputs] = useState<OutputField[]>([]);

  // Find source nodes (nodes that connect to this node)
  const sourceNodeIds = edges
    .filter(edge => edge.target === currentNodeId)
    .map(edge => edge.source);

  // Get available outputs from source nodes
  useEffect(() => {
    const outputs: OutputField[] = [];
    
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
        value: null,
        displayPath: `${nodeName} (all data)`
      });
      
      // Add specific output fields from node definition
      if (outputFields.length > 0) {
        outputFields.forEach(field => {
          outputs.push({
            nodeId: sourceNodeId,
            nodeName,
            path: `inputData.${field}`,
            value: null,
            displayPath: `${nodeName} → ${field}`
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
            value: null,
            displayPath: `${nodeName} → ${field}`
          });
        });
      }
    });
    
    setAvailableOutputs(outputs);
  }, [sourceNodeIds, nodes]);

  // Check if current value is a template
  const hasTemplate = isTemplate(value);

  const handleSelectOutput = (output: OutputField) => {
    // If it's a textarea, append to existing value, otherwise replace
    if (fieldSchema?.type === 'textarea' && value && !value.includes('{{')) {
      // Append template to existing text
      onChange(`${value}\n{{${output.path}}}`);
    } else {
      // Replace with template
      onChange(`{{${output.path}}}`);
    }
    setIsOpen(false);
  };

  const handleManualEdit = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => handleManualEdit(e.target.value)}
          placeholder={fieldSchema?.description || 'Enter value or select from previous node'}
          className={cn(
            "text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300",
            hasTemplate && "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20"
          )}
        />
        {sourceNodeIds.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 w-8 p-0"
            title="Select output from previous node"
          >
            <Link className={cn("h-4 w-4", hasTemplate && "text-blue-600 dark:text-blue-400")} />
          </Button>
        )}
      </div>
      
      {hasTemplate && (
        <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
          <Eye className="h-3 w-3" />
          <span>Using output from previous node</span>
        </div>
      )}

      {isOpen && sourceNodeIds.length > 0 && (
        <div className="mt-2 p-2 bg-white/80 dark:bg-zinc-900/80 border border-stone-200 dark:border-white/10 rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
            Select output from previous nodes:
          </div>
          <div className="space-y-1">
            {availableOutputs.map((output, index) => (
              <button
                key={`${output.nodeId}-${output.path}-${index}`}
                type="button"
                onClick={() => handleSelectOutput(output)}
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Link className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{output.displayPath}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 ml-5">
                  {`{{${output.path}}}`}
                </div>
              </button>
            ))}
          </div>
          {availableOutputs.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-2">
              No previous nodes connected. Connect nodes to use their outputs.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

