"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface MentionOption {
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
  isNodeExpanded?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const TOKEN_RE = /\{\{([^}]+)\}\}/g;

/** Convert a raw template path (inside {{ }}) to a human-readable label. */
function tokenLabel(raw: string): string {
  // raw is the full {{...}} string
  const inner = raw.replace(/^\{\{/, '').replace(/\}\}$/, '');
  if (inner === 'inputData') return 'All Data';
  const field = inner.split('.').pop() || inner;
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Safely escape a string for use in HTML attributes. */
function escAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Safely escape text node content. */
function escText(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Convert a value string (with {{...}} tokens) to an innerHTML string with chip spans.
 * Token chips are `contenteditable="false"` spans with data-token holding the raw {{...}}.
 */
function valueToHtml(value: string): string {
  const parts: string[] = [];
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escText(value.slice(lastIndex, match.index)));
    }
    const raw = match[0];
    const label = tokenLabel(raw);
    parts.push(
      `<span contenteditable="false" data-token="${escAttr(raw)}" class="mention-token-chip">${escText(label)}<button type="button" class="mention-token-x" tabindex="-1">×</button></span>`
    );
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < value.length) {
    parts.push(escText(value.slice(lastIndex)));
  }

  return parts.join('');
}

/**
 * Walk the contenteditable DOM and reconstruct the raw string value
 * (token chips → their data-token attribute, text nodes → their text).
 */
function serializeEditor(el: HTMLElement): string {
  let result = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || '';
    } else if (node instanceof HTMLElement) {
      const token = node.dataset.token;
      if (token) {
        result += token;
      } else if (node.tagName === 'BR') {
        result += '\n';
      } else {
        result += serializeEditor(node);
      }
    }
  });
  return result;
}

