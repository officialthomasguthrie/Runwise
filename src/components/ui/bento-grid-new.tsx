import { cn } from "@/lib/utils";

export const BentoGridNew = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:gap-6 md:auto-rows-[16rem] md:grid-cols-2 lg:auto-rows-[18rem] lg:grid-cols-3",
        className,
      )}
      suppressHydrationWarning={true}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "group/bento shadow-input row-span-1 flex flex-col justify-between space-y-4 rounded-xl border border-border bg-card p-4 transition duration-200 hover:shadow-xl hover:border-primary hover:shadow-primary/20",
        className,
      )}
      suppressHydrationWarning={true}
    >
      {header}
      <div className="transition duration-200 group-hover/bento:translate-x-2">
        {icon}
        <div className="mt-2 mb-2 font-geist font-bold text-card-foreground">
          {title}
        </div>
        <div className="font-geist text-xs font-normal text-muted-foreground">
          {description}
        </div>
      </div>
    </div>
  );
};
