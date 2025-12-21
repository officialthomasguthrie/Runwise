"use client"

import Link from "next/link"
import { useMemo } from "react"

import { ProCheckoutButton } from "@/components/billing/pro-checkout-button"
import type { PricingTier } from "@/components/ui/pricing-card"
import FadeContent from "@/components/ui/FadeContent"
import { PricingSection as PricingSectionBlock } from "@/components/ui/pricing-section"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

const PAYMENT_FREQUENCIES = ["monthly", "yearly"]
const YEARLY_DISCOUNT_MULTIPLIER = 0.8

const discountMonthlyPrice = (price: number) =>
  Number((price * YEARLY_DISCOUNT_MULTIPLIER).toFixed(2))

// Current Plan button component (matches billing tab styling)
const CurrentPlanButton = () => (
  <button 
    disabled 
    className="border border-gray-300 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl w-full rounded-lg py-1.5 px-3 cursor-not-allowed text-xs font-normal text-foreground opacity-60 transition-all"
  >
    Current Plan
  </button>
)

export default function PricingSection() {
  const { subscriptionTier } = useAuth()

  // Determine current plan from subscription tier
  // Map: personal -> "personal", pro/professional -> "professional", enterprise/enterprises -> "enterprise"
  const currentPlan = useMemo(() => {
    if (!subscriptionTier || subscriptionTier === "free") return null
    if (subscriptionTier === "personal") return "personal"
    if (subscriptionTier === "pro" || subscriptionTier === "professional") return "professional"
    if (subscriptionTier === "enterprise" || subscriptionTier === "enterprises") return "enterprise"
    return null
  }, [subscriptionTier])

  const PRICING_TIERS: PricingTier[] = useMemo(() => [
    {
      id: "personal",
      name: "Personal",
      price: {
        monthly: 9,
        yearly: discountMonthlyPrice(9),
      },
      description: "Solo builders automating personal stacks with AI copilots.",
      features: [
        "2.5k workflow executions",
        "100 credits",
        "5 live workflows",
        "100+ integrations",
        "Webhook + API triggers",
        "Workflow templates",
        "Email support",
      ],
      cta: "Get Started",
      ctaSlot: currentPlan === "personal" ? (
        <CurrentPlanButton />
      ) : (
        <ProCheckoutButton
          plan="personal-monthly"
          variant="outline"
          className="w-full gap-2 border-border text-foreground font-geist justify-center"
        >
          Get Started
        </ProCheckoutButton>
      ),
    },
    {
      id: "professional",
      name: "Professional",
      price: {
        monthly: 29,
        yearly: discountMonthlyPrice(29),
      },
      description: "Scaling teams orchestrating GTM, ops, and product workflows.",
      features: [
        "Everything in Personal",
        "10k workflow executions",
        "300 credits",
        "20 live workflows",
        "Analytics",
        "Semi-priority chat support",
      ],
      cta: "Start Free Trial",
      popular: true,
      ctaSlot: currentPlan === "professional" ? (
        <CurrentPlanButton />
      ) : (
        <ProCheckoutButton
          plan="pro-monthly"
          className="w-full gap-2 justify-center font-geist"
        >
          Start Free Trial
        </ProCheckoutButton>
      ),
    },
    {
      id: "advanced",
      name: "Advanced",
      price: {
        monthly: 99,
        yearly: discountMonthlyPrice(99),
      },
      description: "Ops-heavy teams orchestrating advanced AI workflows at scale.",
      features: [
        "Everything in Professional",
        "40k workflow executions",
        "Unlimited credits",
        "Unlimited live workflows",
        "Priority chat support",
        "Dedicated solution engineer",
      ],
      cta: "Start Free Trial",
      ctaSlot: (
        <ProCheckoutButton
          plan="pro-monthly"
          variant="outline"
          className="w-full gap-2 border-border text-foreground font-geist justify-center"
        >
          Start Free Trial
        </ProCheckoutButton>
      ),
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: {
        monthly: "Custom",
        yearly: "Custom",
      },
      description: "Security, SLAs, and white-glove onboarding for your org.",
      features: [
        "Everything in Advanced",
        "You choose what features to add here",
      ],
      cta: "Contact sales",
      highlighted: true,
      ctaSlot: currentPlan === "enterprise" ? (
        <CurrentPlanButton />
      ) : (
        <Button
          asChild
          variant="secondary"
          className="w-full gap-2 justify-center font-geist"
        >
          <Link href="mailto:hello@runwiseai.app">Contact sales</Link>
        </Button>
      ),
    },
  ], [currentPlan])

  return (
    <FadeContent delay={200} duration={1000}>
          <div
            className="w-full py-4 sm:py-6 bg-background"
            suppressHydrationWarning={true}
          >
        <div
          className="container mx-auto px-4 sm:px-6 lg:px-8"
          suppressHydrationWarning={true}
        >
          <PricingSectionBlock
            title="Pricing"
            subtitle="Choose the perfect plan for your AI workflow needs"
            frequencies={PAYMENT_FREQUENCIES}
            tiers={PRICING_TIERS}
            titleClassName="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tighter leading-tight text-foreground font-geist"
            subtitleClassName="mt-4 text-base sm:text-lg lg:text-xl 2xl:text-lg text-muted-foreground font-geist"
            headerClassName="mb-6 sm:mb-10 lg:mb-16"
          />
        </div>
      </div>
    </FadeContent>
  )
}
