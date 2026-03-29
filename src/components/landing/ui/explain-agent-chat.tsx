"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Pipeline build steps ── */
const BUILD_STEPS = [
  "Analyzing capabilities",
  "Generating execution logic",
  "Validating integrations",
  "Seeding memory",
  "Applying safeguards",
  "Deploying agent",
] as const;

/* ── Timing constants (ms) ── */
const INITIAL_DELAY = 600;
const THINK_1_DUR = 1400;
const STREAM_1_DUR = 800;
const USER_2_DELAY = 900;
const THINK_2_DUR = 1200;
const STREAM_2_DUR = 600;
const STEP_DUR = 500;
const DONE_DELAY = 400;
const HOLD_DUR = 2500;

/* ── Shimmer style (matches Runwise assistant-bubble) ── */
const shimmerStyle: CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(26,26,26,0.45) 0%, rgba(26,26,26,0.35) 25%, rgba(26,26,26,0.15) 50%, rgba(26,26,26,0.35) 75%, rgba(26,26,26,0.45) 100%)",
  backgroundSize: "200% 100%",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: "chat-shimmer 2s ease-in-out infinite",
};

/* ── Avatars ── */
function AiAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        "border border-white/70 bg-white/85",
        "shadow-[0_2px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.95)]",
        "ring-1 ring-black/[0.04] backdrop-blur-xl backdrop-saturate-150",
        className,
      )}
    >
      <Image
        src="/runwise-icon.png"
        alt=""
        width={20}
        height={20}
        className="h-5 w-5 object-contain"
        unoptimized
      />
    </div>
  );
}

function UserAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-200",
        className,
      )}
    >
      <Image
        src="/assets/agents/how-it-works-user.png"
        alt=""
        width={32}
        height={32}
        className="h-full w-full object-cover"
        unoptimized
      />
    </div>
  );
}

/* ── Bubble shells ── */
const userBubble =
  "rounded-2xl rounded-br-md bg-white/90 px-3.5 py-2 text-[12.5px] leading-snug text-[#1a1a1a]/85 shadow-[0_2px_12px_rgba(0,0,0,0.05)]";
const aiBubble =
  "rounded-2xl rounded-bl-md bg-white/90 px-3.5 py-2 text-[12.5px] leading-snug text-[#1a1a1a]/75 shadow-[0_2px_12px_rgba(0,0,0,0.05)]";

/* ── Animation phases ── */
type Phase =
  | "user1"
  | "think1"
  | "ai1"
  | "user2"
  | "think2"
  | "ai2"
  | "pipeline"
  | "done";

