"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Workflow,
  Rocket,
  Plug,
  Layout,
  BarChart3,
  Settings,
  MessageCircle,
  HelpCircle,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";

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
      <Avatar className="h-8 w-8 border border-border">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="User avatar" /> : null}
        <AvatarFallback className="text-xs">
          {getInitials(user)}
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
    <aside
      className={cn(
        "relative h-full border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 flex flex-col w-16",
        className
      )}
    >
      <div className="flex items-center justify-center px-2 py-4">
        <img
          src="/logo.png"
          alt="Runwise Logo"
          className="h-8 w-auto object-contain"
        />
      </div>
      <nav className="flex-1 px-2 pb-4 mt-2">
        <ul className="flex flex-col items-center gap-3">
          {mainItems.map(({ href, icon: Icon, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:text-foreground",
                  pathname === href ? "border-border text-foreground" : ""
                )}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Link>
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
              <Link
                href={href}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:text-foreground",
                  pathname === href ? "border-border text-foreground" : ""
                )}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="px-2 pb-4">
        <UserProfileAvatar user={user} />
      </div>
    </aside>
  );
}

