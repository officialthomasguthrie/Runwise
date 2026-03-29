"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Inbox, Pause, Play, Route, Send } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = [
  { key: "intake", label: "Intake", hint: "Capture", Icon: Inbox },
  { key: "route", label: "Route", hint: "Rules", Icon: Route },
  { key: "act", label: "Act", hint: "Deliver", Icon: Send },
  { key: "close", label: "Close", hint: "Synced", Icon: CheckCircle2 },
] as const;

const STEP_MS = 720;

/** Same tokens + labels as `statusConfig` in Runwise `agent-tab-content.tsx` (+ `idle` for reduced motion). */
const PREVIEW_STATUS = {
  active: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Active",
  },
  paused: {
    bg: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    label: "Paused",
  },
  idle: {
    bg: "bg-stone-500/15",
    text: "text-stone-600 dark:text-stone-400",
    label: "Idle",
  },
} as const;

type AutomateProcessPreviewProps = {
  className?: string;
};

export function AutomateProcessPreview({ className = "" }: AutomateProcessPreviewProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lineFill, setLineFill] = useState(0);
  const reduceMotion = useReducedMotion();

  const running = !paused && !reduceMotion;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [running]);

  /** Line after step `i` stays empty until step `i` runs, then fills 0→1 over `STEP_MS`. */
  useEffect(() => {
    if (!running || reduceMotion) return;
    let cancelled = false;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / STEP_MS);
      setLineFill(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(() => {
      if (cancelled) return;
      setLineFill(0);
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [active, running, reduceMotion]);

  const statusKey = reduceMotion ? "idle" : paused ? "paused" : "active";
  const status = PREVIEW_STATUS[statusKey];

  return (
    <div className={`flex w-full flex-1 flex-col gap-2.5 sm:gap-3 ${className}`}>
      <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/[0.08] bg-white/55 px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] sm:px-3.5 sm:py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[11px] font-semibold tracking-tight text-[#1a1a1a] sm:text-xs">
              Competitor Monitor
            </p>
            <span
              className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
            >
              {status.label}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? "Resume automation preview" : "Pause automation preview"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/[0.1] bg-white/70 text-[#1a1a1a]/75 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] transition hover:border-black/[0.14] hover:bg-white hover:text-[#1a1a1a] active:scale-[0.97]"
        >
          {paused ? <Play className="h-3.5 w-3.5" strokeWidth={2} /> : <Pause className="h-3.5 w-3.5" strokeWidth={2} />}
        </button>
      </div>

      <div className="flex w-full min-w-0 items-stretch sm:min-h-[108px]">
        {STEPS.flatMap((step, i) => {
          const node = (
            <motion.div
              key={step.key}
              className="flex min-h-[92px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-black/[0.08] bg-white/55 px-1.5 py-2 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] sm:min-h-[100px] sm:px-2 sm:py-2.5"
              initial={false}
              animate={
                reduceMotion
                  ? { scale: 1, boxShadow: "0 0 0 1px rgba(0,0,0,0.06)" }
                  : {
                      scale: active === i && !paused ? 1.03 : 1,
                      boxShadow:
                        active === i && !paused
                          ? "0 0 0 1px rgba(26,26,26,0.14), 0 8px 24px rgba(0,0,0,0.06)"
                          : active === i && paused
                            ? "0 0 0 1px rgba(26,26,26,0.11), 0 4px 14px rgba(0,0,0,0.04)"
                            : "0 0 0 1px rgba(0,0,0,0.06)",
                    }
              }
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            >
              <motion.div
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/[0.04] text-[#1a1a1a]/70 sm:h-8 sm:w-8"
                animate={
                  reduceMotion
                    ? { opacity: 0.75 }
                    : {
                        opacity:
                          paused && active === i
                            ? 0.88
                            : active === i
                              ? 1
                              : active > i
                                ? 0.9
                                : 0.45,
                      }
                }
                transition={{ duration: 0.25 }}
              >
                <step.Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.75} aria-hidden />
              </motion.div>
              <span className="max-w-full truncate text-center text-[10px] font-medium tracking-tight text-[#1a1a1a] sm:text-[11px]">
                {step.label}
              </span>
              <span className="max-w-full truncate text-center text-[9px] text-[#1a1a1a]/45 sm:text-[10px]">
                {step.hint}
              </span>
            </motion.div>
          );

          if (i >= STEPS.length - 1) {
            return [node];
          }

          const connector = (
            <div
              key={`${step.key}-conn`}
              className="mx-0.5 flex w-[clamp(6px,5%,20px)] shrink-0 flex-col justify-center self-stretch sm:mx-1 sm:w-[clamp(8px,6%,24px)]"
            >
              <div className="relative h-px w-full overflow-hidden rounded-full bg-black/[0.09]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-black/25 to-black/40"
                  style={{
                    width: reduceMotion
                      ? active > i
                        ? "100%"
                        : "0%"
                      : active > i
                        ? "100%"
                        : active === i
                          ? `${lineFill * 100}%`
                          : "0%",
                  }}
                />
              </div>
            </div>
          );

          return [node, connector];
        })}
      </div>
    </div>
  );
}
