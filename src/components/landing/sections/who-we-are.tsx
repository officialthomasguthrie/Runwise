"use client";

import React, { useEffect, useRef, useState } from "react";

const words = [
  "Runwise",
  "converts",
  "natural-language",
  "prompts",
  "into",
  "complete,",
  "production-ready",
  "workflows,",
  "allowing",
  "you",
  "to",
  "automate",
  "complex",
  "operations",
  "without",
  "writing",
  "code",
];

export function WhoWeAre() {
  const [visibleWords, setVisibleWords] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            let currentWord = 0;
            const interval = setInterval(() => {
              currentWord++;
              setVisibleWords(currentWord);
              if (currentWord >= words.length + 3) {
                clearInterval(interval);
              }
            }, 80);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px 0px 0px" },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const getWordStyle = (index: number): React.CSSProperties => {
    if (index < visibleWords - 2) {
      return { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" };
    } else if (index === visibleWords - 2) {
      return { opacity: 0.9, filter: "blur(1px)", transform: "translateY(0)" };
    } else if (index === visibleWords - 1) {
      return { opacity: 0.7, filter: "blur(3px)", transform: "translateY(2px)" };
    } else if (index === visibleWords) {
      return { opacity: 0.3, filter: "blur(6px)", transform: "translateY(5px)" };
    } else {
      return { opacity: 0, filter: "blur(8px)", transform: "translateY(10px)" };
    }
  };

  return (
    <section
      id="about"
      ref={sectionRef}
      className="flex flex-col items-center justify-center px-4 pt-[50px] sm:px-6 md:px-10"
    >
      <div className="relative min-w-0 max-w-full overflow-hidden">
        <div className="mx-auto w-full min-w-0 max-w-[800px] px-1 sm:px-2">
          <h3 className="break-words text-center text-[20px] leading-[1.45em] font-medium -tracking-[.02em] sm:text-[28px] md:text-[34px] lg:text-[40px]">
            {words.map((word, index) => (
              <span
                key={index}
                className="mr-[0.3em] inline-block max-w-full break-words transition-all duration-300 ease-out"
                style={getWordStyle(index)}
              >
                {word}
              </span>
            ))}
          </h3>
        </div>
      </div>
    </section>
  );
}
