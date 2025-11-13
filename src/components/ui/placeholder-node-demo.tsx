"use client";

import { memo, useState, useMemo } from "react";
import { Handle, Position, useReactFlow, useNodeId } from "@xyflow/react";
import { PlaceholderNode } from "@/components/placeholder-node";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Zap, X } from "lucide-react";
import { nodeRegistry, searchNodes } from "@/lib/nodes";
import type { NodeDefinition } from "@/lib/nodes/types";
import * as LucideIcons from "lucide-react";

// Icon name mappings (same as workflow-node-library)
const iconMappings: Record<string, string> = {
  'Table': 'Table2',
  'Trello': 'LayoutGrid',
  'Webhook': 'Link',
  'Merge': 'GitMerge',
  'FileSpreadsheet': 'FileSpreadsheet',
  'FileCheck': 'FileCheck2',
  'Smartphone': 'Phone',
};

// Get Lucide icon component by name with fallbacks
const getIcon = (iconName: string) => {
  const mappedName = iconMappings[iconName] || iconName;
  let IconComponent = (LucideIcons as any)[mappedName];
  
  if (!IconComponent) {
    IconComponent = (LucideIcons as any)[`${mappedName}2`];
  }
  if (!IconComponent) {
    IconComponent = (LucideIcons as any)[iconName.replace(/([A-Z])/g, '$1')];
  }
  if (!IconComponent) {
    IconComponent = Zap;
  }
  
  return IconComponent;
};

// Helper to get type badge color
const getTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'trigger':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'action':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'transform':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const PlaceholderNodeDemo = memo(({ data }: { data?: { layoutDirection?: 'LR' | 'TB' } }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const nodeId = useNodeId();
  const { setNodes, getNode } = useReactFlow();
  const layoutDirection = data?.layoutDirection === 'TB' ? 'TB' : 'LR';
  const targetPosition = layoutDirection === 'TB' ? Position.Top : Position.Left;
  const sourcePosition = layoutDirection === 'TB' ? Position.Bottom : Position.Right;
  const verticalHandleStyle =
    layoutDirection === 'TB'
      ? { left: '50%', transform: 'translate(-50%, 0)' }
      : undefined;

  // Get all nodes and filter by search query
  const filteredNodes = useMemo(() => {
    const allNodes = Object.values(nodeRegistry) as NodeDefinition[];
    if (!searchQuery.trim()) {
      return allNodes;
    }
    return searchNodes(searchQuery);
  }, [searchQuery]);

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
    setSelectedNodeId(null);
    setSearchQuery("");
  };

  const handleAddNode = () => {
    if (!selectedNodeId || !nodeId) return;

    const currentNode = getNode(nodeId);
    if (!currentNode) return;

    const selectedNodeDef = nodeRegistry[selectedNodeId];
    if (!selectedNodeDef) return;

    // Replace placeholder node with workflow-node
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              type: 'workflow-node',
              data: {
                nodeId: selectedNodeId,
                config: {},
                layoutDirection,
              },
            }
          : node
      )
    );

    setIsModalOpen(false);
    setSelectedNodeId(null);
    setSearchQuery("");
  };

  return (
    <>
      <PlaceholderNode>
        <Handle
          type="target"
          position={targetPosition}
          id="target"
          className="w-3 h-3 bg-primary border-2 border-background"
          style={verticalHandleStyle}
        />
        <button
          onClick={handlePlusClick}
          className="w-full h-full flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity text-gray-400 hover:text-foreground"
          type="button"
        >
          +
        </button>
        <Handle
          type="source"
          position={sourcePosition}
          id="source"
          className="w-3 h-3 bg-primary border-2 border-background"
          style={verticalHandleStyle}
        />
      </PlaceholderNode>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 [&>button]:hidden">
          <div className="p-6 pb-4 border-b relative">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedNodeId(null);
                setSearchQuery("");
              }}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            <DialogHeader>
              <DialogTitle>Add Node</DialogTitle>
            </DialogHeader>

            {/* Search Bar */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Scrollable Grid of Node Cards */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredNodes.map((node) => {
                const IconComponent = getIcon(node.icon);
                const isSelected = selectedNodeId === node.id;

                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`
                      relative p-4 rounded-lg border-2 text-left transition-all
                      ${isSelected
                        ? 'border-primary bg-card shadow-md'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50'
                      }
                    `}
                    type="button"
                  >
                    {/* Icon and Type Badge */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 rounded-md bg-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${getTypeBadgeColor(node.type)}`}
                      >
                        {node.type}
                      </span>
                    </div>

                    {/* Node Name */}
                    <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                      {node.name}
                    </h3>

                    {/* Node Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {node.description}
                    </p>

                    {/* Category */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {node.category}
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredNodes.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No nodes found matching "{searchQuery}"</p>
              </div>
            )}
          </div>

          {/* Footer with Add Node Button */}
          <div className="p-6 pt-4 border-t">
            <DialogFooter className="sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedNodeId(null);
                  setSearchQuery("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNode}
                disabled={!selectedNodeId}
              >
                Add Node
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default PlaceholderNodeDemo;
