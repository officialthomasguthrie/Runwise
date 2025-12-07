/**
 * Credit Calculation System
 * Calculates credits based on OpenAI token usage
 * 1 credit = $0.01 of OpenAI usage
 */

/**
 * Calculate credits used based on token usage
 * GPT-4o pricing:
 * - Input: $2.50 per 1M tokens = $0.0025 per 1K tokens
 * - Output: $10.00 per 1M tokens = $0.01 per 1K tokens
 * 
 * Formula: credits = (inputTokens * 0.0025 + outputTokens * 0.01) * 100
 * Simplified: credits = inputTokens * 0.25 + outputTokens * 1.0
 */
export function calculateCreditsFromTokens(
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1000) * 0.0025; // Cost in dollars
  const outputCost = (outputTokens / 1000) * 0.01; // Cost in dollars
  const totalCost = inputCost + outputCost;
  
  // Convert to credits (1 credit = $0.01)
  // Round up to ensure we don't undercharge
  return Math.ceil(totalCost * 100);
}

/**
 * Estimate credits for workflow generation based on complexity
 * These are estimates used when exact token counts aren't available
 */
export function estimateWorkflowGenerationCredits(
  nodeCount: number,
  hasCustomNodes: boolean = false
): number {
  // Base estimate
  let credits = 2; // Small workflow (1-3 nodes)
  
  if (nodeCount <= 3) {
    credits = 2; // Small: ~3000 input + 1000 output
  } else if (nodeCount <= 7) {
    credits = 3; // Medium: ~3500 input + 2000 output
  } else {
    credits = 5; // Large: ~4000 input + 4000 output
  }
  
  // Add extra for complex custom nodes
  if (hasCustomNodes && nodeCount > 5) {
    credits += 2; // Complex: ~5000 input + 6000 output
  }
  
  return credits;
}

/**
 * Estimate credits for chat responses based on message length
 */
export function estimateChatResponseCredits(
  inputLength: number,
  outputLength: number
): number {
  // Rough estimate: ~4 characters per token
  const estimatedInputTokens = Math.ceil(inputLength / 4);
  const estimatedOutputTokens = Math.ceil(outputLength / 4);
  
  return calculateCreditsFromTokens(estimatedInputTokens, estimatedOutputTokens);
}

/**
 * Get monthly credit allocation based on subscription tier
 */
export function getMonthlyCreditAllocation(tier: string): number {
  switch (tier) {
    case 'personal':
      return 100; // $1/month OpenAI budget
    case 'professional':
      return 500; // $5/month OpenAI budget
    case 'enterprise':
      return 2000; // $20/month OpenAI budget (custom)
    default:
      return 0; // Free tier gets no credits
  }
}


