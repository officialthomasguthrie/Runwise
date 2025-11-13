import { type ReactNode } from "react";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

export const ButtonEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  ...otherProps
}: EdgeProps & { children: ReactNode }) => {
  const isVertical =
    sourcePosition === "top" ||
    sourcePosition === "bottom" ||
    targetPosition === "top" ||
    targetPosition === "bottom";

  const [edgePath, labelX, labelY] = isVertical
    ? getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 16,
        centerX: sourceX,
        centerY: sourceY + (targetY - sourceY) / 2,
      })
    : getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={style}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          {(otherProps as any).children}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
