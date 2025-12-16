"use client";

import React, { useState } from "react";
import { motion, Variants } from "framer-motion";

type Plan = {
  icon: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  description: string;
  buttonText: string;
  features: string[];
  planId?: string; // 'personal' or 'professional'
};

export const Pricing: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planName: string) => {
    // Map plan names to plan IDs
    const planIdMap: Record<string, { monthly: string; yearly: string }> = {
      Personal: {
        monthly: 'personal-monthly',
        yearly: 'personal-yearly',
      },
      Professional: {
        monthly: 'pro-monthly',
        yearly: 'pro-yearly',
      },
    };

    const planConfig = planIdMap[planName];
    if (!planConfig) {
      // Enterprise plan - handle separately if needed
      return;
    }

    const planId = isAnnual ? planConfig.yearly : planConfig.monthly;
    setLoadingPlan(planName);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: planId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error ?? 'Unable to start checkout. Please try again.',
        );
      }

      const payload = await response.json();
      if (!payload.url) {
        throw new Error('Stripe did not return a checkout URL.');
      }

      window.location.href = payload.url as string;
    } catch (error: any) {
      console.error('Failed to start checkout:', error);
      alert(
        error?.message ??
          'We could not start the checkout flow. Please try again.',
      );
      setLoadingPlan(null);
    }
  };

  const plans: Plan[] = [
    {
      icon: "/assets/icons/personal-icon.svg",
      name: "Personal",
      monthlyPrice: "$9.99",
      annualPrice: "$8",
      description:
        "Essential tools and features for starting your journey with ease.",
      buttonText: "Get Started",
      planId: "personal",
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
      description:
        "Advanced capabilities designed to meet growing business needs.",
      buttonText: "Start Free Trial",
      planId: "professional",
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
      description:
        "Comprehensive solutions tailored for large-scale business success.",
      buttonText: "Schedule a call",
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
    },
  ];

  const headingVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const toggleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 80 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <section className="px-6 md:px-10 pt-[110px]" id="pricing">
      {/* Section Header */}
      <motion.div
        className="text-center mb-[60px]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={headingVariants}
      >
        <div className="border border-[#ffffff1a] bg-[#0d0d0d] text-[#ffffffB3] h-[32.8px] w-fit mx-auto rounded-lg flex items-center px-4 text-sm font-light" style={{ borderRadius: '8px' }}>
          Pricing
        </div>

        <h3 className="text-[28px] md:text-[50px] font-medium leading-[1.2em] tracking-tight mt-[25px]">
          Flexible plans for growth
        </h3>

        <p className="text-base md:text-lg text-[#ffffffcc] leading-[1.4em] font-normal mt-2.5">
          Transparent pricing designed to fit your requirements.
        </p>
      </motion.div>

      {/* Toggle */}
      <motion.div
        className="flex justify-center mb-10 md:mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={toggleVariants}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-[#ffffff0f] border border-[#ffffff1a] rounded-[10px] p-[5px] flex items-center gap-2.5">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-2.5 py-2 rounded-lg text-base leading-[1.4em] -tracking-[.02em] font-normal cursor-pointer transition-all duration-300 ${
              !isAnnual ? "bg-[#bd28b3ba] text-white" : "text-white"
            }`}
          >
            Monthly
          </button>

          <button
            onClick={() => setIsAnnual(true)}
            className={`px-2.5 py-2 rounded-lg text-base leading-[1.4em] -tracking-[.02em] font-normal cursor-pointer transition-all duration-300 ${
              isAnnual ? "bg-[#bd28b3ba] text-white" : "text-white"
            }`}
          >
            Annually (20% Off)
          </button>
        </div>
      </motion.div>

      {/* Pricing Cards */}
      <div className="max-w-[1120px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[30px]">
        {/* First Card */}
        <motion.div
          className="border border-[#ffffff1a] rounded-[16px] px-8 py-9 md:px-9 md:py-10 flex flex-col gap-y-9 h-full min-h-[560px]"
          style={{
            background:
              "linear-gradient(149deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.06) 100%)",
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
          transition={{ delay: 0.4 }}
        >
          <div className="space-y-[15px]">
            {/* Plan Header */}
            <div className="flex items-center gap-2.5">
              <div className="w-[28px] h-[28px] bg-[#ffffff14] border border-[#ffffff1a] flex items-center justify-center rounded-[8px]">
                <img
                  src={plans[0].icon}
                  alt="icon"
                  loading="lazy"
                  className="w-[15px] h-[15px] object-contain"
                />
              </div>

              <span className="text-base font-light -tracking-[.02em] leading-[1.2em]">
                {plans[0].name}
              </span>
            </div>

            {/* Price */}
            <p>
              <span className="text-[35px] font-medium -tracking-[.02em]">
                {isAnnual ? plans[0].annualPrice : plans[0].monthlyPrice}
              </span>

              {plans[0].monthlyPrice !== "Custom" && (
                <span className="text-base -tracking-[.02em] font-light">
                  /month
                </span>
              )}
            </p>

            {/* Description */}
            <p className="text-[#ffffffb3] text-base leading-[1.2em] -tracking-[.02em] font-light">
              {plans[0].description}
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => handleCheckout(plans[0].name)}
            disabled={loadingPlan === plans[0].name}
            className="border border-[#ffffff1a] bg-[#bd28b3ba] w-full rounded-lg py-2.5 px-[15px] cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-[5px]">
              <p className="text-[15px] font-normal leading-[1.2em]">
                {loadingPlan === plans[0].name ? "Redirecting…" : plans[0].buttonText}
              </p>
              {loadingPlan !== plans[0].name && (
                <img
                  src="/assets/icons/arrow-top.svg"
                  alt="arrow-top"
                  loading="lazy"
                  className="w-4 h-4"
                />
              )}
            </div>
          </button>

          {/* Features */}
          <ul className="space-y-3 pt-2">
            {plans[0].features.map((feature, fIndex) => (
              <li key={fIndex} className="flex items-center gap-2.5">
                <div className="w-[24px] h-[24px] bg-[#ffffff14] border border-[#ffffff1a] flex items-center justify-center rounded-[8px]">
                  <img
                    src="/assets/icons/tikmark.svg"
                    alt="tikmark"
                    loading="lazy"
                    className="w-[15px] h-[15px] object-contain"
                  />
                </div>

                <span className="text-base leading-[1.2em] -tracking-[.02em] font-light">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Second Card */}
        <motion.div
          className="border border-[#ffffff1a] rounded-[16px] px-8 py-9 md:px-9 md:py-10 flex flex-col gap-y-9 h-full min-h-[560px]"
          style={{
            background:
              "linear-gradient(149deg, rgba(189, 40, 179, 0.15) 0%, rgba(255, 255, 255, 0.06) 29%, rgba(255, 255, 255, 0.06) 74%, rgba(189, 40, 179, 0.15) 100%)",
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
          transition={{ delay: 1.0 }}
        >
          <div className="space-y-[15px]">
            {/* Plan Header */}
            <div className="flex items-center gap-2.5">
              <div className="w-[28px] h-[28px] bg-[#ffffff14] border border-[#ffffff1a] flex items-center justify-center rounded-[8px]">
                <img
                  src={plans[1].icon}
                  alt="icon"
                  loading="lazy"
                  className="w-[15px] h-[15px] object-contain"
                />
              </div>

              <span className="text-base font-light -tracking-[.02em] leading-[1.2em]">
                {plans[1].name}
              </span>
            </div>

            {/* Price */}
            <p>
              <span className="text-[35px] font-medium -tracking-[.02em]">
                {isAnnual ? plans[1].annualPrice : plans[1].monthlyPrice}
              </span>

              {plans[1].monthlyPrice !== "Custom" && (
                <span className="text-base -tracking-[.02em] font-light">
                  /month
                </span>
              )}
            </p>

            {/* Description */}
            <p className="text-[#ffffffb3] text-base leading-[1.2em] -tracking-[.02em] font-light">
              {plans[1].description}
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => handleCheckout(plans[1].name)}
            disabled={loadingPlan === plans[1].name}
            className="border border-[#ffffff1a] bg-[#bd28b3ba] w-full rounded-lg py-2.5 px-[15px] cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-[5px]">
              <p className="text-[15px] font-normal leading-[1.2em]">
                {loadingPlan === plans[1].name ? "Redirecting…" : plans[1].buttonText}
              </p>
              {loadingPlan !== plans[1].name && (
                <img
                  src="/assets/icons/arrow-top.svg"
                  alt="arrow-top"
                  loading="lazy"
                  className="w-4 h-4"
                />
              )}
            </div>
          </button>

          {/* Features */}
          <ul className="space-y-3 pt-2">
            {plans[1].features.map((feature, fIndex) => (
              <li key={fIndex} className="flex items-center gap-2.5">
                <div className="w-[24px] h-[24px] bg-[#ffffff14] border border-[#ffffff1a] flex items-center justify-center rounded-[8px]">
                  <img
                    src="/assets/icons/tikmark.svg"
                    alt="tikmark"
                    loading="lazy"
                    className="w-[15px] h-[15px] object-contain"
                  />
                </div>

                <span className="text-base leading-[1.2em] -tracking-[.02em] font-light">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Third Card */}
        <motion.div
          className="border border-[#ffffff1a] rounded-[30px] px-8 py-9 md:px-9 md:py-10 flex flex-col gap-y-9 h-full min-h-[560px] md:col-span-2 lg:col-span-1"
          style={{
            background:
              "linear-gradient(149deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.06) 100%)",
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
          transition={{ delay: 1.6 }}
        >
          <div className="space-y-[15px]">
            {/* Plan Header */}
            <div className="flex items-center gap-2.5">
              <div className="w-[28px] h-[28px] bg-[#ffffff14] border border-[#ffffff1a] flex items-center justify-center rounded-[8px]">
                <img
                  src={plans[2].icon}
                  alt="icon"
                  loading="lazy"
                  className="w-[15px] h-[15px] object-contain"
                />
              </div>

              <span className="text-base font-light -tracking-[.02em] leading-[1.2em]">
                {plans[2].name}
              </span>
            </div>

            {/* Price */}
            <p>
              <span className="text-[35px] font-medium -tracking-[.02em]">
                {isAnnual ? plans[2].annualPrice : plans[2].monthlyPrice}
              </span>

              {plans[2].monthlyPrice !== "Custom" && (
                <span className="text-base -tracking-[.02em] font-light">
                  /month
                </span>
              )}
            </p>

            {/* Description */}
            <p className="text-[#ffffffb3] text-base leading-[1.2em] -tracking-[.02em] font-light">
              {plans[2].description}
            </p>
          </div>

          {/* CTA Button - Enterprise (opens Cal.com in new tab) */}
          <button 
            onClick={() => window.open('https://cal.com/thomas-guthrie/runwise-enterprise-consultation', '_blank')}
            className="border border-[#ffffff1a] bg-[#bd28b3ba] w-full rounded-lg py-2.5 px-[15px] cursor-pointer flex items-center justify-center"
          >
            <div className="flex items-center justify-center gap-[5px]">
              <p className="text-[15px] font-normal leading-[1.2em]">
                {plans[2].buttonText}
              </p>
              <img
                src="/assets/icons/arrow-top.svg"
                alt="arrow-top"
                loading="lazy"
                className="w-4 h-4"
              />
            </div>
          </button>

          {/* Features */}
          <ul className="space-y-3 pt-2">
            {plans[2].features.map((feature, fIndex) => (
              <li key={fIndex} className="flex items-center gap-2.5">
                <div className="w-[24px] h-[24px] bg-[#ffffff14] border border-[#ffffff1a] flex items-center justify-center rounded-[8px]">
                  <img
                    src="/assets/icons/tikmark.svg"
                    alt="tikmark"
                    loading="lazy"
                    className="w-[15px] h-[15px] object-contain"
                  />
                </div>

                <span className="text-base leading-[1.2em] -tracking-[.02em] font-light">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
};
