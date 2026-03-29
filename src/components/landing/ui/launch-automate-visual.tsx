"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pause, Play, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

const TASK_INTERVAL_MS = 1000;

/** Agent header — tinted liquid glass (aligned with workflow-mini-preview nodes) */
const agentCardGlass =
  "rounded-xl border border-white/50 bg-[linear-gradient(165deg,rgba(236,239,252,0.88)_0%,rgba(226,231,247,0.68)_48%,rgba(216,222,242,0.58)_100%)] shadow-[0_2px_16px_rgba(51,65,120,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] ring-1 ring-indigo-950/[0.06] backdrop-blur-xl backdrop-saturate-150";

/** Task row — light liquid glass (tighter outer blur than agent card so shadows fit inside scroll padding without clipping) */
const taskCardGlass =
  "rounded-lg border border-white/55 bg-white/48 shadow-[0_2px_7px_rgba(51,65,120,0.07),inset_0_1px_0_rgba(255,255,255,0.88)] ring-1 ring-black/[0.04] backdrop-blur-xl backdrop-saturate-150";

/** Pause / play control */
const controlGlass =
  "relative isolate flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/45 bg-white/40 text-[#1a1a1a]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-white/25 backdrop-blur-xl backdrop-saturate-150 transition-colors before:pointer-events-none before:absolute before:inset-0 before:rounded-lg before:bg-[linear-gradient(135deg,rgba(255,255,255,0.35)_0%,transparent_55%)] before:opacity-80 hover:bg-white/55 hover:text-[#1a1a1a]";

/** Manual run — dark liquid glass CTA */
const manualRunGlass =
  "relative isolate flex shrink-0 items-center gap-1 overflow-hidden rounded-lg border border-white/35 bg-[linear-gradient(165deg,rgba(52,54,64,0.78)_0%,rgba(32,34,42,0.88)_45%,rgba(24,26,34,0.92)_100%)] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-[0_4px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-1px_0_rgba(0,0,0,0.16)] ring-1 ring-white/15 backdrop-blur-xl backdrop-saturate-150 before:pointer-events-none before:absolute before:inset-0 before:rounded-lg before:bg-[linear-gradient(118deg,rgba(255,255,255,0.2)_0%,transparent_42%,rgba(255,255,255,0.05)_70%,transparent_100%)] before:opacity-90";

const MARKETING_TASKS = [
  "Drafted social post for product launch",
  "Scheduled nurture emails for 12 leads",
  "Synced ad spend to weekly report",
  "Updated landing page copy variants",
  "Tagged MQLs in HubSpot pipeline",
  "Queued A/B test for email subject",
  "Summarized campaign performance",
  "Posted recap to #marketing Slack",
] as const;

type TaskItem = { id: string; label: string };

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function LaunchAutomateVisual({ className }: { className?: string }) {
  const [paused, setPaused] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const taskIndexRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /** Append under previous tasks (top → bottom). */
  const appendTask = useCallback((label: string) => {
    setTasks((prev) => [...prev, { id: nextId(), label }]);
  }, []);

  /** When list exceeds the card, clear and restart the cycle from the first task. */
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || tasks.length === 0) return;
    if (el.scrollHeight > el.clientHeight + 1) {
      /* Avoid a tight loop if a single row is taller than the viewport */
      if (tasks.length <= 1) return;
      setTasks([]);
      taskIndexRef.current = 0;
    }
  }, [tasks]);

  /** ~1s: add next marketing task (starts empty; first item after 1s). */
  useEffect(() => {
    if (reducedMotion || paused) return;
    const id = window.setInterval(() => {
      const i = taskIndexRef.current % MARKETING_TASKS.length;
      appendTask(MARKETING_TASKS[i]);
      taskIndexRef.current += 1;
    }, TASK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion, appendTask]);

  const handleManualRun = () => {
    appendTask("Manual run · triggered workflow");
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 w-full flex-col gap-2 px-2.5 pb-2 pt-2.5 sm:gap-2.5 sm:px-3 sm:pb-2.5 sm:pt-3",
        className,
      )}
    >
      {/* Agent profile card */}
      <div className={cn(agentCardGlass, "shrink-0 px-2.5 py-2 sm:px-3 sm:py-2.5")}>
        <div className="flex items-center gap-2.5">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/60 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-black/[0.05]">
            <Image
              src="/assets/agents/outreach.png"
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold tracking-tight text-[#1a1a1a]/90 sm:text-[13px]">
              Marketing Agent
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-[#1a1a1a]/45 sm:text-[11px]">
              Campaigns, content, leads
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className={controlGlass}
              aria-pressed={paused}
              aria-label={paused ? "Resume task stream" : "Pause task stream"}
            >
              {paused ? (
                <Play className="relative z-[1] h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <Pause className="relative z-[1] h-3.5 w-3.5" strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              onClick={handleManualRun}
              className={manualRunGlass}
              aria-label="Run workflow manually"
            >
              <Zap className="relative z-[1] h-3 w-3 shrink-0 opacity-95" strokeWidth={2.5} />
              <span className="relative z-[1]">Run now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task stream — fills remaining height to the bottom of the panel */}
      <div
        ref={listRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-y-auto px-6 pt-0 pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-7"
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              taskCardGlass,
              "w-[calc(100%+1.75rem)] shrink-0 -mx-3.5 px-2.5 py-1.5 sm:w-[calc(100%+2rem)] sm:-mx-4",
              !reducedMotion && "animate-chat-in",
            )}
          >
            <p className="text-[10px] leading-snug text-[#1a1a1a]/78 sm:text-[11px]">
              {task.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
