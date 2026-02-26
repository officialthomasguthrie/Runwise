"use client";

import { ArrowUp, Check, ChevronDown, Send, X } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface GradientColors {
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
}

interface ThemeGradients {
  light: GradientColors;
  dark: GradientColors;
}

interface DropdownOption {
  id: string;
  label: string;
  value: string;
}

interface GradientAIChatInputProps {
  placeholder?: string | React.ReactNode;
  onSend?: (message: string) => void;
  enableAnimations?: boolean;
  className?: string;
  disabled?: boolean;
  textareaHeight?: number;

  // Dropdown options
  dropdownOptions?: DropdownOption[];
  onOptionSelect?: (option: DropdownOption) => void;

  // Gradient customization - now theme-aware
  mainGradient?: ThemeGradients;
  outerGradient?: ThemeGradients;
  innerGradientOpacity?: number;
  buttonBorderColor?: {
    light: string;
    dark: string;
  };

  // Shadow customization
  enableShadows?: boolean;
  shadowOpacity?: number;
  shadowColor?: {
    light: string;
    dark: string;
  };
}

export function GradientAIChatInput({
  placeholder = "Send message...",
  onSend,
  enableAnimations = true,
  className,
  disabled = false,
  textareaHeight = 100,

  // Dropdown options - no defaults, only show if provided
  dropdownOptions,
  onOptionSelect,

  // Theme-aware gradient defaults
  mainGradient = {
    light: {
      topLeft: "#a855f7",    // Purple
      topRight: "#ec4899",    // Pink
      bottomRight: "#a855f7", // Purple
      bottomLeft: "#ec4899"   // Pink
    },
    dark: {
      topLeft: "#a855f7",     // Purple
      topRight: "#ec4899",    // Pink
      bottomRight: "#a855f7", // Purple
      bottomLeft: "#ec4899"   // Pink
    }
  },
  outerGradient = {
    light: {
      topLeft: "#9333ea",     // Darker purple
      topRight: "#db2777",    // Darker pink
      bottomRight: "#9333ea", // Darker purple
      bottomLeft: "#db2777"   // Darker pink
    },
    dark: {
      topLeft: "#9333ea",     // Darker purple
      topRight: "#db2777",    // Darker pink
      bottomRight: "#9333ea", // Darker purple
      bottomLeft: "#db2777"   // Darker pink
    }
  },
  innerGradientOpacity = 0.1,
  buttonBorderColor = {
    light: "#DBDBD8",  // Light gray for light mode
    dark: "#4A4A4A"    // Darker gray for dark mode
  },

  // Shadow defaults
  enableShadows = true,
  shadowOpacity = 1,
  shadowColor = {
    light: "rgb(168, 85, 247)", // Purple shadow for light mode
    dark: "rgb(168, 85, 247)" // Purple shadow for dark mode
  },
}: GradientAIChatInputProps) {
  const [message, setMessage] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DropdownOption | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Fix hydration mismatch - only apply theme after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current theme's gradients - default to light mode for SSR
  const isDark = mounted && theme === "dark";
  const currentMainGradient = isDark ? mainGradient.dark : mainGradient.light;
  const currentOuterGradient = isDark ? outerGradient.dark : outerGradient.light;
  const currentButtonBorderColor = isDark ? buttonBorderColor.dark : buttonBorderColor.light;
  const currentShadowColor = isDark ? shadowColor.dark : shadowColor.light;

  // Utility function to convert hex or rgb to rgba
  const hexToRgba = (color: string, alpha: number): string => {
    // Handle RGB format: rgb(r, g, b)
    if (color.startsWith('rgb(')) {
      const rgbValues = color.slice(4, -1).split(',').map(val => parseInt(val.trim()));
      return `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, ${alpha})`;
    }

    // Handle hex format
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Fallback - return as is if neither format
    return color;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && onSend && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };


  return (
    <motion.div
      className={cn(
        "relative",
        className
      )}
      initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }}
    >
      {/* Main container with border matching submit button */}
      <div className="relative rounded-[16px] bg-[#bd28b3] border border-[#ffffff1a] p-[1px]">
        {/* Inner container with background */}
        <div className="h-full w-full rounded-[15px] bg-background relative">
          {/* Content container - Two row layout */}
          <div className="relative p-4">

          {/* Top row: Text input */}
          <div className="flex items-start gap-3 mb-3">
            {/* Text input area */}
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={typeof placeholder === 'string' ? placeholder : ''}
                disabled={disabled}
                rows={1}
                className={cn(
                  "w-full resize-none border-0 bg-transparent",
                  "text-foreground placeholder:text-muted-foreground",
                  "text-base leading-6 py-2 px-0",
                  "focus:outline-none focus:ring-0 outline-none",
                  "overflow-y-auto scrollbar-hide",
                  "transition-colors duration-200",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                style={{
                  height: `${textareaHeight}px`,
                  outline: "none !important",
                  boxShadow: "none !important",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              />
              {/* Custom placeholder component overlay */}
              {!message && typeof placeholder !== 'string' && placeholder && (
                <div className="absolute inset-0 pointer-events-none flex items-start py-2 text-base text-muted-foreground text-left">
                  {placeholder}
                </div>
              )}
            </div>
          </div>

          {/* Send button - Bottom right corner circle - Styled like homepage purple buttons */}
          <div className="absolute bottom-4 right-4">
            <motion.button
              type="submit"
              onClick={handleSubmit}
              disabled={disabled || !message.trim()}
              className={cn(
                "flex items-center justify-center",
                "w-8 h-8 rounded-full",
                "bg-[#bd28b3ba] border border-[#ffffff1a]",
                "transition-all cursor-pointer",
                (disabled || !message.trim()) && "opacity-50 cursor-not-allowed"
              )}
              whileHover={shouldAnimate && message.trim() ? { scale: 1.1 } : {}}
              whileTap={shouldAnimate && message.trim() ? { scale: 0.9 } : {}}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              <ArrowUp className="w-4 h-4 text-white" />
            </motion.button>
          </div>

          {/* Bottom row: File pills + Select buttons */}
          <div className="flex items-center gap-2">
           

            {/* Dropdown selector - Only show if options are provided */}
            {dropdownOptions && dropdownOptions.length > 0 && (
            <div className="relative hidden md:block" ref={dropdownRef}>
              <motion.button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5",
                  "text-sm text-muted-foreground hover:text-foreground",
                  "rounded-full transition-colors cursor-pointer",
                  "bg-muted/30 hover:bg-muted/50",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                style={{
                  border: `1px solid ${currentButtonBorderColor}`
                }}
                whileHover={shouldAnimate ? { scale: 1.02 } : {}}
                whileTap={shouldAnimate ? { scale: 0.98 } : {}}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
              >
                <span className="text-muted-foreground font-medium">
                  {selectedOption ? selectedOption.label : "Select"}
                </span>
                <ChevronDown className={cn(
                                                        "w-3 h-3 transition-transform",
                                                        isDropdownOpen && "rotate-180"
                                                      )} />
              </motion.button>

              {/* Dropdown menu */}
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  className="absolute top-full mt-2 left-0 bg-popover border border-border rounded-lg shadow-lg min-w-[120px] z-10"
                >
                  <div className="p-1">
                    {dropdownOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSelectedOption(option);
                          onOptionSelect?.(option);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors flex items-center gap-2 mb-1",
                          selectedOption?.id === option.id && "bg-accent"
                        )}
                      >
                        <span className="flex-1">{option.label}</span>
                        {selectedOption?.id === option.id && (
                          <Check className="w-3 h-3 text-foreground" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
            )}

          </div>
        </div>
        </div>

        {/* Enhanced shadow system for both light and dark modes */}
        {enableShadows && (
          <>
            {/* Bottom shadow - stronger and more visible */}
            <div
              className="absolute -bottom-3 left-3 right-3 h-6 rounded-full blur-md"
              style={{
                opacity: shadowOpacity,
                background: `linear-gradient(to bottom, ${hexToRgba(currentShadowColor, 0.1)} 0%, transparent 100%)`
              }}
            />

            {/* Side shadows - more pronounced */}
            <div
              className="absolute -left-2 top-3 bottom-3 w-4 rounded-full blur-sm"
              style={{
                opacity: shadowOpacity,
                background: `linear-gradient(to right, ${hexToRgba(currentShadowColor, 0.06)} 0%, transparent 100%)`
              }}
            />
            <div
              className="absolute -right-2 top-3 bottom-3 w-4 rounded-full blur-sm"
              style={{
                opacity: shadowOpacity,
                background: `linear-gradient(to left, ${hexToRgba(currentShadowColor, 0.06)} 0%, transparent 100%)`
              }}
            />

            {/* Additional drop shadow for depth */}
            <div
              className="absolute inset-0 rounded-[16px] shadow-lg pointer-events-none"
              style={{
                opacity: shadowOpacity,
                boxShadow: `0 10px 25px ${hexToRgba(currentShadowColor, isDark ? 0.15 : 0.05)}`
              }}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
