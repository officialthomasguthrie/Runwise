"use client";

import Image from "next/image";
import { Pencil, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const BRANDFETCH_CLIENT = "1dxbfHSJFAPEGdCLU4o5B";

/** Step rows: flat glass, no outer shadow/ring (avoids clip at panel edges) */
const glassCardStep =
  "rounded-[10px] border border-white/65 bg-white/55 backdrop-blur-xl backdrop-saturate-150";

/** Edit panel: light glass, minimal depth */
const glassCardPanel =
  "rounded-[10px] border border-white/65 bg-white/55 backdrop-blur-xl backdrop-saturate-150";

/** Save CTA — dark liquid glass (specular + blur, matches site glass language) */
const saveLiquidGlass =
  "relative isolate overflow-hidden rounded-md border border-white/35 bg-[linear-gradient(165deg,rgba(52,54,64,0.72)_0%,rgba(32,34,42,0.82)_45%,rgba(24,26,34,0.9)_100%)] py-1.5 text-center text-[10px] font-semibold text-white shadow-[0_6px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(0,0,0,0.18)] ring-1 ring-white/15 backdrop-blur-xl backdrop-saturate-150 before:pointer-events-none before:absolute before:inset-0 before:rounded-md before:bg-[linear-gradient(118deg,rgba(255,255,255,0.22)_0%,transparent_40%,rgba(255,255,255,0.05)_68%,transparent_100%)] before:opacity-90";

/** Aligned with how-it-works gradient card: rounded-[28px] sm:rounded-[32px] */
const outerStepRadiusTL = "rounded-tl-[28px] sm:rounded-tl-[32px]";
const outerStepRadiusBL = "rounded-bl-[28px] sm:rounded-bl-[32px]";
const outerStepRadiusTRBR =
  "rounded-tr-[28px] rounded-br-[28px] sm:rounded-tr-[32px] sm:rounded-br-[32px]";

type StepDef = {
  id: string;
  kind: "trigger" | "action";
  title: string;
  subtitle: string;
  logoSrc?: string;
  logoSize?: number;
  Icon?: LucideIcon;
};

const WORKFLOW_STEPS: StepDef[] = [
  {
    id: "trigger-hubspot",
    kind: "trigger",
    title: "New lead in HubSpot",
    subtitle: "Runs when a contact enters your pipeline",
    logoSrc: `https://cdn.brandfetch.io/idRt0LuzRf/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
    logoSize: 20,
  },
  {
    id: "enrich",
    kind: "action",
    title: "Enrich & score",
    subtitle: "Pull firmographics and assign a lead score",
    Icon: Sparkles,
  },
  {
    id: "nurture-email",
    kind: "action",
    title: "Send nurture email",
    subtitle: "Personalized follow-up within 5 minutes",
    logoSrc: `https://cdn.brandfetch.io/id5o3EIREg/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`,
    logoSize: 18,
  },
  {
    id: "slack-alert",
    kind: "action",
    title: "Notify sales in Slack",
    subtitle: "Post a summary to #sales-leads",
    logoSrc: `https://cdn.brandfetch.io/idJ_HhtG0Z/w/400/h/400/theme/dark/icon.jpeg?c=${BRANDFETCH_CLIENT}`,
    logoSize: 20,
  },
];

/** Step that shows the open edit panel by default */
const DEFAULT_EDIT_STEP_ID = "nurture-email";

function StepIcon({ step }: { step: StepDef }) {
  if (step.logoSrc) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        <Image
          src={step.logoSrc}
          alt=""
          width={step.logoSize ?? 16}
          height={step.logoSize ?? 16}
          className="object-contain"
          style={{ maxWidth: step.logoSize ?? 16, maxHeight: step.logoSize ?? 16 }}
          unoptimized
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </span>
    );
  }
  const Icon = step.Icon ?? Zap;
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
      <Icon className="h-3.5 w-3.5 text-[#1a1a1a]/50" strokeWidth={2} />
    </span>
  );
}

