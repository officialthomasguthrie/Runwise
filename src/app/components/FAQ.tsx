"use client";

import React, { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

type FAQItem = {
  question: string;
  answer: string;
};

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme !== "dark";

  const faqs: FAQItem[] = [
    {
      question: "What is Runwise?",
      answer:
        "Runwise is the world's first fully generative no-code workflow builder designed for non-technical teams. Our software turns natural language prompts into fully functional AI workflows and automations, allowing anyone to bring autonomy to their life in just minutes.",
    },
    {
      question: "How does Runwise work?",
      answer:
        "Runwise uses AI to convert plain English prompts into fully executable AI workflows and automations. Our fine-tuned AI model builds, debugs, and maintains your workflows for seamless integration.",
    },
    {
      question: "Do I need technical experience?",
      answer:
        "No. Runwise is built for non-technical users. You don't need to code — just describe what you want to automate and build it visually.",
    },
    {
      question: "What can I automate?",
      answer:
        "Anything repetitive. Lead capture, emails, CRM updates, AI tasks, notifications, data syncing, onboarding flows, and more.",
    },
    {
      question: "Does Runwise integrate with other tools?",
      answer:
        "Yes. Runwise connects with popular apps and APIs, so you can automate workflows across your existing tools.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <section className="py-20 px-6 md:px-10 overflow-hidden space-y-[65px]">
      {/* Header */}
      <motion.div
        className="text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
      >
        <div className="border border-[#ffffff1a] bg-[#0d0d0d] text-[#ffffffB3] h-[32.8px] w-fit mx-auto rounded-lg flex items-center px-4 text-sm font-light" style={{ borderRadius: '8px' }}>
          FAQs
        </div>

        <h3 className="text-[28px] md:text-[50px] font-medium leading-[1.2em] tracking-tight mt-[25px]">
          We’re here to help
        </h3>

        <p className="text-base md:text-lg text-[#ffffffcc] leading-[1.4em] font-normal mt-2.5">
          FAQs designed to provide the information you need.
        </p>
      </motion.div>

      {/* FAQ List */}
      <motion.div
        className="max-w-[950px] mx-auto flex flex-col gap-3 relative"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={fadeUp}
      >
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-[#ffffff0f] border border-[#ffffff1a] rounded-[20px] overflow-hidden transition-all duration-300 relative z-30"
          >
            {/* Question */}
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-5 py-5 flex items-center justify-between text-left cursor-pointer group"
            >
              <span className="text-white text-base md:text-lg font-normal pr-4 -tracking-[.02em] leading-[1.5em]">
                {faq.question}
              </span>

              <span
                className={`shrink-0 transition-transform duration-300 ease-out ${
                  openIndex === index ? "rotate-180" : "rotate-0"
                }`}
              >
                <img
                  src="/assets/icons/down-arrow.svg"
                  alt="arrow"
                  className="w-[15px] h-[15px]"
                />
              </span>
            </button>

            {/* Answer */}
            <div
              className={`grid transition-all duration-300 ease-out ${
                openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pt-1 pb-5 text-[#ffffffb3] text-base leading-[1.5em]">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Background Blur — hidden in light mode */}
        {!isLight && (
          <div
            className="absolute w-[923px] h-[328px] opacity-60 blur-[50px] z-0 overflow-hidden"
            style={{
              left: "calc(50% - 461.5px)",
              top: "calc(50.1377% - 164px)",
            }}
          >
            <img
              src="/assets/img4.png"
              alt="img"
              className="opacity-50 bg-cover bg-center"
            />
          </div>
        )}
      </motion.div>

      {/* CTA */}
      <div
        className="max-w-[950px] w-full mx-auto py-[65px] flex flex-col justify-center items-center"
        style={isLight ? {} : {
          background: "radial-gradient(21% 42%, rgba(189, 40, 179, 0.35) 0%, rgba(56, 54, 61, 0) 100%)",
        }}
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="flex flex-col justify-center items-center gap-y-7.5 text-center"
        >
          <div>
            <h3 className="text-[28px] md:text-[50px] font-medium leading-[1.2em] -tracking-[.02em] max-w-[564px] mx-auto">
              Your next breakthrough in productivity starts here.
            </h3>

            <p className="text-base md:text-lg text-[#ffffffcc] leading-[1.5em] font-normal -tracking-[.02em] mt-2.5 max-w-[410px] mx-auto">
              Join thousands of teams already using Runwise AI to automate their
              workflows.
            </p>
          </div>

          {/* CTA Button */}
          <button 
            onClick={() => {
              if (!loading && user) {
                router.push("/dashboard");
              } else {
                const pricingSection = document.getElementById("pricing");
                if (pricingSection) {
                  const headerOffset = 80;
                  const elementPosition = pricingSection.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.scrollY - headerOffset;
                  window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                  });
                }
              }
            }}
            className="border border-[#ffffff1a] bg-[#bd28b3ba] max-w-[150.44px] whitespace-nowrap w-full rounded-lg py-2.5 px-[15px] cursor-pointer flex items-center justify-center mt-6"
          >
            <div className="flex items-center justify-center gap-[5px]">
              <p className="text-[15px] font-normal leading-[1.2em]">
                {!loading && user ? "Go to Dashboard" : "Start Free Trial"}
              </p>
              <img src="/assets/icons/arrow-top.svg" className="w-4 h-4" />
            </div>
          </button>
        </motion.div>
      </div>
    </section>
  );
};
