"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Workflow,
  Bot,
  Rocket,
  Plug,
  Layout,
  BarChart3,
  Settings,
  MessageCircle,
  HelpCircle,
  Sun,
  Moon,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipArrow,
} from "@/components/ui/tooltip";

function getInitials(user: any) {
  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim();
  if (fullName) {
    const parts = fullName.split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (
      (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
    ).toUpperCase();
  }
  const email = (user?.email as string | undefined) ?? "";
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "RW";
}

function UserProfileAvatar({ user }: { user: any }) {
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? undefined;
  return (
    <Link href="/settings" className="flex items-center justify-center" aria-label="Profile">
      <Avatar className="h-8 w-8 border border-stone-200 dark:border-white/10">
        {avatarUrl ? (
          <AvatarImage 
            src={avatarUrl} 
            alt="User avatar" 
            key={avatarUrl}
          />
        ) : null}
        <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    </Link>
  );
}

interface CollapsibleSidebarProps {
  className?: string;
}

export function CollapsibleSidebar({ className }: CollapsibleSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const mainItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/workflows", icon: Workflow, label: "Workflows" },
    { href: "/agents", icon: Bot, label: "Agents", badge: "NEW" },
    { href: "/runs", icon: Rocket, label: "Runs" },
    { href: "/integrations", icon: Plug, label: "Integrations" },
    { href: "/templates", icon: Layout, label: "Templates" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
  ];

  const utilityItems = [
    { href: "/settings", icon: Settings, label: "Settings" },
    { href: "/feedback", icon: MessageCircle, label: "Feedback" },
    { href: "/help", icon: HelpCircle, label: "Help" },
  ];

  return (
    <TooltipProvider delayDuration={0}>
    <aside
      className={cn(
        "relative h-full border-r border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-stone-50 dark:supports-[backdrop-filter]:bg-background/75 hidden md:flex flex-col w-16 z-40",
        className
      )}
    >
      <div className="flex items-center justify-center px-2 py-4">
        <Link href="/" className="flex items-center justify-center">
        <img
          src="/logo.png"
          alt="Runwise Logo"
          className="h-8 w-auto object-contain"
        />
        </Link>
      </div>
      <nav className="flex-1 px-2 pb-4 mt-2">
        <ul className="flex flex-col items-center gap-3">
          {mainItems.map(({ href, icon: Icon, label, badge }) => (
            <li key={href}>
                <Tooltip>
                  <TooltipTrigger asChild>
              <Link
                href={href}
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:text-foreground",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "border-stone-200 dark:border-white/10 text-foreground"
                    : ""
                )}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
                {badge && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-pink-500 ring-2 ring-background" />
                )}
              </Link>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right"
                    sideOffset={4}
                    className="bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl border border-stone-200/50 dark:border-white/20 text-foreground shadow-[0_15px_30px_-12px_rgba(0,0,0,0.1),0_5px_15px_-8px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3),0_4px_6px_-4px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.05)]"
                  >
                    <TooltipArrow className="fill-stone-100 dark:fill-zinc-900/90" width={8} height={4} />
                    <p className="flex items-center gap-2">
                      {label}
                      {badge && (
                        <span className="text-[10px] font-semibold tracking-wide text-pink-400 bg-pink-400/10 border border-pink-400/20 rounded px-1 py-0.5 leading-none">
                          {badge}
                        </span>
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
            </li>
          ))}
        </ul>
      </nav>
      <nav className="px-2 pb-3">
        <div className="flex items-center justify-center pb-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:text-foreground"
          >
            {mounted ? (
              theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
        <ul className="flex flex-col items-center gap-2">
          {utilityItems.map(({ href, icon: Icon, label }) => (
            <li key={href}>
                <Tooltip>
                  <TooltipTrigger asChild>
              <Link
                href={href}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:text-foreground",
                  pathname === href ? "border-stone-200 dark:border-white/10 text-foreground" : ""
                )}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Link>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right"
                    sideOffset={4}
                    className="bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl border border-stone-200/50 dark:border-white/20 text-foreground shadow-[0_15px_30px_-12px_rgba(0,0,0,0.1),0_5px_15px_-8px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3),0_4px_6px_-4px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.05)]"
                  >
                    <TooltipArrow className="fill-stone-100 dark:fill-zinc-900/90" width={8} height={4} />
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
            </li>
          ))}
        </ul>
      </nav>
      <div className="px-2 pb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
        <UserProfileAvatar user={user} />
              </div>
            </TooltipTrigger>
            <TooltipContent 
              side="right"
              sideOffset={8}
              className="bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl border border-stone-200/50 dark:border-white/20 text-foreground shadow-[0_15px_30px_-12px_rgba(0,0,0,0.1),0_5px_15px_-8px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3),0_4px_6px_-4px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.05)]"
            >
              <TooltipArrow className="fill-stone-100 dark:fill-zinc-900/90" width={8} height={4} />
              <p>Profile</p>
            </TooltipContent>
          </Tooltip>
      </div>
    </aside>
    </TooltipProvider>
  );
}

