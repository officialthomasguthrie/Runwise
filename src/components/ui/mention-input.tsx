"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface MentionOption {
  nodeId: string;
  nodeName: string;
  path: string;
  displayPath: string;
  fullPath: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  availableOutputs: MentionOption[];
  isTextarea?: boolean;
  rows?: number;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  isNodeExpanded?: boolean; // Whether the parent node is expanded
}

export function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  availableOutputs,
  isTextarea = false,
  rows = 3,
  onClick,
  onMouseDown,
  isNodeExpanded = true,
}: MentionInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 0 });
  const positionUpdateRef = useRef<number | undefined>(undefined);

  // Group outputs by node, preserving order
  const nodeOrder = new Map<string, number>();
  availableOutputs.forEach((output, idx) => {
    if (!nodeOrder.has(output.nodeId)) {
      nodeOrder.set(output.nodeId, nodeOrder.size);
    }
  });

  const groupedOutputs = availableOutputs.reduce((acc, output) => {
    if (!acc[output.nodeId]) {
      acc[output.nodeId] = {
        nodeName: output.nodeName,
        outputs: [],
        order: nodeOrder.get(output.nodeId) || 0,
      };
    }
    acc[output.nodeId].outputs.push(output);
    return acc;
  }, {} as Record<string, { nodeName: string; outputs: MentionOption[]; order: number }>);

  // Filter and sort by execution order
  const filteredGroups = Object.entries(groupedOutputs)
    .map(([nodeId, group]) => {
      const filtered = group.outputs.filter((output) =>
        output.displayPath.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      return filtered.length > 0 ? { ...group, nodeId, filtered } : null;
    })
    .filter((group): group is NonNullable<typeof group> => group !== null)
    .sort((a, b) => a.order - b.order);

  const filteredOptions = filteredGroups.flatMap((group) => group.filtered);

  // Get popover position - positioned at bottom of input field, same width
  const getPopoverPosition = useCallback(() => {
    const input = inputRef.current;
    if (!input) return { top: 0, left: 0, width: 0 };

    // Get input's actual screen position (accounts for all transforms including zoom/pan)
    const inputRect = input.getBoundingClientRect();
    
    // Get input's CSS width (not transformed) so dropdown maintains consistent size
    const inputWidth = input.offsetWidth;
    
    // Position at bottom of input field, same width, perfectly aligned
    return {
      top: inputRect.bottom + 4, // 4px gap below input
      left: inputRect.left, // Aligned with left edge
      width: inputWidth, // Use CSS width (not transformed) for consistent size
    };
  }, []);

  // Check for @ mention
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);

    // Find @ symbol before cursor
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if there's a space after @ (meaning mention is complete)
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionStart(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (showMentions && filteredOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredOptions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    onKeyDown?.(e);
  };

  // Insert mention at cursor position
  const insertMention = (option: MentionOption) => {
    const input = inputRef.current;
    if (!input) return;

    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(input.selectionStart || value.length);
    const template = `{{${option.fullPath}}}`;
    const newValue = beforeMention + template + afterMention;

    onChange(newValue);
    setShowMentions(false);

    // Set cursor after inserted mention
    setTimeout(() => {
      const newCursorPos = beforeMention.length + template.length;
      if (isTextarea) {
        (input as HTMLTextAreaElement).setSelectionRange(newCursorPos, newCursorPos);
      } else {
        (input as HTMLInputElement).setSelectionRange(newCursorPos, newCursorPos);
      }
      input.focus();
    }, 0);
  };

  // Update popover position continuously when visible
  useEffect(() => {
    if (!showMentions || !inputRef.current) return;

    const updatePosition = () => {
      const position = getPopoverPosition();
      setPopoverPosition(position);
      positionUpdateRef.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      if (positionUpdateRef.current) {
        cancelAnimationFrame(positionUpdateRef.current);
      }
    };
  }, [showMentions, getPopoverPosition]);

  // Also update on scroll/resize and React Flow transforms
  useEffect(() => {
    if (!showMentions) return;

    const handleUpdate = () => {
      if (inputRef.current) {
        const position = getPopoverPosition();
        setPopoverPosition(position);
      }
    };

    // Listen to React Flow viewport for pan/zoom
    const reactFlowViewport = document.querySelector('.react-flow__viewport');
    const reactFlowPane = document.querySelector('.react-flow__pane');
    
    if (reactFlowViewport) {
      reactFlowViewport.addEventListener('scroll', handleUpdate, true);
    }
    if (reactFlowPane) {
      // Listen for transform changes (zoom/pan)
      const observer = new MutationObserver(handleUpdate);
      observer.observe(reactFlowPane, {
        attributes: true,
        attributeFilter: ['style'],
        childList: false,
        subtree: false,
      });
      
      // Also listen for wheel events (zoom)
      reactFlowPane.addEventListener('wheel', handleUpdate, { passive: true });
      
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      
      return () => {
        if (reactFlowViewport) {
          reactFlowViewport.removeEventListener('scroll', handleUpdate, true);
        }
        if (reactFlowPane) {
          reactFlowPane.removeEventListener('wheel', handleUpdate);
          observer.disconnect();
        }
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    } else {
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [showMentions, getPopoverPosition]);

  // Close dropdown when node is collapsed
  useEffect(() => {
    if (!isNodeExpanded && showMentions) {
      setShowMentions(false);
    }
  }, [isNodeExpanded, showMentions]);

  // Close on click outside
  useEffect(() => {
    if (!showMentions) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        popoverRef.current &&
        target &&
        !popoverRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMentions]);

  const InputComponent = isTextarea ? 'textarea' : 'input';
  const inputProps = isTextarea ? { rows } : { type: 'text' };

  return (
    <>
      <InputComponent
        ref={inputRef as any}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          // Prevent node dragging when interacting with input
          e.stopPropagation();
          if (onClick) {
            onClick(e);
          }
        }}
        onMouseDown={(e) => {
          // Prevent node dragging when interacting with input
          e.stopPropagation();
          if (onMouseDown) {
            onMouseDown(e);
          }
        }}
        onMouseMove={(e) => {
          // Prevent node dragging during text selection
          if (e.buttons === 1) { // Only if mouse button is pressed
            e.stopPropagation();
          }
        }}
        placeholder={placeholder}
        className={`nodrag ${className || ''}`}
        {...inputProps}
      />
       {showMentions && createPortal(
         <div
           ref={popoverRef}
           className="fixed z-[9999] backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80 border border-stone-200 dark:border-white/10 shadow-lg rounded-sm overflow-hidden pointer-events-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
           style={{
             top: `${popoverPosition.top}px`,
             left: `${popoverPosition.left}px`,
             width: `${popoverPosition.width}px`,
             transform: 'translateZ(0)', // Force GPU acceleration
             maxHeight: 'none', // Remove max height restriction
           }}
         >
          {filteredOptions.length > 0 ? (
            filteredGroups.map((group) => (
              <div key={group.nodeId} className="border-b border-stone-200 dark:border-white/10 last:border-b-0">
                <div className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-stone-50/50 dark:bg-zinc-800/50">
                  {group.nodeName}
                </div>
                {group.filtered.map((output) => {
                  const globalIndex = filteredOptions.findIndex((o) => o === output);
                  const isSelected = globalIndex === selectedIndex;
                  
                  return (
                    <div
                      key={`${group.nodeId}-${output.path}`}
                      onClick={() => insertMention(output)}
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] cursor-pointer",
                        isSelected && "bg-stone-100 dark:bg-zinc-800"
                      )}
                    >
                      <div className="font-medium leading-tight">{output.displayPath}</div>
                      <div className="text-muted-foreground font-mono text-[9px] leading-tight">
                        {`{{${output.fullPath}}}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="px-1.5 py-2 text-[10px] text-muted-foreground text-center">
              No Previous Outputs
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

