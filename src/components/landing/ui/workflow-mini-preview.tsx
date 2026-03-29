"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { cn } from "@/lib/utils";

/** Same Brandfetch client + paths as `integration-orbit.tsx` / Runwise `agent-tab-content.tsx` */
const BRANDFETCH_CLIENT = "1dxbfHSJFAPEGdCLU4o5B";

const BRAND_LOGOS = {
  gmail: `https://cdn.brandfetch.io/id5o3EIREg/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  openai: `https://cdn.brandfetch.io/idR3duQxYl/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
  slack: `https://cdn.brandfetch.io/idJ_HhtG0Z/w/400/h/400/theme/dark/icon.jpeg?c=${BRANDFETCH_CLIENT}`,
} as const;

/** Compact node shell — tinted liquid glass (reads off cream bento; avoids flat white CTAs) */
const miniBase = cn(
  "w-[132px] select-none rounded-[10px] text-[#1a1a1a]",
  "border border-white/50",
  "bg-[linear-gradient(165deg,rgba(236,239,252,0.82)_0%,rgba(226,231,247,0.62)_48%,rgba(216,222,242,0.55)_100%)]",
  "backdrop-blur-xl backdrop-saturate-150",
  "shadow-[0_2px_16px_rgba(51,65,120,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]",
  "ring-1 ring-indigo-950/[0.06]",
);

const handleCls =
  "!h-2 !w-2 !border-2 !border-white !shadow-sm !bg-indigo-500";

const EDGE_STYLE = { stroke: "#6366f1", strokeWidth: 1.5 };

function MiniNodeHeader({
  logoSrc,
  logoAlt,
  title,
  logoImgClassName,
}: {
  logoSrc: string;
  logoAlt: string;
  title: string;
  /** Per-brand size (Gmail smaller, OpenAI larger, etc.) */
  logoImgClassName: string;
}) {
  return (
    <header className="flex items-center gap-1.5 border-b border-indigo-950/[0.08] px-2 py-1.5">
      <Image
        src={logoSrc}
        alt={logoAlt}
        width={40}
        height={40}
        className={cn("shrink-0 object-contain", logoImgClassName)}
        unoptimized
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <span className="truncate text-[10px] font-semibold leading-tight tracking-tight">{title}</span>
    </header>
  );
}

function MiniNodeBody({ heading, description }: { heading: string; description: string }) {
  return (
    <div className="px-2 py-1.5">
      <p className="text-[9px] font-bold leading-snug">{heading}</p>
      <p className="mt-0.5 line-clamp-2 text-[8px] leading-snug text-stone-600">{description}</p>
    </div>
  );
}

function MiniNodeFooter({ label }: { label: string }) {
  return (
    <div className="px-2 pb-2 pt-1">
      <div
        className={cn(
          "rounded-md border border-white/70 bg-white/75 px-2 py-1 text-center text-[8px] font-medium text-[#1a1a1a]/85",
          "shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm",
        )}
      >
        {label}
      </div>
    </div>
  );
}

function MiniTriggerNode() {
  return (
    <div className={miniBase}>
      <Handle type="source" position={Position.Right} id="out" className={handleCls} />
      <MiniNodeHeader
        logoSrc={BRAND_LOGOS.gmail}
        logoAlt="Gmail"
        title="Gmail"
        logoImgClassName="h-3 w-3"
      />
      <MiniNodeBody
        heading="Email trigger"
        description="Fires when a new message lands in your inbox."
      />
      <MiniNodeFooter label="Configure Gmail" />
    </div>
  );
}

function MiniActionNode() {
  return (
    <div className={miniBase}>
      <Handle type="target" position={Position.Left} id="in" className={handleCls} />
      <Handle type="source" position={Position.Right} id="out" className={handleCls} />
      <MiniNodeHeader
        logoSrc={BRAND_LOGOS.openai}
        logoAlt="OpenAI"
        title="OpenAI"
        logoImgClassName="h-4 w-4"
      />
      <MiniNodeBody
        heading="Summarize"
        description="Turns the thread into a short brief for your team."
      />
      <MiniNodeFooter label="Configure OpenAI" />
    </div>
  );
}

function MiniEndNode() {
  return (
    <div className={miniBase}>
      <Handle type="target" position={Position.Left} id="in" className={handleCls} />
      <MiniNodeHeader
        logoSrc={BRAND_LOGOS.slack}
        logoAlt="Slack"
        title="Slack"
        logoImgClassName="h-3.5 w-3.5"
      />
      <MiniNodeBody heading="Post update" description="Sends the summary to your chosen channel." />
      <MiniNodeFooter label="Configure Slack" />
    </div>
  );
}

const nodeTypes = {
  miniTrigger: MiniTriggerNode,
  miniAction: MiniActionNode,
  miniEnd: MiniEndNode,
};

const CANVAS_MAX_X = 468;
/** Tighter vertical bounds so fitView centers the graph; lower y = higher on canvas */
const CANVAS_MAX_Y = 132;

const initialNodes: Node[] = [
  {
    id: "t1",
    type: "miniTrigger",
    position: { x: 16, y: 10 },
    data: {},
    draggable: false,
  },
  {
    id: "a1",
    type: "miniAction",
    position: { x: 176, y: 2 },
    data: {},
    draggable: false,
  },
  {
    id: "e1",
    type: "miniEnd",
    position: { x: 336, y: 10 },
    data: {},
    draggable: false,
  },
];

const initialEdges: Edge[] = [
  {
    id: "t-a",
    source: "t1",
    target: "a1",
    sourceHandle: "out",
    targetHandle: "in",
    type: "straight",
    animated: true,
    style: EDGE_STYLE,
  },
  {
    id: "a-e",
    source: "a1",
    target: "e1",
    sourceHandle: "out",
    targetHandle: "in",
    type: "straight",
    animated: true,
    style: EDGE_STYLE,
  },
];

function FlowCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "straight" as const,
      style: EDGE_STYLE,
    }),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      fitViewOptions={{ padding: 0.08, maxZoom: 1, minZoom: 0.45 }}
      minZoom={0.45}
      maxZoom={1}
      panOnDrag={false}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      nodeExtent={[
        [0, 0],
        [CANVAS_MAX_X, CANVAS_MAX_Y],
      ]}
      translateExtent={[
        [-24, -16],
        [CANVAS_MAX_X + 24, CANVAS_MAX_Y + 32],
      ]}
      className="!bg-transparent"
      proOptions={{ hideAttribution: true }}
    />
  );
}

type WorkflowMiniPreviewProps = {
  className?: string;
};

export function WorkflowMiniPreview({ className = "" }: WorkflowMiniPreviewProps) {
  return (
    <ReactFlowProvider>
      <div
        className={cn(
          "relative h-full min-h-0 w-full",
          "[&_.react-flow]:h-full [&_.react-flow]:w-full",
          "workflow-mini-preview",
          className,
        )}
      >
        <FlowCanvas />
      </div>
    </ReactFlowProvider>
  );
}
