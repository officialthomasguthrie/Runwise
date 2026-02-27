"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentMemory, AgentMemoryType } from "@/lib/agents/types";

// ── Memory type metadata ─────────────────────────────────────────────────────

const MEMORY_TYPE_META: Record<
  AgentMemoryType,
  { icon: string; label: string }
> = {
  fact:        { icon: "💡", label: "Facts" },
  preference:  { icon: "❤️",  label: "Preferences" },
  contact:     { icon: "👤", label: "Contacts" },
  event:       { icon: "📅", label: "Events" },
  instruction: { icon: "📋", label: "Instructions" },
};

const MEMORY_TYPES: AgentMemoryType[] = [
  "fact",
  "preference",
  "contact",
  "event",
  "instruction",
];

// ── Importance dots ───────────────────────────────────────────────────────────

function ImportanceDots({ value }: { value: number }) {
  const dots = Math.round((value / 10) * 5); // map 1-10 → 1-5 dots
  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < dots ? "bg-pink-400/70" : "bg-white/10"
          )}
        />
      ))}
    </div>
  );
}

// ── Memory row ────────────────────────────────────────────────────────────────

function MemoryRow({
  memory,
  onDelete,
}: {
  memory: AgentMemory;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onDelete(memory.id);
    // parent removes from list, so no need to reset
  }

  return (
    <div className="group flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground leading-relaxed">{memory.content}</p>
        <div className="flex items-center gap-2 mt-1">
          <ImportanceDots value={memory.importance} />
          {memory.source === "user" && (
            <span className="text-[10px] text-muted-foreground/50 bg-white/5 px-1.5 py-0.5 rounded">
              manual
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Delete memory"
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 disabled:opacity-40 mt-0.5"
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════

interface AgentMemoryPanelProps {
  agentId: string;
  initialMemories: AgentMemory[];
}

export function AgentMemoryPanel({
  agentId,
  initialMemories,
}: AgentMemoryPanelProps) {
  const [memories, setMemories] = useState<AgentMemory[]>(initialMemories);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<AgentMemoryType>("fact");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Group by type
  const grouped = MEMORY_TYPES.reduce<Record<AgentMemoryType, AgentMemory[]>>(
    (acc, t) => {
      acc[t] = memories.filter((m) => m.memory_type === t);
      return acc;
    },
    {} as Record<AgentMemoryType, AgentMemory[]>
  );

  async function handleDelete(memoryId: string) {
    const res = await fetch(
      `/api/agents/${agentId}/memory?memoryId=${memoryId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    }
  }

  async function handleAdd() {
    if (!newContent.trim()) return;
    setSaving(true);
    setSaveError(null);

    const res = await fetch(`/api/agents/${agentId}/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: newContent.trim(),
        memory_type: newType,
        importance: 5,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setSaveError(json.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    setMemories((prev) => [json.memory, ...prev]);
    setNewContent("");
    setAdding(false);
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">Memory</h2>
          <span className="text-xs text-muted-foreground/60 border border-white/10 rounded-full px-2 py-0.5">
            {memories.length}
          </span>
        </div>
        <button
          onClick={() => {
            setAdding((v) => !v);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-white/10 hover:border-white/20 rounded-md px-2 py-1"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {/* Add memory form */}
      {adding && (
        <div className="border border-white/10 rounded-md p-3 bg-white/[0.02] flex flex-col gap-2">
          <textarea
            ref={inputRef}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="E.g. John from Acme is interested in the enterprise plan"
            className="w-full min-h-[72px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            {MEMORY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={cn(
                  "text-xs rounded-full px-2.5 py-0.5 border transition-colors",
                  newType === t
                    ? "border-pink-400/50 text-pink-300 bg-pink-400/10"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                )}
              >
                {MEMORY_TYPE_META[t].icon} {MEMORY_TYPE_META[t].label.slice(0, -1)}
              </button>
            ))}
          </div>
          {saveError && <p className="text-xs text-red-400">{saveError}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setAdding(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !newContent.trim()}
              className="inline-flex items-center gap-1 text-xs border border-white/10 hover:border-white/20 rounded-md px-3 py-1 text-foreground disabled:opacity-40 transition-colors"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Memory groups */}
      {memories.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <span className="text-3xl opacity-30">🧠</span>
          <p className="text-xs text-muted-foreground">
            No memories yet. The agent will start remembering as it works.
          </p>
        </div>
      ) : (
        MEMORY_TYPES.filter((t) => grouped[t].length > 0).map((type) => {
          const meta = MEMORY_TYPE_META[type];
          return (
            <div key={type}>
              <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>{meta.icon}</span> {meta.label}
              </p>
              {grouped[type].map((mem) => (
                <MemoryRow key={mem.id} memory={mem} onDelete={handleDelete} />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
