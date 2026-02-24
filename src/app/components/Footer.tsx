"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export const Footer: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isLegalPage = pathname === "/terms" || pathname === "/privacy";

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme !== "dark";
  const toggleTheme = () => setTheme(isLight ? "dark" : "light");

  const handleSmoothScroll = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    href: string
  ) => {
    event.preventDefault();
    const targetId = href.replace("#", "");
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    const headerOffset = 80;
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  return (
    <footer className="border-t border-[#ffffff1a] pt-[64px] pb-8 px-10 relative overflow-hidden">
      <div className="max-w-[1200px] w-full mx-auto flex gap-6 md:gap-8 flex-col md:flex-row md:justify-between relative z-30">
        <div className="flex flex-col gap-7.5">
          <div>
            <Link href="/" className="inline-block">
              <img
                src={isLight ? "/runwise-logo-light.png" : "/runwise-logo-dark.png"}
                alt="Runwise"
                className="h-[31px] w-auto object-contain"
              />
            </Link>

            <p className="max-w-[350px] text-[#ffffffb3] text-base leading-[1.2em] -tracking-[.02em] font-light mt-2.5">
              Transform your ideas into automated workflows with AI. No coding required.
            </p>
          </div>

          <ul className="flex items-center gap-2.5 mt-4">
            <li>
              <Link
                href="https://x.com/runwise_ai"
                target="_blank"
                className="bg-transparent rounded-lg w-7.5 h-7.5 flex items-center justify-center"
              >
                <img src="/assets/icons/x.svg" alt="x" className="w-5 h-5" />
              </Link>
            </li>

            <li>
              <Link
                href="https://www.instagram.com/runwise.official/"
                target="_blank"
                className="bg-transparent rounded-lg w-7.5 h-7.5 flex items-center justify-center"
              >
                <img
                  src="/assets/icons/instagram.svg"
                  alt="instagram"
                  className="w-5 h-5"
                />
              </Link>
            </li>

            <li>
              <Link
                href="https://discord.gg/YdAq6TEZv7"
                target="_blank"
                className="bg-transparent rounded-lg w-7.5 h-7.5 flex items-center justify-center"
              >
                <img
                  src="/assets/icons/discord.svg"
                  alt="discord"
                  className="w-5 h-5"
                />
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-8">
          {/* Navigation column - hidden on Terms & Conditions and Privacy pages */}
          {!isLegalPage && (
            <ul className="flex flex-col gap-y-2.5 min-w-[140px]">
              <li className="text-base font-normal -tracking-[.02em] leading-[1.4em] hover:text-white">
                Navigation
              </li>
              <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
                <Link href="#process" onClick={(e) => handleSmoothScroll(e, "#process")}>
                  Process
                </Link>
              </li>

              <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
                <Link href="#possibilities" onClick={(e) => handleSmoothScroll(e, "#possibilities")}>
                  Services
                </Link>
              </li>

              <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
                <Link href="#benefits" onClick={(e) => handleSmoothScroll(e, "#benefits")}>
                  Benefits
                </Link>
              </li>

              <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
                <Link href="#pricing" onClick={(e) => handleSmoothScroll(e, "#pricing")}>
                  Plans
                </Link>
              </li>
            </ul>
          )}

          {/* Pages column */}
          <ul className="flex flex-col gap-y-2.5 min-w-[140px]">
            <li className="text-base font-normal -tracking-[.02em] leading-[1.4em] hover:text-white">
              Pages
            </li>
            <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
              <Link href="/">Home</Link>
            </li>
            <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
              <Link href="/terms">Terms & Conditions</Link>
            </li>
            <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
              <Link href="/privacy">Privacy Policy</Link>
            </li>
            {!user ? (
              <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
                <Link href="/login">Login</Link>
              </li>
            ) : (
              <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
                <Link href="/dashboard">Dashboard</Link>
              </li>
            )}
          </ul>

          {/* Contact column */}
          <ul className="flex flex-col gap-y-2.5 min-w-[180px]">
            <li className="text-base font-normal -tracking-[.02em] leading-[1.4em] hover:text-white">
              Contact
            </li>
            <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
              <a href="mailto:hello@runwiseai.app">Email: hello@runwiseai.app</a>
            </li>
            <li className="text-sm font-normal leading-[1.2em] text-[#ffffffb3] hover:text-white">
              <a href="tel:+640223591512">Phone: +64 022 359 1512</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright + Theme Toggle */}
      <div className="w-full border-t border-[#ffffff1a] mt-6 pt-4 pb-0 relative z-30">
        <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-[#ffffff80] font-light leading-[1.4em] -tracking-[.02em]">
            © {new Date().getFullYear()} Runwise. All rights reserved.
          </p>

          {/* Dark / Light mode toggle */}
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ffffff1a] text-[#ffffff80] hover:text-white transition-colors text-xs"
            >
              {isLight ? (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
