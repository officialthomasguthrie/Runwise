import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

export const BaseNode = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-xl border border-stone-200 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 text-card-foreground backdrop-blur-xl",
      "shadow-[0_15px_30px_-12px_rgba(0,0,0,0.1),0_5px_15px_-8px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]",
      "dark:border-white/20 dark:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3),0_4px_6px_-4px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.05)]",
      "hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15),0_10px_20px_-8px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)]",
      "dark:hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4),0_8px_12px_-8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)]",
      "hover:-translate-y-1 transition-all duration-300 ease-out",
      // React Flow displays node elements inside of a `NodeWrapper` component,
      // which compiles down to a div with the class `react-flow__node`.
      // When a node is selected, the class `selected` is added to the
      // `react-flow__node` element. This allows us to style the node when it
      // is selected, using Tailwind's `&` selector.
      "[.react-flow\\_\\_node.selected_&]:border-primary/50",
      "[.react-flow\\_\\_node.selected_&]:shadow-[0_0_0_2px_hsl(var(--primary)/0.2),0_15px_30px_-12px_rgba(0,0,0,0.1)]",
      "[.react-flow\\_\\_node.selected_&]:from-stone-50 [.react-flow\\_\\_node.selected_&]:to-stone-100",
      "[.react-flow\\_\\_node.selected_&]:dark:from-zinc-900/95 [.react-flow\\_\\_node.selected_&]:dark:to-zinc-900/80",
      className,
    )}
    tabIndex={0}
    {...props}
  />
));
BaseNode.displayName = "BaseNode";

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export const BaseNodeHeader = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <header
    ref={ref}
    {...props}
    className={cn(
      "mx-0 my-0 -mb-1 flex flex-row items-center justify-between gap-2 px-3 py-2",
      // Remove or modify these classes if you modify the padding in the
      // `<BaseNode />` component.
      className,
    )}
  />
));
BaseNodeHeader.displayName = "BaseNodeHeader";

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export const BaseNodeHeaderTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="base-node-title"
    className={cn("user-select-none flex-1 font-semibold", className)}
    {...props}
  />
));
BaseNodeHeaderTitle.displayName = "BaseNodeHeaderTitle";

export const BaseNodeContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="base-node-content"
    className={cn("flex flex-col gap-y-2 p-3", className)}
    {...props}
  />
));
BaseNodeContent.displayName = "BaseNodeContent";

export const BaseNodeFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="base-node-footer"
    className={cn(
      "flex flex-col items-center gap-y-2 border-t px-3 pb-3 pt-2",
      className,
    )}
    {...props}
  />
));
BaseNodeFooter.displayName = "BaseNodeFooter";
