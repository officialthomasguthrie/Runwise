"use client";

import { memo } from "react";
import { Handle, Position, useNodeId } from "@xyflow/react";
import { PlaceholderNode } from "@/components/placeholder-node";

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
