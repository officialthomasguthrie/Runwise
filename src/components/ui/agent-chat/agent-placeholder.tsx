"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";

const SKELETON_CLASS = "bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse";

export function AgentPlaceholder() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col pb-8">
        {/* Header skeleton — matches AgentTabContent header */}
        <div className="flex-shrink-0 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex-shrink-0 border border-stone-200/60 dark:border-white/10 overflow-hidden">
            <div className={`w-full h-full ${SKELETON_CLASS}`} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className={`h-5 w-32 ${SKELETON_CLASS}`} />
            <div className={`h-4 w-48 ${SKELETON_CLASS}`} />
          </div>
          <div className={`w-10 h-10 rounded-full flex-shrink-0 ${SKELETON_CLASS}`} />
        </div>

        {/* Two-column layout skeleton */}
        <div className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
            {/* Left — Activity Feed */}
            <div className="flex flex-col gap-5 min-w-0">
              <div className="rounded-lg bg-stone-50 dark:bg-stone-800/50 flex flex-col overflow-hidden min-h-[200px]">
                <div className="flex flex-row items-center justify-between gap-2 h-10 px-3 bg-stone-100 dark:bg-stone-700/40">
                  <div className={`h-4 w-24 ${SKELETON_CLASS}`} />
                  <div className={`h-7 w-7 rounded ${SKELETON_CLASS}`} />
                </div>
                <div className="flex flex-col p-2 space-y-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 rounded-md bg-white dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-600/50 px-3 py-2"
                    >
                      <div className={`h-5 w-5 rounded flex-shrink-0 ${SKELETON_CLASS}`} />
                      <div className="flex-1 space-y-1">
                        <div className={`h-4 w-full ${SKELETON_CLASS}`} />
                        <div className={`h-3 w-16 ${SKELETON_CLASS}`} />
                      </div>
                      <div className={`h-4 w-4 rounded flex-shrink-0 ${SKELETON_CLASS}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Capabilities, Knowledge, Goals cards */}
            <div className="flex flex-col gap-5 min-w-0">
              {[
                { h: 210, rows: 4 },
                { h: 280, rows: 5 },
                { h: 245, rows: 5 },
              ].map((card, ci) => (
                <div
                  key={ci}
                  className="rounded-lg bg-stone-50 dark:bg-stone-800/50 flex flex-col overflow-hidden"
                  style={{ minHeight: card.h }}
                >
                  <div className="h-10 px-3 flex items-center justify-between bg-stone-100 dark:bg-stone-700/40">
                    <div className={`h-4 w-28 ${SKELETON_CLASS}`} />
                    <div className={`h-7 w-12 rounded-lg ${SKELETON_CLASS}`} />
                  </div>
                  <div className="flex-1 p-2 space-y-1.5">
                    {Array.from({ length: card.rows }).map((_, ri) => (
                      <div
                        key={ri}
                        className="flex items-center gap-2 rounded-md bg-white dark:bg-stone-900/80 px-3 py-1.5"
                      >
                        <div className={`h-6 w-6 rounded ${SKELETON_CLASS} flex-shrink-0`} />
                        <div className={`h-4 flex-1 ${SKELETON_CLASS}`} />
                        <div className={`h-6 w-6 rounded-full ${SKELETON_CLASS} flex-shrink-0`} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-[400px] flex-col items-center justify-center text-center px-6">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <div className="rounded-full p-4 bg-stone-100 dark:bg-stone-800/50">
          <Bot className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            Your agent isn&apos;t ready yet
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Switch to the Builder tab to create your agent. Once it&apos;s ready, you&apos;ll be able to manage it here.
          </p>
        </div>
      </div>
    </div>
  );
}
