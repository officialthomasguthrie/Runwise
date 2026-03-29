"use client";

import Image from "next/image";

type AgentStatus = "running" | "idle";

type AgentRow = {
  name: string;
  subtitle: string;
  status: AgentStatus;
  avatarSrc: string;
  /** SVG path in viewBox 0 0 56 24 — distinct per agent when running */
  sparkPath: string;
};

/** Steady climb with a mid dip (pipeline / throughput vibe) */
const SPARK_RUNNING_SALES =
  "M1 18 C6 10, 10 22, 16 14 S26 8, 32 12 S42 4, 55 7";
/** Higher volatility: spike, pullback, second push (research / monitoring vibe) */
const SPARK_RUNNING_RESEARCH =
  "M1 20 C5 8, 12 16, 18 6 S28 14, 36 10 S44 4, 55 9";
const SPARK_IDLE =
  "M1 16 C10 15, 14 17, 24 16 S38 18, 55 15";

const AGENTS: AgentRow[] = [
  {
    name: "Sales Agent",
    subtitle: "24 tasks completed",
    status: "running",
    avatarSrc: "/assets/agents/sales.png",
    sparkPath: SPARK_RUNNING_SALES,
  },
  {
    name: "Research Agent",
    subtitle: "Tracking competitors & pricing shifts",
    status: "running",
    avatarSrc: "/assets/agents/research.png",
    sparkPath: SPARK_RUNNING_RESEARCH,
  },
  {
    name: "Outreach Agent",
    subtitle: "Emailing qualified leads from today’s list",
    status: "idle",
    avatarSrc: "/assets/agents/outreach.png",
    sparkPath: SPARK_IDLE,
  },
];

const GLASS_LIST =
  "overflow-hidden rounded-2xl border border-white/70 bg-white/45 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-black/[0.04] backdrop-blur-xl backdrop-saturate-150";

const GLASS_PILL_RUNNING =
  "border-emerald-400/35 bg-emerald-500/[0.12] text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md";

const GLASS_PILL_IDLE =
  "border-black/[0.08] bg-white/55 text-[#1a1a1a]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md";

function ActivitySpark({ path, running }: { path: string; running: boolean }) {
  return (
    <svg
      className={`h-8 w-[52px] shrink-0 sm:h-9 sm:w-[60px] ${running ? "text-emerald-500/90" : "text-[#1a1a1a]/28"}`}
      viewBox="0 0 56 24"
      fill="none"
      aria-hidden
    >
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

type DeployAgentsPreviewProps = {
  className?: string;
};

export function DeployAgentsPreview({ className = "" }: DeployAgentsPreviewProps) {
  return (
    <div className={`flex w-full flex-col ${className}`}>
      <div className={GLASS_LIST}>
        <ul className="divide-y divide-black/[0.06]">
          {AGENTS.map((agent) => {
            const running = agent.status === "running";
            return (
              <li key={agent.name} className="flex items-center gap-2.5 px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3">
                <div
                  className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/80 bg-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 sm:h-10 sm:w-10 ${
                    running ? "ring-emerald-500/90" : "ring-black/[0.06]"
                  }`}
                >
                  <Image
                    src={agent.avatarSrc}
                    alt=""
                    width={256}
                    height={256}
                    className="h-full w-full object-cover"
                    unoptimized
                    sizes="40px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold tracking-tight text-[#1a1a1a] sm:text-[13px]">
                    {agent.name}
                  </p>
                  <p className="truncate text-[10px] leading-snug text-[#1a1a1a]/48 sm:text-[11px]">
                    {agent.subtitle}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-medium tracking-wide sm:text-[10px] ${
                    running ? GLASS_PILL_RUNNING : GLASS_PILL_IDLE
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      running ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.55)]" : "bg-[#1a1a1a]/30"
                    }`}
                  />
                  {running ? "Running" : "Idle"}
                </span>
                <ActivitySpark path={agent.sparkPath} running={running} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
