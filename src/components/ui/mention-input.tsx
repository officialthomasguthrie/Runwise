"use client";

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface MentionOption {
  nodeId: string;
  nodeName: string;
  path: string;
  displayPath: string; // Clean field label, e.g. "Email", "All Data"
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
  isNodeExpanded?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a fullPath like "inputData.firstName" into a readable label "First Name" */
function pathToLabel(fullPath: string): string {
  if (!fullPath || fullPath === 'inputData') return 'All Data';
  const field = fullPath.replace(/^inputData\./, '');
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_\s]+/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim() || 'Data';
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert the stored value string (containing {{...}} tokens) into HTML
 * with mi-pill spans for the tokens and escaped text for everything else.
 */
function valueToHtml(value: string): string {
  if (!value) return '';
  const regex = /\{\{([^}]+)\}\}/g;
  let html = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(value)) !== null) {
    if (m.index > last) {
      html += escHtml(value.slice(last, m.index)).replace(/\n/g, '<br>');
    }
    const template = `{{${m[1]}}}`;
    const label = pathToLabel(m[1].trim());
    html +=
      `<span class="mi-pill" contenteditable="false" data-pill="true" data-template="${escHtml(template)}">` +
      `<span class="mi-pill-label">${escHtml(label)}</span>` +
      `<button class="mi-pill-x" data-pill-x="true" type="button" tabindex="-1">×</button>` +
      `</span>`;
    last = regex.lastIndex;
  }
  if (last < value.length) {
    html += escHtml(value.slice(last)).replace(/\n/g, '<br>');
  }
  return html;
}

/**
 * Walk the contenteditable DOM and produce the canonical {{...}} value string.
 * Pill spans contribute their data-template; text nodes contribute their text.
 */
