"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { User } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";

export function FloatingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 320);

      const sections = ["hero", "about", "features", "use-cases", "pricing"];
      const scrollPosition = window.scrollY + 120;
      let found = false;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (!element) continue;

        const { offsetTop, offsetHeight } = element;
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          setActiveSection(section);
          found = true;
          break;
        }
      }

      if (!found && window.scrollY < 200) {
        setActiveSection("hero");
        found = true;
      }

      const bottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 50;
      if (bottom) {
        setActiveSection("");
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "About", href: "/about" },
    { name: "Features", href: "/features" },
    { name: "Use Cases", href: "/use-cases" },
    { name: "Pricing", href: "/pricing" },
    { name: "Blog", href: "/blog" },
  ];

  const handleSmoothScroll = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    href: string,
  ) => {
    event.preventDefault();
    const targetId = href.replace("#", "");
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    const headerOffset = 80;
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - headerOffset;
    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
  };

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>, href: string) => {
    if (!href.startsWith("#")) {
      return;
    }
    if (
      pathname === "/terms" ||
      pathname === "/privacy" ||
      pathname === "/about" ||
      pathname === "/pricing" ||
      pathname === "/features" ||
      pathname === "/use-cases" ||
      pathname === "/blog"
    ) {
      event.preventDefault();
      router.push(`/#${href.slice(1)}`);
      return;
    }

    handleSmoothScroll(event, href);
  };

  const isNavLinkActive = (href: string) => {
    if (href === "/about") return pathname === "/about";
    if (href === "/pricing") return pathname === "/pricing";
    if (href === "/features")
      return pathname === "/features" || (pathname === "/" && activeSection === "features");
    if (href === "/use-cases") return pathname === "/use-cases";
    if (href === "/blog") return pathname === "/blog" || pathname.startsWith("/blog/");
    if (href.startsWith("#")) return activeSection === href.slice(1);
    return false;
  };

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    event.preventDefault();
    if (
      pathname === "/terms" ||
      pathname === "/privacy" ||
      pathname === "/about" ||
      pathname === "/pricing" ||
      pathname === "/features" ||
      pathname === "/use-cases" ||
      pathname === "/blog"
    ) {
      router.push("/");
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveSection("hero");
  };

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-50 h-auto w-full">
        <nav className="relative flex items-center bg-transparent px-5 py-4 transition-all duration-300 md:px-10 md:py-5">
          <div
            className={`relative mx-auto w-full flex-1 rounded-2xl border border-white/60 bg-white/30 px-3 py-2 shadow-[0_4px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-500 ease-in-out md:py-2.5 ${
              isScrolled ? "max-w-[660px] md:px-5" : "max-w-[1200px] md:px-4"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className={`inline-flex shrink-0 items-center transition-all duration-500 ease-in-out max-md:ml-3 ${
                  isScrolled ? "md:ml-0" : "md:ml-6"
                }`}
                onClick={handleLogoClick}
              >
                <Image
                  src="/runwise-icon.png"
                  alt="Runwise"
                  className="h-[26px] w-[26px] shrink-0 object-contain md:hidden"
                  width={26}
                  height={26}
                />
                <Image
                  src="/runwise-logo-light.png"
                  alt="Runwise"
                  className="hidden h-[31px] w-[110px] max-w-[110px] min-w-[110px] shrink-0 object-contain md:block"
                  width={110}
                  height={31}
                />
              </Link>

              <div className="hidden flex-1 items-center justify-center gap-2.5 py-0.5 md:flex">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`relative rounded px-2 py-[5px] text-sm leading-[1.2em] font-normal text-[#333] ${
                      isNavLinkActive(link.href) ? "text-[#111]" : ""
                    }`}
                    onClick={(event) => handleNavClick(event, link.href)}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              <div className="hidden items-center gap-2 md:flex">
                {!authLoading && !user && (
                  <button
                    className={`flex cursor-pointer items-center justify-center rounded-lg border border-black/15 bg-white/35 leading-none text-[#151515] ${
                      isScrolled ? "h-[34px] w-[34px] p-0" : "h-[38px] px-4"
                    }`}
                    onClick={() => {
                      router.push("/login");
                    }}
                  >
                    {!isScrolled ? (
                      <span className="text-[15px] leading-[1.2em] font-normal whitespace-nowrap">
                        Login
                      </span>
                    ) : (
                      <User className="mx-auto h-4 w-4" />
                    )}
                  </button>
                )}

                {!authLoading && (
                  <button
                    className={`flex cursor-pointer items-center justify-center rounded-lg border border-[#ffffff1a] bg-[#bd28b3ba] ${
                      isScrolled ? "h-[34px] w-[42px]" : "h-[38px] w-[142px]"
                    }`}
                    onClick={() => {
                      if (user) {
                        router.push("/dashboard");
                      } else {
                        window.open("/signup", "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    {!isScrolled ? (
                      <div className="flex items-center justify-center gap-[5px]">
                        <p className="text-[15px] leading-[1.2em] font-normal whitespace-nowrap text-white">
                          {user ? "Dashboard" : "Start Building"}
                        </p>
                        <Image
                          src="/assets/icons/arrow-top.svg"
                          alt="arrow-top"
                          className="h-4 w-4"
                          width={16}
                          height={16}
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Image
                          src="/assets/icons/arrow-top.svg"
                          alt="arrow-top"
                          className="h-4 w-4"
                          width={16}
                          height={16}
                        />
                      </div>
                    )}
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="relative z-50 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center max-md:mr-3 md:hidden"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                <div className="relative h-5 w-5">
                  <span
                    className={`absolute left-1/2 h-[2px] w-[27px] -translate-x-1/2 bg-[#1a1a1a] transition-all duration-300 ease-in-out ${
                      isMenuOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
                    }`}
                  />
                  <span
                    className={`absolute top-1/2 left-1/2 h-[2px] w-[27px] -translate-x-1/2 -translate-y-1/2 bg-[#1a1a1a] transition-all duration-300 ease-in-out ${
                      isMenuOpen ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <span
                    className={`absolute bottom-0 left-1/2 h-[2px] w-[27px] -translate-x-1/2 bg-[#1a1a1a] transition-all duration-300 ease-in-out ${
                      isMenuOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </nav>
      </header>

      <div
        className={`fixed right-0 left-0 z-50 transition-all duration-500 ease-in-out md:hidden ${
          isMenuOpen
            ? "visible top-[64px] translate-y-0 opacity-100"
            : "pointer-events-none invisible top-[64px] -translate-y-full opacity-0"
        }`}
      >
        {/* Inset + liquid glass to match header pill / bento (not flat opaque sheet) */}
        <div className="px-5 pb-4 pt-1">
          <div
            className="rounded-b-[22px] border border-white/60 border-t-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.28)_48%,rgba(245,243,239,0.22)_100%)] shadow-[0_12px_40px_rgba(51,65,120,0.08),inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(0,0,0,0.03)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150"
          >
            <div className="flex min-h-fit flex-col px-4 pt-5 pb-4">
              <nav className="mb-1 flex flex-col gap-0.5">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`relative rounded-xl px-3 py-2.5 text-sm leading-[1.2em] font-normal transition-colors ${
                      isNavLinkActive(link.href)
                        ? "bg-white/45 text-[#111] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-white/50"
                        : "text-[#333] hover:bg-white/35 active:bg-white/45"
                    }`}
                    onClick={(event) => {
                      handleNavClick(event, link.href);
                      setIsMenuOpen(false);
                    }}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>

              <div className="mt-4 flex flex-col gap-2 border-t border-white/45 pt-4">
                {!authLoading && !user && (
                  <button
                    onClick={() => {
                      router.push("/login");
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-white/70 bg-white/40 px-4 py-2.5 text-[#151515] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-black/[0.04] backdrop-blur-md transition-colors hover:bg-white/55 active:bg-white/65"
                  >
                    <span className="text-sm leading-[1.2em] font-normal">Login</span>
                  </button>
                )}
                {!authLoading && (
                  <button
                    onClick={() => {
                      if (user) {
                        router.push("/dashboard");
                      } else {
                        const pricingSection = document.getElementById("pricing");
                        if (pricingSection) {
                          const headerOffset = 80;
                          const elementPosition = pricingSection.getBoundingClientRect().top;
                          const offsetPosition = elementPosition + window.scrollY - headerOffset;
                          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                        }
                      }
                      setIsMenuOpen(false);
                    }}
                    className="relative isolate flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/25 bg-[linear-gradient(165deg,rgba(189,40,179,0.88)_0%,rgba(140,30,132,0.92)_45%,rgba(110,24,108,0.95)_100%)] px-4 py-2.5 shadow-[0_6px_24px_rgba(120,30,110,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-white/20 backdrop-blur-md transition-[filter] hover:brightness-105 active:brightness-95"
                  >
                    <span className="relative z-[1] text-sm leading-[1.2em] font-normal text-white">
                      {user ? "Dashboard" : "Start Building"}
                    </span>
                    <Image
                      src="/assets/icons/arrow-top.svg"
                      alt="arrow-top"
                      className="relative z-[1] h-4 w-4"
                      width={16}
                      height={16}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
