"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  LayoutDashboard,
  Workflow,
  History,
  Settings,
  Plug,
  MessageSquare,
  HelpCircle,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "Runs", href: "/runs", icon: History },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "Templates", href: "/templates", icon: FileText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Feedback", href: "/feedback", icon: MessageSquare },
  { label: "Help", href: "/help", icon: HelpCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MinimalSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
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

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Check if current path matches a nav item (including workspace pages)
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/workflows") {
      return pathname === "/workflows";
    }
    // For workspace pages, check if pathname starts with /workspace
    if (href.startsWith("/workspace")) {
      return pathname?.startsWith("/workspace");
    }
    return pathname === href;
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full bg-background border-r border-stone-200 dark:border-white/10 transition-all duration-300 z-40 flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-center border-b border-stone-200 dark:border-white/10 px-4">
        {isCollapsed ? (
          <Link href="/" className="flex items-center justify-center">
            <img
              src={logoSrc}
              alt="Runwise Logo"
              className="h-8 w-8 object-contain"
            />
          </Link>
        ) : (
          <Link href="/" className="flex items-center">
            <img
              src={logoSrc}
              alt="Runwise Logo"
              className="h-8 w-auto object-contain"
            />
          </Link>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                  isCollapsed ? "justify-center" : ""
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Toggle Button */}
      <div className="border-t border-stone-200 dark:border-white/10 p-2">
        <button
          onClick={toggleSidebar}
          className={cn(
            "w-full flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors",
            isCollapsed ? "" : "justify-end"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

