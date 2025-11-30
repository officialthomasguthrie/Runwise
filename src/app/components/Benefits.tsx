"use client"

import React from "react";
import { motion, Variants } from "framer-motion";

export const Benefits: React.FC = () => {
  const BENEFITS = [
    {
      title: "Cost reduction",
      description:
        "Optimize business processes and streamline operations to significantly minimize costs and maximize overall efficiency.",
      icon: "/assets/icons/cost-reduction.svg",
    },
    {
      title: "Improved outcomes",
      description:
        "Leverage powerful data-driven insights and innovative strategies to enhance performance and achieve superior results.",
      icon: "/assets/icons/tikmark.svg",
    },
    {
      title: "Increased productivity",
      description:
        "Enhance team output by automating repetitive tasks, refining workflows, and accelerating overall business functions.",
      icon: "/assets/icons/cost-up.svg",
    },
  ];

  const headingVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 80 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <section
      id="benefits"
      className="px-6 md:px-10 pt-[110px] flex flex-col gap-y-[60px] items-center"
    >
      {/* Section Header */}
      <motion.div 
        className="text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={headingVariants}
      >
        <div className="border border-[#ffffff1a] bg-[#0d0d0d] text-[#ffffffB3] h-[32.8px] w-fit mx-auto rounded-lg flex items-center px-4 text-sm font-light" style={{ borderRadius: '8px' }}>
          Benefits
        </div>

        <h3 className="text-[28px] md:text-[50px] font-medium leading-[1.2em] tracking-tight mt-[25px]">
          Maximize efficiency and impact
        </h3>

        <p className="text-base md:text-lg text-[#ffffffcc] leading-[1.4em] font-normal mt-2.5">
          Discover the key benefits of partnering with us.
        </p>
      </motion.div>

      {/* Benefit Cards */}
      <div className="max-w-[1200px] w-full grid grid-cols-1 md:grid-cols-3 gap-[30px]">
        {/* Cost reduction */}
        <motion.div
          className="border border-[#ffffff1a] bg-[#ffffff0f] rounded-[16px] px-7 py-8 md:px-8 md:py-9 relative overflow-hidden flex flex-col gap-5 h-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
          transition={{ delay: 0.2 }}
        >
          {/* Background Glow */}
          <div className="absolute w-[100px] h-[100px] -top-[12px] -right-[12px] bg-[#de2feb80] blur-[50px] rounded-full"></div>

          {/* Icon */}
          <div className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-white/20 relative z-10 border border-[#ffffff1a]">
            <img
              src={BENEFITS[0].icon}
              alt={BENEFITS[0].title}
              loading="lazy"
              className="w-5 h-5"
            />
          </div>

          {/* Title & Description */}
          <div className="flex flex-col gap-2.5 relative z-10 min-w-0">
            <h4 className="text-[22px] font-normal leading-[1.2em] tracking-tight break-words">
              {BENEFITS[0].title}
            </h4>

            <p className="text-base font-normal text-[#ffffffb3] leading-[1.4em] break-words">
              {BENEFITS[0].description}
            </p>
          </div>
        </motion.div>

        {/* Improved outcomes */}
        <motion.div
          className="border border-[#ffffff1a] bg-[#ffffff0f] rounded-[16px] px-7 py-8 md:px-8 md:py-9 relative overflow-hidden flex flex-col gap-5 h-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
          transition={{ delay: 0.8 }}
        >
          {/* Background Glow */}
          <div className="absolute w-[100px] h-[100px] -top-[12px] -right-[12px] bg-[#de2feb80] blur-[50px] rounded-full"></div>

          {/* Icon */}
          <div className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-white/20 relative z-10 border border-[#ffffff1a]">
            <img
              src={BENEFITS[1].icon}
              alt={BENEFITS[1].title}
              loading="lazy"
              className="w-5 h-5"
            />
          </div>

          {/* Title & Description */}
          <div className="flex flex-col gap-2.5 relative z-10 min-w-0">
            <h4 className="text-[22px] font-normal leading-[1.2em] tracking-tight break-words">
              {BENEFITS[1].title}
            </h4>

            <p className="text-base font-normal text-[#ffffffb3] leading-[1.4em] break-words">
              {BENEFITS[1].description}
            </p>
          </div>
        </motion.div>

        {/* Increased productivity */}
        <motion.div
          className="border border-[#ffffff1a] bg-[#ffffff0f] rounded-[16px] px-7 py-8 md:px-8 md:py-9 relative overflow-hidden flex flex-col gap-5 h-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={cardVariants}
          transition={{ delay: 0.8 }}
        >
          {/* Background Glow */}
          <div className="absolute w-[100px] h-[100px] -top-[12px] -right-[12px] bg-[#de2feb80] blur-[50px] rounded-full"></div>

          {/* Icon */}
          <div className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-white/20 relative z-10 border border-[#ffffff1a]">
            <img
              src={BENEFITS[2].icon}
              alt={BENEFITS[2].title}
              loading="lazy"
              className="w-5 h-5"
            />
          </div>

          {/* Title & Description */}
          <div className="flex flex-col gap-2.5 relative z-10 min-w-0">
            <h4 className="text-[22px] font-normal leading-[1.2em] tracking-tight break-words">
              {BENEFITS[2].title}
            </h4>

            <p className="text-base font-normal text-[#ffffffb3] leading-[1.4em] break-words">
              {BENEFITS[2].description}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};