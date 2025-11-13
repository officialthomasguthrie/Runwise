"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";

export function AuthHeader() {
  const [mounted, setMounted] = React.useState(false);
  const { theme } = useTheme();

  // Fix hydration mismatch by only using theme after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Get the logo source based on theme
  const logoSrc = React.useMemo(() => {
    if (!mounted) return '/runwise-logo-dark.png'; // Default to dark before mount
    return theme === 'light' ? '/runwise-logo-light.png' : '/runwise-logo-dark.png';
  }, [mounted, theme]);

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center">
          <img
            key={`logo-${theme}-${mounted}`}
            src={logoSrc}
            alt="Runwise Logo"
            width={150}
            height={40}
            className="h-9 w-auto bg-transparent"
            style={{ background: 'transparent', backgroundColor: 'transparent' }}
            suppressHydrationWarning
          />
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </header>
  );
}
