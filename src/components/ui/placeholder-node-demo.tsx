"use client";

import { memo } from "react";
import { Handle, Position, useNodeId } from "@xyflow/react";
import { PlaceholderNode } from "@/components/placeholder-node";

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

interface PlaceholderNodeData {
  layoutDirection?: 'LR' | 'TB';
  onOpenAddNodeSidebar?: () => void;
}

const PlaceholderNodeDemo = memo(({ data }: { data?: PlaceholderNodeData }) => {
  const nodeId = useNodeId();
  const layoutDirection = data?.layoutDirection === 'TB' ? 'TB' : 'LR';
  const targetPosition = layoutDirection === 'TB' ? Position.Top : Position.Left;
  const sourcePosition = layoutDirection === 'TB' ? Position.Bottom : Position.Right;
  const verticalHandleStyle =
    layoutDirection === 'TB'
      ? { left: '50%', transform: 'translate(-50%, 0)' }
      : undefined;

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open the add node sidebar instead of modal
    if (typeof data?.onOpenAddNodeSidebar === 'function') {
      data.onOpenAddNodeSidebar();
    }
  };

  return (
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
  );
});

export default PlaceholderNodeDemo;
