"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Cpu, Zap, Check, MousePointer2 } from "lucide-react";

import { cn } from "@/lib/utils";

const PIPELINE = [
  { label: "Analyzing prompt…", Icon: Sparkles },
  { label: "Building workflow…", Icon: Cpu },
  { label: "Connecting tools…", Icon: Zap },
  { label: "Agent deployed!", Icon: Check },
] as const;

/** Total cycle: cursor glide → click → pipeline → hold → reset. */
const CURSOR_MOVE_MS = 1200;
const CLICK_PAUSE_MS = 400;
const STEP_MS = 600;
const HOLD_MS = 1400;
const TOTAL_MS =
  CURSOR_MOVE_MS + CLICK_PAUSE_MS + PIPELINE.length * STEP_MS + HOLD_MS;

type Phase = "idle" | "moving" | "clicked" | "pipeline" | "done";

/** Default CTA — hero-aligned pastel (before the demo “click”) */
const generateAgentButtonPastel =
  "border-indigo-200/55 bg-[linear-gradient(135deg,#e8f4ff_0%,#ede9fe_45%,#fce7f3_100%)] text-[#1a1a1a]/82 shadow-[0_2px_14px_rgba(99,102,241,0.2),0_2px_10px_rgba(236,72,153,0.14)]";

/** After click — plain white; same padding/type as pastel, ~1% scale for a minimal “pressed” read */
const generateAgentButtonWhiteSmall =
  "scale-[0.99] border-[#e8e6e2] bg-[#fdfdfc] text-[#1a1a1a]/70 shadow-[0_2px_8px_rgba(0,0,0,0.05)]";

export function LaunchInSecondsVisual({ className }: { className?: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [pipelineIdx, setPipelineIdx] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const run = () => {
      setPhase("idle");
      setPipelineIdx(-1);

      timer.current = setTimeout(() => {
        setPhase("moving");

        timer.current = setTimeout(() => {
          setPhase("clicked");

          timer.current = setTimeout(() => {
            setPhase("pipeline");
            let step = 0;

            const advance = () => {
              setPipelineIdx(step);
              step++;
              if (step < PIPELINE.length) {
                timer.current = setTimeout(advance, STEP_MS);
              } else {
                timer.current = setTimeout(() => {
                  setPhase("done");
                  timer.current = setTimeout(run, HOLD_MS);
                }, STEP_MS);
              }
            };

            advance();
          }, CLICK_PAUSE_MS);
        }, CURSOR_MOVE_MS);
      }, 300);
    };

    run();
    return clear;
  }, []);

  const cursorActive = phase === "moving" || phase === "clicked";
  const btnPastelIdle = phase === "idle" || phase === "moving";
  const showPipeline = phase === "pipeline" || phase === "done";

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Button + cursor area */}
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "pointer-events-none select-none rounded-[10px] border px-4 py-2 text-[11px] font-semibold tracking-tight transition-all duration-200",
            btnPastelIdle ? generateAgentButtonPastel : generateAgentButtonWhiteSmall,
          )}
        >
          Generate Agent
        </button>

        {/* Cursor — inline transition matches Landing Page TW4 output (TW3 ambiguous arbitrary classes were unreliable). */}
        <div
          className={cn(
            "pointer-events-none absolute",
            cursorActive
              ? "translate-x-3 translate-y-2 opacity-100"
              : "-translate-x-10 translate-y-8 opacity-0",
          )}
          style={{
            right: -6,
            bottom: -8,
            transitionProperty: "transform, opacity",
            transitionDuration: cursorActive ? "1200ms" : "0ms",
            transitionTimingFunction: cursorActive
              ? "cubic-bezier(0.22, 1, 0.36, 1)"
              : "linear",
          }}
        >
          <MousePointer2
            className="h-5 w-5 text-[#1a1a1a]/75 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
            strokeWidth={2}
            fill="white"
          />
        </div>
      </div>

      {/* Pipeline steps */}
      <div
        className={cn(
          "flex flex-col gap-1.5 transition-opacity duration-300",
          showPipeline ? "opacity-100" : "opacity-0",
        )}
      >
        {PIPELINE.map((step, i) => {
          const active = pipelineIdx >= i;
          return (
            <div
              key={step.label}
              className={cn(
                "flex min-h-[1.5rem] items-center gap-2 rounded-[8px] px-2.5 py-1",
                active ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
              )}
              style={{
                transitionProperty: "opacity, transform",
                transitionDuration: "300ms",
                transitionTimingFunction: "ease-out",
              }}
            >
              <step.Icon
                className={cn(
                  "h-3 w-3 shrink-0",
                  active ? "text-[#1a1a1a]/50" : "text-[#1a1a1a]/20",
                )}
                strokeWidth={2}
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-snug",
                  i === PIPELINE.length - 1 && active
                    ? "text-[#1a1a1a]"
                    : active
                      ? "text-[#1a1a1a]/60"
                      : "text-[#1a1a1a]/30",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
