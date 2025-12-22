"use client";

import React from "react";
import Marquee from "react-fast-marquee";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

export const Hero: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  type Brand = {
    src: string;
    name: string;
    fontFamily: string;
  };

  const brands: Brand[] = [
    { src: "/assets/brands/notion.svg", name: "Notion", fontFamily: "system-ui, -apple-system, sans-serif" },
    { src: "/assets/brands/slack.svg", name: "Slack", fontFamily: "'Lato', system-ui, sans-serif" },
    { src: "/assets/brands/github.svg", name: "GitHub", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    { src: "/assets/brands/openai.svg", name: "OpenAI", fontFamily: "'Inter', system-ui, sans-serif" },
    { src: "/assets/brands/dropbox.svg", name: "Dropbox", fontFamily: "'Open Sans', system-ui, sans-serif" },
    { src: "/assets/brands/trello.svg", name: "Trello", fontFamily: "system-ui, -apple-system, sans-serif" },
    { src: "/assets/brands/linear.svg", name: "Linear", fontFamily: "'Inter', system-ui, sans-serif" },
    { src: "/assets/brands/hubspot.svg", name: "HubSpot", fontFamily: "'Inter', system-ui, sans-serif" },
  ];


  return (
    <section
      className="pt-[180px] px-6 md:px-10 pb-[100px] relative flex flex-col justify-center items-center gap-9 overflow-hidden"
      id="hero"
    >
      {/* Top Content */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="flex flex-col items-center gap-y-[15px] relative z-30"
      >
        <div className="border border-[#ffffff30] backdrop-blur-md bg-[#ffffff08] text-white h-[32.8px] w-fit rounded-lg flex items-center px-[13px] text-sm font-light text-center leading-[1.2em] shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]" style={{ borderRadius: '8px' }}>
          Introducing Runwise
        </div>

        <div>
          <h1 className="max-w-[900px] mx-auto text-[35px] md:text-[60px] font-medium -tracking-[.02em] leading-[1.1em] text-center">
            Turn natural language prompts into functional automations
          </h1>

          <p className="max-w-[500px] mx-auto text-[#fffc] text-base md:text-lg font-normal leading-[1.5em] text-center mt-[15px]">
            Runwise turns plain English prompts into fully functional AI workflows and automations
          </p>

          <div className="flex items-center justify-center gap-[15px] mt-8">
            {/* Start Building/Dashboard BTN - Only show after loading completes */}
            {!loading && (
              <button 
                onClick={() => {
                  if (user) {
                    router.push("/dashboard");
                  } else if (typeof window !== "undefined") {
                    window.open("/signup", "_blank", "noopener,noreferrer");
                  }
                }}
                className="border border-[#ffffff1a] bg-[#bd28b3ba] max-w-[140.77px] w-full min-h-[38px] py-2.5 rounded-lg px-[15px] cursor-pointer flex items-center justify-center"
              >
                <div className="flex items-center justify-center gap-[5px]">
                  <p className="text-sm">{user ? "Dashboard" : "Start Building"}</p>
                  <img src="/assets/icons/arrow-top.svg" className="w-4 h-4" alt="Arrow icon" />
                </div>
              </button>
            )}

            {/* See Plans BTN */}
            <button 
              onClick={() => {
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
              }}
              className="border border-[#ffffff1a] max-w-[93.19px] w-full min-h-[38px] py-2.5 rounded-lg px-[15px] cursor-pointer flex items-center justify-center"
            >
              <span className="text-sm">See Plans</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Brands Marquee */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        viewport={{ once: true }}
        className="max-w-[500px] w-full mx-auto h-[50px] relative z-30"
      >
        <div className="flex items-center h-full w-full overflow-hidden brand-marquee-fade">
          <Marquee gradient={false} speed={30} autoFill>
            {brands.map((brand, index) => (
              <div key={`${brand.src}-${index}`} className="flex items-center gap-2.5 mr-12">
                <img
                  src={brand.src}
                  className="h-6 object-contain brightness-0 invert opacity-90"
                  loading="lazy"
                  alt={brand.name}
                />
                <span 
                  className="text-white text-sm font-medium whitespace-nowrap"
                  style={{ fontFamily: brand.fontFamily }}
                >
                  {brand.name}
                </span>
              </div>
            ))}
          </Marquee>
        </div>
      </motion.div>

      {/* Right & Left Gradients */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        whileInView={{ opacity: 0.55, x: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        viewport={{ once: true }}
        className="z-10 w-[1085px] h-[184px] absolute bottom-[30px] -right-[46px] overflow-hidden blur-[60px]"
        aria-hidden="true"
      >
        <img src="/assets/img1.svg" className="w-full h-full" alt="" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 0.55, x: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        viewport={{ once: true }}
        className="z-10 w-[1085px] h-[184px] absolute top-[30px] -left-[46px] overflow-hidden blur-[60px]"
        aria-hidden="true"
      >
        <img src="/assets/img2.svg" className="w-full h-full" alt="" />
      </motion.div>

    </section>
  );
};
