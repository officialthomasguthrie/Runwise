"use client";

import { motion, Variants } from "framer-motion";
import { AIChatbots } from "./AIChatbots";
import { ContentCreation } from "./ContentCreation";
import { LeadGeneration } from "./LeadGeneration";
import { DataInsights } from "./DataInsights";
import { AIConsulting } from "./AIConsulting";

export const Posibilities: React.FC = () => {
  const headingVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const boxVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: "easeOut" },
    },
  };

  return (
    <section className="px-6 md:px-10 pt-[110px]" id="possibilities">
      {/* Header */}
      <motion.div
        className="text-center mb-[65px]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={headingVariants}
      >
        <div className="border border-[#ffffff1a] bg-[#0d0d0d] text-[#ffffffB3] h-[32.8px] w-fit mx-auto rounded-lg flex items-center px-4 text-sm font-light" style={{ borderRadius: '8px' }}>
          Possibilities
        </div>

        <h3 className="text-[28px] md:text-[50px] font-medium leading-[1.2em] tracking-tight mt-[25px]">
          Endless Possibilities
        </h3>

        <p className="text-base md:text-lg text-[#ffffffcc] leading-[1.4em] font-normal mt-2.5">
          One platform to automate content, operations, and growth.
        </p>
      </motion.div>

      {/* Top 3 boxes */}
      <div className="max-w-[364px] md:max-w-[1200px] w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[15px]">
        {/* AI Chatbots */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={boxVariants}
          transition={{ delay: 0.1 }}
        >
          <AIChatbots />
        </motion.div>

        {/* Content Creation */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={boxVariants}
          transition={{ delay: 0.2 }}
        >
          <ContentCreation />
        </motion.div>

        {/* Lead Generation */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={boxVariants}
          transition={{ delay: 0.3 }}
        >
          <LeadGeneration />
        </motion.div>
      </div>

      <div className="max-w-[364px] md:max-w-[1200px] w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-[15px] mt-[15px]">
        {/* Data Insights */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={boxVariants}
          transition={{ delay: 0.1 }}
        >
          <DataInsights />
        </motion.div>

        {/* AI Consulting */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={boxVariants}
          transition={{ delay: 0.2 }}
        >
          <AIConsulting />
        </motion.div>
      </div>
    </section>
  );
};
