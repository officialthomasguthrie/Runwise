"use client";

import React, { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import Marquee from "react-fast-marquee";
import { motion } from "framer-motion";

export const Hero: React.FC = () => {
  const [isStylesReady, setIsStylesReady] = useState(false);
  const [isClient, setIsClient] = useState(false);

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

  // Dots logic (unchanged)
  const dots = useMemo(() => {
    const dotCount = 50;
    return Array.from({ length: dotCount }, (_, i) => {
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      const direction = Math.floor(Math.random() * 5);

      let moveX = 0;
      let moveY = 0;

      if (direction === 0) moveY = 100 - startY;
      else if (direction === 1) moveY = -startY;
      else if (direction === 2) moveX = 100 - startX;
      else if (direction === 3) moveX = -startX;
      else {
        moveX = (Math.random() > 0.5 ? 100 : 0) - startX;
        moveY = (Math.random() > 0.5 ? 100 : 0) - startY;
      }

      return {
        id: i,
        x: startX,
        y: startY,
        opacity: Math.random() * 0.5 + 0.3,
        moveX,
        moveY,
        duration: Math.random() * 9 + 9,
        delay: Math.random() * 2,
      };
    });
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isClient) return;

    const styleId = "floating-dots-animations";

    const existingStyle = document.getElementById(styleId);
    if (existingStyle) existingStyle.remove();

    const styleElement = document.createElement("style");
    styleElement.id = styleId;
    styleElement.setAttribute("type", "text/css");

    const keyframes = dots
      .map((dot) => {
        const moveXvw = (dot.moveX / 100) * 80;
        const moveYvh = (dot.moveY / 100) * 80;
        return `
          @keyframes float-${dot.id} {
            0% { transform: translate(0, 0); }
            100% { transform: translate(${moveXvw}vw, ${moveYvh}vh); }
          }
        `;
      })
      .join("");

    styleElement.textContent = keyframes;
    document.head.appendChild(styleElement);

    requestAnimationFrame(() => setIsStylesReady(true));

    return () => {
      const element = document.getElementById(styleId);
      if (element) element.remove();
    };
  }, [dots, isClient]);

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
            {/* Start Building BTN */}
            <Link href="/dashboard" className="border border-[#ffffff1a] bg-[#bd28b3ba] max-w-[140.77px] w-full min-h-[38px] py-2.5 rounded-lg start-building-btn px-[15px] cursor-pointer overflow-hidden relative group">
              <div className="h-[18px] relative overflow-hidden flex items-center">
                <div className="flex items-center gap-[5px] absolute inset-0 transition-all duration-500 ease-in-out group-hover:-translate-y-full group-hover:opacity-0">
                  <p className="text-sm">Start Building</p>
                  <img src="/assets/icons/arrow-top.svg" className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-[5px] absolute inset-0 translate-y-full opacity-0 transition-all duration-500 ease-in-out group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="text-sm">Start Building</p>
                  <img
                    src="/assets/icons/arrow-right.svg"
                    className="w-4 h-4"
                  />
                </div>
              </div>
            </Link>

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
              className="border border-[#ffffff1a] max-w-[93.19px] w-full min-h-[38px] py-2.5 rounded-lg start-building-btn px-[15px] cursor-pointer overflow-hidden relative group"
            >
              <div className="h-[18px] relative overflow-hidden flex items-center">
                <div className="flex items-center text-sm absolute inset-0 transition-all duration-500 ease-in-out group-hover:-translate-y-full group-hover:opacity-0">
                  See Plans
                </div>
                <div className="flex items-center text-sm absolute inset-0 translate-y-full opacity-0 transition-all duration-500 ease-in-out group-hover:translate-y-0 group-hover:opacity-100">
                  See Plans
                </div>
              </div>
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
      >
        <img src="/assets/img1.svg" className="w-full h-full" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 0.55, x: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        viewport={{ once: true }}
        className="z-10 w-[1085px] h-[184px] absolute top-[30px] -left-[46px] overflow-hidden blur-[60px]"
      >
        <img src="/assets/img2.svg" className="w-full h-full" />
      </motion.div>

      {/* Floating Dots */}
      {isClient && (
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 bg-black overflow-hidden">
          {dots.map((dot) => (
            <div
              key={dot.id}
              className="absolute rounded-full bg-white/80"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: "3px",
                height: "3px",
                opacity: dot.opacity,
                animation: isStylesReady
                  ? `float-${dot.id} ${dot.duration}s ease-in-out ${dot.delay}s infinite alternate`
                  : "none",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
};
