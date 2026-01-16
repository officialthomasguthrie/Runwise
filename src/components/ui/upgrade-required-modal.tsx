"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Crown, Rocket, Clock, Zap, Activity, BarChart, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeRequiredModalProps {
  open: boolean;
  onClose: () => void;
  source?: "ai-prompt" | "workflow-run" | "node-config" | "other";
  title?: string;
  message?: string;
  upgradePlan?: string; // Plan to upgrade to (default: "personal-monthly")
}

export function UpgradeRequiredModal({
  open,
  onClose,
  source = "other",
  title,
  message,
  upgradePlan = "personal-monthly",
}: UpgradeRequiredModalProps) {
  const router = useRouter();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  if (!open) return null;

  const handleViewPlans = () => {
    onClose();
    router.push("/settings?tab=billing");
  };

  const handleStartFreeTrial = async () => {
    try {
      setIsCheckoutLoading(true);
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },  
        body: JSON.stringify({
          plan: "pro-monthly",
          skipTrial: false,
          trialDays: 7,
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

  const handleUpgradeNow = async () => {
    try {
      setIsCheckoutLoading(true);
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: upgradePlan,
          skipTrial: upgradePlan === "pro-monthly" ? false : false,
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

  const features = [
    { icon: Clock, text: "Save hours every week instantly" },
    { icon: Rocket, text: "Launch automations in minutes, not days" },
    { icon: Zap, text: "Run workflows 24/7 automatically" },
    { icon: Activity, text: "1000+ Executions" },
    { icon: BarChart, text: "Analytics" },
    { icon: Headphones, text: "Priority Support" },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-lg bg-[#d4d3d2] dark:bg-[#2a2a2a] overflow-hidden shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 text-gray-800 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex p-2">
          {/* Left side - Image */}
          <div className="hidden md:block w-1/2 relative">
            <div className="w-full h-full overflow-hidden rounded-lg p-1">
              <img
                src="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
                alt=""
                className="w-full h-full object-cover rounded-lg"
                style={{ objectPosition: 'center' }}
              />
            </div>
          </div>

          {/* Right side - Content */}
          <div className="flex-1 p-4 md:p-6 pl-3 md:pl-4">
            <div className="space-y-3">
              {/* Title */}
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                  Unlock Full Access
                </h2>
                <p className="text-xs md:text-sm text-gray-700 dark:text-gray-400 mt-1">
                  You've used your free workflow. Upgrade to continue.
                </p>
              </div>

              {/* Features List */}
              <div className="flex flex-col gap-2">
                {features.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      {IconComponent && <IconComponent className="h-3 w-3 text-gray-900 dark:text-white flex-shrink-0" />}
                      <span className="text-xs text-gray-900 dark:text-white">{feature.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* CTA Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleStartFreeTrial}
                  disabled={isCheckoutLoading}
                  className="flex-1 border border-purple-600/30 dark:border-[#ffffff1a] bg-[#bd28b3ba] rounded-md py-2 px-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckoutLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Start Free Trial"
                  )}
                </button>
                <button
                  onClick={handleViewPlans}
                  disabled={isCheckoutLoading}
                  className="flex-[0.5] border border-gray-300 dark:border-[#ffffff1a] bg-white dark:bg-transparent text-gray-900 dark:text-white rounded-md py-2 px-3 text-xs font-medium flex items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  See Plans
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


