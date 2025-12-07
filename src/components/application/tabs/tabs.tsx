"use client";

import { Tabs as AriaTabs, TabList as AriaTabList, Tab as AriaTab, TabPanel as AriaTabPanel } from "react-aria-components";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

interface TabItem {
  id: string;
  label: string;
  badge?: number;
}

interface TabsProps extends Omit<ComponentProps<typeof AriaTabs>, "orientation"> {
  orientation?: "horizontal" | "vertical";
  type?: "button-border" | "button" | "line" | "pills";
  items?: TabItem[];
}

const TabsRoot = ({ className, orientation = "horizontal", ...props }: TabsProps) => {
  return (
    <AriaTabs
      orientation={orientation}
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col" : "flex-row",
        className
      )}
      {...props}
    />
  );
};

interface TabsListProps extends Omit<ComponentProps<typeof AriaTabList>, 'children'> {
  type?: "button-border" | "button-gray" | "button" | "line" | "pills";
  items?: TabItem[];
  children?: (item: TabItem) => ReactNode;
}

const TabsList = ({ className, type = "button-border", items, children, ...props }: TabsListProps) => {
  return (
    <AriaTabList
      className={cn(
        "flex flex-col",
        type === "button-border" && "gap-0.5 rounded-lg border border-border bg-muted p-1",
        type === "button-gray" && "gap-0.5",
        type === "button" && "gap-1",
        type === "line" && "border-b border-border",
        type === "pills" && "gap-1",
        className
      )}
      items={items}
      {...props}
    >
      {children}
    </AriaTabList>
  );
};

interface TabsItemProps extends ComponentProps<typeof AriaTab> {
  badge?: number;
  id?: string;
  label?: string;
}

const TabsItem = ({ 
  className, 
  badge,
  label,
  children,
  id,
  ...props 
}: TabsItemProps) => {
  const content = label || (typeof children === 'function' ? undefined : children);
  return (
    <AriaTab
      id={id}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
        "hover:bg-white/20 dark:hover:bg-zinc-900/20",
        "data-[selected]:backdrop-blur-xl data-[selected]:bg-white/40 data-[selected]:dark:bg-zinc-900/40 data-[selected]:border data-[selected]:border-stone-200 data-[selected]:dark:border-white/10 data-[selected]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] data-[selected]:text-foreground",
        "data-[focus-visible]:outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring data-[focus-visible]:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {content}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </AriaTab>
  );
};

const TabsPanel = ({ className, ...props }: ComponentProps<typeof AriaTabPanel>) => {
  return (
    <AriaTabPanel
      className={cn(
        "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  );
};

// Create a compound component
const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Item: TabsItem,
  Panel: TabsPanel,
});

export { Tabs };

