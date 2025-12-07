"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

interface Option {
  label: string;
  value: string;
}

interface NativeSelectProps extends Omit<ComponentProps<"select">, "options"> {
  options?: Option[];
  "aria-label"?: string;
}

export const NativeSelect = ({ 
  className, 
  options = [], 
  "aria-label": ariaLabel,
  ...props 
}: NativeSelectProps) => {
  return (
    <select
      aria-label={ariaLabel}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