export function ExplainAgentChat({ className }: { className?: string }) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [pipelineIdx, setPipelineIdx] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPhase("done");
      setPipelineIdx(BUILD_STEPS.length - 1);
      return;
    }

    const schedule = (fn: () => void, ms: number) => {
      timer.current = setTimeout(fn, ms);
    };

    const run = () => {
      setPhase(null);
      setPipelineIdx(-1);

      schedule(() => {
        setPhase("user1");
        schedule(() => {
          setPhase("think1");
          schedule(() => {
            setPhase("ai1");
            schedule(() => {
              setPhase("user2");
              schedule(() => {
                setPhase("think2");
                schedule(() => {
                  setPhase("ai2");
                  schedule(() => {
                    setPhase("pipeline");
                    let step = 0;
                    const advance = () => {
                      setPipelineIdx(step);
                      step++;
                      if (step < BUILD_STEPS.length) {
                        schedule(advance, STEP_DUR);
                      } else {
                        schedule(() => {
                          setPhase("done");
                          schedule(run, HOLD_DUR);
                        }, DONE_DELAY);
                      }
                    };
                    advance();
                  }, STREAM_2_DUR);
                }, THINK_2_DUR);
              }, USER_2_DELAY);
            }, STREAM_1_DUR);
          }, THINK_1_DUR);
        }, INITIAL_DELAY);
      }, 100);
    };

    run();
    return clear;
  }, []);

  const show = (from: Phase) => {
    if (!phase) return false;
    const order: Phase[] = [
      "user1",
      "think1",
      "ai1",
      "user2",
      "think2",
      "ai2",
      "pipeline",
      "done",
    ];
    return order.indexOf(phase) >= order.indexOf(from);
  };

  const isThinking1 = phase === "think1";
  const isThinking2 = phase === "think2";

  return (
    <div
      className={cn(
        "pointer-events-none select-none flex flex-col items-center gap-3.5 px-5 pt-5 pb-0 sm:px-6 sm:pt-6 md:px-8 md:pt-8",
        className,
      )}
    >
      {/* ── User 1: "Manage my marketing for me." ── */}
      {show("user1") && (
        <div
          className="flex w-full items-end justify-end gap-2 animate-chat-in"
          style={{ opacity: 0 }}
        >
          <div className={userBubble}>Manage my marketing for me.</div>
          <UserAvatar />
        </div>
      )}

      {/* ── AI thinking 1 / AI question ── */}
      {isThinking1 && (
        <div className="flex w-full items-start gap-2 animate-chat-in" style={{ opacity: 0 }}>
          <AiAvatar />
          <div className={aiBubble}>
            <span className="inline-block text-[12.5px]" style={shimmerStyle}>
              Thinking...
            </span>
          </div>
        </div>
      )}
      {show("ai1") && !isThinking1 && (
        <div className="flex w-full items-start gap-2 animate-chat-in" style={{ opacity: 0 }}>
          <AiAvatar />
          <div className={aiBubble}>What&apos;s your main goal with marketing?</div>
        </div>
      )}

      {/* ── User 2: "More leads" ── */}
      {show("user2") && !isThinking2 && (
        <div
          className={cn(
            "flex w-full items-end justify-end gap-2",
            phase === "user2" ? "animate-chat-in" : "",
          )}
          style={phase === "user2" ? { opacity: 0 } : undefined}
        >
          <div className={userBubble}>More leads</div>
          <UserAvatar />
        </div>
      )}
      {isThinking2 && (
        <div className="flex w-full items-end justify-end gap-2">
          <div className={userBubble}>More leads</div>
          <UserAvatar />
        </div>
      )}

      {/* ── AI thinking 2 / AI confirmation + pipeline ── */}
      {isThinking2 && (
        <div className="flex w-full items-start gap-2 animate-chat-in" style={{ opacity: 0 }}>
          <AiAvatar />
          <div className={aiBubble}>
            <span className="inline-block text-[12.5px]" style={shimmerStyle}>
              Thinking...
            </span>
          </div>
        </div>
      )}
      {show("ai2") && !isThinking2 && (
        <div className="flex w-full items-start gap-2 animate-chat-in" style={{ opacity: 0 }}>
          <AiAvatar />
          <div className={aiBubble}>
            <p>
              <span className="font-semibold text-[#1a1a1a]/85">Got it</span> — setting up your
              marketing engine.
            </p>
            {show("pipeline") && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {BUILD_STEPS.map((step, i) => {
                  /* One row at a time: only indices 0..pipelineIdx while running (no “next” gray peek). */
                  const visible =
                    phase === "done" ||
                    (phase === "pipeline" && pipelineIdx >= 0 && i <= pipelineIdx);
                  if (!visible) return null;

                  const completed = phase === "done" || pipelineIdx > i;
                  const active =
                    phase === "pipeline" && pipelineIdx >= 0 && pipelineIdx === i;

                  return (
                    <div key={step} className="flex items-center gap-1.5">
                      {completed ? (
                        <CheckCircle2
                          className="h-[13px] w-[13px] shrink-0 text-emerald-500"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <Loader2
                          className="h-[13px] w-[13px] shrink-0 animate-spin text-[#1a1a1a]/45"
                          strokeWidth={2.5}
                        />
                      )}
                      {active ? (
                        <span
                          className="inline-block text-[11px] font-medium leading-none"
                          style={shimmerStyle}
                        >
                          {step}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium leading-none text-[#1a1a1a]/55">
                          {step}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Deployed card ── */}
      {phase === "done" && (
        <div
          className="mt-1 w-full max-w-[85%] animate-chat-in"
          style={{ opacity: 0 }}
        >
          <div
            className={cn(
              "rounded-2xl bg-white/90 px-4 pt-3.5 pb-40",
              "shadow-[0_2px_16px_rgba(0,0,0,0.06)]",
              "ring-1 ring-emerald-200/60",
            )}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.2} />
              <span className="text-[13px] font-bold leading-tight text-[#1a1a1a]/85">
                Done. Your Marketing Agent is Live!
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <div className="h-1.5 w-[90%] rounded-full bg-stone-200/60" />
              <div className="h-1.5 w-[70%] rounded-full bg-stone-200/60" />
              <div className="h-1.5 w-[80%] rounded-full bg-stone-200/60" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
