import { FloatingHeader } from "@/components/landing/layout/floating-header";
import { HeroPromptInput } from "@/components/landing/ui/hero-prompt-input";
import { IntegrationsMarquee } from "@/components/landing/ui/integrations-marquee";
import { FaqAccordion } from "@/components/landing/ui/faq-accordion";
import { PricingCards } from "@/components/landing/ui/pricing-cards";
import { IntegrationOrbit } from "@/components/landing/ui/integration-orbit";
import { FeaturesBentoGrid } from "@/components/landing/sections/features-bento";
import { WhoWeAre } from "@/components/landing/sections/who-we-are";
import { HowItWorksSteps } from "@/components/landing/sections/how-it-works";
import { AgentLearningChart } from "@/components/landing/ui/agent-learning-chart";
import { AutomateConveyorVisual } from "@/components/landing/ui/automate-conveyor-visual";
import { LaunchInSecondsVisual } from "@/components/landing/ui/launch-in-seconds-visual";
import { NoCodeSplitVisual } from "@/components/landing/ui/no-code-split-visual";
import Image from "next/image";
import Link from "next/link";
import { LandingCtaButtons } from "@/components/landing/ui/landing-cta-buttons";

const benefitsBentoShell =
  "flex min-h-[312px] flex-col items-stretch p-5 sm:min-h-[340px] sm:p-6 md:min-h-[368px] md:p-7 rounded-[22px] border border-white/60 bg-white/35 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150";

/**
 * Same row track as Features second bento row: max(280,312,320) default, max(300,312,340) sm,
 * max(320,368,368) md. Fixed h + min-h-0 + overflow-hidden so the learning chart cannot exceed it.
 */
const benefitsSecondRowShell =
  "flex h-[320px] min-h-0 flex-col items-stretch overflow-hidden p-5 sm:h-[340px] sm:p-6 md:h-[368px] md:p-7 rounded-[22px] border border-white/60 bg-white/35 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150";

const benefitsCardTitle =
  "text-left font-sans text-sm font-medium leading-snug tracking-tight text-[#1a1a1a] sm:text-base";

const benefitsCardBody =
  "mt-2 max-w-prose text-left text-[12px] leading-relaxed text-[#1a1a1a]/55 sm:text-[13px]";

/** Subheading under section titles — ~same max width as title stack (800px) */
const sectionSubhead =
  "mx-auto mt-3 w-full max-w-[min(100%,800px)] text-center text-[13px] leading-[1.5em] font-normal text-[#1a1a1a]/55 sm:mt-4 sm:text-sm md:text-base";

