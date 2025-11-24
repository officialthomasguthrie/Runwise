"use client";

import React, { forwardRef, type ReactNode } from "react";
import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";

import { BaseNode } from "@/components/base-node";

export type PlaceholderNodeProps = Partial<NodeProps> & {
  children?: ReactNode;
};

export const PlaceholderNode = forwardRef<HTMLDivElement, PlaceholderNodeProps>(
  ({ children }, ref) => {

    return (
      <BaseNode
        ref={ref}
        className="w-[150px] border border-stone-200 dark:border-white/20 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl shadow-[0_15px_30px_-12px_rgba(0,0,0,0.1),0_5px_15px_-8px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3),0_4px_6px_-4px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15),0_10px_20px_-8px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] dark:hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4),0_8px_12px_-8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:-translate-y-1 transition-all duration-300 p-2 text-center text-foreground"
      >
        {children}
        <Handle
          type="target"
          style={{ visibility: "hidden" }}
          position={Position.Top}
          isConnectable={false}
        />
        <Handle
          type="source"
          style={{ visibility: "hidden" }}
          position={Position.Bottom}
          isConnectable={false}
        />
      </BaseNode>
    );
  },
);

PlaceholderNode.displayName = "PlaceholderNode";
