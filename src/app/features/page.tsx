import { FloatingHeader } from "@/components/landing/layout/floating-header";
import { LegalDocumentFooter } from "@/components/landing/layout/legal-document-footer";
import { FeaturesBentoGrid } from "@/components/landing/sections/features-bento";

export const metadata = {
  title: "Features | Runwise",
  description:
    "Agents, visual workflows, integrations, and end-to-end automation—everything you need to build smarter AI workflows.",
};

export default function FeaturesPage() {
  return (
    <main className="landing-page min-h-screen bg-[#f5f3ef] text-black">
      <FloatingHeader />

      <section
        className="flex w-full flex-col items-center pb-16 pt-16 sm:pb-20 sm:pt-20 md:pb-24 md:pt-24"
        aria-labelledby="features-page-heading"
      >
        <div className="flex w-full flex-col items-center px-4 pt-4 sm:px-6 sm:pt-6 md:pt-8">
          <div className="flex h-[28px] w-fit items-center rounded-full border border-white/60 bg-white/30 px-3 shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:h-[30px] sm:px-3.5">
            <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs">
              Features
            </span>
          </div>

          <h1
            id="features-page-heading"
            className="mt-4 text-center text-[24px] leading-[1.15em] font-medium -tracking-[.02em] sm:text-[32px] md:text-[40px] lg:text-[48px] lg:leading-[1.1em]"
          >
            Everything You Need to Build{" "}
            <span className="font-playfair font-normal italic whitespace-nowrap">
              Smarter AI Workflows
            </span>
          </h1>
          <p className="mx-auto mt-3 w-full max-w-[min(100%,800px)] text-center text-[13px] leading-[1.5em] font-normal text-[#1a1a1a]/55 sm:mt-4 sm:text-sm md:text-base">
            Agents, visual workflows, integrations, and end-to-end process automation—built for teams
            who don&apos;t want to live in code.
          </p>

          <div className="mt-8 w-full px-0 sm:mt-10 md:mt-12">
            <FeaturesBentoGrid />
          </div>
        </div>
      </section>

      <LegalDocumentFooter />
    </main>
  );
}
