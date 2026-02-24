"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import Link from "next/link";

export default function DashboardHeader() {
  const [mounted, setMounted] = React.useState(false);
  const { signOut } = useAuth();
  const router = useRouter();
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

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Logo Section */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img
            key={`logo-${theme}-${mounted}`}
            src={logoSrc}
            alt="Runwise Logo"
            width={150}
            height={40}
            className="h-8 md:h-9 w-auto bg-transparent"
            style={{ background: 'transparent', backgroundColor: 'transparent' }}
            suppressHydrationWarning
          />
        </Link>

        {/* Right Section - Logout Button */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <HugeiconsIcon icon={Logout01Icon} className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