function domToValue(el: HTMLElement): string {
  let out = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.dataset.pill === 'true') {
        // Pill → emit the template, don't recurse into children
        out += el.dataset.template ?? '';
      } else if (el.tagName === 'BR') {
        out += '\n';
      } else if (el.tagName === 'DIV' && out.length > 0) {
        // contenteditable wraps new lines in <div> (Chrome/Safari behaviour)
        out += '\n';
        el.childNodes.forEach(walk);
      } else {
        el.childNodes.forEach(walk);
      }
    }
  };
  el.childNodes.forEach(walk);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const divRef = useRef<HTMLDivElement>(null);
  const lastExtValueRef = useRef<string>(value);
  const isUserEditingRef = useRef<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const positionUpdateRef = useRef<number | undefined>(undefined);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 0 });

  // ── Group / filter options ────────────────────────────────────────────────

  const nodeOrder = new Map<string, number>();
  availableOutputs.forEach((o) => {
    if (!nodeOrder.has(o.nodeId)) nodeOrder.set(o.nodeId, nodeOrder.size);
  });

  const groupedOutputs = availableOutputs.reduce(
    (acc, o) => {
      if (!acc[o.nodeId])
        acc[o.nodeId] = { nodeName: o.nodeName, outputs: [], order: nodeOrder.get(o.nodeId) || 0 };
      acc[o.nodeId].outputs.push(o);
      return acc;
    },
    {} as Record<string, { nodeName: string; outputs: MentionOption[]; order: number }>,
  );

  const filteredGroups = Object.entries(groupedOutputs)
    .map(([nodeId, group]) => {
      const filtered = group.outputs.filter(
        (o) =>
          o.displayPath.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          o.nodeName.toLowerCase().includes(mentionQuery.toLowerCase()),
      );
      return filtered.length > 0 ? { ...group, nodeId, filtered } : null;
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .sort((a, b) => a.order - b.order);

  const filteredOptions = filteredGroups.flatMap((g) => g.filtered);

  // ── Sync external value → DOM ─────────────────────────────────────────────

  const renderToDom = useCallback((val: string) => {
    if (!divRef.current) return;
    divRef.current.innerHTML = valueToHtml(val);
  }, []);

  // Initial paint — run synchronously to avoid flash of raw {{...}} text
  useLayoutEffect(() => {
    renderToDom(value);
    lastExtValueRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Respond to external value changes (AI fill, config load, etc.)
  useEffect(() => {
    if (isUserEditingRef.current) return;
    if (value === lastExtValueRef.current) return;
    lastExtValueRef.current = value;
    renderToDom(value);
  }, [value, renderToDom]);

  // ── Popover position ──────────────────────────────────────────────────────

  const getPopoverPosition = useCallback(() => {
    const el = divRef.current;
    if (!el) return { top: 0, left: 0, width: 0 };
    const rect = el.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left, width: el.offsetWidth };
  }, []);

  useEffect(() => {
    if (!showMentions) return;
    const update = () => {
      setPopoverPosition(getPopoverPosition());
      positionUpdateRef.current = requestAnimationFrame(update);
    };
    update();
    return () => {
      if (positionUpdateRef.current) cancelAnimationFrame(positionUpdateRef.current);
    };
  }, [showMentions, getPopoverPosition]);

  useEffect(() => {
    if (!showMentions) return;
    const handleUpdate = () => {
      if (divRef.current) setPopoverPosition(getPopoverPosition());
    };
    const reactFlowPane = document.querySelector('.react-flow__pane');
    const observer = reactFlowPane
      ? new MutationObserver(handleUpdate)
      : null;
    observer?.observe(reactFlowPane!, { attributes: true, attributeFilter: ['style'] });
    reactFlowPane?.addEventListener('wheel', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      observer?.disconnect();
      reactFlowPane?.removeEventListener('wheel', handleUpdate as EventListener);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [showMentions, getPopoverPosition]);

  // ── Close on collapse / click outside ────────────────────────────────────

  useEffect(() => {
    if (!isNodeExpanded && showMentions) setShowMentions(false);
  }, [isNodeExpanded, showMentions]);

  useEffect(() => {
    if (!showMentions) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(t) &&
        divRef.current &&
        !divRef.current.contains(t)
      ) {
        setShowMentions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMentions]);

  // ── Create pill DOM element ───────────────────────────────────────────────

  const createPillEl = (option: MentionOption): HTMLSpanElement => {
    const pill = document.createElement('span');
    pill.className = 'mi-pill';
    pill.contentEditable = 'false';
    pill.dataset.pill = 'true';
    pill.dataset.template = `{{${option.fullPath}}}`;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'mi-pill-label';
    labelSpan.textContent = option.displayPath;

    const xBtn = document.createElement('button');
    xBtn.className = 'mi-pill-x';
    xBtn.dataset.pillX = 'true';
    xBtn.textContent = '×';
    xBtn.type = 'button';
    xBtn.tabIndex = -1;

    pill.appendChild(labelSpan);
    pill.appendChild(xBtn);
    return pill;
  };

  // ── Insert mention at cursor ──────────────────────────────────────────────

  const insertMention = useCallback(
    (option: MentionOption) => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || !divRef.current) return;

      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;

      if (startNode.nodeType === Node.TEXT_NODE) {
        const text = startNode.textContent || '';
        const offset = range.startOffset;
        const textBefore = text.slice(0, offset);
        const atIdx = textBefore.lastIndexOf('@');

        if (atIdx !== -1) {
          const insertRange = document.createRange();
          insertRange.setStart(startNode, atIdx);
          insertRange.setEnd(startNode, offset);
          insertRange.deleteContents();

          const pill = createPillEl(option);
          insertRange.insertNode(pill);

          // Place cursor just after the inserted pill
          const after = document.createRange();
          after.setStartAfter(pill);
          after.collapse(true);
          selection.removeAllRanges();
          selection.addRange(after);
        }
      }

      const newVal = domToValue(divRef.current);
      lastExtValueRef.current = newVal;
      onChange(newVal);
      setShowMentions(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange],
  );

  // ── Input handler ─────────────────────────────────────────────────────────

  const handleInput = useCallback(() => {
    if (!divRef.current) return;
    isUserEditingRef.current = true;
    const serialized = domToValue(divRef.current);
    lastExtValueRef.current = serialized;
    onChange(serialized);
    isUserEditingRef.current = false;

    // @ mention detection — look at visible text before cursor
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      setShowMentions(false);
      return;
    }
    try {
      const range = selection.getRangeAt(0);
      const preRange = document.createRange();
      preRange.selectNodeContents(divRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      const textBefore = preRange.toString();
      const lastAt = textBefore.lastIndexOf('@');
      if (lastAt !== -1) {
        const afterAt = textBefore.slice(lastAt + 1);
        if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
          setMentionQuery(afterAt);
          setShowMentions(true);
          setSelectedIndex(0);
          return;
        }
      }
    } catch {
      // ignore selection errors
    }
    setShowMentions(false);
  }, [onChange]);

  // ── Click handler — pill X button ─────────────────────────────────────────

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.dataset.pillX === 'true' || target.closest?.('[data-pill-x="true"]')) {
        e.preventDefault();
        e.stopPropagation();
        const pill = (target as HTMLElement).closest?.('[data-pill="true"]') as HTMLElement | null;
        if (pill && divRef.current) {
          pill.remove();
          const newVal = domToValue(divRef.current);
          lastExtValueRef.current = newVal;
          onChange(newVal);
        }
        return;
      }
      onClick?.(e);
    },
    [onChange, onClick],
  );

  // ── Keyboard handler ──────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (showMentions && filteredOptions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((p) => (p + 1) % filteredOptions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((p) => (p - 1 + filteredOptions.length) % filteredOptions.length);
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
      // Prevent newline in single-line mode
      if (!isTextarea && e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      onKeyDown?.(e);
    },
    [showMentions, filteredOptions, selectedIndex, insertMention, isTextarea, onKeyDown],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const minHeight = isTextarea ? `${rows * 1.5}rem` : undefined;

  return (
    <>
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown?.(e);
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1) e.stopPropagation();
        }}
        className={cn('nodrag mi-editor', className)}
        style={{
          minHeight,
          whiteSpace: isTextarea ? 'pre-wrap' : 'nowrap',
          overflowWrap: isTextarea ? 'break-word' : undefined,
          overflowX: isTextarea ? undefined : 'hidden',
        }}
      />

      {showMentions &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[9999] backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80 border border-stone-200 dark:border-white/10 shadow-lg rounded-sm overflow-hidden pointer-events-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
              width: `${popoverPosition.width}px`,
              transform: 'translateZ(0)',
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredGroups.map((group) => (
                <div
                  key={group.nodeId}
                  className="border-b border-stone-200 dark:border-white/10 last:border-b-0"
                >
                  {/* Node name as group header */}
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-stone-50/50 dark:bg-zinc-800/50 tracking-wide uppercase">
                    {group.nodeName}
                  </div>
                  {group.filtered.map((output) => {
                    const globalIdx = filteredOptions.findIndex((o) => o === output);
                    return (
                      <div
                        key={`${group.nodeId}-${output.path}`}
                        onClick={() => insertMention(output)}
                        className={cn(
                          'px-2 py-1.5 text-xs cursor-pointer flex items-center gap-2',
                          globalIdx === selectedIndex
                            ? 'bg-stone-100 dark:bg-zinc-800'
                            : 'hover:bg-stone-50 dark:hover:bg-zinc-800/60',
                        )}
                      >
                        {/* Mini pill preview */}
                        <span className="mi-pill pointer-events-none shrink-0">
                          <span className="mi-pill-label">{output.displayPath}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="px-2 py-2 text-[10px] text-muted-foreground text-center">
                No previous outputs
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
