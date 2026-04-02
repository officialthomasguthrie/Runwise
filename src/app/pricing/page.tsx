import { FloatingHeader } from "@/components/landing/layout/floating-header";
import { LegalDocumentFooter } from "@/components/landing/layout/legal-document-footer";
import { PricingCards } from "@/components/landing/ui/pricing-cards";
import { PricingComparisonTable } from "@/components/landing/ui/pricing-comparison-table";

export const metadata = {
  title: "Pricing | Runwise",
  description:
    "Simple pricing for every stage — Personal, Professional, and Enterprise plans for Runwise automation.",
};

export default function PricingPage() {
  return (
    <main className="landing-page min-h-screen bg-[#f5f3ef] text-black">
      <FloatingHeader />

      <section
        className="flex w-full flex-col items-center pb-16 pt-16 sm:pb-20 sm:pt-20 md:pb-24 md:pt-24"
        aria-labelledby="pricing-hero-heading"
      >
        <div className="flex w-full flex-col items-center px-4 pt-4 sm:px-6 sm:pt-6 md:pt-8">
          <div className="flex h-[28px] w-fit items-center rounded-full border border-white/60 bg-white/30 px-3 shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:h-[30px] sm:px-3.5">
            <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs">
              Pricing
            </span>
          </div>

          <h1
            id="pricing-hero-heading"
            className="mt-4 w-full min-w-0 max-w-full px-1 text-center text-[22px] leading-[1.2em] font-medium -tracking-[.02em] sm:px-2 sm:text-[28px] md:text-[36px] lg:text-[44px] lg:leading-[1.1em] xl:text-[48px] xl:whitespace-nowrap"
          >
            Simple Pricing for{" "}
            <span className="font-playfair block font-normal italic xl:inline">Every Stage</span>
          </h1>
          <p className="mx-auto mt-3 w-full max-w-[min(100%,800px)] text-center text-[13px] leading-[1.5em] font-normal text-[#1a1a1a]/55 sm:mt-4 sm:text-sm md:text-base">
            Pick the plan that matches your team—credits, executions, and the AI workflow builder
            included. Upgrade or change anytime.
          </p>

          <div className="mt-4 flex w-full max-w-[1200px] flex-col items-center sm:mt-5">
            <PricingCards checkoutCancelPath="/pricing" />
          </div>

          <div className="mt-12 flex w-full max-w-[1200px] flex-col items-center sm:mt-14 md:mt-16">
            <h2
              id="pricing-compare-heading"
              className="text-center text-[20px] leading-[1.15em] font-medium -tracking-[.02em] text-[#1a1a1a] sm:text-[26px] md:text-[32px] lg:text-[38px] lg:leading-[1.1em]"
            >
              Compare plans
            </h2>
            <p className="mx-auto mt-3 w-full max-w-[min(100%,800px)] text-center text-[13px] leading-[1.5em] font-normal text-[#1a1a1a]/55 sm:mt-4 sm:text-sm md:text-base">
              What&apos;s included on each tier—same tools, more capacity and support as you grow.
            </p>
            <div className="mt-8 w-full sm:mt-10 md:mt-12">
              <PricingComparisonTable />
            </div>
          </div>
        </div>
      </section>

      <LegalDocumentFooter />
    </main>
  );
}
