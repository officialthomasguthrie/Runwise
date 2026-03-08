"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const CHAT_INPUT_PLACEHOLDERS = {
  default: "Describe what you want your agent to do…",
  questionnaire: "Type your answers…",
  adjusting: "Tell me what to change…",
} as const;
const DEFAULT_PLACEHOLDER = CHAT_INPUT_PLACEHOLDERS.default;
const MAX_TEXTAREA_ROWS = 8;
const LINE_HEIGHT_PX = 24;

interface ChatInputProps {
  placeholder?: string;
  /** When true, disables the textarea (no typing) */
  disabled?: boolean;
  /** When true, disables sending but allows typing */
  sendDisabled?: boolean;
  isStreaming?: boolean;
  onSend: (text: string) => void;
  /** When provided, Enter (without Shift) triggers this instead of sending */
  onEnterAction?: () => void;
  className?: string;
  fillValue?: string | null;
  onFillApplied?: () => void;
  autoFocus?: boolean;
}

export function ChatInput({
  placeholder = DEFAULT_PLACEHOLDER,
  disabled = false,
  sendDisabled = false,
  isStreaming = false,
  onSend,
  onEnterAction,
  className,
  fillValue,
  onFillApplied,
  autoFocus = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !isStreaming && !disabled && !sendDisabled;

  // Apply fillValue from parent (e.g. when user clicks example chip)
  useEffect(() => {
    if (fillValue) {
      setValue(fillValue);
      onFillApplied?.();
      textareaRef.current?.focus();
    }
  }, [fillValue, onFillApplied]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled || sendDisabled) return;
    onSend(trimmed);
    setValue("");
  }, [value, isStreaming, disabled, sendDisabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (onEnterAction) {
          onEnterAction();
        } else {
          handleSend();
        }
      }
    },
    [handleSend, onEnterAction]
  );

  // Auto-resize textarea (up to MAX_TEXTAREA_ROWS)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    const maxHeight = LINE_HEIGHT_PX * MAX_TEXTAREA_ROWS;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        className={cn(
          "relative flex w-full items-end rounded-xl px-3 py-2 transition-opacity",
          "border border-stone-200 bg-stone-100 dark:border-white/15 dark:bg-zinc-800/50 dark:backdrop-blur-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
          disabled && "opacity-60"
        )}
      >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className="min-h-[80px] max-h-[192px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed"
        aria-label="Message"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send"
        title="Send Message"
        className={cn(
          "absolute right-2 bottom-2 flex items-center justify-center w-7 h-7 rounded-full border transition-all",
          "bg-[#bd28b3ba] border-[#ffffff1a]",
          !canSend
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:scale-110 active:scale-95"
        )}
      >
        {isStreaming ? (
          <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
        ) : (
          <ArrowUp className="h-3.5 w-3.5 text-white" />
        )}
      </button>
      </div>
    </div>
  );
}