function EditPanel({ stepId, className }: { stepId: string; className?: string }) {
  const step = WORKFLOW_STEPS.find((s) => s.id === stepId);
  if (!step) return null;

  return (
    <div
      className={cn(
        glassCardPanel,
        outerStepRadiusTRBR,
        "flex h-full min-h-0 flex-1 flex-col gap-3 p-2.5 sm:p-3",
        className,
      )}
    >
      <div className="shrink-0 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a1a1a]/40">
          Edit step
        </p>
        <h4 className="text-[12px] font-semibold leading-tight text-[#1a1a1a]/90">{step.title}</h4>
        <p className="text-[10px] leading-snug text-[#1a1a1a]/45">{step.subtitle}</p>
      </div>

      {stepId === "nurture-email" && (
        <>
          <div className="flex shrink-0 flex-col gap-1">
            <span className="text-[10px] font-medium text-[#1a1a1a]/50">Send via</span>
            <div className="flex items-center gap-1.5 rounded-md border border-stone-200/70 bg-white/60 px-2 py-1.5">
              <Image
                src={`https://cdn.brandfetch.io/id5o3EIREg/theme/dark/symbol.svg?c=${BRANDFETCH_CLIENT}`}
                alt=""
                width={18}
                height={18}
                className="shrink-0 object-contain"
                unoptimized
                referrerPolicy="strict-origin-when-cross-origin"
              />
              <span className="text-[10px] font-medium text-[#1a1a1a]/75">Gmail</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <span className="text-[10px] font-medium text-[#1a1a1a]/50">Subject</span>
            <div className="w-full rounded-md border border-stone-200/70 bg-white/70 px-2 py-1 text-[10px] text-[#1a1a1a]/80">
              Quick follow-up on your interest
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
            <span className="shrink-0 text-[10px] font-medium text-[#1a1a1a]/50">Body</span>
            <div className="min-h-0 w-full flex-1 overflow-hidden whitespace-pre-wrap rounded-md border border-stone-200/70 bg-white/70 px-2 py-1 text-[10px] leading-relaxed text-[#1a1a1a]/75">
              {`Hi {{first_name}},\n\nThanks for reaching out. Here’s a short overview of how we help teams like yours grow pipeline…`}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <span className="text-[10px] font-medium text-[#1a1a1a]/50">Tone</span>
            <div className="w-full rounded-md border border-stone-200/70 bg-white/70 px-2 py-1 text-[10px] text-[#1a1a1a]/75">
              Professional & friendly
            </div>
          </div>
        </>
      )}

      {stepId !== "nurture-email" && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden text-[10px] text-[#1a1a1a]/50">
          <p className="shrink-0">Adjust labels, filters, and timing for this step.</p>
          <div className="min-h-8 min-h-0 flex-1 rounded-md border border-dashed border-stone-200/60 bg-white/35" />
        </div>
      )}

      <div className={cn("shrink-0 w-full", saveLiquidGlass)}>
        <span className="relative z-[1]">Save changes</span>
      </div>
    </div>
  );
}

export function ReviewCustomizeVisual({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none select-none flex h-full min-h-0 flex-col gap-2 px-2 pb-2 pt-1.5 sm:flex-row sm:items-stretch sm:gap-2 sm:px-2.5 sm:pb-2 sm:pt-2",
        className,
      )}
    >
      {/* Left: fills card height; steps share vertical space */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible sm:min-h-0">
        <div className="flex min-h-0 flex-1 flex-col gap-1">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isEditing = step.id === DEFAULT_EDIT_STEP_ID;
          const actionIndex = WORKFLOW_STEPS.slice(0, idx).filter((s) => s.kind === "action").length;
          const stepLabel =
            step.kind === "trigger" ? "Trigger" : `Step ${actionIndex + 1}`;
          const isFirst = idx === 0;
          const isLast = idx === WORKFLOW_STEPS.length - 1;
          return (
            <div
              key={step.id}
              className={cn(
                glassCardStep,
                "flex min-h-0 min-w-0 flex-1 items-center gap-2 px-2 py-1.5",
                isFirst && outerStepRadiusTL,
                isLast && outerStepRadiusBL,
                isEditing && "border-indigo-400/45 bg-white/65",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <StepIcon step={step} />
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-[#1a1a1a]/35">
                    {stepLabel}
                  </span>
                  <p className="truncate text-[11px] font-semibold leading-tight text-[#1a1a1a]/88">
                    {step.title}
                  </p>
                  <p className="truncate text-[9px] leading-tight text-[#1a1a1a]/42">
                    {step.subtitle}
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                  isEditing
                    ? "border-indigo-300/50 bg-indigo-50/90 text-indigo-600"
                    : "border-white/50 bg-white/50 text-[#1a1a1a]/40",
                )}
                aria-hidden
              >
                <Pencil className="h-3 w-3" strokeWidth={2} />
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Right: full height column; fixed width on sm+ */}
      <div className="flex min-h-0 w-full flex-1 flex-col sm:w-[228px] sm:flex-none md:w-[248px]">
        <EditPanel stepId={DEFAULT_EDIT_STEP_ID} />
      </div>
    </div>
  );
}
