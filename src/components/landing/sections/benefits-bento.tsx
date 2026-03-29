import { cn } from "@/lib/utils";

/** Matches feature bento glass panels */
const bentoCardBase =
  "rounded-[22px] border border-white/60 bg-white/35 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150";

/**
 * Five blank cards in a different layout than Features:
 * — Tall card on the left (spans 2 rows)
 * — Two stacked cards on the top-right
 * — Two cards along the bottom row
 * Mobile: single column, same order.
 */
export function BenefitsBento() {
  return (
    <div className="mt-10 w-full max-w-6xl md:mt-14">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:grid-rows-[auto_auto_auto] md:gap-5">
        <div
          className={cn(
            bentoCardBase,
            "min-h-[220px] md:col-start-1 md:row-start-1 md:row-span-2 md:min-h-[min(100%,20rem)]",
          )}
          aria-hidden="true"
        />
        <div
          className={cn(bentoCardBase, "min-h-[160px] md:col-start-2 md:row-start-1")}
          aria-hidden="true"
        />
        <div
          className={cn(bentoCardBase, "min-h-[160px] md:col-start-2 md:row-start-2")}
          aria-hidden="true"
        />
        <div
          className={cn(bentoCardBase, "min-h-[160px] md:col-start-1 md:row-start-3")}
          aria-hidden="true"
        />
        <div
          className={cn(bentoCardBase, "min-h-[160px] md:col-start-2 md:row-start-3")}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
