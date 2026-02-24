"use client";

import { ArrowUp } from "lucide-react";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroPromptInputProps {
  placeholder?: React.ReactNode;
  onSend?: (message: string) => void;
  className?: string;
  disabled?: boolean;
}

export function HeroPromptInput({
  placeholder,
  onSend,
  className,
  disabled = false,
}: HeroPromptInputProps) {
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = () => {
    if (message.trim() && onSend && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = !!message.trim() && !disabled;

  return (
    <motion.div
      className={cn("relative", className)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
    >
      {/* Container */}
      <div
        className={cn(
          "relative rounded-2xl transition-all duration-300",
          // Light mode: white background, very subtle border, soft shadow
          "bg-white border border-black/[0.07]",
          "shadow-[0_2px_20px_rgba(0,0,0,0.06)]",
          // Dark mode: dark translucent background, subtle white border
          "dark:bg-white/[0.05] dark:border-white/[0.09]",
          "dark:shadow-[0_2px_32px_rgba(0,0,0,0.4)]",
          // Focus ring: very subtle
          focused && "border-black/[0.13] shadow-[0_4px_28px_rgba(0,0,0,0.09)] dark:border-white/[0.15] dark:shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
        )}
      >
        <div className="relative p-4 pb-3">

          {/* Textarea */}
          <div
            className="relative mb-10"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, black 72%, transparent 96%)",
              maskImage: "linear-gradient(to bottom, black 72%, transparent 96%)",
            }}
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={disabled}
              rows={1}
              className={cn(
                "w-full resize-none border-0 bg-transparent",
                "text-foreground text-[15px] leading-relaxed",
                "py-0 px-0",
                "focus:outline-none focus:ring-0 outline-none",
                "overflow-y-auto",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              style={{
                height: "68px",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              } as React.CSSProperties}
            />

            {/* Animated placeholder overlay */}
            {!message && placeholder && (
              <div className="absolute inset-0 pointer-events-none flex items-start text-[15px] text-muted-foreground/55 dark:text-muted-foreground/50">
                {placeholder}
              </div>
            )}

          </div>

          {/* Send button — bottom right, absolutely positioned */}
          <div className="absolute bottom-3 right-4">
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              whileHover={canSend ? { scale: 1.07 } : {}}
              whileTap={canSend ? { scale: 0.93 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                "bg-[#bd28b3ba] border border-[#ffffff1a] cursor-pointer",
                !canSend && "opacity-50 cursor-not-allowed"
              )}
            >
              <ArrowUp className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
