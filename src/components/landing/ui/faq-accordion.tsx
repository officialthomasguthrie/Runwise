"use client";

import Image from "next/image";
import { useState } from "react";

type FAQItem = {
  question: string;
  answer: string;
};

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

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="relative z-10 mt-6 flex w-full max-w-[950px] flex-col gap-3 sm:mt-8">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="relative z-30 overflow-hidden rounded-[20px] border border-white/60 bg-white/35 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300"
        >
          <button
            type="button"
            onClick={() => toggleFAQ(index)}
            className="group flex w-full cursor-pointer items-center justify-between px-5 py-5 text-left"
          >
            <span className="pr-4 text-base leading-[1.5em] font-normal -tracking-[.02em] text-[#1a1a1a] md:text-lg">
              {faq.question}
            </span>

            <span
              className={`shrink-0 transition-transform duration-300 ease-out ${
                openIndex === index ? "rotate-180" : "rotate-0"
              }`}
            >
              <Image
                src="/assets/icons/down-arrow.svg"
                alt=""
                width={15}
                height={15}
                className="h-[15px] w-[15px] brightness-0 opacity-55"
              />
            </span>
          </button>

          <div
            className={`grid transition-all duration-300 ease-out ${
              openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <p className="px-5 pt-1 pb-5 text-base leading-[1.5em] text-[#1a1a1a]/70">
                {faq.answer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
