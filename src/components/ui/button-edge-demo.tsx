import { EdgeProps, Position } from "@xyflow/react";
import { memo } from "react";
import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
 
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ButtonEdge } from "@/components/button-edge";
 
type AddNodeSidebarCallback = (() => void) | undefined;

const ButtonEdgeDemo = memo((props: EdgeProps) => {
  const { addNodes, addEdges, getNode } = useReactFlow();
  
  const onEdgeClick = useCallback(() => {
    const sourceNode = getNode(props.source);
    if (!sourceNode) return;
    const layoutDirection = sourceNode.data?.layoutDirection === 'TB' ? 'TB' : 'LR';
    const rawSidebarCallback = sourceNode.data?.onOpenAddNodeSidebar;
    const onOpenAddNodeSidebar: AddNodeSidebarCallback =
      typeof rawSidebarCallback === 'function'
        ? (rawSidebarCallback as () => void)
        : undefined;
    
    // Generate unique ID for new node
    const newNodeId = `placeholder-${Date.now()}`;
    const newEdgeId = `${props.source}-${newNodeId}`;
    
    // Calculate position for new node (to the right of source node)
    const newNodePosition = {
      x: sourceNode.position.x + 400,
      y: sourceNode.position.y + Math.random() * 100 - 50, // Add some vertical offset
    };
    
    // Add new placeholder node
    addNodes({
      id: newNodeId,
      type: 'placeholder',
      position: newNodePosition,
      data: {
        layoutDirection,
        onOpenAddNodeSidebar, // Pass sidebar opener to placeholder
      } as {
        layoutDirection: 'LR' | 'TB';
        onOpenAddNodeSidebar?: () => void;
      },
    });
    
    // Add new edge from source to placeholder
    const newEdge = {
      id: newEdgeId,
      source: props.source,
      target: newNodeId,
      type: 'buttonedge',
      animated: true,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      sourcePosition: layoutDirection === 'TB' ? Position.Bottom : Position.Right,
      targetPosition: layoutDirection === 'TB' ? Position.Top : Position.Left,
    } as any;
    addEdges(newEdge);
    
    // Auto-open sidebar when placeholder is created
    if (onOpenAddNodeSidebar) {
      setTimeout(() => {
        onOpenAddNodeSidebar();
      }, 100); // Small delay to ensure node is added first
    }
  }, [props.source, addNodes, addEdges, getNode]);
 
  return (
    <ButtonEdge {...props}>
      <Button onClick={onEdgeClick} size="icon" variant="secondary">
        <Plus size={16} />
      </Button>
    </ButtonEdge>
  );
});
 
export default ButtonEdgeDemo;