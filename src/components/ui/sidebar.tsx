"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Layout,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  UserCircle,
  Workflow,
  Zap,
  BarChart3,
  ChevronDown,
  Sun,
  Moon,
  History,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Constants for better maintainability
const SIDEBAR_CONSTANTS = {
  HEADER_HEIGHT: '5rem', // 80px
  TOTAL_MARGIN: '12rem', // 192px total margin
  PROFILE_HEIGHT: '60px',
  AVATAR_SIZE: 'size-6',
} as const;

const sidebarVariants = {
  open: {
    width: "15rem",
  },
  closed: {
    width: "3.05rem",
  },
};

const contentVariants = {
  open: { display: "block", opacity: 1 },
  closed: { display: "block", opacity: 1 },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      x: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      x: { stiffness: 100 },
    },
  },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.2,
  staggerChildren: 0.1,
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

export function DashboardSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name.charAt(0)}${user.user_metadata.last_name.charAt(0)}`.toUpperCase();
    }
    
    if (user?.email) {
      const emailParts = user.email.split('@')[0];
      return emailParts.length >= 2 
        ? emailParts.substring(0, 2).toUpperCase()
        : `${emailParts.charAt(0)}${emailParts.charAt(0)}`.toUpperCase();
    }
    
    return "U";
  };

  const getUserName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.email?.split('@')[0] || "User";
  };

  return (
    <motion.div
      className={cn(
        "sidebar fixed left-0 z-40 h-[calc(100vh-12rem)] shrink-0 top-20",
      )}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <motion.div
        className={`relative z-40 flex text-muted-foreground h-full shrink-0 flex-col bg-background dark:bg-background transition-all rounded-lg shadow-lg`}
        variants={contentVariants}
      >
        <motion.ul variants={staggerVariants} className="flex h-full flex-col">
          <div className="flex grow flex-col items-center">
            <div className={`flex h-[${SIDEBAR_CONSTANTS.PROFILE_HEIGHT}] w-full shrink-0 p-2`}>
              <div className="mt-[1.5px] flex w-full justify-start">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="w-full" asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex w-full items-center justify-start gap-2 px-2 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 rounded-md transition" 
                    >
                      <Avatar className={`rounded ${SIDEBAR_CONSTANTS.AVATAR_SIZE}`}>
                        {user?.user_metadata?.avatar_url ? (
                          <AvatarImage 
                            src={user.user_metadata.avatar_url} 
                            alt="User avatar" 
                            key={user.user_metadata.avatar_url}
                          />
                        ) : null}
                        <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <motion.li
                        variants={variants}
                        className="flex w-fit items-center gap-2"
                      >
                        {!isCollapsed && (
                          <>
                            <p className="text-sm font-medium">
                              {getUserName()}
                            </p>
                            <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                          </>
                        )}
                      </motion.li>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <div className="flex flex-row items-center gap-3 p-3">
                      <Avatar className="size-10">
                        {user?.user_metadata?.avatar_url ? (
                          <AvatarImage 
                            src={user.user_metadata.avatar_url} 
                            alt="User avatar" 
                            key={user.user_metadata.avatar_url}
                          />
                        ) : null}
                        <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium text-foreground">
                          {getUserName()}
                        </span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {user?.email || "user@example.com"}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                      onSelect={(e) => {
                        e.preventDefault();
                        router.push('/settings/profile');
                      }}
                    >
                      <UserCircle className="h-4 w-4" /> 
                      <span>Profile Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                      onSelect={(e) => {
                        e.preventDefault();
                        router.push('/settings/account');
                      }}
                    >
                      <Settings className="h-4 w-4" /> 
                      <span>Account Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                      onSelect={(e) => {
                        e.preventDefault();
                        router.push('/settings/billing');
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span>Billing & Plans</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onSelect={(e) => {
                        e.preventDefault();
                        handleSignOut();
                      }}
                    >
                      <LogOut className="h-4 w-4" /> 
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex h-full w-full flex-col">
              <div className="flex grow flex-col gap-4">
                <ScrollArea className="h-16 grow p-2">
                  <div className={cn("flex w-full flex-col gap-1")}>
                    <Link
                      href="/dashboard"
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition",
                        !pathname?.includes("dashboard") && "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-primary",
                        pathname?.includes("dashboard") &&
                          "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                      )}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-medium">Dashboard</p>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/workflows"
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition",
                        !pathname?.includes("workflows") && "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-primary",
                        pathname?.includes("workflows") &&
                          "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                      )}
                    >
                      <Workflow className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <div className="flex items-center gap-2">
                            <p className="ml-2 text-sm font-medium">Workflows</p>
                            <Badge
                              className={cn(
                                "flex h-fit w-fit items-center gap-1.5 rounded border-none bg-gradient-to-r from-purple-500 to-pink-500 px-1.5 text-white",
                              )}
                              variant="outline"
                            >
                              NEW
                            </Badge>
                          </div>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/runs"
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition",
                        !pathname?.includes("runs") && "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-primary",
                        pathname?.includes("runs") &&
                          "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                      )}
                    >
                      <History className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-medium">Recent Runs</p>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/integrations"
                      className={cn(
                        "flex h-8 flex-row items-center rounded-md px-2 py-1.5 transition",
                        !pathname?.includes("integrations") && "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-primary",
                        pathname?.includes("integrations") && "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                      )}
                    >
                      <Zap className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-medium">Integrations</p>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/analytics"
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition",
                        !pathname?.includes("analytics") && "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-primary",
                        pathname?.includes("analytics") &&
                          "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                      )}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-medium">Analytics</p>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/templates"
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition",
                        !pathname?.includes("templates") && "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-primary",
                        pathname?.includes("templates") &&
                          "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                      )}
                    >
                      <Layout className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-medium">Templates</p>
                        )}
                      </motion.li>
                    </Link>
                    <Separator className="w-full" />
                    <Link
                      href="/help"
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition",
                        !pathname?.includes("help") && "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-primary",
                        pathname?.includes("help") &&
                          "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                      )}
                    >
                      <GraduationCap className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-medium">Help Center</p>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/feedback"
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition",
                        !pathname?.includes("feedback") && "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-primary",
                        pathname?.includes("feedback") &&
                          "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                      )}
                    >
                      <MessageSquareText className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-medium">Feedback</p>
                        )}
                      </motion.li>
                    </Link>
                  </div>
                </ScrollArea>
              </div>
               <div className="flex flex-col p-2 pb-4">
                 {/* Minimal Theme Toggle */}
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={toggleTheme}
                   className={cn(
                     "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-primary",
                     "justify-center md:justify-start"
                   )}
                 >
                   {theme === 'dark' ? (
                     <Sun className="h-4 w-4 shrink-0" />
                   ) : (
                     <Moon className="h-4 w-4 shrink-0" />
                   )}
                   <motion.li variants={variants}>
                     {!isCollapsed && (
                       <p className="ml-2 text-sm font-medium">
                         {theme === 'dark' ? 'Light' : 'Dark'}
                       </p>
                     )}
                   </motion.li>
                 </Button>
                
                <Link
                  href="/settings"
                  className={cn(
                    "mt-auto flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition",
                    !pathname?.includes("settings") && "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-primary",
                    pathname?.includes("settings") &&
                      "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <motion.li variants={variants}>
                    {!isCollapsed && (
                      <p className="ml-2 text-sm font-medium">Settings</p>
                    )}
                  </motion.li>
                </Link>
              </div>
            </div>
          </div>
        </motion.ul>
      </motion.div>
    </motion.div>
  );
}
