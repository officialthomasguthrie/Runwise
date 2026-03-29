"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { useAuth } from "@/contexts/auth-context";

type PlanCheckout = "personal" | "professional" | "enterprise";

type Plan = {
  icon: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  description: string;
  buttonText: string;
  features: string[];
  gridClass?: string;
  checkout: PlanCheckout;
};

const plans: Plan[] = [
  {
    icon: "/assets/icons/personal-icon.svg",
    name: "Personal",
    monthlyPrice: "$9.99",
    annualPrice: "$8",
    description: "Essential tools and features for starting your journey with ease.",
    buttonText: "Get Started",
    checkout: "personal",
    features: [
      "100 credits",
      "100+ executions",
      "Up to 3 active workflows",
      "10 step workflows",
      "No technical skills required",
      "Fast setup",
      "AI workflow builder included",
      "AI workflow generation",
    ],
  },
  {
    icon: "/assets/icons/professional-icon.svg",
    name: "Professional",
    monthlyPrice: "$29.99",
    annualPrice: "$24",
    description: "Advanced capabilities designed to meet growing business needs.",
    buttonText: "Start Free Trial",
    checkout: "professional",
    features: [
      "Everything in personal",
      "500 credits",
      "1000+ executions",
      "Up to 10 active workflows",
      "Priority support",
      "Scales with businesses",
      "Stronger capacity",
      "2 consultation a month",
    ],
  },
  {
    icon: "/assets/icons/interprise-icon.svg",
    name: "Enterprises",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    description: "Comprehensive solutions tailored for large-scale business success.",
    buttonText: "Schedule a call",
    checkout: "enterprise",
    features: [
      "Custom usage limits",
      "Dedicated infrastructure",
      "Advanced integrations",
      "Custom workflow logic",
      "Priority support & onboarding",
      "SLAs & compliance options",
      "Team collaboration features",
      "Scales without limits",
    ],
    gridClass: "md:col-span-2 lg:col-span-1",
  },
];

const glassPanel =
  "border border-white/60 bg-white/35 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150";

const ENTERPRISE_CAL_URL =
  "https://cal.com/thomas-guthrie/runwise-enterprise-consultation";

export type PricingCardsProps = {
  /** App path for Stripe checkout cancel (e.g. `/pricing`). Omit to use API default `/#pricing`. */
  checkoutCancelPath?: string;
};

