import { Plus } from "lucide-react";
import { EdgeProps, Position } from "@xyflow/react";
import { memo } from "react";
import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
 
import { Button } from "@/components/ui/button";
import { ButtonEdge } from "@/components/button-edge";
 
const ButtonEdgeDemo = memo((props: EdgeProps) => {
  const { addNodes, deleteElements, addEdges, getNode, getEdges } = useReactFlow();
  
  const onEdgeClick = useCallback(() => {
    const sourceNode = getNode(props.source);
    const targetNode = getNode(props.target);
    
    if (!sourceNode || !targetNode) return;
    
    const layoutDirection = sourceNode.data?.layoutDirection === 'TB' ? 'TB' : 'LR';
    const onOpenAddNodeSidebar = sourceNode.data?.onOpenAddNodeSidebar;
    
    // Generate unique ID for new node
    const newNodeId = `placeholder-${Date.now()}`;
    
    // Calculate position for new node (midpoint between source and target)
    const newNodePosition = {
      x: (sourceNode.position.x + targetNode.position.x) / 2,
      y: (sourceNode.position.y + targetNode.position.y) / 2,
    };
    
    // Remove the clicked edge first
    deleteElements({ edges: [{ id: props.id }] });
    
    // Add new placeholder node
    addNodes({
      id: newNodeId,
      type: 'placeholder',
      position: newNodePosition,
      data: {
        layoutDirection,
        onOpenAddNodeSidebar, // Pass sidebar opener to placeholder
      },
    });
    
    // Create two new edges: source -> new node -> target
    const edge1 = {
      id: `${props.source}-${newNodeId}`,
      source: props.source,
      target: newNodeId,
      type: 'buttonedge',
      animated: true,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      sourcePosition: layoutDirection === 'TB' ? Position.Bottom : Position.Right,
      targetPosition: layoutDirection === 'TB' ? Position.Top : Position.Left,
    } as any;
    
    const edge2 = {
      id: `${newNodeId}-${props.target}`,
      source: newNodeId,
      target: props.target,
      type: 'buttonedge',
      animated: true,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      sourcePosition: layoutDirection === 'TB' ? Position.Bottom : Position.Right,
      targetPosition: layoutDirection === 'TB' ? Position.Top : Position.Left,
    } as any;
    
    // Add the two new edges
    addEdges(edge1);
    addEdges(edge2);
    
    // Automatically open sidebar for new placeholder
    if (onOpenAddNodeSidebar && typeof onOpenAddNodeSidebar === 'function') {
      setTimeout(() => {
        onOpenAddNodeSidebar(newNodeId);
      }, 100);
    }
  }, [props.source, props.target, props.id, addNodes, deleteElements, addEdges, getNode]);
 
  return (
    <ButtonEdge {...props}>
      <Button 
        onClick={onEdgeClick} 
        size="icon" 
        className="h-8 w-8 rounded-full backdrop-blur-lg bg-white/50 dark:bg-zinc-900/50 border border-white/40 dark:border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_25px_rgba(0,0,0,0.3)] hover:bg-white/80 dark:hover:bg-zinc-900/80 transition-all duration-300 hover:scale-110 text-foreground"
      >
        <Plus size={16} />
      </Button>
    </ButtonEdge>
  );
});
 
export default ButtonEdgeDemo;