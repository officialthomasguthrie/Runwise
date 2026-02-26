'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

import { AlertCircle, Coins } from "lucide-react";
interface CreditBalance {
  balance: number;
  usedThisMonth: number;
  monthlyAllocation: number;
  lastReset: string;
  nextReset: string;
}

export function CreditBalance() {
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

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border">
        <Coins className="w-4 h-4 text-muted-foreground animate-pulse" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (error || !creditData) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertCircle className="w-4 h-4 text-destructive" />
        <span className="text-xs text-destructive">Error loading credits</span>
      </div>
    );
  }

  const percentageUsed = creditData.monthlyAllocation > 0
    ? (creditData.usedThisMonth / creditData.monthlyAllocation) * 100
    : 0;
  const isLow = percentageUsed >= 80;
  const isVeryLow = percentageUsed >= 95;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border hover:bg-background/70 transition-colors">
      <Coins className={`w-4 h-4 ${isVeryLow ? 'text-destructive' : isLow ? 'text-yellow-500' : 'text-foreground'}`} />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">
            {creditData.balance}
          </span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs text-muted-foreground">
            {creditData.monthlyAllocation}
          </span>
        </div>
        {isLow && (
          <span className="text-[10px] text-muted-foreground">
            {isVeryLow ? 'Very low' : 'Low'} credits
          </span>
        )}
      </div>
    </div>
  );
}


