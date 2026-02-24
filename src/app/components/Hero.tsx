"use client";

import React, { useEffect, useState } from "react";
import Marquee from "react-fast-marquee";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { HeroPromptInput } from "@/components/ui/hero-prompt-input";
import TextType from "@/components/ui/text-type";
import { createClient } from "@/lib/supabase-client";

export const Hero: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleHeroSend = async (message: string) => {
    // Store prompt so dashboard can pick it up after redirect
    if (typeof window !== "undefined") {
      localStorage.setItem("heroPrompt", message);
    }

    if (user) {
      // Logged in: create workflow and go directly to workspace
      try {
        const supabase = createClient();
        const { data } = await (supabase as any)
          .from("workflows")
          .insert({
            name: "Untitled Workflow",
            status: "draft",
            user_id: user.id,
            workflow_data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
          })
          .select()
          .single();
        if (data?.id) {
          router.push(`/workspace/${data.id}?prompt=${encodeURIComponent(message)}`);
          return;
        }
      } catch {
        // fallback
      }
      router.push(`/dashboard?prompt=${encodeURIComponent(message)}`);
    } else {
      router.push("/signup");
    }
  };

  const isLight = mounted && theme !== "dark";

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
      className="pt-[130px] px-6 md:px-10 pb-[60px] relative flex flex-col justify-center items-center gap-6 overflow-hidden"
      id="hero"
    >
      {/* Top Content */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="flex flex-col items-center gap-y-[12px] relative z-30"
      >
        <div className="border border-[#ffffff30] backdrop-blur-md bg-[#ffffff08] text-white h-[28px] w-fit rounded-lg flex items-center px-[11px] text-xs font-light text-center leading-[1.2em] shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]" style={{ borderRadius: '8px' }}>
          Introducing Runwise
        </div>

        <div>
          <h1 className="max-w-[800px] mx-auto text-[30px] md:text-[52px] font-medium -tracking-[.02em] leading-[1.1em] text-center">
            Turn natural language prompts into functional automations
          </h1>

          <p className="max-w-[480px] mx-auto text-[#fffc] text-sm md:text-base font-normal leading-[1.5em] text-center mt-[10px]">
            Runwise is the world's first fully generative no-code workflow builder designed for non-technical teams
          </p>

          <div className="w-full max-w-2xl mx-auto mt-4">
            {!loading && (
              <HeroPromptInput
                placeholder={
                  <TextType
                    text={[
                      "Send a welcome email when a user signs up",
                      "Generate and post social media content every Monday",
                      "Summarize daily sales data and send to my email",
                      "Create Slack notifications for new customer feedback",
                      "Automatically backup database files every week",
                    ]}
                    typingSpeed={40}
                    deletingSpeed={25}
                    pauseDuration={2000}
                    loop={true}
                    showCursor={false}
                    cursorCharacter="|"
                  />
                }
                onSend={handleHeroSend}
                className="w-full"
              />
            )}
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
                  className={`h-6 object-contain brightness-0 ${
                    isLight ? "opacity-45" : "invert opacity-90"
                  }`}
                  loading="lazy"
                  alt={brand.name}
                />
                <span 
                  className={`text-sm font-medium whitespace-nowrap ${
                    isLight ? "text-black/45" : "text-white"
                  }`}
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
        whileInView={{ opacity: isLight ? 0.32 : 0.55, x: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        viewport={{ once: true }}
        className={`z-10 w-[1085px] h-[184px] absolute bottom-[30px] -right-[46px] overflow-hidden blur-[60px] ${isLight ? "saturate-[0.85]" : ""}`}
        aria-hidden="true"
      >
        <img src="/assets/img1.svg" className="w-full h-full" alt="" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: isLight ? 0.32 : 0.55, x: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        viewport={{ once: true }}
        className={`z-10 w-[1085px] h-[184px] absolute top-[30px] -left-[46px] overflow-hidden blur-[60px] ${isLight ? "saturate-[0.85]" : ""}`}
        aria-hidden="true"
      >
        <img src="/assets/img2.svg" className="w-full h-full" alt="" />
      </motion.div>

    </section>
  );
};
