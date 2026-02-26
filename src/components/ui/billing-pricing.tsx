"use client";

import { CreditCard, Edit, Trash2, AlertCircle, Loader2, Save, X, CreditCard as CreditCardIcon, Calendar, XCircle } from "lucide-react";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Plan = {
  icon: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  description: string;
  buttonText: string;
  features: string[];
};

interface BillingPricingProps {
  subscriptionTier?: string | null;
}

export const BillingPricing: React.FC<BillingPricingProps> = ({ subscriptionTier: subscriptionTierProp }) => {
  const { user, subscriptionTier: authSubscriptionTier, subscriptionStatus, refreshSubscription } = useAuth();
  const supabase = createClient();

  // Use subscription tier from auth context (most reliable source), fallback to prop, then to 'free'
  // This ensures we always have a value and it's always up-to-date
  const subscriptionTier = authSubscriptionTier ?? subscriptionTierProp ?? 'free';

  // True when the user has previously cancelled a paid subscription — they cannot use a free trial again
  const hasCancelledPlan = subscriptionStatus === 'cancelled';

  // Determine current plan from subscription_tier (memoized for stability)
  // Map: free -> null (no current plan), personal -> personal, pro/professional -> professional, enterprise/enterprises -> enterprises
  const currentPlan = useMemo(() => {
    const userPlan = subscriptionTier || "free";
    if (userPlan === "free") return null;
    if (userPlan === "personal") return "personal";
    if (userPlan === "pro" || userPlan === "professional") return "professional";
    if (userPlan === "enterprise" || userPlan === "enterprises") return "enterprises";
    return null;
  }, [subscriptionTier]);

  interface PaymentMethod {
    id: string;
    type: string;
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    cardholderName?: string;
    isDefault: boolean;
  }

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    cardNumber: string;
    cardholderName: string;
    expiryMonth: number;
    expiryYear: number;
    brand: string;
    isDefault: boolean;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);

  // Cancel plan state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Load payment methods from Stripe
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!user) {
        setIsLoadingPaymentMethods(false);
        return;
      }

      try {
        setIsLoadingPaymentMethods(true);
        const response = await fetch('/api/stripe/payment-methods', {
          method: 'GET',
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to load payment methods');
        }

        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
      } catch (error) {
        console.error('Error loading payment methods:', error);
        setPaymentMethods([]);
      } finally {
        setIsLoadingPaymentMethods(false);
      }
    };

    loadPaymentMethods();
  }, [user]);

  // Handle delete payment method
  const handleDeleteClick = (method: PaymentMethod, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaymentMethodToDelete(method);
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPaymentMethodToDelete(null);
  };

  const confirmDeletePaymentMethod = async () => {
    if (!paymentMethodToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/stripe/payment-methods/${paymentMethodToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete payment method');
      }

      // Remove from local state
      const updatedMethods = paymentMethods.filter(m => m.id !== paymentMethodToDelete.id);
      setPaymentMethods(updatedMethods);
      
      // Close modal
      setShowDeleteModal(false);
      setPaymentMethodToDelete(null);
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      alert(error.message || 'Failed to delete payment method. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit payment method
  const handleEditClick = (method: PaymentMethod, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMethodId(method.id);
    setEditFormData({
      cardNumber: `•••• •••• •••• ${method.last4}`,
      cardholderName: method.cardholderName || '',
      expiryMonth: method.expiryMonth,
      expiryYear: method.expiryYear,
      brand: method.brand,
      isDefault: method.isDefault,
    });
  };

  const cancelEdit = () => {
    setEditingMethodId(null);
    setEditFormData(null);
  };

  const handleEditFormChange = (field: string, value: string | number | boolean) => {
    if (!editFormData) return;
    setEditFormData({
      ...editFormData,
      [field]: value,
    });
  };

  const saveEdit = async () => {
    if (!editingMethodId || !editFormData) return;

    setIsSavingEdit(true);
    try {
      // Call API to update payment method (works for both mock and real cards)
      const response = await fetch(`/api/stripe/payment-methods/${editingMethodId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expiryMonth: editFormData.expiryMonth,
          expiryYear: editFormData.expiryYear,
          cardholderName: editFormData.cardholderName,
          isDefault: editFormData.isDefault,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save payment method');
      }

      // Reload payment methods to get updated data from Stripe
      const reloadResponse = await fetch('/api/stripe/payment-methods', {
        method: 'GET',
      });

      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json();
        setPaymentMethods(reloadData.paymentMethods || []);
      } else {
        // If reload fails, update local state manually
        const updatedMethods = paymentMethods.map(m =>
          m.id === editingMethodId
            ? {
                ...m,
                expiryMonth: editFormData.expiryMonth,
                expiryYear: editFormData.expiryYear,
                isDefault: editFormData.isDefault,
              }
            : editFormData.isDefault ? { ...m, isDefault: false } : m
        );
        setPaymentMethods(updatedMethods);
      }

      // Close edit form
      setEditingMethodId(null);
      setEditFormData(null);
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      alert(error.message || 'Failed to save payment method. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle adding a new payment method
  const handleAddPaymentMethod = async () => {
    setIsAddingPaymentMethod(true);
    try {
      // Create a setup intent for adding a payment method
      const response = await fetch('/api/stripe/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setAsDefault: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create setup intent');
      }

      const data = await response.json();
      
      // Redirect to add card page with setup intent
      window.location.href = `/settings/billing/add-card?setup_intent=${encodeURIComponent(data.clientSecret || '')}`;
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      alert(error.message || 'Failed to add payment method. Please try again.');
      setIsAddingPaymentMethod(false);
    }
  };

  // Handle plan switch/checkout
  const handleCancelPlan = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      const response = await fetch('/api/stripe/cancel-subscription', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to cancel subscription.');
      }
      await refreshSubscription();
      setCancelSuccess(true);
      setShowCancelConfirm(false);
    } catch (err: any) {
      setCancelError(err.message ?? 'Failed to cancel. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCheckout = async (planName: string) => {
    // Map plan names to plan IDs
    const planIdMap: Record<string, string | null> = {
      'Personal': 'personal-monthly',
      'Professional': 'pro-monthly',
      'Enterprises': null, // Enterprise requires custom handling
    };

    const planId = planIdMap[planName];
    
    if (!planId) {
      // Enterprise plan - show message
      alert('Please contact us to set up an Enterprise plan.');
      return;
    }

    setLoadingPlan(planName);

    // Determine if this should include a free trial.
    // Trial is only offered for Professional when the user has no current plan
    // AND has never previously cancelled a subscription.
    const isProfessionalPlan = planName === 'Professional';
    const shouldApplyTrial = isProfessionalPlan && currentPlan === null && !hasCancelledPlan;

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: planId,
          skipTrial: !shouldApplyTrial, // Skip trial for plan switches, but apply for new "Start Free Trial" clicks
          trialDays: shouldApplyTrial ? 7 : undefined, // Explicitly set 7-day trial for "Start Free Trial"
          cancelUrl: '/settings?tab=billing', // Return to billing settings on cancel
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error ?? 'Unable to start checkout. Please try again.',
        );
      }

      const payload = await response.json();
      if (!payload.url) {
        throw new Error('Stripe did not return a checkout URL.');
      }

      window.location.href = payload.url as string;
    } catch (error: any) {
      console.error('Failed to start checkout:', error);
      alert(
        error?.message ??
          'We could not start the checkout flow. Please try again.',
      );
      setLoadingPlan(null);
    }
  };
  
  const plans: Plan[] = [
    {
      icon: "/assets/icons/personal-icon.svg",
      name: "Personal",
      monthlyPrice: "$9.99",
      annualPrice: "$8",
      description:
        "Essential tools and features for starting your journey with ease.",
      buttonText: "Get Started",
      features: [
        "100 credits",
        "100+ executions",
        "Up to 3 active workflows",
        "10 step workflows",
        "No technical skills required",
        "Fast setup",
        "AI workflow builder included",
        "AI workflow generation",
      ],
    },
    {
      icon: "/assets/icons/professional-icon.svg",
      name: "Professional",
      monthlyPrice: "$29.99",
      annualPrice: "$24",
      description:
        "Advanced capabilities designed to meet growing business needs.",
      buttonText: "Start Free Trial",
      features: [
        "Everything in personal",
        "500 credits",
        "1000+ executions",
        "Up to 10 active workflows",
        "Priority support",
        "Scales with businesses",
        "Stronger capacity",
        "2 consultation a month",
      ],
    },
    {
      icon: "/assets/icons/interprise-icon.svg",
      name: "Enterprises",
      monthlyPrice: "Custom",
      annualPrice: "Custom",
      description:
        "Comprehensive solutions tailored for large-scale business success.",
      buttonText: "Schedule a call",
      features: [
        "Custom usage limits",
        "Dedicated infrastructure",
        "Advanced integrations",
        "Custom workflow logic",
        "Priority support & onboarding",
        "SLAs & compliance options",
        "Team collaboration features",
        "Scales without limits",
      ],
    },
  ];

  const cardVariants: Variants = {
    hidden: { opacity: 1, y: 0 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0 },
    },
  };

  // Refs for card backgrounds
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);

  // Update card backgrounds based on theme
  useEffect(() => {
    const updateCardBackgrounds = () => {
      const isDark = document.documentElement.classList.contains('dark');
      
      if (card1Ref.current) {
        card1Ref.current.style.backgroundImage = isDark
          ? "linear-gradient(149deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.06) 100%)"
          : "linear-gradient(149deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.02) 100%)";
      }
      
      if (card2Ref.current) {
        card2Ref.current.style.backgroundImage = isDark
          ? "linear-gradient(149deg, rgba(189, 40, 179, 0.15) 0%, rgba(255, 255, 255, 0.06) 29%, rgba(255, 255, 255, 0.06) 74%, rgba(189, 40, 179, 0.15) 100%)"
          : "linear-gradient(149deg, rgba(189, 40, 179, 0.08) 0%, rgba(0, 0, 0, 0.02) 29%, rgba(0, 0, 0, 0.02) 74%, rgba(189, 40, 179, 0.08) 100%)";
      }
      
      if (card3Ref.current) {
        card3Ref.current.style.backgroundImage = isDark
          ? "linear-gradient(149deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.06) 100%)"
          : "linear-gradient(149deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.02) 100%)";
      }
    };

    updateCardBackgrounds();

    // Watch for theme changes
    const observer = new MutationObserver(updateCardBackgrounds);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-8">
      {/* Pricing Cards - 2 in first row, 1 in second row spanning both */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px]">
        {/* First Card - Personal */}
        <motion.div
          ref={card1Ref}
          className="border border-gray-300 dark:border-[#ffffff1a] rounded-[16px] px-6 py-5 flex flex-col gap-y-4 h-full min-h-[200px] bg-white/40 dark:bg-transparent backdrop-blur-xl"
        >
          <div className="space-y-2">
            {/* Plan Header */}
            <div className="flex items-center gap-2">
              <div className="w-[20px] h-[20px] bg-gray-100 dark:bg-[#ffffff14] border border-gray-300 dark:border-[#ffffff1a] flex items-center justify-center rounded-[6px]">
                <img
                  src={plans[0].icon}
                  alt="icon"
                  loading="lazy"
                  className="w-[12px] h-[12px] object-contain brightness-0 dark:brightness-100"
                />
              </div>

              <span className="text-sm font-light -tracking-[.02em] leading-[1.2em]">
                {plans[0].name}
              </span>
            </div>

            {/* Price */}
            <p>
              <span className="text-2xl font-medium -tracking-[.02em]">
                {plans[0].monthlyPrice}
              </span>

              {plans[0].monthlyPrice !== "Custom" && (
                <span className="text-xs -tracking-[.02em] font-light ml-1">
                  /month
                </span>
              )}
            </p>

            {/* Description */}
            <p className="text-gray-600 dark:text-[#ffffffb3] text-xs leading-[1.3em] -tracking-[.02em] font-light">
              {plans[0].description}
            </p>
          </div>

          {/* CTA Button */}
          {currentPlan === "personal" ? (
            cancelSuccess ? (
              <p className="text-xs text-center text-muted-foreground py-1.5">Plan cancelled. You are now on the free plan.</p>
            ) : !showCancelConfirm ? (
              <button
                onClick={() => { setShowCancelConfirm(true); setCancelError(null); }}
                className="border border-red-400/60 bg-red-500/5 hover:bg-red-500/10 w-full rounded-lg py-1.5 px-3 cursor-pointer text-xs font-normal text-muted-foreground transition-all flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400/80 flex-shrink-0" />
                Cancel Plan
              </button>
            ) : (
              <div className="rounded-md border border-red-400/40 bg-red-500/5 p-3 space-y-2">
                <p className="text-xs font-medium">Cancel your plan?</p>
                <p className="text-xs text-muted-foreground">Your subscription will be cancelled <strong>immediately</strong> and you will be moved to the free plan.</p>
                {cancelError && <p className="text-xs text-red-500">{cancelError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelPlan}
                    disabled={isCancelling}
                    className="border border-red-400/60 bg-red-500/5 hover:bg-red-500/15 rounded-md py-1 px-2.5 text-xs text-muted-foreground disabled:opacity-50 transition-all"
                  >
                    {isCancelling ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    onClick={() => { setShowCancelConfirm(false); setCancelError(null); }}
                    disabled={isCancelling}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Keep plan
                  </button>
                </div>
              </div>
            )
          ) : (
            <button 
              onClick={() => handleCheckout(plans[0].name)}
              disabled={loadingPlan === plans[0].name}
              className="border border-gray-300 dark:border-[#ffffff1a] bg-[#bd28b3ba] w-full rounded-lg start-building-btn py-1.5 px-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-end justify-center gap-1">
                <p className="text-xs font-normal leading-[1.2em] text-white">
                  {loadingPlan === plans[0].name ? 'Redirecting...' : currentPlan ? 'Switch to Personal' : plans[0].buttonText}
                </p>

                {loadingPlan !== plans[0].name && (
                  <img
                    src="/assets/icons/arrow-top.svg"
                    alt="arrow-top"
                    loading="lazy"
                    className="w-3 h-3 brightness-0 invert dark:brightness-100 dark:invert-0"
                  />
                )}
              </div>
            </button>
          )}

          {/* Features */}
          <ul className="space-y-1.5 pt-1">
            {plans[0].features.slice(0, 4).map((feature, fIndex) => (
              <li key={fIndex} className="flex items-center gap-2">
                <div className="w-[16px] h-[16px] bg-gray-100 dark:bg-[#ffffff14] border border-gray-300 dark:border-[#ffffff1a] flex items-center justify-center rounded-[6px] flex-shrink-0">
                  <img
                    src="/assets/icons/tikmark.svg"
                    alt="tikmark"
                    loading="lazy"
                    className="w-[10px] h-[10px] object-contain brightness-0 dark:brightness-100"
                  />
                </div>

                <span className="text-xs leading-[1.3em] -tracking-[.02em] font-light">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Second Card - Professional */}
        <motion.div
          ref={card2Ref}
          className="border border-gray-300 dark:border-[#ffffff1a] rounded-[16px] px-6 py-5 flex flex-col gap-y-4 h-full min-h-[200px] bg-white/40 dark:bg-transparent backdrop-blur-xl"
        >
          <div className="space-y-2">
            {/* Plan Header */}
            <div className="flex items-center gap-2">
              <div className="w-[20px] h-[20px] bg-gray-100 dark:bg-[#ffffff14] border border-gray-300 dark:border-[#ffffff1a] flex items-center justify-center rounded-[6px]">
                <img
                  src={plans[1].icon}
                  alt="icon"
                  loading="lazy"
                  className="w-[12px] h-[12px] object-contain brightness-0 dark:brightness-100"
                />
              </div>

              <span className="text-sm font-light -tracking-[.02em] leading-[1.2em]">
                {plans[1].name}
              </span>
            </div>

            {/* Price */}
            <p>
              <span className="text-2xl font-medium -tracking-[.02em]">
                {plans[1].monthlyPrice}
              </span>

              {plans[1].monthlyPrice !== "Custom" && (
                <span className="text-xs -tracking-[.02em] font-light ml-1">
                  /month
                </span>
              )}
            </p>

            {/* Description */}
            <p className="text-gray-600 dark:text-[#ffffffb3] text-xs leading-[1.3em] -tracking-[.02em] font-light">
              {plans[1].description}
            </p>
          </div>

          {/* CTA Button */}
          {currentPlan === "professional" ? (
            cancelSuccess ? (
              <p className="text-xs text-center text-muted-foreground py-1.5">Plan cancelled. You are now on the free plan.</p>
            ) : !showCancelConfirm ? (
              <button
                onClick={() => { setShowCancelConfirm(true); setCancelError(null); }}
                className="border border-red-400/60 bg-red-500/5 hover:bg-red-500/10 w-full rounded-lg py-1.5 px-3 cursor-pointer text-xs font-normal text-muted-foreground transition-all flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400/80 flex-shrink-0" />
                Cancel Plan
              </button>
            ) : (
              <div className="rounded-md border border-red-400/40 bg-red-500/5 p-3 space-y-2">
                <p className="text-xs font-medium">Cancel your plan?</p>
                <p className="text-xs text-muted-foreground">Your subscription will be cancelled <strong>immediately</strong> and you will be moved to the free plan.</p>
                {cancelError && <p className="text-xs text-red-500">{cancelError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelPlan}
                    disabled={isCancelling}
                    className="border border-red-400/60 bg-red-500/5 hover:bg-red-500/15 rounded-md py-1 px-2.5 text-xs text-muted-foreground disabled:opacity-50 transition-all"
                  >
                    {isCancelling ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    onClick={() => { setShowCancelConfirm(false); setCancelError(null); }}
                    disabled={isCancelling}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Keep plan
                  </button>
                </div>
              </div>
            )
          ) : (
            <button 
              onClick={() => handleCheckout(plans[1].name)}
              disabled={loadingPlan === plans[1].name}
              className="border border-gray-300 dark:border-[#ffffff1a] bg-[#bd28b3ba] w-full rounded-lg start-building-btn py-1.5 px-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-end justify-center gap-1">
                <p className="text-xs font-normal leading-[1.2em] text-white">
                  {loadingPlan === plans[1].name
                    ? 'Redirecting...'
                    : currentPlan !== null
                      ? 'Switch to Professional'
                      : hasCancelledPlan
                        ? 'Get Started'
                        : 'Start Free Trial'}
                </p>

                {loadingPlan !== plans[1].name && (
                  <img
                    src="/assets/icons/arrow-top.svg"
                    alt="arrow-top"
                    loading="lazy"
                    className="w-3 h-3 brightness-0 invert dark:brightness-100 dark:invert-0"
                  />
                )}
              </div>
            </button>
          )}

          {/* Features */}
          <ul className="space-y-1.5 pt-1">
            {plans[1].features.slice(0, 4).map((feature, fIndex) => (
              <li key={fIndex} className="flex items-center gap-2">
                <div className="w-[16px] h-[16px] bg-gray-100 dark:bg-[#ffffff14] border border-gray-300 dark:border-[#ffffff1a] flex items-center justify-center rounded-[6px] flex-shrink-0">
                  <img
                    src="/assets/icons/tikmark.svg"
                    alt="tikmark"
                    loading="lazy"
                    className="w-[10px] h-[10px] object-contain brightness-0 dark:brightness-100"
                  />
                </div>

                <span className="text-xs leading-[1.3em] -tracking-[.02em] font-light">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Third Card - Enterprises (spans both columns) */}
        <motion.div
          ref={card3Ref}
          className="border border-gray-300 dark:border-[#ffffff1a] rounded-[16px] px-6 py-5 flex flex-col gap-y-4 h-full min-h-[200px] md:col-span-2 bg-white/40 dark:bg-transparent backdrop-blur-xl"
        >
          <div className="space-y-2">
            {/* Plan Header */}
            <div className="flex items-center gap-2">
              <div className="w-[20px] h-[20px] bg-gray-100 dark:bg-[#ffffff14] border border-gray-300 dark:border-[#ffffff1a] flex items-center justify-center rounded-[6px]">
                <img
                  src={plans[2].icon}
                  alt="icon"
                  loading="lazy"
                  className="w-[12px] h-[12px] object-contain brightness-0 dark:brightness-100"
                />
              </div>

              <span className="text-sm font-light -tracking-[.02em] leading-[1.2em]">
                {plans[2].name}
              </span>
            </div>

            {/* Price */}
            <p>
              <span className="text-2xl font-medium -tracking-[.02em]">
                {plans[2].monthlyPrice}
              </span>

              {plans[2].monthlyPrice !== "Custom" && (
                <span className="text-xs -tracking-[.02em] font-light ml-1">
                  /month
                </span>
              )}
            </p>

            {/* Description */}
            <p className="text-gray-600 dark:text-[#ffffffb3] text-xs leading-[1.3em] -tracking-[.02em] font-light">
              {plans[2].description}
            </p>
          </div>

          {/* CTA Button */}
          {currentPlan === "enterprises" ? (
            cancelSuccess ? (
              <p className="text-xs text-center text-muted-foreground py-1.5">Plan cancelled. You are now on the free plan.</p>
            ) : !showCancelConfirm ? (
              <button
                onClick={() => { setShowCancelConfirm(true); setCancelError(null); }}
                className="border border-red-400/60 bg-red-500/5 hover:bg-red-500/10 w-full rounded-lg py-1.5 px-3 cursor-pointer text-xs font-normal text-muted-foreground transition-all flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400/80 flex-shrink-0" />
                Cancel Plan
              </button>
            ) : (
              <div className="rounded-md border border-red-400/40 bg-red-500/5 p-3 space-y-2">
                <p className="text-xs font-medium">Cancel your plan?</p>
                <p className="text-xs text-muted-foreground">Your subscription will be cancelled <strong>immediately</strong> and you will be moved to the free plan.</p>
                {cancelError && <p className="text-xs text-red-500">{cancelError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelPlan}
                    disabled={isCancelling}
                    className="border border-red-400/60 bg-red-500/5 hover:bg-red-500/15 rounded-md py-1 px-2.5 text-xs text-muted-foreground disabled:opacity-50 transition-all"
                  >
                    {isCancelling ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    onClick={() => { setShowCancelConfirm(false); setCancelError(null); }}
                    disabled={isCancelling}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Keep plan
                  </button>
                </div>
              </div>
            )
          ) : (
            <button 
              onClick={() => window.open('https://cal.com/thomas-guthrie/runwise-enterprise-consultation', '_blank')}
              className="border border-gray-300 dark:border-[#ffffff1a] bg-[#bd28b3ba] w-full rounded-lg start-building-btn py-1.5 px-3 cursor-pointer"
            >
              <div className="flex items-end justify-center gap-1">
                <p className="text-xs font-normal leading-[1.2em] text-white">
                  {plans[2].buttonText}
                </p>

                <img
                  src="/assets/icons/arrow-top.svg"
                  alt="arrow-top"
                  loading="lazy"
                  className="w-3 h-3 brightness-0 invert dark:brightness-100 dark:invert-0"
                />
              </div>
            </button>
          )}

          {/* Features */}
          <ul className="space-y-1.5 pt-1">
            {plans[2].features.slice(0, 4).map((feature, fIndex) => (
              <li key={fIndex} className="flex items-center gap-2">
                <div className="w-[16px] h-[16px] bg-gray-100 dark:bg-[#ffffff14] border border-gray-300 dark:border-[#ffffff1a] flex items-center justify-center rounded-[6px] flex-shrink-0">
                  <img
                    src="/assets/icons/tikmark.svg"
                    alt="tikmark"
                    loading="lazy"
                    className="w-[10px] h-[10px] object-contain brightness-0 dark:brightness-100"
                  />
                </div>

                <span className="text-xs leading-[1.3em] -tracking-[.02em] font-light">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Billing Information Card */}
      <div className="border border-gray-300 dark:border-[#ffffff1a] rounded-[16px] px-6 py-5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Billing Information</h3>
            <Button
              onClick={handleAddPaymentMethod}
              className="bg-[#bd28b3ba] hover:bg-[#bd28b3da] text-white border-0"
              size="sm"
              disabled={isAddingPaymentMethod}
            >
              {isAddingPaymentMethod ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add Payment Method
                </>
              )}
            </Button>
          </div>

          {isLoadingPaymentMethods ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading payment methods...</p>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <CreditCard className="h-12 w-12 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No payment methods found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div key={method.id} className="space-y-0">
                  {/* Payment Method Card */}
                  <div
                    className={`flex items-center justify-between p-4 border border-gray-300 dark:border-[#ffffff1a] rounded-lg bg-white/20 dark:bg-zinc-900/20 transition-all ${
                      editingMethodId === method.id ? 'rounded-b-none' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/40 dark:bg-zinc-900/40 border border-[#ffffff1a] rounded-lg flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                          </p>
                          {method.isDefault && (
                            <span className="text-xs px-2 py-0.5 bg-white/40 dark:bg-zinc-900/40 rounded text-foreground">
                              Default
                            </span>
                          )}
                        </div>
                        {method.cardholderName && (
                          <p className="text-xs font-medium text-foreground">
                            {method.cardholderName}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Expires {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleEditClick(method, e)}
                        className="p-2 border border-gray-300 dark:border-[#ffffff1a] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl rounded-lg hover:bg-white/60 dark:hover:bg-zinc-900/60 transition-all text-foreground disabled:opacity-50"
                        title="Edit"
                        disabled={editingMethodId === method.id}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(method, e)}
                        className="p-2 border border-gray-300 dark:border-[#ffffff1a] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl rounded-lg hover:bg-white/60 dark:hover:bg-zinc-900/60 transition-all text-foreground disabled:opacity-50"
                        title="Delete"
                        disabled={editingMethodId === method.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Edit Form (expanded when editing) */}
                  {editingMethodId === method.id && editFormData && (
                    <div className="p-4 border border-gray-300 dark:border-[#ffffff1a] border-t-0 rounded-b-lg bg-white/20 dark:bg-zinc-900/20 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card Number */}
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`cardNumber-${method.id}`}>Card Number</Label>
                          <div className="relative">
                            <CreditCardIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
                            <Input
                              id={`cardNumber-${method.id}`}
                              value={editFormData.cardNumber}
                              onChange={(e) => handleEditFormChange('cardNumber', e.target.value)}
                              placeholder="1234 5678 9012 3456"
                              className="pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
                              disabled
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Card number cannot be changed</p>
                        </div>

                        {/* Cardholder Name */}
                        <div className="space-y-2">
                          <Label htmlFor={`cardholderName-${method.id}`}>Cardholder Name</Label>
                          <div className="relative">
                            <CreditCardIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
                            <Input
                              id={`cardholderName-${method.id}`}
                              value={editFormData.cardholderName}
                              onChange={(e) => handleEditFormChange('cardholderName', e.target.value)}
                              placeholder="John Doe"
                              className="pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
                            />
                          </div>
                        </div>

                        {/* Brand */}
                        <div className="space-y-2">
                          <Label htmlFor={`brand-${method.id}`}>Card Brand</Label>
                          <div className="relative">
                            <CreditCardIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
                            <Input
                              id={`brand-${method.id}`}
                              value={editFormData.brand.charAt(0).toUpperCase() + editFormData.brand.slice(1)}
                              disabled
                              className="pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70 cursor-default"
                            />
                          </div>
                        </div>

                        {/* Expiry Month */}
                        <div className="space-y-2">
                          <Label htmlFor={`expiryMonth-${method.id}`}>Expiry Month</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
                            <Input
                              id={`expiryMonth-${method.id}`}
                              type="number"
                              min="1"
                              max="12"
                              value={editFormData.expiryMonth}
                              onChange={(e) => handleEditFormChange('expiryMonth', parseInt(e.target.value) || 1)}
                              placeholder="MM"
                              className="pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
                            />
                          </div>
                        </div>

                        {/* Expiry Year */}
                        <div className="space-y-2">
                          <Label htmlFor={`expiryYear-${method.id}`}>Expiry Year</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
                            <Input
                              id={`expiryYear-${method.id}`}
                              type="number"
                              min={new Date().getFullYear()}
                              value={editFormData.expiryYear}
                              onChange={(e) => handleEditFormChange('expiryYear', parseInt(e.target.value) || new Date().getFullYear())}
                              placeholder="YYYY"
                              className="pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
                            />
                          </div>
                        </div>

                        {/* Set as Default */}
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`isDefault-${method.id}`}
                              checked={editFormData.isDefault}
                              onChange={(e) => handleEditFormChange('isDefault', e.target.checked)}
                              className="w-4 h-4 rounded border-stone-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40 text-primary focus:ring-2 focus:ring-primary"
                            />
                            <Label htmlFor={`isDefault-${method.id}`} className="text-sm font-normal cursor-pointer">
                              Set as default payment method
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                          variant="ghost"
                          onClick={cancelEdit}
                          className="bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isSavingEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={saveEdit}
                          className="bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isSavingEdit}
                        >
                          {isSavingEdit ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Payment Method Modal */}
      {showDeleteModal && paymentMethodToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={cancelDelete}
          />
          
          {/* Modal */}
          <div className="relative z-10 w-full max-w-md mx-4 bg-background border border-border rounded-lg shadow-lg p-6">
            <div className="space-y-4">
              {/* Icon and Title */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    Delete Payment Method
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete the {paymentMethodToDelete.brand.charAt(0).toUpperCase() + paymentMethodToDelete.brand.slice(1)} card ending in {paymentMethodToDelete.last4}? This action cannot be undone and the payment method will be permanently removed from your account.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={cancelDelete}
                  className="min-w-[80px]"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeletePaymentMethod}
                  className="min-w-[80px] gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

