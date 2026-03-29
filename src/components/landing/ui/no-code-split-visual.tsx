"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowUp, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Syntax‑highlighting token colours (light editor theme) ── */
const K = "text-[#8b5cf6]";
const S = "text-[#059669]";
const F = "text-[#2563eb]";
const C = "text-[#9ca3af]";
const D = "text-[#1a1a1a]/80";
const P = "text-[#1a1a1a]/40";

type Token = [text: string, color: string];

const CODE: Token[][] = [
  [["import ", K], ["requests", D], [", ", P], ["json", D], [", ", P], ["os", D]],
  [["from ", K], ["datetime ", D], ["import ", K], ["datetime", D], [", ", P], ["timedelta", D]],
  [["from ", K], ["runwise.integrations ", D], ["import ", K], ["HubSpot", D], [", ", P], ["Slack", D], [", ", P], ["LinkedIn", D]],
  [],
  [["# ", C], ["Run weekly marketing pipeline across all active channels and segments", C]],
  [["def ", K], ["run_marketing", F], ["(config: ", D], ["dict", F], [", dry_run: ", D], ["bool ", K], ["= ", P], ["False", K], ["):", P]],
  [["    leads = ", D], ["HubSpot", F], [".", P], ["fetch_leads", F], ["(source=", D], ['"hubspot"', S], [", status=", D], ['"active"', S], [", limit=", D], ["500", D], [")", P]],
  [["    results = ", D], ["{", P], ['"sent"', S], [": ", P], ["0", D], [", ", P], ['"skipped"', S], [": ", P], ["0", D], [", ", P], ['"errors"', S], [": ", P], ["[]", D], ["}", P]],
  [],
  [["    ", D], ["for ", K], ["lead ", D], ["in ", K], ["leads:", D]],
  [["        segment = ", D], ["classify", F], ["(lead.profile, model=", D], ['"intent-v3"', S], [", threshold=", D], ["0.82", D], [")", P]],
  [["        ", D], ["if ", K], ["segment == ", D], ['"high_value"', S], [" ", D], ["and ", K], ["lead.last_contact < datetime.now() - timedelta(days=", D], ["7", D], ["):", P]],
  [["            ", D], ["send_email", F], ["(template=", D], ['"vip_offer"', S], [", to=lead.email, subject=", D], ['"Exclusive for you"', S], [")", P]],
  [["            ", D], ["Slack", F], [".", P], ["notify", F], ["(channel=", D], ['"#sales-leads"', S], [", msg=", D], ["f", K], ['"New VIP: {lead.name} ({lead.company})"', S], [")", P]],
  [["        ", D], ["elif ", K], ["segment == ", D], ['"nurture"', S], [":", P]],
  [["            ", D], ["LinkedIn", F], [".", P], ["schedule_post", F], ["(content=", D], ["generate_post", F], ["(lead), time=", D], ["next_slot", F], ["())", P]],
  [["        results[", D], ['"sent"', S], ["] += ", D], ["1", D]],
  [],
  [["    ", D], ["return ", K], ["{", P], ['"processed"', S], [": ", P], ["len", F], ["(leads), ", D], ['"results"', S], [": results, ", D], ['"timestamp"', S], [": ", D], ["datetime.now().isoformat()", D], ["}", P]],
];

/* ── Pipeline steps (matches Runwise BuildProgressCard) ── */
type StepStatus = "done" | "running" | "pending";

const STEPS: { label: string; status: StepStatus }[] = [
  { label: "Analyzing capabilities", status: "done" },
  { label: "Generating execution logic", status: "done" },
  { label: "Validating integrations", status: "done" },
  { label: "Seeding memory", status: "running" },
  { label: "Applying safeguards", status: "pending" },
  { label: "Deploying agent", status: "pending" },
];

/* ── Shared macOS window chrome ── */
function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-[#e8e6e2]/60 px-2.5 py-1.5">
      <span className="h-[7px] w-[7px] rounded-full bg-[#ff5f57]" />
      <span className="h-[7px] w-[7px] rounded-full bg-[#febc2e]" />
      <span className="h-[7px] w-[7px] rounded-full bg-[#28c840]" />
      <span className="ml-2 text-[8px] font-medium text-[#1a1a1a]/40">{title}</span>
    </div>
  );
}