function PricingPlanCard({
  plan,
  isAnnual,
  currentPlanKey,
  hasCancelledPlan,
  loadingPlan,
  onCheckout,
  onEnterprise,
}: {
  plan: Plan;
  isAnnual: boolean;
  currentPlanKey: "personal" | "professional" | "enterprises" | null;
  hasCancelledPlan: boolean;
  loadingPlan: string | null;
  onCheckout: (plan: Plan) => void;
  onEnterprise: () => void;
}) {
  const isCurrent =
    (plan.checkout === "personal" && currentPlanKey === "personal") ||
    (plan.checkout === "professional" && currentPlanKey === "professional") ||
    (plan.checkout === "enterprise" && currentPlanKey === "enterprises");

  const isLoading = loadingPlan === plan.name;

  let ctaLabel = plan.buttonText;
  if (plan.checkout === "professional") {
    if (currentPlanKey) ctaLabel = "Switch to Professional";
    else if (hasCancelledPlan) ctaLabel = "Get Started";
    else ctaLabel = "Start Free Trial";
  } else if (plan.checkout === "personal" && currentPlanKey && currentPlanKey !== "personal") {
    ctaLabel = "Switch to Personal";
  }

  return (
    <div
      className={`flex flex-col gap-y-[35px] rounded-[30px] p-[30px] ${glassPanel} ${plan.gridClass ?? ""}`}
    >
      <div className="space-y-[15px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[25px] w-[25px] items-center justify-center rounded-lg bg-black/[0.06]">
            <Image
              src={plan.icon}
              alt=""
              width={15}
              height={15}
              className="h-[15px] w-[15px] object-contain brightness-0 opacity-70"
            />
          </div>

          <span className="text-base font-light leading-[1.2em] -tracking-[.02em] text-[#1a1a1a]">
            {plan.name}
          </span>
        </div>

        <p>
          <span className="text-[35px] font-medium -tracking-[.02em] text-[#1a1a1a]">
            {isAnnual ? plan.annualPrice : plan.monthlyPrice}
          </span>

          {plan.monthlyPrice !== "Custom" && (
            <span className="text-base font-light -tracking-[.02em] text-[#1a1a1a]/70">
              /month
            </span>
          )}
        </p>

        <p className="text-base font-light leading-[1.2em] -tracking-[.02em] text-[#1a1a1a]/70">
          {plan.description}
        </p>
      </div>

      {plan.checkout === "enterprise" ? (
        isCurrent ? (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-black/10 bg-black/[0.06] py-2.5 px-[15px] text-[15px] font-normal text-[#1a1a1a]/50"
          >
            Current Plan
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnterprise}
            className="w-full cursor-pointer rounded-lg border border-black/10 bg-[#bd28b3ba] py-2.5 px-[15px]"
          >
            <div className="flex items-center justify-center gap-[5px]">
              <p className="text-[15px] font-normal leading-[1.2em] text-white">{plan.buttonText}</p>
              <Image src="/assets/icons/arrow-top.svg" alt="" width={16} height={16} className="h-4 w-4" />
            </div>
          </button>
        )
      ) : isCurrent ? (
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-lg border border-black/10 bg-black/[0.06] py-2.5 px-[15px] text-[15px] font-normal text-[#1a1a1a]/50"
        >
          Current Plan
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onCheckout(plan)}
          disabled={isLoading}
          className="w-full cursor-pointer rounded-lg border border-black/10 bg-[#bd28b3ba] py-2.5 px-[15px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center justify-center gap-[5px]">
            <p className="text-[15px] font-normal leading-[1.2em] text-white">
              {isLoading ? "Redirecting…" : ctaLabel}
            </p>
            {!isLoading && (
              <Image src="/assets/icons/arrow-top.svg" alt="" width={16} height={16} className="h-4 w-4" />
            )}
          </div>
        </button>
      )}

      <ul className="space-y-2.5">
        {plan.features.map((feature, fIndex) => (
          <li key={fIndex} className="flex items-center gap-2.5">
            <div className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-lg bg-black/[0.06]">
              <Image
                src="/assets/icons/tikmark.svg"
                alt=""
                width={15}
                height={15}
                className="h-[15px] w-[15px] object-contain brightness-0 opacity-70"
              />
            </div>

            <span className="text-base font-light leading-[1.2em] -tracking-[.02em] text-[#1a1a1a]/90">
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PricingCards({ checkoutCancelPath }: PricingCardsProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const checkoutInFlightRef = useRef(false);

  const { subscriptionTier, subscriptionStatus } = useAuth();
  const hasCancelledPlan = subscriptionStatus === "cancelled";

  const currentPlanKey = useMemo(() => {
    if (!subscriptionTier || subscriptionTier === "free") return null;
    if (subscriptionTier === "personal") return "personal" as const;
    if (subscriptionTier === "pro" || subscriptionTier === "professional") return "professional" as const;
    if (subscriptionTier === "enterprise" || subscriptionTier === "enterprises") return "enterprises" as const;
    return null;
  }, [subscriptionTier]);

  const handleCheckout = async (plan: Plan) => {
    const planIdMap: Record<string, { monthly: string; yearly: string }> = {
      Personal: {
        monthly: "personal-monthly",
        yearly: "personal-yearly",
      },
      Professional: {
        monthly: "pro-monthly",
        yearly: "pro-yearly",
      },
    };

    const planConfig = planIdMap[plan.name];
    if (!planConfig) return;

    const planId = isAnnual ? planConfig.yearly : planConfig.monthly;

    if (checkoutInFlightRef.current) return;
    checkoutInFlightRef.current = true;
    setLoadingPlan(plan.name);

    const isProfessionalPlan = plan.name === "Professional";
    const shouldApplyTrial =
      isProfessionalPlan && currentPlanKey === null && !hasCancelledPlan;

    try {
      const body: Record<string, unknown> = {
        plan: planId,
        skipTrial: !shouldApplyTrial,
        trialDays: shouldApplyTrial ? 7 : undefined,
      };
      if (checkoutCancelPath) {
        body.cancelUrl = checkoutCancelPath;
      }

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          (payload as { error?: string }).error ?? "Unable to start checkout. Please try again.",
        );
      }

      const payload = (await response.json()) as { url?: string };
      if (!payload.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      window.location.href = payload.url;
    } catch (e: unknown) {
      console.error("Failed to start checkout:", e);
      checkoutInFlightRef.current = false;
      setLoadingPlan(null);
      const message =
        e instanceof Error ? e.message : "We could not start the checkout flow. Please try again.";
      window.alert(message);
    }
  };

  const handleEnterprise = () => {
    window.open(ENTERPRISE_CAL_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="mb-8 mt-8 flex justify-center">
        <div className={`flex items-center gap-2.5 rounded-lg p-[5px] ${glassPanel}`}>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className={`cursor-pointer rounded-lg px-2.5 py-2 text-base leading-[1.4em] font-normal -tracking-[.02em] ${
              isAnnual ? "bg-[#bd28b3ba] text-white" : "text-[#1a1a1a]/75"
            }`}
          >
            Annually
          </button>

          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className={`cursor-pointer rounded-lg px-2.5 py-2 text-base leading-[1.4em] font-normal -tracking-[.02em] ${
              !isAnnual ? "bg-[#bd28b3ba] text-white" : "text-[#1a1a1a]/75"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-[30px] md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PricingPlanCard
            key={plan.name}
            plan={plan}
            isAnnual={isAnnual}
            currentPlanKey={currentPlanKey}
            hasCancelledPlan={hasCancelledPlan}
            loadingPlan={loadingPlan}
            onCheckout={handleCheckout}
            onEnterprise={handleEnterprise}
          />
        ))}
      </div>
    </>
  );
}
