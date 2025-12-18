"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeRequiredModalProps {
  open: boolean;
  onClose: () => void;
  source?: "ai-prompt" | "workflow-run" | "node-config" | "other";
}

export function UpgradeRequiredModal({
  open,
  onClose,
  source = "other",
}: UpgradeRequiredModalProps) {
  const router = useRouter();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  if (!open) return null;

  const handleViewPlans = () => {
    onClose();
    router.push("/settings?tab=billing");
  };

  const handleUpgradeNow = async () => {
    try {
      setIsCheckoutLoading(true);
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "personal-monthly",
          skipTrial: false,
          cancelUrl: "/dashboard",
          source,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error ?? "Unable to start checkout. Please try again."
        );
      }

      const payload = await response.json();
      if (!payload.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      window.location.href = payload.url as string;
    } catch (error: any) {
      console.error("Failed to start checkout from upgrade modal:", error);
      alert(
        error?.message ??
          "We could not start the checkout flow. Please try again."
      );
      setIsCheckoutLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-stone-200 dark:border-white/10 bg-background p-6 shadow-xl relative">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            Upgrade to run workflows
          </h2>
          <p className="text-sm text-muted-foreground">
            You&apos;re currently on the Free plan. To run workflows and use
            AI-powered automation, you&apos;ll need an active subscription.
          </p>

          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>• Unlimited AI prompts within your plan limits</li>
            <li>• Workflow creation and execution</li>
            <li>• Access to all current and future core features</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleViewPlans}
            className="sm:min-w-[120px]"
            disabled={isCheckoutLoading}
          >
            View Plans
          </Button>
          <Button
            onClick={handleUpgradeNow}
            className="bg-[#bd28b3ba] hover:bg-[#bd28b3da] text-white border-0 sm:min-w-[140px] flex items-center justify-center gap-2"
            disabled={isCheckoutLoading}
          >
            {isCheckoutLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>Upgrade Now</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


