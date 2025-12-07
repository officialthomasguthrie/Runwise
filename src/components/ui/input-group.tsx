"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center", className)}
      {...props}
    />
  )
);
InputGroup.displayName = "InputGroup";

export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "leading" | "trailing" | "block-start" | "block-end" | "inline-start" | "inline-end";
}

export const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center",
        align === "leading" && "rounded-l-md",
        align === "trailing" && "rounded-r-md",
        className
      )}
      {...props}
    />
  )
);
InputGroupAddon.displayName = "InputGroupAddon";

export interface InputGroupButtonProps extends Omit<ButtonProps, 'size'> {
  size?: ButtonProps['size'] | 'icon-sm';
}

export const InputGroupButton = React.forwardRef<HTMLButtonElement, InputGroupButtonProps>(
  ({ className, variant = "ghost", size, ...props }, ref) => {
    // Map 'icon-sm' to 'sm' for the Button component
    const buttonSize = size === 'icon-sm' ? 'sm' : size;
    return (
      <Button
        ref={ref}
        variant={variant}
        size={buttonSize}
        className={cn(className)}
        {...props}
      />
    );
  }
);
InputGroupButton.displayName = "InputGroupButton";

export interface InputGroupTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(
  ({ className, ...props }, ref) => (
    <Textarea
      ref={ref}
      className={cn("resize-none", className)}
      {...props}
    />
  )
);
InputGroupTextarea.displayName = "InputGroupTextarea";

