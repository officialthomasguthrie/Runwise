import Link from "next/link";

import { FloatingHeader } from "@/components/landing/layout/floating-header";
import { LegalDocumentFooter } from "@/components/landing/layout/legal-document-footer";

export const metadata = {
  title: "About | Runwise",
  description:
    "Learn about Runwise — we help teams turn natural language into production-ready automations without writing code.",
};

export default function AboutPage() {
  return (
    <main className="landing-page min-h-screen bg-[#f5f3ef] text-black">
      <FloatingHeader />

      <section
        className="flex w-full flex-col items-center pb-12 pt-16 sm:pb-14 sm:pt-20 md:pb-16 md:pt-24"
        aria-labelledby="about-hero-heading"
      >
        <div className="flex w-full flex-col items-center px-4 pt-4 sm:px-6 sm:pt-6 md:pt-8">
          <div className="flex w-full max-w-[800px] flex-col items-center gap-4 text-center sm:gap-5 md:gap-6">
            <div className="flex h-[28px] w-fit items-center rounded-full border border-white/60 bg-white/30 px-3 shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:h-[30px] sm:px-3.5">
              <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs">
                Company
              </span>
            </div>
            <h1
              id="about-hero-heading"
              className="text-center text-[24px] leading-[1.15em] font-medium -tracking-[.02em] sm:text-[32px] md:text-[40px] lg:text-[48px] lg:leading-[1.1em]"
            >
              Automation that speaks your{" "}
              <span className="font-playfair font-normal italic whitespace-nowrap">language</span>
            </h1>
            <p className="w-full max-w-[min(100%,800px)] text-[13px] leading-[1.5em] font-normal text-[#1a1a1a]/55 sm:text-sm md:text-base">
              Runwise is building the generative workflow layer for teams who want to move fast—without
              sacrificing clarity, safety, or control.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[720px] px-4 pb-16 sm:px-6 sm:pb-20 md:pb-24">
        <section className="pt-8 sm:pt-10">
          <h2 className="text-lg font-medium tracking-tight text-[#1a1a1a] sm:text-xl">
            Why we exist
          </h2>
          <div className="mt-4 space-y-4 text-[14px] leading-[1.65] text-[#1a1a1a]/75 sm:text-[15px]">
            <p>
              Most automation tools still assume you think in triggers, nodes, and APIs. We believe the
              best interface is the one you already use every day: plain language. Runwise turns what you
              describe into workflows you can review, customize, and run—so operators and domain experts
              can own automation end to end.
            </p>
            <p>
              We&apos;re focused on reliability and transparency: you should always see what an agent will
              do, connect the tools you already trust, and iterate without filing tickets or waiting on
              engineering bandwidth.
            </p>
          </div>
        </section>

        <section className="mt-12 sm:mt-14">
          <h2 className="text-lg font-medium tracking-tight text-[#1a1a1a] sm:text-xl">
            What we&apos;re building
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-[14px] leading-relaxed text-[#1a1a1a]/75 sm:text-[15px]">
            <li>
              A generative builder that goes from prompt to runnable workflows—not static templates
              alone.
            </li>
            <li>First-class integrations so your agents work where your data and customers already live.</li>
            <li>
              Guardrails and visibility by design, so teams can adopt AI-assisted automation with
              confidence.
            </li>
          </ul>
        </section>

        <section className="mt-12 sm:mt-14">
          <h2 className="text-lg font-medium tracking-tight text-[#1a1a1a] sm:text-xl">
            Where we&apos;re based
          </h2>
          <p className="mt-4 text-[14px] leading-[1.65] text-[#1a1a1a]/75 sm:text-[15px]">
            Runwise is operated from New Zealand. We work with customers and infrastructure globally and
            take privacy and data handling seriously—see our{" "}
            <Link
              href="/privacy"
              className="text-black underline underline-offset-2 transition hover:opacity-80"
            >
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </section>
      </div>

      <LegalDocumentFooter />
    </main>
  );
}
