"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

import { cn } from "@/lib/utils";

/** Square viewBox; irregular upward curve (intelligence rises over time). */
const CHART_PATH =
  "M 54 158 C 82 148 98 136 118 122 C 140 104 154 112 172 94 C 188 80 200 70 208 58";

const DRAW_DURATION = 2.8;
const HOLD_MS = 1000;

type AgentLearningChartProps = {
  className?: string;
};

export function AgentLearningChart({ className }: AgentLearningChartProps) {
  const reduceMotion = useReducedMotion();
  const filterId = `agent-learning-glow-${useId().replace(/:/g, "")}`;

  const lineTransition = reduceMotion
    ? { duration: 0 }
    : {
        pathLength: {
          duration: DRAW_DURATION,
          ease: [0.33, 1, 0.68, 1] as const,
          repeat: Infinity,
          repeatDelay: HOLD_MS / 1000,
          repeatType: "loop" as const,
        },
      };

  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn(
        "block aspect-square h-full max-h-full min-h-0 min-w-0 w-auto max-w-full",
        className,
      )}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter
          id={filterId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComponentTransfer in="blur" result="soft">
            <feFuncA type="linear" slope="0.55" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="soft" />
          </feMerge>
        </filter>
      </defs>

      <line x1="48" y1="36" x2="48" y2="168" stroke="rgba(26,26,26,0.12)" strokeWidth="1.2" />
      <line x1="48" y1="168" x2="212" y2="168" stroke="rgba(26,26,26,0.12)" strokeWidth="1.2" />

      <line x1="48" y1="62" x2="212" y2="62" stroke="rgba(26,26,26,0.05)" strokeWidth="1" />
      <line x1="48" y1="100" x2="212" y2="100" stroke="rgba(26,26,26,0.05)" strokeWidth="1" />
      <line x1="48" y1="138" x2="212" y2="138" stroke="rgba(26,26,26,0.05)" strokeWidth="1" />

      <text
        x="18"
        y="104"
        fill="rgba(26,26,26,0.45)"
        fontSize="11"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="0.02em"
        transform="rotate(-90 18 104)"
        textAnchor="middle"
      >
        Intelligence
      </text>
      <text
        x="130"
        y="226"
        fill="rgba(26,26,26,0.45)"
        fontSize="11"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="0.02em"
        textAnchor="middle"
      >
        Time
      </text>

      <motion.path
        d={CHART_PATH}
        fill="none"
        stroke="#4ade80"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.42}
        filter={`url(#${filterId})`}
        initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={lineTransition}
      />
      <motion.path
        d={CHART_PATH}
        fill="none"
        stroke="#16a34a"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={lineTransition}
      />
    </svg>
  );
}
