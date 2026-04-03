import type { TokenUsageTotals } from '@/lib/ai/openai-usage';
import { calculateCreditsFromTokens, getGenerationCreditCap } from '@/lib/credits/calculator';
import { deductCredits } from '@/lib/credits/tracker';

export async function finalizeTokenMeteredCredits(params: {
  userId: string;
  shouldCharge: boolean;
  totals: TokenUsageTotals;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<{ creditsUsed: number; newBalance: number }> {
  const { userId, shouldCharge, totals, reason, metadata } = params;
  if (!shouldCharge) {
    return { creditsUsed: 0, newBalance: 0 };
  }

  if (totals.inputTokens + totals.outputTokens <= 0) {
    return { creditsUsed: 0, newBalance: 0 };
  }

  let credits = calculateCreditsFromTokens(totals.inputTokens, totals.outputTokens);
  credits = Math.min(credits, getGenerationCreditCap());

  const deduction = await deductCredits(userId, credits, reason, metadata);
  if (!deduction.success) {
    console.error(`[${reason}] Failed to deduct credits:`, deduction.error);
    return { creditsUsed: credits, newBalance: deduction.newBalance };
  }

  return { creditsUsed: credits, newBalance: deduction.newBalance };
}