// ─── Component ─────────────────────────────────────────────────────────────

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
  const editorRef = useRef<HTMLDivElement>(null);

  // Track the last value we reported via onChange so we can detect external changes.
  const lastReportedValue = useRef<string>(value);

  // ── @ mention state ──────────────────────────────────────────────────────
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const positionUpdateRef = useRef<number | undefined>(undefined);

  // Stores where in the DOM the @ sign lives (for replacement on select)
  const atMentionRef = useRef<{ node: Text; offset: number; queryLen: number } | null>(null);

  // ── Group outputs by node ────────────────────────────────────────────────
  const nodeOrder = new Map<string, number>();
  availableOutputs.forEach((o) => {
    if (!nodeOrder.has(o.nodeId)) nodeOrder.set(o.nodeId, nodeOrder.size);
  });

  const groupedOutputs = availableOutputs.reduce((acc, o) => {
    if (!acc[o.nodeId]) acc[o.nodeId] = { nodeName: o.nodeName, outputs: [], order: nodeOrder.get(o.nodeId) || 0 };
    acc[o.nodeId].outputs.push(o);
    return acc;
  }, {} as Record<string, { nodeName: string; outputs: MentionOption[]; order: number }>);

  const filteredGroups = Object.entries(groupedOutputs)
    .map(([nodeId, group]) => {
      const filtered = group.outputs.filter((o) =>
        o.displayPath.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      return filtered.length > 0 ? { ...group, nodeId, filtered } : null;
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .sort((a, b) => a.order - b.order);

  const filteredOptions = filteredGroups.flatMap((g) => g.filtered);

  // ── Initialize DOM on mount ──────────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = valueToHtml(value);
    lastReportedValue.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync external value changes to DOM ──────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // Only update DOM if value changed from outside this component
    if (value !== lastReportedValue.current) {
      editor.innerHTML = valueToHtml(value);
      lastReportedValue.current = value;
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    }
  }, [value]);

  // ── Popover position tracking ────────────────────────────────────────────
  const getPopoverPosition = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return { top: 0, left: 0, width: 0 };
    const rect = editor.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left, width: editor.offsetWidth };
  }, []);

  useEffect(() => {
    if (!showMentions) return;
    const update = () => {
      setPopoverPosition(getPopoverPosition());
      positionUpdateRef.current = requestAnimationFrame(update);
    };
    update();
    return () => { if (positionUpdateRef.current) cancelAnimationFrame(positionUpdateRef.current); };
  }, [showMentions, getPopoverPosition]);

  useEffect(() => {
    if (!isNodeExpanded && showMentions) setShowMentions(false);
  }, [isNodeExpanded, showMentions]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!showMentions) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (
        popoverRef.current && t && !popoverRef.current.contains(t) &&
        editorRef.current && !editorRef.current.contains(t)
      ) setShowMentions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMentions]);

  // ── Detect @ in current text node at cursor ──────────────────────────────
  const detectAtMention = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    const range = sel.getRangeAt(0);
    if (!range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) {
      setShowMentions(false);
      return false;
    }
    const textNode = range.startContainer as Text;
    const textBefore = (textNode.textContent || '').substring(0, range.startOffset);
    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx === -1) { setShowMentions(false); return false; }
    const query = textBefore.substring(atIdx + 1);
    if (query.includes(' ')) { setShowMentions(false); return false; }
    atMentionRef.current = { node: textNode, offset: atIdx, queryLen: query.length };
    setMentionQuery(query);
    setShowMentions(true);
    setSelectedIndex(-1);
    return true;
  }, []);

  // ── Input handler ────────────────────────────────────────────────────────
  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    detectAtMention();
    const newValue = serializeEditor(editor);
    lastReportedValue.current = newValue;
    onChange(newValue);
  }, [detectAtMention, onChange]);

  // ── Insert a token at the current @ position ─────────────────────────────
  const insertMention = useCallback((option: MentionOption) => {
    const editor = editorRef.current;
    const info = atMentionRef.current;
    if (!editor || !info) return;

    // Delete @query from the text node
    const { node: textNode, offset: atOffset, queryLen } = info;
    const deleteRange = document.createRange();
    deleteRange.setStart(textNode, atOffset);
    deleteRange.setEnd(textNode, atOffset + 1 + queryLen); // +1 for @
    deleteRange.deleteContents();

    // Build chip element
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset.token = `{{${option.fullPath}}}`;
    chip.className = 'mention-token-chip';
    chip.textContent = option.displayPath;

    const xBtn = document.createElement('button');
    xBtn.type = 'button';
    xBtn.className = 'mention-token-x';
    xBtn.tabIndex = -1;
    xBtn.textContent = '×';
    chip.appendChild(xBtn);

    // Insert chip at current range position
    const insertRange = document.createRange();
    insertRange.setStart(textNode, atOffset);
    insertRange.collapse(true);
    insertRange.insertNode(chip);

    // Place cursor right after chip
    const afterText = document.createTextNode('');
    chip.after(afterText);
    const sel = window.getSelection();
    if (sel) {
      const cur = document.createRange();
      cur.setStart(afterText, 0);
      cur.collapse(true);
      sel.removeAllRanges();
      sel.addRange(cur);
    }

    setShowMentions(false);
    atMentionRef.current = null;

    const newValue = serializeEditor(editor);
    lastReportedValue.current = newValue;
    onChange(newValue);
  }, [onChange]);

  // ── Remove token via × button ────────────────────────────────────────────
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const xBtn = target.closest('.mention-token-x') as HTMLElement | null;
    if (xBtn) {
      e.preventDefault();
      e.stopPropagation();
      const chip = xBtn.closest('.mention-token-chip') as HTMLElement | null;
      if (chip) {
        chip.remove();
        const editor = editorRef.current;
        if (editor) {
          const newValue = serializeEditor(editor);
          lastReportedValue.current = newValue;
          onChange(newValue);
        }
      }
    }
    onClick?.(e);
  }, [onChange, onClick]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showMentions && filteredOptions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((p) => p < filteredOptions.length - 1 ? p + 1 : 0); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((p) => p > 0 ? p - 1 : filteredOptions.length - 1); return; }
      if ((e.key === 'Enter' || e.key === 'Tab') && selectedIndex >= 0) { e.preventDefault(); insertMention(filteredOptions[selectedIndex]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setShowMentions(false); return; }
    }

    // Backspace: delete token chip immediately before cursor
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (range.collapsed && range.startOffset === 0) {
          const prev = range.startContainer.previousSibling;
          if (prev instanceof HTMLElement && prev.dataset.token) {
            e.preventDefault();
            prev.remove();
            const editor = editorRef.current;
            if (editor) {
              const newValue = serializeEditor(editor);
              lastReportedValue.current = newValue;
              onChange(newValue);
            }
            return;
          }
        }
      }
    }

    // Prevent Enter from inserting <div> blocks in non-textarea mode
    if (!isTextarea && e.key === 'Enter') {
      e.preventDefault();
      return;
    }

    onKeyDown?.(e);
  }, [showMentions, filteredOptions, selectedIndex, insertMention, isTextarea, onChange, onKeyDown]);

  // ── Render ───────────────────────────────────────────────────────────────
  const minHeight = isTextarea ? `${rows * 1.5}rem` : undefined;

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline={isTextarea}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleEditorClick}
        onMouseDown={(e) => { e.stopPropagation(); onMouseDown?.(e); }}
        onMouseMove={(e) => { if (e.buttons === 1) e.stopPropagation(); }}
        className={cn('mention-editor nodrag', className)}
        style={{ minHeight }}
      />

      {showMentions && createPortal(
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
              <div key={group.nodeId} className="border-b border-stone-200 dark:border-white/10 last:border-b-0">
                <div className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-stone-50/50 dark:bg-zinc-800/50">
                  {group.nodeName}
                </div>
                {group.filtered.map((output) => {
                  const globalIndex = filteredOptions.findIndex((o) => o === output);
                  const isKeyboardSelected = globalIndex === selectedIndex;
                  return (
                    <div
                      key={`${group.nodeId}-${output.path}`}
                      onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      onMouseLeave={() => setSelectedIndex(-1)}
                      onClick={() => insertMention(output)}
                      className={cn(
                        'px-1.5 py-1 text-[10px] cursor-pointer hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors',
                        isKeyboardSelected && 'bg-stone-100 dark:bg-zinc-800'
                      )}
                    >
                      <div className="font-medium leading-tight">{output.displayPath}</div>
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
