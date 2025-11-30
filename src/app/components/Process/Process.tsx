"use client";

import { motion, Variants } from "framer-motion";
import { Prompt } from "./Prompt";
import { Launch } from "./Launch";
import { Test } from "./Test";

export const Process: React.FC = () => {
  const headingVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: "easeOut" },
    },
  };

  const boxVariants: Variants = {
    hiddenLeft: { opacity: 0, x: -60 },
    hiddenBottom: { opacity: 0, y: 60 },
    hiddenRight: { opacity: 0, x: 60 },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <section className="px-6 md:px-10 pt-[80px] space-y-[65px]" id="process">
      {/* Header */}
      <motion.div
        className="text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={headingVariants}
      >
        <div className="border border-[#ffffff1a] bg-[#0d0d0d] text-[#ffffffB3] h-[32.8px] w-fit mx-auto rounded-lg flex items-center px-4 text-sm font-light" style={{ borderRadius: '8px' }}>
          Process
        </div>

        <h3 className="text-[28px] md:text-[50px] font-medium leading-[1.2em] tracking-tight mt-[25px]">
          Your path to excellence
        </h3>

        <p className="text-base md:text-lg text-[#ffffffcc] leading-[1.4em] font-normal mt-2.5">
          A simple, effective approach to deliver excellence.
        </p>
      </motion.div>

      <div className="max-w-[364px] md:max-w-[1200px] w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[30px]">
        <motion.div
          initial="hiddenLeft"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={boxVariants}
          transition={{ delay: 0.2 }}
        >
          <Prompt />
        </motion.div>

        <motion.div
          initial="hiddenBottom"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={boxVariants}
          transition={{ delay: 0.4 }}
        >
          <Test />
        </motion.div>

        <motion.div
          initial="hiddenRight"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={boxVariants}
          transition={{ delay: 0.6 }}
        >
          <Launch />
        </motion.div>
      </div>
    </section>
  );
};
