import { memo } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import { Mail, Zap, CheckCircle, Trash2, Info } from "lucide-react";

// Trigger Node Component
export const TriggerNodeBase = memo(({ data, id }: { data: any; id: string }) => {
  const { deleteElements } = useReactFlow();
  const layoutDirection = data?.layoutDirection === 'TB' ? 'TB' : 'LR';
  const sourcePosition = layoutDirection === 'TB' ? Position.Bottom : Position.Right;
  const verticalHandleStyle =
    layoutDirection === 'TB'
      ? { left: '50%', transform: 'translate(-50%, 0)' }
      : undefined;
  
  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <BaseNode className="w-80">
      <Handle
        type="source"
        position={sourcePosition}
        id="trigger-source"
        className="w-3 h-3 bg-primary border-2 border-background"
        style={verticalHandleStyle}
      />
      <BaseNodeHeader className="border-b">
        <div className="flex items-center gap-2 flex-1">
          <Mail className="size-4 text-primary" />
          <BaseNodeHeaderTitle>Email Received</BaseNodeHeaderTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-transparent"
          >
            <Info className="h-3 w-3" />
          </Button>
          <Button
            onClick={handleDelete}
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-70 hover:opacity-100 hover:text-destructive hover:bg-transparent"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </BaseNodeHeader>
      <BaseNodeContent>
        <h3 className="text-lg font-bold">Email Trigger</h3>
        <p className="text-xs text-muted-foreground">
          Automatically triggers when a new email is received in your inbox.
        </p>
      </BaseNodeContent>
      <BaseNodeFooter>
        <h4 className="text-md self-start font-bold">Configuration</h4>
        <Button variant="ghost" className="nodrag w-full backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground">
          Configure Email
        </Button>
      </BaseNodeFooter>
    </BaseNode>
  );
});

TriggerNodeBase.displayName = "TriggerNodeBase";

// Action Node Component
export const ActionNodeBase = memo(({ data, id }: { data: any; id: string }) => {
  const { deleteElements } = useReactFlow();
  const layoutDirection = data?.layoutDirection === 'TB' ? 'TB' : 'LR';
  const targetPosition = layoutDirection === 'TB' ? Position.Top : Position.Left;
  const sourcePosition = layoutDirection === 'TB' ? Position.Bottom : Position.Right;
  const verticalHandleStyle =
    layoutDirection === 'TB'
      ? { left: '50%', transform: 'translate(-50%, 0)' }
      : undefined;
  
  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  const nodeTitle = data.label === 'Send Reply' ? 'Send Reply' : 'AI Analysis';
  const nodeDescription = data.label === 'Send Reply' 
    ? 'Sends the generated reply back to the sender.' 
    : 'Analyzes the email content and generates an appropriate response.';
  const buttonText = data.label === 'Send Reply' ? 'Configure Gmail' : 'Configure AI';

  return (
    <BaseNode className="w-80">
      <Handle
        type="target"
        position={targetPosition}
        id="action-target"
        className="w-3 h-3 bg-primary border-2 border-background"
        style={verticalHandleStyle}
      />
      <Handle
        type="source"
        position={sourcePosition}
        id="action-source"
        className="w-3 h-3 bg-primary border-2 border-background"
        style={verticalHandleStyle}
      />
      <BaseNodeHeader className="border-b">
        <div className="flex items-center gap-2 flex-1">
          <Zap className="size-4 text-primary" />
          <BaseNodeHeaderTitle>{nodeTitle}</BaseNodeHeaderTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-transparent"
          >
            <Info className="h-3 w-3" />
          </Button>
          <Button
            onClick={handleDelete}
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-70 hover:opacity-100 hover:text-destructive hover:bg-transparent"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </BaseNodeHeader>
      <BaseNodeContent>
        <h3 className="text-lg font-bold">{nodeTitle}</h3>
        <p className="text-xs text-muted-foreground">
          {nodeDescription}
        </p>
      </BaseNodeContent>
      <BaseNodeFooter>
        <h4 className="text-md self-start font-bold">Configuration</h4>
        <Button variant="ghost" className="nodrag w-full backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground">
          {buttonText}
        </Button>
      </BaseNodeFooter>
    </BaseNode>
  );
});

ActionNodeBase.displayName = "ActionNodeBase";

// End Node Component
export const EndNodeBase = memo(({ data, id }: { data: any; id: string }) => {
  const { deleteElements } = useReactFlow();
  const layoutDirection = data?.layoutDirection === 'TB' ? 'TB' : 'LR';
  const targetPosition = layoutDirection === 'TB' ? Position.Top : Position.Left;
  const verticalHandleStyle =
    layoutDirection === 'TB'
      ? { left: '50%', transform: 'translate(-50%, 0)' }
      : undefined;
  
  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <BaseNode className="w-80">
      <Handle
        type="target"
        position={targetPosition}
        id="end-target"
        className="w-3 h-3 bg-primary border-2 border-background"
        style={verticalHandleStyle}
      />
      <BaseNodeHeader className="border-b">
        <div className="flex items-center gap-2 flex-1">
          <CheckCircle className="size-4 text-primary" />
          <BaseNodeHeaderTitle>Reply Sent</BaseNodeHeaderTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-transparent"
          >
            <Info className="h-3 w-3" />
          </Button>
          <Button
            onClick={handleDelete}
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-70 hover:opacity-100 hover:text-destructive hover:bg-transparent"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </BaseNodeHeader>
      <BaseNodeContent>
        <h3 className="text-lg font-bold">Workflow Complete</h3>
        <p className="text-xs text-muted-foreground">
          The email reply has been successfully sent to the recipient.
        </p>
      </BaseNodeContent>
      <BaseNodeFooter>
        <h4 className="text-md self-start font-bold">Status</h4>
        <Button variant="ghost" className="nodrag w-full backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground">
          View Logs
        </Button>
      </BaseNodeFooter>
    </BaseNode>
  );
});

EndNodeBase.displayName = "EndNodeBase";
