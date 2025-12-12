"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  
  // Always call hooks unconditionally (React rules)
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Header shrink
      setIsScrolled(window.scrollY > 1000);

      // Sections you want to track
      const sections = [
        "hero",
        "process",
        "possibilities",
        "benefits",
        "pricing",
        "contact",
      ];

      const scrollPosition = window.scrollY + 120;
      let found = false;

      // Section detection
      for (const section of sections) {
        const element = document.getElementById(section);
        if (!element) continue;

        const { offsetTop, offsetHeight } = element;

        if (
          scrollPosition >= offsetTop &&
          scrollPosition < offsetTop + offsetHeight
        ) {
          setActiveSection(section);
          found = true;
          break;
        }
      }

      // If above hero → mark hero active
      if (!found && window.scrollY < 200) {
        setActiveSection("hero");
        found = true;
      }

      // -------------- NEW FIX --------------
      // If user scrolls below the last tracked section → remove highlight
      const bottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 50;

      if (bottom) {
        setActiveSection("");
        return;
      }
      // -------------------------------------
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navLinks = [
    { name: "Process", href: "#process" },
    { name: "Possibilities", href: "#possibilities" },
    { name: "Benefits", href: "#benefits" },
    { name: "Pricing", href: "#pricing" },
    { name: "Contact", href: "#contact" },
  ];

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

  const handleLogoClick = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveSection("hero");
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 w-full h-auto overflow-hidden" style={{ borderRadius: '8px' }}>
        <nav
          className={`px-5 md:px-10 py-4 md:py-5 flex relative overflow-hidden items-center transition-all duration-300 bg-black md:bg-transparent border-b md:border-none border-[#ffffff1a] rounded-lg`}
          style={{ borderRadius: '8px' }}
        >
          <div
            className={`w-full mx-auto flex-1 md:py-2.5 md:px-4.5 relative overflow-visible transition-all duration-500 ease-in-out md:border border-[#ffffff1a] rounded-lg bg-black/50 md:backdrop-blur-[10px] ${
              isScrolled ? "max-w-[642px]" : "max-w-[1200px]"
            }`}
            style={{ borderRadius: '8px' }}
          >
            <div className="flex items-center justify-between gap-4">
              {/* Logo  */}
              <Link
                href="/"
                className={`w-[31px] md:w-[110px] h-[31px] transition-all duration-500 ease-in-out ${
                  isScrolled ? "ml-3" : "md:ml-9"
                }`}
                onClick={handleLogoClick}
              >
                <img
                  src="/assets/runwise-logo.avif"
                  alt="runwise logo"
                  loading="lazy"
                  className="h-full w-full object-cover hidden md:block"
                />

                <img
                  src="/assets/mobile-logo.avif"
                  alt="runwise logo"
                  loading="lazy"
                  className="h-full w-full object-cover block md:hidden"
                />
              </Link>

              {/* Nav Links - Desktop */}
              <div className="hidden md:flex items-center justify-center gap-2.5 py-0.5 flex-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`rounded py-[5px] px-2 relative text-sm font-normal leading-[1.2em] transition-all duration-300 ${
                      activeSection === link.href.replace("#", "")
                        ? "bg-[#ffffff1a]"
                        : "hover:bg-[#ffffff1a]"
                    }`}
                    onClick={(event) => handleSmoothScroll(event, link.href)}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              {/* Buttons - Desktop */}
              <div className="hidden md:flex items-center gap-2 mr-2">
                {/* Login Button - Only show if user is not logged in */}
                {isMounted && !loading && !user && (
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      if (router) {
                        router.push("/login");
                      }
                    }}
                    className={`border border-[#ffffff30] bg-transparent text-white rounded-lg cursor-pointer flex items-center justify-center ${
                      isScrolled ? "h-[34px] w-[34px]" : "h-[38px] px-4"
                    }`}
                  >
                    {!isScrolled && (
                      <span className="text-[15px] font-normal leading-[1.2em] whitespace-nowrap">
                        Login
                      </span>
                    )}
                    {isScrolled && (
                      <User className="w-4 h-4" />
                    )}
                  </button>
                )}

                {/* Start Building Button */}
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    if (isMounted && !loading && user && router) {
                      router.push("/dashboard");
                    } else {
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
                    }
                  }}
                  className={`border border-[#ffffff1a] bg-[#bd28b3ba] rounded-lg cursor-pointer flex items-center justify-center ${
                    isScrolled ? "h-[34px] w-[42px]" : "h-[38px] w-[142px]"
                  }`}
                >
                  {!isScrolled && (
                    <div className="flex items-center justify-center gap-[5px]">
                      <p className="text-[15px] font-normal leading-[1.2em] whitespace-nowrap">
                        {isMounted && !loading && user ? "Dashboard" : "Start Building"}
                      </p>
                      <img
                        src="/assets/icons/arrow-top.svg"
                        alt="arrow-top"
                        loading="lazy"
                        className="w-4 h-4"
                      />
                    </div>
                  )}
                  {isScrolled && (
                    <div className="flex items-center justify-center w-full h-full">
                      <img
                        src="/assets/icons/arrow-top.svg"
                        alt="arrow-top"
                        loading="lazy"
                        className="w-4 h-4"
                      />
                    </div>
                  )}
                </button>
              </div>

              {/* Hamburger/Close Menu Button - Mobile */}
              <button
                onClick={toggleMenu}
                className="md:hidden flex items-center justify-center w-6 h-6 cursor-pointer z-50 relative"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                <div className="relative w-5 h-5">
                  {/* Hamburger bars / Close X - same position */}
                  <span
                    className={`absolute top-0 left-1/2 -translate-x-1/2 w-[27px] h-[2px] bg-white transition-all duration-300 ease-in-out ${
                      isMenuOpen
                        ? "rotate-45 top-1/2 -translate-y-1/2"
                        : "top-0"
                    }`}
                  />
                  <span
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[27px] h-[2px] bg-white transition-all duration-300 ease-in-out ${
                      isMenuOpen ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[27px] h-[2px] bg-white transition-all duration-300 ease-in-out ${
                      isMenuOpen
                        ? "-rotate-45 top-1/2 -translate-y-1/2"
                        : "bottom-0"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <div
        className={`fixed left-0 right-0 z-50 bg-black transition-all duration-500 ease-in-out md:hidden ${
          isMenuOpen
            ? "top-[64px] opacity-100 visible translate-y-0"
            : "top-[64px] opacity-0 invisible pointer-events-none -translate-y-full"
        }`}
      >
        <div className="px-5 pt-6 pb-4 min-h-fit flex flex-col">
          <nav className="flex flex-col gap-2 mb-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`rounded py-[5px] px-2 relative text-sm font-normal leading-[1.2em] transition-all duration-300 ${
                  activeSection === link.href.replace("#", "")
                    ? "bg-[#ffffff1a]"
                    : "hover:bg-[#ffffff1a]"
                }`}
                onClick={(event) => {
                  handleSmoothScroll(event, link.href);
                  closeMenu();
                }}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Mobile Buttons */}
          <div className="flex flex-col gap-2">
            {/* Login Button - Only show if user is not logged in */}
            {isMounted && !loading && !user && (
              <button 
                onClick={(event) => {
                  event.preventDefault();
                  if (router) {
                    router.push("/login");
                  }
                  closeMenu();
                }}
                className="w-full border border-[#ffffff30] bg-transparent text-white rounded-lg py-2.5 px-4 cursor-pointer flex items-center justify-center"
              >
                <span className="text-sm font-normal leading-[1.2em]">
                  Login
                </span>
              </button>
            )}
            <button 
              onClick={(event) => {
                event.preventDefault();
                if (isMounted && !loading && user && router) {
                  router.push("/dashboard");
                } else {
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
                }
                closeMenu();
              }}
              className="w-full border border-[#ffffff1a] bg-[#bd28b3ba] rounded-lg py-2.5 px-4 cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="text-sm font-normal leading-[1.2em] text-white">
                {isMounted && !loading && user ? "Dashboard" : "Start Building"}
              </span>
              <img
                src="/assets/icons/arrow-top.svg"
                alt="arrow-top"
                loading="lazy"
                className="w-4 h-4"
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