/* ── Full‑width code editor layer ── */
function CodeLayer() {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <WindowChrome title="marketing_agent.py" />
      <div className="flex-1 overflow-hidden px-2.5 py-2">
        <pre className="font-mono text-[8.5px] leading-[13px]">
          {CODE.map((line, i) => (
            <div key={i} className="flex whitespace-pre">
              <span className="mr-2 inline-block w-3 text-right text-[7px] leading-[13px] text-[#1a1a1a]/20">
                {i + 1}
              </span>
              {line.length === 0 ? (
                <span>{"\u00A0"}</span>
              ) : (
                line.map(([text, color], j) => (
                  <span key={j} className={color}>
                    {text}
                  </span>
                ))
              )}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

/* ── Full‑width chat / agent‑builder layer ── */
function ChatLayer() {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <WindowChrome title="Runwise — Agent Builder" />

      <div className="flex flex-1 flex-col px-3 py-2.5">
        {/* User bubble */}
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-stone-100 px-3 py-1.5 text-[9px] font-medium leading-snug text-[#1a1a1a]/85">
            Manage my marketing for me.
          </div>
        </div>

        {/* Pipeline card */}
        <div className="mt-2.5 min-h-0 flex-1">
          <div className="overflow-hidden rounded-[10px] border border-stone-200/60 bg-stone-50/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="border-b border-stone-200/50 px-2.5 py-1.5">
              <p className="text-[7px] font-semibold uppercase tracking-wider text-[#1a1a1a]/40">
                Building agent
              </p>
            </div>
            <div className="divide-y divide-stone-200/40">
              {STEPS.map((step) => (
                <div
                  key={step.label}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-[5px] transition-colors",
                    step.status === "running" && "bg-stone-100/50",
                  )}
                >
                  {step.status === "done" && (
                    <CheckCircle2
                      className="h-[11px] w-[11px] shrink-0 text-emerald-500"
                      strokeWidth={2.5}
                    />
                  )}
                  {step.status === "running" && (
                    <Loader2
                      className="h-[11px] w-[11px] shrink-0 animate-spin text-[#1a1a1a]/70"
                      strokeWidth={2.5}
                    />
                  )}
                  {step.status === "pending" && (
                    <span className="block h-[11px] w-[11px] shrink-0 rounded-full border-[1.5px] border-[#1a1a1a]/15" />
                  )}
                  <span
                    className={cn(
                      "text-[8px] font-medium leading-none",
                      step.status === "done" && "text-[#1a1a1a]/70",
                      step.status === "running" && "text-[#1a1a1a]/85",
                      step.status === "pending" && "text-[#1a1a1a]/30",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prompt input */}
        <div className="mt-auto shrink-0 pt-2">
          <div className="relative flex items-center rounded-lg border border-stone-200 bg-stone-100 px-2 py-1.5">
            <span className="flex-1 truncate text-[8px] text-[#1a1a1a]/30">
              Describe what you want your agent to do…
            </span>
            <div className="ml-1.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-[#ffffff1a] bg-[#bd28b3ba]">
              <ArrowUp className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main comparison component ── */
export function NoCodeSplitVisual({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(50);
  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    handleRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(Math.max(pct, 0), 100));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    handleRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full select-none overflow-hidden rounded-xl border border-[#e8e6e2]/60",
        className,
      )}
    >
      {/* Bottom layer: chat (full‑width, always visible behind the code) */}
      <div className="absolute inset-0">
        <ChatLayer />
      </div>

      {/* Top layer: code, clipped at the split position */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        <CodeLayer />
      </div>

      {/* ── Slider handle ── */}
      <div
        ref={handleRef}
        className="absolute inset-y-0 z-30 w-8 -translate-x-1/2 cursor-col-resize touch-none"
        style={{ left: `${split}%` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Vertical rule */}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#e8e6e2]" />

        {/* Glass pill handle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              "border border-white/60 bg-white/90",
              "shadow-[0_2px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]",
              "ring-1 ring-black/[0.04] backdrop-blur-xl",
              "transition-shadow hover:shadow-[0_2px_16px_rgba(0,0,0,0.15)]",
            )}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="text-[#1a1a1a]/50"
            >
              <path
                d="M4 3L1.5 6L4 9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 3L10.5 6L8 9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
