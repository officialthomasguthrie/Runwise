"use client";

import { BarChart2, LayoutDashboard, Menu, Settings, User, Users, Workflow, X, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileMenuProps {
  children: React.ReactNode;
}

export function MobileMenu({ children }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMenu}
        className="fixed top-4 right-20 z-[60] md:hidden bg-background/80 backdrop-blur-sm border border-border"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div>
            {/* Mobile Sidebar - Collapsed Version */}
            <motion.div
              ref={sidebarRef}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30 
              }}
              className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-16 bg-background border-r border-border z-50 md:hidden overflow-y-auto"
            >
              {/* Collapsed Sidebar Content */}
              <div className="flex flex-col h-full">
                {/* Navigation Icons Only */}
                <div className="flex flex-col items-center py-4 space-y-4">
                  {/* Dashboard Icon */}
                  <Link href="/dashboard" onClick={closeMenu}>
                    <div className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md cursor-pointer",
                      pathname === "/dashboard" 
                        ? "bg-gradient-to-r from-purple-500 to-pink-500" 
                        : "hover:bg-muted"
                    )}>
                      <LayoutDashboard className={cn(
                                                                  "w-4 h-4",
                                                                  pathname === "/dashboard" ? "text-white" : "text-muted-foreground"
                                                                )} />
                    </div>
                  </Link>
                  
                  {/* Workflows Icon */}
                  <Link href="/workflows" onClick={closeMenu}>
                    <div className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted cursor-pointer">
                      <Workflow className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                  
                  {/* Integrations Icon */}
                  <Link href="/integrations" onClick={closeMenu}>
                    <div className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted cursor-pointer">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                  
                  {/* Teams Icon */}
                  <Link href="/teams" onClick={closeMenu}>
                    <div className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted cursor-pointer">
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                  
                  {/* Analytics Icon */}
                  <Link href="/analytics" onClick={closeMenu}>
                    <div className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted cursor-pointer">
                      <BarChart2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                </div>
                
                {/* Bottom Section */}
                <div className="mt-auto flex flex-col items-center py-4 space-y-4">
                  {/* Settings Icon */}
                  <Link href="/settings" onClick={closeMenu}>
                    <div className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted cursor-pointer">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                  
                  {/* Account Icon */}
                  <Link href="/settings/profile" onClick={closeMenu}>
                    <div className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted cursor-pointer">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
