/**
 * Credit Tracking System
 * Handles credit deduction, checking, and balance management
 */

import { createAdminClient } from '@/lib/supabase-admin';
import { getMonthlyCreditAllocation } from './calculator';

export interface CreditBalance {
  balance: number;
  usedThisMonth: number;
  monthlyAllocation: number;
  lastReset: string;
  nextReset: string;
}

/**
 * Get user's current credit balance
 */
export async function getCreditBalance(userId: string): Promise<CreditBalance | null> {
  const adminSupabase = createAdminClient();
  
  const { data: user, error } = await (adminSupabase
    .from('users') as any)
    .select('credits_balance, credits_used_this_month, credits_last_reset, subscription_tier')
    .eq('id', userId)
    .single();
  
  if (error || !user) {
    console.error('Error fetching credit balance:', error);
    return null;
  }
  
  const monthlyAllocation = getMonthlyCreditAllocation(user.subscription_tier || 'free');
  const lastReset = user.credits_last_reset || new Date().toISOString();
  const nextReset = new Date(lastReset);
  nextReset.setMonth(nextReset.getMonth() + 1);
  
  return {
    balance: user.credits_balance || 0,
    usedThisMonth: user.credits_used_this_month || 0,
    monthlyAllocation,
    lastReset,
    nextReset: nextReset.toISOString(),
  };
}

/**
 * Check if user has enough credits
 */
export async function checkCreditsAvailable(
  userId: string,
  requiredCredits: number
): Promise<{ available: boolean; balance: number; message?: string }> {
  const balance = await getCreditBalance(userId);
  
  if (!balance) {
    return {
      available: false,
      balance: 0,
      message: 'Unable to check credit balance',
    };
  }
  
  // Check if we need to reset credits (monthly reset)
  const now = new Date();
  const lastReset = new Date(balance.lastReset);
  const shouldReset = now > new Date(balance.nextReset);
  
  if (shouldReset) {
    await resetMonthlyCredits(userId);
    // Re-fetch balance after reset
    const newBalance = await getCreditBalance(userId);
    if (!newBalance) {
      return {
        available: false,
        balance: 0,
        message: 'Unable to check credit balance after reset',
      };
    }
    
    if (newBalance.balance >= requiredCredits) {
      return { available: true, balance: newBalance.balance };
    } else {
      return {
        available: false,
        balance: newBalance.balance,
        message: `Insufficient credits. You need ${requiredCredits} credits but only have ${newBalance.balance} remaining.`,
      };
    }
  }
  
  if (balance.balance >= requiredCredits) {
    return { available: true, balance: balance.balance };
  } else {
    return {
      available: false,
      balance: balance.balance,
      message: `Insufficient credits. You need ${requiredCredits} credits but only have ${balance.balance} remaining.`,
    };
  }
}

/**
 * Deduct credits from user's balance
 */
export async function deductCredits(
  userId: string,
  credits: number,
  reason: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const adminSupabase = createAdminClient();
  
  // First check if user has enough credits
  const check = await checkCreditsAvailable(userId, credits);
  if (!check.available) {
    return {
      success: false,
      newBalance: check.balance,
      error: check.message,
    };
  }
  
  // Get current balance to calculate new values
  const currentBalance = await getCreditBalance(userId);
  if (!currentBalance) {
    return {
      success: false,
      newBalance: check.balance,
      error: 'Unable to fetch current balance',
    };
  }

  // Get current total_credits_used before updating
  const { data: currentUser } = await (adminSupabase
    .from('users') as any)
    .select('total_credits_used')
    .eq('id', userId)
    .single();
  
  const previousTotal = currentUser?.total_credits_used || 0;

  // Deduct credits
  const { data: updatedUser, error } = await (adminSupabase
    .from('users') as any)
    .update({
      credits_balance: check.balance - credits,
      credits_used_this_month: currentBalance.usedThisMonth + credits,
      total_credits_used: previousTotal + credits, // Cumulative total
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('Error deducting credits:', error);
    return {
      success: false,
      newBalance: check.balance,
      error: 'Failed to deduct credits',
    };
  }
  
  // Log credit usage
  await logCreditUsage(userId, credits, reason, metadata);
  
  return {
    success: true,
    newBalance: updatedUser.credits_balance,
  };
}

/**
 * Reset monthly credits for a user
 */
export async function resetMonthlyCredits(userId: string): Promise<boolean> {
  const adminSupabase = createAdminClient();
  
  // Get user's subscription tier
  const { data: user, error: fetchError } = await (adminSupabase
    .from('users') as any)
    .select('subscription_tier')
    .eq('id', userId)
    .single();
  
  if (fetchError || !user) {
    console.error('Error fetching user for credit reset:', fetchError);
    return false;
  }
  
  const monthlyAllocation = getMonthlyCreditAllocation(user.subscription_tier || 'free');
  const now = new Date().toISOString();
  const nextReset = new Date();
  nextReset.setMonth(nextReset.getMonth() + 1);
  
  const { error } = await (adminSupabase
    .from('users') as any)
    .update({
      credits_balance: monthlyAllocation,
      credits_used_this_month: 0,
      credits_last_reset: now,
      updated_at: now,
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Error resetting monthly credits:', error);
    return false;
  }
  
  return true;
}

/**
 * Log credit usage for analytics
 */
async function logCreditUsage(
  userId: string,
  credits: number,
  reason: string,
  metadata?: Record<string, any>
): Promise<void> {
  const adminSupabase = createAdminClient();
  
  try {
    // Extract workflow_id and execution_id from metadata if present
    const workflowId = metadata?.workflowId || metadata?.workflow_id || null;
    const executionId = metadata?.executionId || metadata?.execution_id || null;
    
    // Prepare metadata without workflow/execution IDs (they're separate columns)
    const logMetadata = { ...metadata };
    if (logMetadata.workflowId) delete logMetadata.workflowId;
    if (logMetadata.workflow_id) delete logMetadata.workflow_id;
    if (logMetadata.executionId) delete logMetadata.executionId;
    if (logMetadata.execution_id) delete logMetadata.execution_id;
    
    const { error } = await (adminSupabase
      .from('credit_usage_logs') as any)
      .insert({
        user_id: userId,
        credits: credits,
        reason: reason,
        metadata: logMetadata || {},
        workflow_id: workflowId,
        execution_id: executionId,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      // Log error but don't throw - credit deduction already succeeded
      console.error('Error logging credit usage:', error);
    }
  } catch (error: any) {
    // Log error but don't throw - credit deduction already succeeded
    console.error('Unexpected error logging credit usage:', error);
  }
}

/**
 * Initialize credits for a new user based on their subscription tier
 */
export async function initializeUserCredits(userId: string, subscriptionTier: string): Promise<boolean> {
  const adminSupabase = createAdminClient();
  const monthlyAllocation = getMonthlyCreditAllocation(subscriptionTier);
  const now = new Date().toISOString();
  
  const { error } = await (adminSupabase
    .from('users') as any)
    .update({
      credits_balance: monthlyAllocation,
      credits_used_this_month: 0,
      credits_last_reset: now,
      updated_at: now,
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Error initializing user credits:', error);
    return false;
  }
  
  return true;
}

