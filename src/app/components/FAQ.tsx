"use client";

import React, { useState } from "react";
import { motion, Variants } from "framer-motion";

type FAQItem = {
  question: string;
  answer: string;
};

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>();

  const faqs: FAQItem[] = [
    {
      question: "What is Runwise?",
      answer:
        "Runwise is an AI-powered automation platform that converts plain-English prompts into workflows—no coding required.",
    },
    {
      question: "How does Runwise work?",
      answer:
        "You describe what you want in natural language, and Runwise generates a workflow using AI.",
    },
    {
      question: "Do I need technical experience?",
      answer:
        "No. Runwise is for everyone—from non-technical founders to developers.",
    },
    {
      question: "What can I automate?",
      answer:
        "Anything from operations, notifications, data processing, agents, integrations, and more.",
    },
    {
      question: "Does Runwise integrate with other tools?",
      answer: "Yes, we support many integrations and offer custom workflows.",
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

        {/* Background Blur */}
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
      </motion.div>

      {/* CTA */}
      <div
        className="max-w-[950px] w-full mx-auto py-[65px] flex flex-col justify-center items-center"
        style={{
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
          <button className="border border-[#ffffff1a] bg-[#bd28b3ba] max-w-[150.44px] whitespace-nowrap w-full rounded-lg py-2.5 px-[15px] cursor-pointer overflow-hidden relative group mt-6">
            <div className="h-[18px] relative overflow-hidden">
              {/* default */}
              <div className="flex items-end gap-[5px] absolute inset-0 transition-all duration-500 ease-in-out group-hover:-translate-y-full group-hover:opacity-0">
                <p className="text-[15px] font-normal leading-[1.2em]">
                  Start Free Trial
                </p>
                <img src="/assets/icons/arrow-top.svg" className="w-4 h-4" />
              </div>

              {/* hover */}
              <div className="flex items-end gap-[5px] absolute inset-0 translate-y-full opacity-0 transition-all duration-500 ease-in-out group-hover:translate-y-0 group-hover:opacity-100">
                <p className="text-[15px] font-normal leading-[1.2em]">
                  Start Free Trial
                </p>
                <img src="/assets/icons/arrow-right.svg" className="w-4 h-4" />
              </div>
            </div>
          </button>
        </motion.div>
      </div>
    </section>
  );
};
