"use client";

import { Mail, Zap, CheckCircle } from "lucide-react";
import { Handle, Position } from "@xyflow/react";

// Custom Trigger Node Component
export const TriggerNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-4 min-w-[200px] min-h-[80px]">
      <Handle
        type="source"
        position={Position.Right}
        id="trigger-source"
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-card-foreground leading-tight">
            Email Received
          </h3>
        </div>
      </div>
    </div>
  );
};

// Custom Action Node Component
export const ActionNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-4 min-w-[200px] min-h-[80px]">
      <Handle
        type="target"
        position={Position.Left}
        id="action-target"
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="action-source"
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-card-foreground leading-tight">
            {data.label || 'AI Analysis'}
          </h3>
        </div>
      </div>
    </div>
  );
};

// Custom End Node Component
export const EndNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-4 min-w-[200px] min-h-[80px]">
      <Handle
        type="target"
        position={Position.Left}
        id="end-target"
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <CheckCircle className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-card-foreground leading-tight">
            Reply Sent
          </h3>
        </div>
      </div>
    </div>
  );
};
