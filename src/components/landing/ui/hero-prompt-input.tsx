"use client";

import { ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "Send a welcome email when a user signs up",
  "Generate and post social media content every Monday",
  "Summarize daily sales data and send to my email",
  "Create Slack notifications for new customer feedback",
  "Automatically backup database files every week",
];

function useTypingPlaceholder() {
  const [text, setText] = useState("");
  const indexRef = useRef(0);
  const charRef = useRef(0);
  const deletingRef = useRef(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = PROMPTS[indexRef.current];

      if (!deletingRef.current) {
        charRef.current++;
        setText(current.slice(0, charRef.current));
        if (charRef.current >= current.length) {
          timeout = setTimeout(() => {
            deletingRef.current = true;
            tick();
          }, 2000);
          return;
        }
        timeout = setTimeout(tick, 40);
      } else {
        charRef.current--;
        setText(current.slice(0, charRef.current));
        if (charRef.current <= 0) {
          deletingRef.current = false;
          indexRef.current = (indexRef.current + 1) % PROMPTS.length;
          timeout = setTimeout(tick, 400);
          return;
        }
        timeout = setTimeout(tick, 25);
      }
    };

    timeout = setTimeout(tick, 600);
    return () => clearTimeout(timeout);
  }, []);

  return text;
}

export function HeroPromptInput({ className }: { className?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const placeholder = useTypingPlaceholder();

  const handleSubmit = () => {
    if (!message.trim()) return;
    router.push("/signup");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = !!message.trim();

  return (
    <div
      className={cn(
        "relative mx-auto w-[92%] max-w-2xl sm:mx-0 sm:w-full",
        className,
      )}
    >
      <div
        className={cn(
          "relative rounded-[20px] border border-white/60 bg-white/40 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300",
          "shadow-[0_8px_40px_rgba(0,0,0,0.07),0_2px_6px_rgba(0,0,0,0.04)]",
          "ring-1 ring-black/[0.05]",
          focused &&
            "border-white/80 shadow-[0_10px_50px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.05)] ring-black/[0.07]",
        )}
      >
        <div className="relative p-3 pb-2.5 sm:p-4 sm:pb-3">
          <div
            className="relative mb-9 sm:mb-10"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, black 72%, transparent 96%)",
              maskImage: "linear-gradient(to bottom, black 72%, transparent 96%)",
            }}
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              rows={1}
              className="h-[68px] w-full resize-none border-0 bg-transparent px-0 py-0 text-[13.5px] leading-relaxed text-[#1a1a1a]/85 outline-none focus:ring-0 focus:outline-none sm:h-14 sm:text-[14.5px]"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            />

            {!message && (
              <div className="pointer-events-none absolute inset-0 flex items-start text-[13.5px] text-[#1a1a1a]/30 sm:text-[14.5px]">
                {placeholder}
              </div>
            )}
          </div>

          <div className="absolute right-4 bottom-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#bd28b3] transition-all duration-200 hover:brightness-110 active:scale-95",
                !canSend && "cursor-default opacity-35",
              )}
            >
              <ArrowUp className="h-[15px] w-[15px] text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