export default function LandingHome() {
  return (
    <div className="relative min-h-screen bg-[#f5f3ef] text-[#1a1a1a]">
      <div className="relative z-10">
        <FloatingHeader />

        <main className="landing-page">
          <section
            id="hero"
            className="relative flex w-full flex-col items-center pt-20 pb-14 sm:pt-24 sm:pb-16 md:pt-28 md:pb-20 lg:min-h-[min(76svh,820px)]"
          >
            <div className="hero-bg" aria-hidden="true" />
            <div className="relative z-10 flex w-full max-w-[800px] flex-col items-center gap-4 px-4 pt-6 sm:gap-5 sm:px-6 sm:pt-8 md:pt-10 md:gap-6 lg:flex-1 lg:justify-center lg:pt-12">
              <div className="flex h-[28px] w-fit items-center rounded-full border border-white/60 bg-white/30 px-3 shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:h-[30px] sm:px-3.5">
                <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs">
                  Introducing Runwise
                </span>
              </div>

              <h1 className="text-center text-[26px] leading-[1.15em] font-normal -tracking-[.02em] sm:text-[34px] md:text-[44px] lg:text-[52px] lg:leading-[1.1em]">
                <span className="font-medium lg:block lg:whitespace-nowrap">
                  Turn natural language prompts into{" "}
                </span>
                <span className="font-playfair font-normal italic lg:block lg:whitespace-nowrap">
                  functional automations
                </span>
              </h1>

              <p className="w-full max-w-[min(100%,800px)] text-center text-[13px] leading-[1.5em] font-normal text-[#1a1a1a]/55 sm:text-sm md:text-base">
                Runwise is the world&apos;s first fully generative automation builder designed for
                non-technical teams
              </p>

              <HeroPromptInput className="mt-1 w-full max-w-2xl" />

              <div className="mt-3 w-full sm:mt-4">
                <IntegrationsMarquee />
              </div>
            </div>
          </section>

          <WhoWeAre />

          <section
            id="features"
            className="flex w-full flex-col items-center px-4 pt-[50px] sm:px-6"
          >
            <div className="flex h-[30px] w-fit items-center rounded-lg border border-white/60 bg-white/30 px-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.03] backdrop-blur-xl">
              <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs">
                Features
              </span>
            </div>

            <h2 className="mt-4 text-center text-[24px] leading-[1.15em] font-medium -tracking-[.02em] whitespace-nowrap sm:text-[32px] md:text-[40px] lg:text-[48px] lg:leading-[1.1em]">
              Everything You Need to Build{" "}
              <span className="font-playfair font-normal italic whitespace-nowrap">
                Smarter AI Workflows
              </span>
            </h2>
            <p className={sectionSubhead}>
              Agents, visual workflows, integrations, and end-to-end process automation—built for teams
              who don&apos;t want to live in code.
            </p>

            <div className="mt-8 w-full md:mt-12">
              <FeaturesBentoGrid />
            </div>
          </section>

          <section
            id="how-it-works"
            className="flex w-full flex-col items-center px-4 pt-16 sm:px-6"
          >
            <div className="flex h-[30px] w-fit items-center rounded-lg border border-white/60 bg-white/30 px-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.03] backdrop-blur-xl">
              <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs">
                How it works
              </span>
            </div>

            <h2 className="mt-4 text-center text-[24px] leading-[1.15em] font-medium -tracking-[.02em] whitespace-nowrap sm:text-[32px] md:text-[40px] lg:text-[48px] lg:leading-[1.1em]">
              From Idea to Automation in{" "}
              <span className="font-playfair font-normal italic whitespace-nowrap">Minutes</span>
            </h2>
            <p className={sectionSubhead}>
              Describe the outcome, connect your stack, review the setup, and launch—without filing tickets
              or waiting on engineering.
            </p>

            <HowItWorksSteps />
          </section>

          <section id="benefits" className="flex w-full flex-col items-center px-4 pt-16 sm:px-6">
            <div className="flex h-[30px] w-fit items-center rounded-lg border border-white/60 bg-white/30 px-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.03] backdrop-blur-xl">
              <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs">
                Benefits
              </span>
            </div>

            <h2 className="mt-4 text-center text-[24px] leading-[1.15em] font-medium -tracking-[.02em] whitespace-nowrap sm:text-[32px] md:text-[40px] lg:text-[48px] lg:leading-[1.1em]">
              Your Work,{" "}
              <span className="font-playfair font-normal italic whitespace-nowrap">Supercharged</span>
            </h2>
            <p className={sectionSubhead}>
              Less manual work, faster launches, and automations that stay aligned with how your team
              actually operates.
            </p>

            <div className="mt-8 w-full max-w-6xl md:mt-12">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
                <div className={`${benefitsBentoShell} md:col-span-7`}>
                  <h3 className={benefitsCardTitle}>Automate Repetitive Tasks</h3>
                  <p className={benefitsCardBody}>
                    Hand off recurring work to agents that follow your rules and keep outputs consistent
                    every time.
                  </p>
                  <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center">
                    <AutomateConveyorVisual className="w-full max-w-2xl" />
                  </div>
                </div>
                <div className={`${benefitsBentoShell} md:col-span-5`}>
                  <h3 className={benefitsCardTitle}>No Code, No Headache</h3>
                  <p className={benefitsCardBody}>
                    Design automations with plain language and a visual flow—no scripts, YAML, or glue code
                    required.
                  </p>
                  <div className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <NoCodeSplitVisual className="flex-1" />
                  </div>
                </div>
                <div className={`${benefitsSecondRowShell} md:col-span-4`}>
                  <h3 className={benefitsCardTitle}>Launch in Seconds</h3>
                  <p className={benefitsCardBody}>
                    Go from idea to a running agent in moments, without provisioning infrastructure or
                    wrestling with setup.
                  </p>
                  <div className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden">
                    <LaunchInSecondsVisual />
                  </div>
                </div>
                <div className={`${benefitsSecondRowShell} md:col-span-4`}>
                  <h3 className={benefitsCardTitle}>Your Agent Learns Over Time</h3>
                  <p className={benefitsCardBody}>
                    Refine behavior with feedback and history so each run gets closer to how you actually
                    work.
                  </p>
                  <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="flex min-h-0 min-w-0 flex-1 justify-center overflow-hidden">
                      <AgentLearningChart />
                    </div>
                  </div>
                </div>
                <div className={`${benefitsSecondRowShell} md:col-span-4`}>
                  <h3 className={benefitsCardTitle}>Connect Everything Seamlessly</h3>
                  <p className={benefitsCardBody}>
                    Plug into the tools you already use so agents can read context, take action, and keep
                    systems in sync.
                  </p>
                  <div className="mt-3 flex min-h-0 min-w-0 flex-1 items-center justify-center pb-1">
                    <IntegrationOrbit />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="pricing" className="flex w-full flex-col items-center px-4 pt-16 sm:px-6">
            <div className="flex h-[30px] w-fit items-center rounded-lg border border-white/60 bg-white/30 px-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.03] backdrop-blur-xl">
              <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs">
                Pricing
              </span>
            </div>

            <h2 className="mt-4 text-center text-[24px] leading-[1.15em] font-medium -tracking-[.02em] whitespace-nowrap sm:text-[32px] md:text-[40px] lg:text-[48px] lg:leading-[1.1em]">
              Simple Pricing for{" "}
              <span className="font-playfair font-normal italic whitespace-nowrap">Every</span> Stage
            </h2>
            <p className={sectionSubhead}>
              Pick the plan that matches your team—credits, executions, and the AI workflow builder
              included. Upgrade or change anytime.
            </p>

            <div className="mt-4 flex w-full max-w-[1200px] flex-col items-center sm:mt-5">
              <PricingCards />
            </div>
          </section>

          <section id="faq" className="flex w-full flex-col items-center px-4 pt-16 sm:px-6">
            <div className="flex h-[30px] w-fit items-center rounded-lg border border-white/60 bg-white/30 px-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.03] backdrop-blur-xl">
              <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]/70 sm:text-xs">
                FAQ
              </span>
            </div>

            <h2 className="mt-4 text-center text-[24px] leading-[1.15em] font-medium -tracking-[.02em] whitespace-nowrap sm:text-[32px] md:text-[40px] lg:text-[48px] lg:leading-[1.1em]">
              Got Questions? We&apos;ve Got{" "}
              <span className="font-playfair font-normal italic whitespace-nowrap">Answers</span>
            </h2>

            <FaqAccordion />
          </section>

          <section id="cta" className="w-full pt-16 pb-4 md:pb-6">
            <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
              <div className="relative h-[400px] w-full overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#ffffff_0%,#f2f8ff_30%,#f7f0ff_62%,#fff6e6_100%)] sm:h-[430px] sm:rounded-[28px] md:h-[480px]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_18%_22%,rgba(99,102,241,0.20)_0%,transparent_68%),radial-gradient(ellipse_60%_50%_at_82%_18%,rgba(236,72,153,0.16)_0%,transparent_70%),radial-gradient(ellipse_60%_55%_at_52%_78%,rgba(34,197,94,0.12)_0%,transparent_72%)]" />

                <div className="relative z-10 flex h-full w-full items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
                  <div className="w-full max-w-3xl">
                    <h2 className="text-center text-[28px] leading-[1.1em] font-medium -tracking-[.02em] text-black sm:text-[36px] md:text-[42px]">
                      Ready to automate your{" "}
                      <span className="font-playfair font-normal italic">first workflow?</span>
                    </h2>
                    <p className="mx-auto mt-3 w-full max-w-[min(100%,800px)] text-center text-[13px] leading-[1.5em] font-normal text-black/60 sm:mt-4 sm:text-sm md:text-base">
                      Go from prompt to a running workflow in minutes—connect your tools and iterate with
                      your team.
                    </p>
                    <LandingCtaButtons />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-2 w-full bg-[#f5f3ef]">
            <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:px-10">
              <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-12">
                <div className="md:max-w-md md:flex-1">
                  <Link href="/" className="inline-flex items-center">
                    <Image
                      src="/runwise-logo-light.png"
                      alt="runwise logo"
                      className="h-[48px] w-auto object-contain"
                      width={171}
                      height={48}
                    />
                  </Link>

                  <p className="mt-4 max-w-md text-sm leading-relaxed text-black/70">
                    Transform your ideas into automated workflows with AI. No coding required.
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    <a
                      href="https://x.com/runwise_ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Runwise on X"
                      className="inline-flex h-6 w-6 items-center justify-center text-black/70 transition hover:text-black/80"
                    >
                      <span
                        aria-hidden="true"
                        className="h-6 w-6 bg-current [mask-image:url('/assets/icons/x.svg')] [mask-repeat:no-repeat] [mask-size:contain] [mask-position:center] [-webkit-mask-image:url('/assets/icons/x.svg')] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] [-webkit-mask-position:center]"
                      />
                    </a>
                    <a
                      href="https://www.instagram.com/runwise.official/"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Runwise on Instagram"
                      className="inline-flex h-6 w-6 items-center justify-center text-black/70 transition hover:text-black/80"
                    >
                      <span
                        aria-hidden="true"
                        className="h-6 w-6 bg-current [mask-image:url('/assets/icons/instagram.svg')] [mask-repeat:no-repeat] [mask-size:contain] [mask-position:center] [-webkit-mask-image:url('/assets/icons/instagram.svg')] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] [-webkit-mask-position:center]"
                      />
                    </a>
                    <a
                      href="https://discord.gg/YdAq6TEZv7"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Runwise on Discord"
                      className="inline-flex h-6 w-6 items-center justify-center text-black/70 transition hover:text-black/80"
                    >
                      <span
                        aria-hidden="true"
                        className="h-6 w-6 bg-current [mask-image:url('/assets/icons/discord.svg')] [mask-repeat:no-repeat] [mask-size:contain] [mask-position:center] [-webkit-mask-image:url('/assets/icons/discord.svg')] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] [-webkit-mask-position:center]"
                      />
                    </a>
                  </div>
                </div>

                <div className="md:ml-auto md:w-auto md:flex-none">
                  <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:gap-1">
                    <div>
                      <h3 className="text-sm font-medium tracking-wide text-black">Navigation</h3>
                      <ul className="mt-4 space-y-2 text-sm text-black/70">
                        <li>
                          <Link className="transition hover:text-black" href="/">
                            Home
                          </Link>
                        </li>
                        <li>
                          <Link className="transition hover:text-black" href="/about">
                            About
                          </Link>
                        </li>
                        <li>
                          <Link className="transition hover:text-black" href="/features">
                            Features
                          </Link>
                        </li>
                        <li>
                          <Link className="transition hover:text-black" href="/use-cases">
                            Use Cases
                          </Link>
                        </li>
                        <li>
                          <Link className="transition hover:text-black" href="/pricing">
                            Pricing
                          </Link>
                        </li>
                        <li>
                          <Link className="transition hover:text-black" href="/blog">
                            Blog
                          </Link>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium tracking-wide text-black">Contact</h3>
                      <div className="mt-4 space-y-2 text-sm text-black/70">
                        <p>
                          <span className="text-black/80">Email:</span>{" "}
                          <a className="transition hover:text-black" href="mailto:hello@runwiseai.app">
                            hello@runwiseai.app
                          </a>
                        </p>
                        <p>
                          <span className="text-black/80">Phone:</span>{" "}
                          <a className="transition hover:text-black" href="tel:+640223591512">
                            +64 022 359 1512
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </footer>

          <div className="w-full bg-[#f5f3ef]">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-5 sm:px-10">
              <p className="text-xs text-black/55">
                © {new Date().getFullYear()} Runwise. All rights reserved.
              </p>
              <p className="text-right text-xs text-black/55">
                <Link href="/privacy" className="underline underline-offset-2 transition hover:text-black/70">
                  Privacy Policy
                </Link>
                {" and "}
                <Link href="/terms" className="underline underline-offset-2 transition hover:text-black/70">
                  Terms of Service
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
