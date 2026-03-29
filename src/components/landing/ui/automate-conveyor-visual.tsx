"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import {
  FileText,
  RefreshCw,
  Inbox,
  MessageSquare,
  ListChecks,
  Bell,
  DollarSign,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/* ── Paired definitions: each task maps 1:1 to the agent that automates it ── */

type TaskItem = { label: string; Icon: LucideIcon };
type AgentItem = { name: string; desc: string; avatar: string };
type Pair = { task: TaskItem; agent: AgentItem };

const PAIRS: Pair[] = [
  {
    task: { label: "Send Weekly Report", Icon: FileText },
    agent: { name: "Report Agent", desc: "Compiles data and delivers polished weekly reports", avatar: "/assets/agents/sales.png" },
  },
  {
    task: { label: "Update CRM Records", Icon: RefreshCw },
    agent: { name: "Data Clerk", desc: "Syncs CRM records and flags inconsistencies", avatar: "/assets/agents/outreach.png" },
  },
  {
    task: { label: "Organize Inbox", Icon: Inbox },
    agent: { name: "Inbox Agent", desc: "Sorts, labels, and prioritizes incoming mail", avatar: "/assets/agents/research.png" },
  },
  {
    task: { label: "Reply to Messages", Icon: MessageSquare },
    agent: { name: "Email Responder", desc: "Drafts and sends context-aware reply emails", avatar: "/assets/agents/outreach.png" },
  },
  {
    task: { label: "Update To-Do List", Icon: ListChecks },
    agent: { name: "Task Manager", desc: "Keeps your task board current and prioritized", avatar: "/assets/agents/sales.png" },
  },
  {
    task: { label: "Set Reminders", Icon: Bell },
    agent: { name: "Scheduler", desc: "Books meetings and sends calendar reminders", avatar: "/assets/agents/research.png" },
  },
  {
    task: { label: "Track Expenses", Icon: DollarSign },
    agent: { name: "Finance Agent", desc: "Categorizes expenses and prepares summaries", avatar: "/assets/agents/sales.png" },
  },
  {
    task: { label: "Send Emails", Icon: Mail },
    agent: { name: "Outreach Agent", desc: "Sends personalized emails to your contact lists", avatar: "/assets/agents/outreach.png" },
  },
];

const TASKS = PAIRS.map((p) => p.task);
const AGENTS = PAIRS.map((p) => p.agent);

/* ── Shared constants ── */

const CARD_GAP_PX = 32;
const AGENT_GAP_PX = 28;
const STRIP_SPEED_PX_PER_S = 55;
const BELT_REPEAT_PX = 10;

/* ── Card components ── */

