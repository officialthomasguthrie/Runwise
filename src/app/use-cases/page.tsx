import { FloatingHeader } from "@/components/landing/layout/floating-header";
import { LegalDocumentFooter } from "@/components/landing/layout/legal-document-footer";
import { UseCasesGrid } from "@/components/landing/sections/use-cases-grid";

export const metadata = {
  title: "Use Cases | Runwise",
  description:
    "Automate sales, support, marketing, finance, HR, and engineering workflows with Runwise—plain language to production-ready runs.",
};

export default function UseCasesPage() {
  return (
    <main className="landing-page min-h-screen bg-[#f5f3ef] text-black">
      <FloatingHeader />

      <section
        className="flex w-full flex-col items-center pb-16 pt-16 sm:pb-20 sm:pt-20 md:pb-24 md:pt-24"
        aria-labelledby="use-cases-page-heading"
      >
        <div className="flex w-full flex-col items-center px-4 pt-4 sm:px-6 sm:pt-6 md:pt-8">
          <div className="flex h-[28px] w-fit items-center rounded-full border border-white/60 bg-white/30 px-3 shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:h-[30px] sm:px-3.5">
            <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs">
              Use cases
            </span>
          </div>

          <h1
            id="use-cases-page-heading"
            className="mt-4 w-full min-w-0 max-w-full px-1 text-center text-[22px] leading-[1.2em] font-medium -tracking-[.02em] sm:px-2 sm:text-[28px] md:text-[36px] lg:text-[44px] lg:leading-[1.1em] xl:text-[48px] xl:whitespace-nowrap"
          >
            Automation for{" "}
            <span className="font-playfair block font-normal italic xl:inline">every team</span>
          </h1>
          <p className="mx-auto mt-3 w-full max-w-[min(100%,800px)] text-center text-[13px] leading-[1.5em] font-normal text-[#1a1a1a]/55 sm:mt-4 sm:text-sm md:text-base">
            Real workflows teams run with Runwise—from first prompt to scheduled execution across the tools
            you already use.
          </p>

          <div className="mt-8 w-full sm:mt-10 md:mt-12">
            <UseCasesGrid />
          </div>
        </div>
      </section>

      <LegalDocumentFooter />
    </main>
  );
}
