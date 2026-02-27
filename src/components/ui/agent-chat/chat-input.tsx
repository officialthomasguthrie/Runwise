"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export const CHAT_INPUT_PLACEHOLDERS = {
  default: "Describe what you want your agent to do…",
  questionnaire: "Type your answers…",
  adjusting: "Tell me what to change…",
} as const;
const DEFAULT_PLACEHOLDER = CHAT_INPUT_PLACEHOLDERS.default;
const MAX_TEXTAREA_ROWS = 4;
const LINE_HEIGHT_PX = 24;

interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  onSend: (text: string) => void;
  className?: string;
  fillValue?: string | null;
  onFillApplied?: () => void;
  autoFocus?: boolean;
}

export function ChatInput({
  placeholder = DEFAULT_PLACEHOLDER,
  disabled = false,
  isStreaming = false,
  onSend,
  className,
  fillValue,
  onFillApplied,
  autoFocus = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

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
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue("");
  }, [value, isStreaming, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
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
      {isStreaming && (
        <span className="text-xs text-muted-foreground/70">AI is thinking…</span>
      )}
      <div
        className={cn(
          "flex w-full items-end gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition-opacity",
          (isStreaming || disabled) && "opacity-60"
        )}
      >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isStreaming || disabled}
        rows={1}
        className="min-h-[24px] max-h-[96px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed"
        aria-label="Message"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-pink-500/20 text-pink-400 transition-colors hover:bg-pink-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-pink-500/20"
      >
        <Send className="h-4 w-4" />
      </button>
      </div>
    </div>
  );
}
