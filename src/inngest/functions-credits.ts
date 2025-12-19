/**
 * Inngest Functions for Credit System
 * Handles monthly credit resets
 */

import { inngest } from './client';

/**
 * Monthly credit reset function
 * Runs on the 1st of each month at midnight UTC
 */
export const monthlyCreditReset = inngest.createFunction(
  { id: 'monthly-credit-reset' },
  { cron: '0 0 1 * *' }, // First day of every month at midnight UTC
  async ({ step }) => {
    const { createAdminClient } = await import('@/lib/supabase-admin');
    const { getMonthlyCreditAllocation } = await import('@/lib/credits/calculator');
    const adminSupabase = createAdminClient();

    // Get all active users (excluding free users - they never get reset)
    const { data: users, error } = await (adminSupabase
      .from('users') as any)
      .select('id, subscription_tier')
      .eq('subscription_status', 'active')
      .neq('subscription_tier', 'free'); // Exclude free users - they never get reset

    if (error) {
      console.error('Error fetching users for credit reset:', error);
      return { success: false, error: error.message };
    }

    if (!users || users.length === 0) {
      return { success: true, message: 'No users to reset' };
    }

    const now = new Date().toISOString();
    let successCount = 0;
    let errorCount = 0;

    // Reset credits for each user (free users are already excluded)
    for (const user of users) {
      try {
        const monthlyAllocation = getMonthlyCreditAllocation(user.subscription_tier || 'free');
        
        const { error: updateError } = await (adminSupabase
          .from('users') as any)
          .update({
            credits_balance: monthlyAllocation,
            credits_used_this_month: 0,
            credits_last_reset: now,
            updated_at: now,
          })
          .eq('id', user.id);

        if (updateError) {
          console.error(`Error resetting credits for user ${user.id}:`, updateError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err: any) {
        console.error(`Error processing user ${user.id}:`, err);
        errorCount++;
      }
    }

    return {
      success: true,
      message: `Reset credits for ${successCount} users, ${errorCount} errors`,
      successCount,
      errorCount,
    };
  }
);

