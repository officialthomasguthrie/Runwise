"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { LogOut, Search, X, Clock, Menu } from "lucide-react";
import { useCallback, useId, useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface BlankHeaderProps {
  className?: string;
}

interface SearchablePage {
  label: string;
  href: string;
  keywords: string[];
}

const SEARCHABLE_PAGES: SearchablePage[] = [
  { label: 'Dashboard', href: '/dashboard', keywords: ['dashboard', 'home', 'main'] },
  { label: 'Integrations', href: '/integrations', keywords: ['integrations', 'integration', 'connect', 'apps'] },
  { label: 'Templates', href: '/templates', keywords: ['templates', 'template', 'workflow'] },
  { label: 'Analytics', href: '/analytics', keywords: ['analytics', 'stats', 'statistics', 'data'] },
  { label: 'Settings', href: '/settings', keywords: ['settings', 'setting', 'preferences', 'config'] },
  { label: 'Help', href: '/help', keywords: ['help', 'support', 'documentation', 'docs'] },
  { label: 'Workflows', href: '/workflows', keywords: ['workflows', 'workflow', 'automation'] },
];

const SEARCH_HISTORY_KEY = 'runwise_search_history';
const MAX_HISTORY_ITEMS = 10;

export function BlankHeader({ className }: BlankHeaderProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchId = useId();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchablePage[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchablePage[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        try {
          setSearchHistory(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse search history:', e);
        }
      }
    }
  }, []);

  // Toggle mobile menu
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMobileMenuOpen]);

  // Save search history to localStorage
  const saveSearchHistory = useCallback((history: SearchablePage[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    }
  }, []);

  // Filter searchable pages based on query
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase().trim();
    const filtered = SEARCHABLE_PAGES.filter(page => {
      const matchesLabel = page.label.toLowerCase().includes(lowerQuery);
      const matchesKeywords = page.keywords.some(keyword => 
        keyword.toLowerCase().includes(lowerQuery)
      );
      return matchesLabel || matchesKeywords;
    });

    setSearchResults(filtered);
  }, []);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    performSearch(value);
    setShowDropdown(true);
  }, [performSearch]);

  // Handle clicking on a search result
  const handleResultClick = useCallback((page: SearchablePage) => {
    // Add to search history (avoid duplicates, limit to MAX_HISTORY_ITEMS)
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.href !== page.href);
      const updated = [page, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      saveSearchHistory(updated);
      return updated;
    });

    setSearchQuery('');
    setShowDropdown(false);
    router.push(page.href);
  }, [router, saveSearchHistory]);

  // Handle deleting a history item
  const handleDeleteHistory = useCallback((e: React.MouseEvent, page: SearchablePage) => {
    e.stopPropagation();
    setSearchHistory(prev => {
      const updated = prev.filter(item => item.href !== page.href);
      saveSearchHistory(updated);
      return updated;
    });
  }, [saveSearchHistory]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setShowDropdown(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowDropdown(true);
      }
      // Escape to close dropdown
      if (e.key === 'Escape') {
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setSigningOut(false);
    }
  }, [signOut, router, signingOut]);

  // Determine what to show in dropdown
  const showHistory = searchHistory.length > 0 && !searchQuery.trim();
  const showResults = searchQuery.trim() && searchResults.length > 0;
  const showNoResults = searchQuery.trim() && searchResults.length === 0;

  // Mobile menu pages
  const mobileMenuPages = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Workflows', href: '/workflows' },
    { label: 'Runs', href: '/runs' },
    { label: 'Integrations', href: '/integrations' },
    { label: 'Templates', href: '/templates' },
    { label: 'Analytics', href: '/analytics' },
    { label: 'Settings', href: '/settings' },
    { label: 'Help', href: '/help' },
  ];

  return (
    <>
      {/* Mobile Header - visible on mobile only */}
      <div
        className={cn(
          "relative h-16 w-full shrink-0 border-b border-stone-200 dark:border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 md:hidden",
          className
        )}
        ref={mobileMenuRef}
      >
        <div className="flex h-full w-full items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center">
            <img
              src="/logo.png"
              alt="Runwise Logo"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-2">
            {/* Hamburger Menu */}
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center rounded-sm p-2 text-muted-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div
          className={cn(
            "absolute top-16 left-0 right-0 bg-background border-b border-stone-200 dark:border-white/10 overflow-hidden transition-all duration-300 ease-in-out transform",
            isMobileMenuOpen 
              ? "max-h-96 opacity-100 translate-y-0" 
              : "max-h-0 opacity-0 -translate-y-4"
          )}
        >
          <nav className="px-4 py-4">
            <ul className="flex flex-col items-center gap-2">
              {mobileMenuPages.map((page) => (
                <li key={page.href} className="w-full">
                  <Link
                    href={page.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-2 rounded-md text-sm font-medium text-foreground transition-colors"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
              <li className="w-full pt-2 border-t border-stone-200 dark:border-white/10">
                <button
                  onClick={async () => {
                    if (signingOut) return;
                    setSigningOut(true);
                    setIsMobileMenuOpen(false);
                    try {
                      await signOut();
                      router.push("/login");
                    } catch (error) {
                      console.error("Failed to sign out:", error);
                    } finally {
                      setSigningOut(false);
                    }
                  }}
                  disabled={signingOut}
                  className="w-full text-center px-4 py-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Desktop Header - visible on desktop only */}
      <div
        className={cn(
          "relative h-16 w-full shrink-0 border-b border-stone-200 dark:border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 hidden md:flex",
          className
        )}
      >
        <div className="flex h-full w-full items-center px-4">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="w-12" />

            <div className="flex flex-1 justify-center">
            <div className="w-full max-w-2xl space-y-1.5">
              <Label htmlFor={searchId} className="sr-only">
                Search
              </Label>
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    id={searchId}
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={handleInputFocus}
                    className="pl-9 pe-11 focus-visible:ring-0 focus-visible:border-stone-300 dark:focus-visible:border-white/20"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground">
                    <kbd className="inline-flex h-5 max-h-full items-center rounded border border-stone-200 dark:border-white/10 px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
                      ⌘K
                    </kbd>
                  </div>
                </div>

                {/* Search Dropdown */}
                {showDropdown && (showHistory || showResults || showNoResults) && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-[100] rounded-lg border border-stone-200 dark:border-white/10 bg-white dark:bg-black shadow-lg max-h-96 overflow-y-auto">
                    {/* Search Results */}
                    {showResults && (
                      <div className="p-2">
                        {searchResults.map((page) => (
                          <button
                            key={page.href}
                            onClick={() => handleResultClick(page)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors"
                          >
                            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 text-sm text-foreground">{page.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Recent Search History */}
                    {showHistory && (
                      <div className="p-2 border-t border-stone-200 dark:border-white/10">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                          Recent Searches
                        </div>
                        {searchHistory.map((page) => (
                          <div
                            key={page.href}
                            onClick={() => handleResultClick(page)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors group cursor-pointer"
                          >
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 text-sm text-foreground">{page.label}</span>
                            <button
                              onClick={(e) => handleDeleteHistory(e, page)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                              aria-label="Delete from history"
                            >
                              <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No Results */}
                    {showNoResults && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No results found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-2 rounded-sm px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-70"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

