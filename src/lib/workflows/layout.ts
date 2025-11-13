/**
 * Workflow Layout Helper using Dagre
 * Automatically positions nodes in a hierarchical layout
 */

import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeWidth?: number;
  nodeHeight?: number;
  nodesep?: number;  // Horizontal spacing between nodes at same rank
  ranksep?: number;  // Vertical spacing between ranks
  marginx?: number;  // Graph margin X
  marginy?: number;  // Graph margin Y
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'LR',    // Left to Right (like a flowchart)
  nodeWidth: 320,     // Standard workflow node width
  nodeHeight: 200,    // Standard workflow node height
  nodesep: 100,       // 100px between nodes horizontally
  ranksep: 150,       // 150px between ranks (columns)
  marginx: 50,        // 50px margin on sides
  marginy: 50,        // 50px margin on top/bottom
};

/**
 * Auto-layout nodes using Dagre hierarchical layout algorithm
 * 
 * @param nodes - Workflow nodes to layout
 * @param edges - Workflow edges (connections)
 * @param options - Layout configuration options
 * @returns Object with layouted nodes and original edges
 * 
 * @example
 * const { nodes: layoutedNodes, edges } = getLayoutedElements(nodes, edges);
 * setNodes(layoutedNodes);
 * setEdges(edges);
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  // Merge options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph();
  
  // Set default edge label (required by dagre)
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure graph layout
  dagreGraph.setGraph({
    rankdir: config.direction,
    nodesep: config.nodesep,
    ranksep: config.ranksep,
    marginx: config.marginx,
    marginy: config.marginy,
    align: undefined,  // Let dagre decide alignment
    ranker: 'network-simplex',  // Best algorithm for workflow layouts
  });

  // Add all nodes to the graph with their dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: config.nodeWidth,
      height: config.nodeHeight,
    });
  });

  // Add all edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Update nodes with calculated positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Dagre gives us the center point of each node
    // We need to convert to top-left corner for React Flow
    const x = nodeWithPosition.x - config.nodeWidth / 2;
    const y = nodeWithPosition.y - config.nodeHeight / 2;

    return {
      ...node,
      position: { x, y },
    };
  });

  return {
    nodes: layoutedNodes,
    edges, // Edges don't need position updates
  };
}

/**
 * Re-layout existing workflow (useful for "Auto-arrange" button)
 */
export function relayoutWorkflow(
  nodes: Node[],
  edges: Edge[],
  direction?: LayoutDirection
): { nodes: Node[]; edges: Edge[] } {
  return getLayoutedElements(nodes, edges, { direction });
}

/**
 * Get layout for specific workflow types
 */
export const layoutPresets = {
  /** Compact layout for simple workflows */
  compact: (nodes: Node[], edges: Edge[]) =>
    getLayoutedElements(nodes, edges, {
      direction: 'LR',
      nodesep: 80,
      ranksep: 120,
    }),

  /** Spacious layout for complex workflows */
  spacious: (nodes: Node[], edges: Edge[]) =>
    getLayoutedElements(nodes, edges, {
      direction: 'LR',
      nodesep: 150,
      ranksep: 200,
    }),

  /** Vertical layout (top to bottom) */
  vertical: (nodes: Node[], edges: Edge[]) =>
    getLayoutedElements(nodes, edges, {
      direction: 'TB',
      nodesep: 100,
      ranksep: 150,
    }),

  /** Horizontal layout (left to right) - default */
  horizontal: (nodes: Node[], edges: Edge[]) =>
    getLayoutedElements(nodes, edges, {
      direction: 'LR',
      nodesep: 100,
      ranksep: 150,
    }),
};

