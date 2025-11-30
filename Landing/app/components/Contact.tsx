"use client"
import Link from "next/link";
import { motion, Variants } from "framer-motion";

export const Contact: React.FC = () => {
  const headingVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const contentVariants: Variants = {
    hidden: { opacity: 0, x: -60 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.7, ease: "easeOut" }
    }
  };

  const formVariants: Variants = {
    hidden: { opacity: 0, x: 60 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.7, ease: "easeOut" }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");
  };

  return (
    <section className="px-6 md:px-10 pt-[110px] mb-[100px] overflow-hidden" id="contact">
      {/* Section Header */}
      <motion.div 
        className="text-center mb-[25px]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={headingVariants}
      >
        <div className="border border-[#ffffff1a] bg-[#0d0d0d] text-[#ffffffB3] h-[32.8px] w-fit mx-auto rounded-lg flex items-center px-4 text-sm font-light">
          Contact
        </div>
      </motion.div>

      <div className="max-w-[1200px] w-full mx-auto flex items-center justify-center flex-col md:flex-row gap-[25px] relative">
        {/* Content */}
        <motion.div 
          className="flex-1 w-full text-center md:text-start relative z-30"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={contentVariants}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-[28px] md:text-[50px] font-medium leading-[1.2em] tracking-tight">
            Ask whatever you have in your mind
          </h3>

          <p className="text-base md:text-lg text-[#ffffffcc] leading-[1.4em] font-normal mt-2.5">
            Have any questions? Feel free to flick us a message.
          </p>

          <ul className="mt-[35px] flex flex-col items-center md:items-start gap-y-2.5">
            <li className="flex items-center gap-2.5">
              <img
                src="/assets/icons/email-icon.svg"
                alt="email-icon"
                loading="lazy"
                className="w-[25px] h-[25px] object-contain"
              />

              <span className="text-[#ffffffb3] text-base -tracking-[.02em] leading-[1.2em] font-light hover:text-white">
                <Link href="mailto:mail@test.com" target="_blank">
                  ello@runwiseai.app
                </Link>
              </span>
            </li>

            <li className="flex items-center gap-2.5">
              <img
                src="/assets/icons/phone-icon.svg"
                alt="phone-icon"
                loading="lazy"
                className="w-[25px] h-[25px] object-contain"
              />

              <span className="text-[#ffffffb3] text-base -tracking-[.02em] leading-[1.2em] font-light hover:text-white">
                <Link href="tel:(969) 819-8061" target="_blank">
                  +64 022 359 1512
                </Link>
              </span>
            </li>

            <li className="flex items-center gap-2.5">
              <img
                src="/assets/icons/location-icon.svg"
                alt="location-icon"
                loading="lazy"
                className="w-[25px] h-[25px] object-contain"
              />

              <span className="text-[#ffffffb3] text-base -tracking-[.02em] leading-[1.2em] font-light">
                4 Palliser Place, Napier, Hawke's Bay, New Zealand
              </span>
            </li>
          </ul>
        </motion.div>

        {/* Form */}
        <motion.div 
          className="flex-1 py-2.5 px-2.5 md:px-[25px] w-full relative z-30"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={formVariants}
          transition={{ delay: 0.2 }}
        >
          <div className="px-2.5 w-full flex flex-col gap-y-5" onSubmit={handleSubmit}>
            <label htmlFor="name">
              <p className="text-xs font-light leading-[1.2em] -tracking-[.02em] mb-2.5">
                Name
              </p>

              <input
                type="text"
                placeholder="John Doe"
                name="Name"
                required
                className="bg-[#ffffff0f] border border-[#ffffff1a] h-10 rounded-lg p-3 text-sm font-light placeholder:text-[#ffffffb3] text-white w-full focus:outline-[#09f] outline-1 outline-transparent"
              />
            </label>

            <label htmlFor="email">
              <p className="text-xs font-light leading-[1.2em] -tracking-[.02em] mb-2.5">
                Email
              </p>

              <input
                type="email"
                placeholder="john@runwiseai.app"
                name="Email"
                required
                className="bg-[#ffffff0f] border border-[#ffffff1a] h-10 rounded-lg p-3 text-sm font-light placeholder:text-[#ffffffb3] text-white w-full focus:outline-[#09f] outline-1 outline-transparent"
              />
            </label>

            <label htmlFor="message">
              <p className="text-xs font-light leading-[1.2em] -tracking-[.02em] mb-2.5">
                Message
              </p>

              <textarea
                placeholder="Hi, I am reaching out for..."
                name="Message"
                required
                className="bg-[#ffffff0f] border border-[#ffffff1a] min-h-[100px] rounded-lg p-3 text-sm font-light placeholder:text-[#ffffffb3] text-white w-full focus:outline-[#09f] outline-1 outline-transparent"
              />
            </label>

            {/* CTA Button */}
            <button 
              onClick={handleSubmit}
              className="bg-[#ee00ff82] w-full rounded-lg px-2 h-10 cursor-pointer text-center text-[15px] hover:bg-[#333333d9] transition-all duration-300"
            >
              Submit
            </button>
          </div>
        </motion.div>

        {/* Background Blur shadow  */}
        <div
          className="absolute w-[923px] h-[328px] opacity-60 blur-[50px] z-0 overflow-hidden"
          style={{
            left: "calc(50% - 461.5px)",
            top: "calc(50.1377% - 164px)",
          }}
        >
          <img
            src="/assets/img3.svg"
            alt="img"
            loading="lazy"
            className="opacity-50 bg-cover bg-center"
          />
        </div>
      </div>
    </section>
  );
};