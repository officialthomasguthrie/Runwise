"use client";

import React, { useEffect, useRef, useState } from "react";

export const WhoWeAre: React.FC = () => {
  const [visibleWords, setVisibleWords] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

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
      { threshold: 0.2, rootMargin: "0px 0px -40% 0px" }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated, words.length]);

  const getWordStyle = (index: number) => {
    if (index < visibleWords - 2) {
      return {
        opacity: 1,
        filter: "blur(0px)",
        transform: "translateY(0)",
      };
    } else if (index === visibleWords - 2) {
      return {
        opacity: 0.9,
        filter: "blur(1px)",
        transform: "translateY(0)",
      };
    } else if (index === visibleWords - 1) {
      return {
        opacity: 0.7,
        filter: "blur(3px)",
        transform: "translateY(2px)",
      };
    } else if (index === visibleWords) {
      return {
        opacity: 0.3,
        filter: "blur(6px)",
        transform: "translateY(5px)",
      };
    } else {
      return {
        opacity: 0,
        filter: "blur(8px)",
        transform: "translateY(10px)",
      };
    }
  };

  return (
    <section
      ref={sectionRef}
      className="pt-[50px] px-10 flex flex-col gap-y-[25px] items-center justify-center"
    >
      <div
        className="relative overflow-hidden"
        style={{}}
      >
        <div className="max-w-[800px] w-full mx-auto">
          <h3 className="text-center text-[40px] -tracking-[.02em] leading-[1.4em] font-medium">
            {words.map((word, index) => (
              <span
                key={index}
                className="inline-block mr-[0.3em] transition-all duration-300 ease-out"
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
};