function TaskCard({ task }: { task: TaskItem }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#e8e6e2] bg-[#fdfdfc] px-2.5 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-black/[0.05]">
      <task.Icon
        className="h-3.5 w-3.5 shrink-0 text-[#1a1a1a]/45"
        strokeWidth={1.75}
      />
      <span className="text-[11px] font-medium leading-none text-[#1a1a1a]/65">
        {task.label}
      </span>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentItem }) {
  return (
    <div className="flex w-[180px] shrink-0 items-center gap-2 rounded-[12px] border border-[#e8e6e2] bg-[#fdfdfc] px-2.5 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-black/[0.05]">
      <Image
        src={agent.avatar}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
        unoptimized
      />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold leading-tight text-[#1a1a1a]/75">
          {agent.name}
        </span>
        <span className="mt-px block truncate text-[10px] leading-tight text-[#1a1a1a]/45">
          {agent.desc}
        </span>
      </div>
    </div>
  );
}

/* ── Main component ── */

export function AutomateConveyorVisual({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const taskStripRef = useRef<HTMLDivElement>(null);
  const agentStripRef = useRef<HTMLDivElement>(null);
  const [taskStripWidth, setTaskStripWidth] = useState<number | null>(null);
  const [agentStripWidth, setAgentStripWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const taskEl = taskStripRef.current;
    const agentEl = agentStripRef.current;
    if (!taskEl || !agentEl) return;

    const measureTask = () => setTaskStripWidth(taskEl.scrollWidth / 2);
    const measureAgent = () => setAgentStripWidth(agentEl.scrollWidth / 2);
    measureTask();
    measureAgent();

    const ro1 = new ResizeObserver(measureTask);
    const ro2 = new ResizeObserver(measureAgent);
    ro1.observe(taskEl);
    ro2.observe(agentEl);
    return () => {
      ro1.disconnect();
      ro2.disconnect();
    };
  }, []);

  /** Each strip scrolls at the same px/s — duration = halfWidth / speed. */
  const taskDurationS =
    taskStripWidth != null ? taskStripWidth / STRIP_SPEED_PX_PER_S : 0;
  const agentDurationS =
    agentStripWidth != null ? agentStripWidth / STRIP_SPEED_PX_PER_S : 0;

  const beltDurationMs = Math.round((BELT_REPEAT_PX / STRIP_SPEED_PX_PER_S) * 1000);

  return (
    <div
      ref={rootRef}
      className={cn(
        "conveyor-visual-root conveyor-edge-fade relative flex w-full min-w-0 items-center justify-center gap-0 overflow-hidden",
        className,
      )}
      style={{ "--conveyor-belt-duration": `${beltDurationMs}ms` } as CSSProperties}
      aria-hidden
    >
      {/* Left belt track */}
      <div className="flex h-14 min-w-0 flex-1 items-center overflow-hidden">
        <div className="conveyor-belt-dashes conveyor-belt-dashes--in h-px w-full min-w-0 shrink-0" />
      </div>

      {/* Task card marquee — left half, scrolling rightward */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-1/2 z-[5] flex items-center overflow-hidden">
        <div
          ref={taskStripRef}
          className="conveyor-task-strip flex shrink-0 items-center"
          style={
            taskDurationS > 0
              ? ({
                  "--conveyor-strip-duration": `${taskDurationS}s`,
                  gap: `${CARD_GAP_PX}px`,
                } as CSSProperties)
              : ({ gap: `${CARD_GAP_PX}px` } as CSSProperties)
          }
        >
          {TASKS.map((t) => (
            <TaskCard key={t.label} task={t} />
          ))}
          {TASKS.map((t) => (
            <TaskCard key={`dup-${t.label}`} task={t} />
          ))}
        </div>
      </div>

      {/* Machine */}
      <div className="relative z-20 mx-2 shrink-0 rounded-[16px] border border-[#e8e6e2] bg-[#fdfdfc] px-4 py-3 sm:mx-2.5 sm:rounded-[18px] sm:px-5 sm:py-4 md:px-6 md:py-5">
        <Image
          src="/runwise-icon.png"
          alt=""
          width={72}
          height={72}
          className="relative z-[1] h-11 w-11 object-contain sm:h-12 sm:w-12 md:h-14 md:w-14"
        />
      </div>

      {/* Agent card marquee — right half, scrolling rightward */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 right-0 z-[5] flex items-center overflow-hidden">
        <div
          ref={agentStripRef}
          className="conveyor-agent-strip flex shrink-0 items-center"
          style={
            agentDurationS > 0
              ? ({
                  "--conveyor-agent-duration": `${agentDurationS}s`,
                  gap: `${AGENT_GAP_PX}px`,
                } as CSSProperties)
              : ({ gap: `${AGENT_GAP_PX}px` } as CSSProperties)
          }
        >
          {AGENTS.map((a) => (
            <AgentCard key={a.name} agent={a} />
          ))}
          {AGENTS.map((a) => (
            <AgentCard key={`dup-${a.name}`} agent={a} />
          ))}
        </div>
      </div>

      {/* Right belt track */}
      <div className="flex h-14 min-w-0 flex-1 items-center overflow-hidden">
        <div className="conveyor-belt-dashes conveyor-belt-dashes--out h-px w-full min-w-0 shrink-0" />
      </div>
    </div>
  );
}
