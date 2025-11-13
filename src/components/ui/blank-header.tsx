"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BlankHeaderProps {
  className?: string;
}

export function BlankHeader({ className }: BlankHeaderProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const searchId = useId();

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

  return (
    <div
      className={cn(
        "h-16 w-full shrink-0 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
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
              <div className="relative">
                <Input
                  id={searchId}
                  type="search"
                  placeholder="Search..."
                  className="pe-11"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground">
                  <kbd className="inline-flex h-5 max-h-full items-center rounded border border-border px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
                    ⌘K
                  </kbd>
                </div>
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
  );
}

