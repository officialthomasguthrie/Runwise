'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface CreditBalance {
  balance: number;
  usedThisMonth: number;
  monthlyAllocation: number;
  lastReset: string;
  nextReset: string;
}

export function UsageSettings() {
  const { user } = useAuth();
  const [creditData, setCreditData] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCredits() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/credits');
        if (!response.ok) {
          throw new Error('Failed to fetch credit balance');
        }

        const data = await response.json();
        if (data.success && data.balance) {
          setCreditData(data.balance);
        } else {
          setError('Unable to load credit balance');
        }
      } catch (err: any) {
        console.error('Error fetching credits:', err);
        setError(err.message || 'Failed to load credits');
      } finally {
        setLoading(false);
      }
    }

    fetchCredits();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Credit Balance Card Skeleton */}
        <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-10 w-48 bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
          </div>

          {/* Progress Bar Skeleton */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-48 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
              <div className="h-3 w-12 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            </div>
            <div className="w-full h-2 bg-gray-300 dark:bg-[#303030] rounded-full animate-pulse" />
          </div>
        </div>

        {/* Usage Statistics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-4 space-y-2">
            <div className="h-4 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-8 w-24 bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-3 w-40 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
          </div>
          <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-4 space-y-2">
            <div className="h-4 w-28 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-8 w-36 bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-3 w-48 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
          </div>
        </div>

        {/* Credit Information Skeleton */}
        <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-4 space-y-3">
          <div className="h-5 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-4 w-full bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
          </div>
          <div className="pt-2 space-y-2">
            <div className="h-4 w-24 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="space-y-1 ml-2">
              <div className="h-3 w-full bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
              <div className="h-3 w-full bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
              <div className="h-3 w-4/5 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !creditData) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error || 'Unable to load credit information'}
        </div>
      </div>
    );
  }

  const percentageUsed = creditData.monthlyAllocation > 0
    ? (creditData.usedThisMonth / creditData.monthlyAllocation) * 100
    : 0;
  const percentageRemaining = 100 - percentageUsed;
  const isLow = percentageUsed >= 80;
  const isVeryLow = percentageUsed >= 95;

  // Format next reset date
  const nextResetDate = new Date(creditData.nextReset);
  const formattedNextReset = nextResetDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Credit Balance Card */}
      <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Credits Remaining</p>
          <p className="text-3xl font-semibold text-foreground">
            {creditData.balance}
            <span className="text-lg text-muted-foreground font-normal ml-2">
              / {creditData.monthlyAllocation}
            </span>
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {creditData.usedThisMonth} of {creditData.monthlyAllocation} credits used
            </span>
            <span className={`font-medium ${
              isVeryLow 
                ? 'text-destructive' 
                : isLow 
                ? 'text-yellow-500'
                : 'text-foreground/80'
            }`}>
              {percentageUsed.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isVeryLow 
                  ? 'bg-destructive' 
                  : isLow 
                  ? 'bg-yellow-500'
                  : 'bg-foreground/60'
              }`}
              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
            />
          </div>
        </div>

        {isLow && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            isVeryLow
              ? 'bg-destructive/10 text-destructive'
              : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
          } flex items-start gap-2`}>
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              {isVeryLow 
                ? 'You are running very low on credits. Consider upgrading your plan or wait for the monthly reset.'
                : 'You are running low on credits. Consider upgrading your plan for more monthly credits.'}
            </div>
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>Used This Month</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {creditData.usedThisMonth}
          </p>
          <p className="text-xs text-muted-foreground">
            {creditData.monthlyAllocation - creditData.usedThisMonth} credits remaining
          </p>
        </div>

        <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Next Reset</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {formattedNextReset}
          </p>
          <p className="text-xs text-muted-foreground">
            Credits reset on the 1st of each month
          </p>
        </div>
      </div>

      {/* Credit Information */}
      <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">About Credits</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Credits are used for AI-powered features like workflow generation and chat assistance.
            Each credit represents $0.01 of OpenAI API usage.
          </p>
          <p>
            Your credits automatically reset on the 1st of each month based on your subscription plan.
          </p>
          <div className="pt-2 space-y-1">
            <p className="font-medium text-foreground">Credit Costs:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Workflow generation: 2-7 credits (depending on complexity)</li>
              <li>Chat messages: 1-3 credits (depending on length)</li>
              <li>Node configuration help: ~1 credit</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


