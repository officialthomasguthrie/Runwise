"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { ExplainAgentChat } from "@/components/landing/ui/explain-agent-chat";
import { ConnectToolsOrbit } from "@/components/landing/ui/connect-tools-orbit";
import { ReviewCustomizeVisual } from "@/components/landing/ui/review-customize-visual";
import { LaunchAutomateVisual } from "@/components/landing/ui/launch-automate-visual";

const STEPS = [
  {
    title: "Explain Your Agent",
    description:
      "Start by giving your agent a prompt describing exactly what you want it to do.",
    gradient: "linear-gradient(145deg, #f2f8ff 0%, #eef4ff 40%, #f3eeff 100%)",
  },
  {
    title: "Connect Your Tools",
    description: "Connect all the apps and tools your agent needs to complete the task.",
    gradient: "linear-gradient(145deg, #f7f0ff 0%, #f2f8ff 45%, #fff6e6 100%)",
  },
  {
    title: "Review & Customize",
    description: "Preview the setup to make sure everything is ready and working correctly.",
    gradient: "linear-gradient(145deg, #fff6e6 0%, #f7f0ff 50%, #f2f8ff 100%)",
  },
  {
    title: "Launch & Automate",
    description: "Launch your agent and watch it automate your workflow effortlessly.",
    gradient: "linear-gradient(145deg, #f3eeff 0%, #fff6e6 45%, #f2f8ff 100%)",
  },
] as const;

/** Outer shell always uses p-px so layout does not shift when selection toggles the gradient ring */
const stepShell = "rounded-[18px] p-px";
/** Pastel blue → lavender/pink (hero `.hero-bg` palette, no cream/yellow stop) */
const stepShellSelected =
  "bg-[linear-gradient(145deg,#e0f2fe_0%,#dbeafe_32%,#e0e7ff_58%,#ede9fe_82%,#f3e8ff_100%)]";

export function HowItWorksSteps() {
  const [active, setActive] = useState(0);
  const current = STEPS[active];

  return (
    <div className="mx-auto mt-8 w-full max-w-6xl md:mt-10">
      <div className="grid min-w-0 grid-cols-1 items-stretch gap-10 lg:grid-cols-2 lg:gap-14">
        <nav aria-label="How it works steps" className="flex flex-col gap-3 sm:gap-4">
          {STEPS.map((step, index) => {
            const selected = index === active;
            const stepNumber = index + 1;

            const inner = (
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full gap-4 rounded-[17px] px-4 py-4 text-left transition sm:gap-5 sm:px-5 sm:py-5",
                  selected
                    ? "bg-[linear-gradient(145deg,rgba(242,248,255,0.92)_0%,rgba(255,255,255,0.55)_45%,rgba(247,240,255,0.88)_100%)] backdrop-blur-md"
                    : "bg-transparent hover:bg-white/25",
                )}
              >
                <span
                  className={cn(
                    "w-10 shrink-0 select-none text-center text-[28px] font-semibold leading-none tracking-tight tabular-nums sm:w-12 sm:text-[34px]",
                    selected ? "text-[#1a1a1a]" : "text-[#1a1a1a]/30",
                  )}
                  aria-hidden
                >
                  {stepNumber}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[15px] font-semibold leading-snug tracking-tight sm:text-base",
                      selected ? "text-[#1a1a1a]" : "text-[#1a1a1a]/80",
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-[#1a1a1a]/50 sm:text-[13px]">
                    {step.description}
                  </span>
                </span>
              </button>
            );

            return (
              <div key={step.title} className={cn(stepShell, selected ? stepShellSelected : "bg-transparent")}>
                {inner}
              </div>
            );
          })}
        </nav>

        <div className="relative h-[420px] w-full min-w-0 overflow-visible sm:h-[460px] lg:h-auto lg:min-h-0">
          <div
            key={current.title}
            className={cn(
              "relative h-full rounded-[28px] ring-1 ring-black/[0.04] lg:absolute lg:inset-0 sm:rounded-[32px]",
              /* Step 4: box-shadows must not clip — overflow-y:auto on the task list forces overflow-x to clip unless ancestors are visible. */
              active === 3 ? "overflow-visible" : "overflow-hidden",
            )}
            style={{ background: current.gradient }}
          >
            {active === 0 && <ExplainAgentChat />}
            {active === 1 && (
              <div className="flex h-full items-center justify-center">
                <ConnectToolsOrbit />
              </div>
            )}
            {active === 2 && <ReviewCustomizeVisual />}
            {active === 3 && <LaunchAutomateVisual />}
          </div>
        </div>
      </div>
    </div>
  );
}
