"use client";

import Image from "next/image";
import Marquee from "react-fast-marquee";
import { motion } from "framer-motion";

type Brand = {
  src: string;
  name: string;
  fontFamily: string;
};

const brands: Brand[] = [
  {
    src: "/assets/brands/notion.svg",
    name: "Notion",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  {
    src: "/assets/brands/slack.svg",
    name: "Slack",
    fontFamily: "'Lato', system-ui, sans-serif",
  },
  {
    src: "/assets/brands/github.svg",
    name: "GitHub",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  {
    src: "/assets/brands/openai.svg",
    name: "OpenAI",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  {
    src: "/assets/brands/dropbox.svg",
    name: "Dropbox",
    fontFamily: "'Open Sans', system-ui, sans-serif",
  },
  {
    src: "/assets/brands/trello.svg",
    name: "Trello",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  {
    src: "/assets/brands/linear.svg",
    name: "Linear",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  {
    src: "/assets/brands/hubspot.svg",
    name: "HubSpot",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
];

export function IntegrationsMarquee() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      viewport={{ once: true }}
      className="relative z-30 mx-auto h-[40px] w-full max-w-[90vw] sm:h-[50px] sm:max-w-[500px]"
    >
      <div className="brand-marquee-fade flex h-full w-full items-center overflow-hidden">
        <Marquee gradient={false} speed={30} autoFill>
          {brands.map((brand, index) => (
            <div
              key={`${brand.src}-${index}`}
              className="mr-8 flex items-center gap-2 sm:mr-12 sm:gap-2.5"
            >
              <Image
                src={brand.src}
                className="h-5 w-auto object-contain opacity-45 brightness-0 sm:h-6"
                alt={brand.name}
                width={24}
                height={24}
              />
              <span
                className="text-xs font-medium whitespace-nowrap text-black/45 sm:text-sm"
                style={{ fontFamily: brand.fontFamily }}
              >
                {brand.name}
              </span>
            </div>
          ))}
        </Marquee>
      </div>
    </motion.div>
  );
}
