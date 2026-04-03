import { createAdminClient } from '@/lib/supabase-admin';

export type ChatCreditGateState = {
  subscriptionTier: string;
  hasUsedFreeAction: boolean;
};

/**
 * Same subscription / free-action semantics as POST /api/ai/chat:
 * free users without a first workflow generation get unlimited AI without credit checks;
 * after that (or when paid), credits apply unless token balance overrides the chat block.
 */
export async function loadChatCreditGateState(userId: string): Promise<ChatCreditGateState> {
  let subscriptionTier = 'free';
  let hasUsedFreeAction = false;

  try {
    const adminSupabase = createAdminClient();
    const { data: userRow, error: userError } = await (adminSupabase as any)
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (!userError && userRow) {
      subscriptionTier = (userRow as any)?.subscription_tier || 'free';

      if (subscriptionTier === 'free') {
        try {
          const { data: freeActionRow, error: freeActionError } = await (adminSupabase as any)
            .from('users')
            .select('has_used_free_action')
            .eq('id', userId)
            .single();

          if (!freeActionError && freeActionRow) {
            hasUsedFreeAction = (freeActionRow as any)?.has_used_free_action === true;
          }
        } catch {
          hasUsedFreeAction = false;
        }
      }
    }
  } catch {
    subscriptionTier = 'free';
    hasUsedFreeAction = false;
  }

  return { subscriptionTier, hasUsedFreeAction };
}

export function shouldApplyChatCredits(state: ChatCreditGateState): boolean {
  return state.subscriptionTier !== 'free' || state.hasUsedFreeAction;
}

/**
 * For free users who already used their one-time workflow generation: require credits_balance &gt; 0
 * (same override as /api/ai/chat). Returns a 402 Response body to return from the route, or null if allowed.
 */
export async function blockIfFreeTierNeedsCredits(
  userId: string,
  state: ChatCreditGateState
): Promise<Response | null> {
  if (state.subscriptionTier !== 'free' || !state.hasUsedFreeAction) {
    return null;
  }

  try {
    const adminSupabase = createAdminClient();
    const { data: creditsRow } = await (adminSupabase as any)
      .from('users')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    const creditsBalance: number = (creditsRow as any)?.credits_balance ?? 0;
    if (creditsBalance > 0) {
      return null;
    }
  } catch (e) {
    console.error('[chat-credit-gate] Error checking credits_balance:', e);
  }

  return new Response(
    JSON.stringify({
      error: 'You have reached your free limit. Upgrade to continue.',
      requiresSubscription: true,
    }),
    { status: 402, headers: { 'Content-Type': 'application/json' } }
  );
}
