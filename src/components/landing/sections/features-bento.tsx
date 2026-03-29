import Image from "next/image";

import { AutomateProcessPreview } from "@/components/landing/ui/automate-process-preview";
import { DeployAgentsPreview } from "@/components/landing/ui/deploy-agents-preview";
import { IntegrationOrbit } from "@/components/landing/ui/integration-orbit";
import { WorkflowMiniPreview } from "@/components/landing/ui/workflow-mini-preview";

/** Same bento as the landing #features section (grid only; no section chrome). */
export function FeaturesBentoGrid() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:grid-rows-[auto_minmax(0,1fr)] md:gap-5 md:min-h-[300px]">
        <div className="flex min-h-[260px] flex-col items-stretch rounded-[22px] border border-white/60 bg-white/35 p-5 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150 sm:p-6 md:row-span-2 md:grid md:min-h-0 md:grid-rows-[subgrid] md:p-7">
          <div>
            <h3 className="text-left font-sans text-sm font-medium leading-snug tracking-tight text-[#1a1a1a] sm:text-base">
              Deploy Autonomous Agents
            </h3>
            <p className="mt-2 max-w-prose text-left text-[12px] leading-relaxed text-[#1a1a1a]/55 sm:text-[13px]">
              Launch agents that run on schedules or triggers and keep working without constant oversight.
            </p>
          </div>
          <div className="mt-4 flex min-h-0 flex-1 flex-col items-start justify-center md:mt-0 md:h-full md:min-h-0">
            <DeployAgentsPreview className="w-full max-w-prose shrink-0" />
          </div>
        </div>
        <div className="flex min-h-[260px] flex-col items-stretch rounded-[22px] border border-white/60 bg-white/35 p-5 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150 sm:p-6 md:row-span-2 md:grid md:min-h-0 md:grid-rows-[subgrid] md:p-7">
          <div>
            <h3 className="text-left font-sans text-sm font-medium leading-snug tracking-tight text-[#1a1a1a] sm:text-base">
              Build AI Workflows Visually
            </h3>
            <p className="mt-2 max-w-prose text-left text-[12px] leading-relaxed text-[#1a1a1a]/55 sm:text-[13px]">
              Arrange steps on a canvas—connect tools and logic without writing config or glue code.
            </p>
          </div>
          <div className="mt-4 flex min-h-0 flex-1 flex-col items-center justify-center md:mt-0 md:h-full md:min-h-0">
            <WorkflowMiniPreview className="h-[148px] w-full shrink-0 sm:h-[158px]" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:mt-5 md:grid-cols-12 md:gap-5">
        <div className="relative flex min-h-[280px] flex-col items-start overflow-hidden rounded-[22px] border border-white/60 bg-white/35 p-5 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150 sm:min-h-[300px] sm:p-6 md:col-span-5 md:min-h-[320px] md:p-7">
          <h3 className="relative z-10 text-left font-sans text-sm font-medium leading-snug tracking-tight text-[#1a1a1a] sm:text-base">
            From Prompt to Execution
          </h3>
          <p className="relative z-10 mt-2 max-w-prose text-left text-[12px] leading-relaxed text-[#1a1a1a]/55 sm:text-[13px]">
            Describe outcomes in natural language and turn them into workflows you can run and iterate on.
          </p>
          <Image
            src="/assets/prompt-to-execution-builder.png"
            alt=""
            width={1024}
            height={578}
            unoptimized
            className="pointer-events-none absolute bottom-0 right-0 z-0 h-auto w-[min(132%,28rem)] max-w-none rounded-tl-lg border border-white/70 shadow-[0_16px_48px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.05] sm:rounded-tl-xl sm:w-[min(128%,32rem)]"
            style={{ transform: "translate(22%, 20%)" }}
            sizes="(max-width: 768px) 100vw, 640px"
          />
        </div>
        <div className="flex min-h-[312px] flex-col items-stretch rounded-[22px] border border-white/60 bg-white/35 p-5 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150 sm:p-6 md:col-span-3 md:min-h-[368px] md:p-7">
          <h3 className="text-left font-sans text-sm font-medium leading-snug tracking-tight text-[#1a1a1a] sm:text-base">
            Connect Your Entire Stack
          </h3>
          <p className="mt-2 max-w-prose text-left text-[12px] leading-relaxed text-[#1a1a1a]/55 sm:text-[13px]">
            Connect to hundreds of available integrations to streamline your workflow.
          </p>
          <div className="mt-3 flex flex-1 items-center justify-center pb-1">
            <IntegrationOrbit />
          </div>
        </div>
        <div className="flex min-h-[320px] flex-col items-stretch rounded-[22px] border border-white/60 bg-white/35 p-5 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150 sm:min-h-[340px] sm:p-6 md:col-span-4 md:min-h-[368px] md:p-7">
          <h3 className="text-left font-sans text-sm font-medium leading-snug tracking-tight text-[#1a1a1a] sm:text-base">
            Automate Entire Processes
          </h3>
          <p className="mt-2 max-w-prose text-left text-[12px] leading-relaxed text-[#1a1a1a]/55 sm:text-[13px]">
            Chain handoffs, approvals, and updates into end-to-end runs—not disconnected one-offs.
          </p>
          <AutomateProcessPreview className="mt-4 min-h-[220px]" />
        </div>
      </div>
    </div>
  );
}
