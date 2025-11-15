import Link from "next/link"

import { ProCheckoutButton } from "@/components/billing/pro-checkout-button"
import type { PricingTier } from "@/components/ui/pricing-card"
import FadeContent from "@/components/ui/FadeContent"
import { PricingSection as PricingSectionBlock } from "@/components/ui/pricing-section"
import { Button } from "@/components/ui/button"

const PAYMENT_FREQUENCIES = ["monthly", "yearly"]

const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    price: {
      monthly: "Free",
      yearly: "Free",
    },
    description: "Prototype workflows and explore Runwise Studio at your pace.",
    features: [
      "Up to 5 live workflows",
      "Core triggers & actions",
      "Community + docs support",
      "Workflow version history",
      "Basic AI prompt builder",
    ],
    cta: "Get started",
    ctaSlot: (
      <Button
        asChild
        variant="outline"
        className="w-full gap-2 border-border text-foreground font-geist"
      >
        <Link href="/signup">Get started</Link>
      </Button>
    ),
  },
  {
    id: "personal",
    name: "Personal",
    price: {
      monthly: 9,
      yearly: 96,
    },
    description: "Solo builders automating personal stacks with AI copilots.",
    features: [
      "25 live workflows",
      "Webhook + API triggers",
      "AI prompt templates",
      "Runwise desktop alerts",
      "Email support",
    ],
    cta: "Start Free Trial",
    ctaSlot: (
      <ProCheckoutButton
        plan="personal-monthly"
        variant="outline"
        className="w-full gap-2 border-border text-foreground font-geist justify-center"
      >
        Start Free Trial
      </ProCheckoutButton>
    ),
  },
  {
    id: "professional",
    name: "Professional",
    price: {
      monthly: 29,
      yearly: 300,
    },
    description: "Scaling teams orchestrating GTM, ops, and product workflows.",
    features: [
      "Unlimited workflows",
      "100+ integrations + APIs",
      "Parallel execution engine",
      "Priority chat support",
      "Workspace roles & audit log",
    ],
    cta: "Start Free Trial",
    popular: true,
    ctaSlot: (
      <ProCheckoutButton
        plan="pro-monthly"
        className="w-full gap-2 justify-center font-geist"
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
      "Everything in Professional",
      "Private deployment option",
      "Managed onboarding sprints",
      "Dedicated success partner",
      "Compliance & SSO support",
    ],
    cta: "Talk to sales",
    highlighted: true,
    ctaSlot: (
      <Button
        asChild
        variant="secondary"
        className="w-full gap-2 justify-center font-geist"
      >
        <Link href="/contact">Talk to sales</Link>
      </Button>
    ),
  },
]

export default function PricingSection() {
  return (
    <FadeContent delay={200} duration={1000}>
      <div
        className="w-full py-8 sm:py-12 bg-background"
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
