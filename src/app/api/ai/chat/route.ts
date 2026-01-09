/**
 * API Route: /api/ai/chat
 * Handles chat interactions with the AI assistant with streaming support
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { generateStreamingChatResponse } from '@/lib/ai/chat';
import type { ChatRequest } from '@/lib/ai/types';
import { checkCreditsAvailable, deductCredits } from '@/lib/credits/tracker';
import { calculateCreditsFromTokens, estimateChatResponseCredits } from '@/lib/credits/calculator';
import { getIntegrationContextForAI } from '@/lib/integrations/ai-context';

export async function POST(request: NextRequest) {
  try {
    console.log('Chat API route called');
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Chat API] User authenticated:', user.id);

    // Check subscription tier - free users can chat, but check if they've used their one-time action
    let subscriptionTier = 'free';
    let hasUsedFreeAction = false;
    
    try {
      console.log('[Chat API] Fetching user subscription data for:', user.id);
      const adminSupabase = createAdminClient();
      
      // First, fetch subscription tier (this column should always exist)
      const { data: userRow, error: userError } = await (adminSupabase as any)
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      console.log('[Chat API] User query result (subscription):', { 
        hasError: !!userError, 
        hasData: !!userRow,
        error: userError?.message,
        subscriptionTier: userRow?.subscription_tier
      });

      if (!userError && userRow) {
        subscriptionTier = (userRow as any)?.subscription_tier || 'free';
        console.log('[Chat API] User subscription tier:', subscriptionTier);
        
        // Free users can chat unlimited times UNTIL they generate a workflow
        // Once they generate a workflow, has_used_free_action will be true and they'll be blocked
        if (subscriptionTier === 'free') {
          // Try to fetch has_used_free_action separately (handle migration scenario where column might not exist)
          try {
            const { data: freeActionRow, error: freeActionError } = await (adminSupabase as any)
              .from('users')
              .select('has_used_free_action')
              .eq('id', user.id)
              .single();
            
            if (!freeActionError && freeActionRow) {
              // Only treat as true if explicitly true (not null, undefined, or false)
              const freeActionValue = (freeActionRow as any)?.has_used_free_action;
              hasUsedFreeAction = freeActionValue === true;
              
              console.log('[Chat API] Free user free action check:', { 
                freeActionValue,
                hasUsedFreeAction,
                isNull: freeActionValue === null,
                isUndefined: freeActionValue === undefined,
                isBoolean: typeof freeActionValue === 'boolean'
              });
            } else {
              // Column might not exist - treat as not used (safe default)
              console.log('[Chat API] Could not fetch has_used_free_action (column may not exist), treating as false');
              hasUsedFreeAction = false;
            }
          } catch (freeActionCheckError: any) {
            // Column doesn't exist or other error - treat as not used (safe default)
            console.log('[Chat API] Error checking has_used_free_action (column may not exist):', freeActionCheckError?.message);
            hasUsedFreeAction = false;
          }
          
          if (hasUsedFreeAction) {
            console.log('[Chat API] Free user has generated a workflow - blocking further messages');
            // Free user has generated a workflow, block further AI chat messages
            return new Response(
              JSON.stringify({
                error: 'You have reached your free limit. Upgrade to continue chatting.',
                requiresSubscription: true,
              }),
              { status: 402, headers: { 'Content-Type': 'application/json' } }
            );
          }
          console.log('[Chat API] Free user can chat (no workflow generated yet) - allowing unlimited messages');
          // Free user hasn't generated a workflow yet, allow unlimited chat messages
        } else {
          console.log('[Chat API] Paid user - will check credits normally');
        }
      } else {
        console.log('[Chat API] Error fetching user data, defaulting to free user');
        // On query error, default to free user who hasn't used action
        subscriptionTier = 'free';
        hasUsedFreeAction = false;
      }
    } catch (subError: any) {
      console.error('[Chat API] Exception checking subscription tier:', subError);
      console.error('[Chat API] Exception details:', subError?.message, subError?.stack);
      // On error, treat as free user who hasn't used action yet (fail open for chat)
      // This ensures free users aren't blocked by database errors
      subscriptionTier = 'free';
      hasUsedFreeAction = false;
    }
    
    console.log('[Chat API] Final subscription check values:', { subscriptionTier, hasUsedFreeAction });

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured in environment variables');
      return new Response(
        JSON.stringify({ error: 'AI service is not configured. Please add OPENAI_API_KEY to .env.local file.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('OpenAI API key is present');

    // Parse request body with error handling
    let body: ChatRequest;
    try {
      const rawBody = await request.text();
      console.log('Raw request body length:', rawBody.length);
      
      if (!rawBody || rawBody.trim() === '') {
        console.error('Empty request body received');
        return new Response(
          JSON.stringify({ error: 'Request body is empty' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      body = JSON.parse(rawBody);
      console.log('Request body parsed:', { message: body.message, chatId: body.chatId });
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError.message);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!body.message || !body.chatId) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message and chatId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Estimate credits needed for chat response
    const estimatedCredits = estimateChatResponseCredits(
      body.message.length,
      500 // Estimate average response length
    );

    // Only check credits for paid users or free users who have generated a workflow
    // Free users who haven't generated a workflow yet can chat unlimited times without credit checks
    // CRITICAL: For free users who haven't generated a workflow, we MUST skip credit check
    const isFreeUserWithoutWorkflow = subscriptionTier === 'free' && !hasUsedFreeAction;
    const shouldCheckCredits = !isFreeUserWithoutWorkflow;
    
    console.log('[Chat API] Credit check decision:', { 
      subscriptionTier, 
      hasUsedFreeAction,
      isFreeUserWithoutWorkflow,
      shouldCheckCredits,
      userId: user.id,
      estimatedCredits
    });
    
    if (shouldCheckCredits) {
      console.log('[Chat API] ✓ Checking credits for user (paid or generated workflow):', user.id);
      const creditCheck = await checkCreditsAvailable(user.id, estimatedCredits);
      console.log('[Chat API] Credit check result:', creditCheck);
      
      if (!creditCheck.available) {
        console.log('[Chat API] ✗ Credit check failed - blocking request');
        return new Response(
          JSON.stringify({ 
            error: creditCheck.message || 'Insufficient credits',
            credits: {
              required: estimatedCredits,
              available: creditCheck.balance,
            }
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } } // 402 Payment Required
        );
      }
      console.log('[Chat API] ✓ Credit check passed');
    } else {
      console.log('[Chat API] ✓ SKIPPING credit check - free user who hasn\'t generated workflow (unlimited messages allowed)');
    }

    console.log('Calling generateStreamingChatResponse...');
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get user's integration context for AI
          const integrationContext = await getIntegrationContextForAI(user.id);
          
          // Generate streaming chat response
          await generateStreamingChatResponse({
            message: body.message,
            chatId: body.chatId,
            conversationHistory: body.conversationHistory || [],
            context: body.context,
            integrationContext,
            onChunk: (chunk: string, isComplete: boolean, metadata?: any) => {
              const data = JSON.stringify({
                type: 'chunk',
                content: chunk,
                isComplete,
                metadata,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            onComplete: async (fullMessage: string, metadata?: any) => {
              // NOTE: We do NOT mark has_used_free_action when free users send messages
              // Free users can send unlimited messages until they generate a workflow
              // The flag is only set when they generate a workflow (in generate-workflow route)

              // Only calculate and deduct credits for paid users or free users who have used their free action
              // Free users using their first action should not be charged credits
              let creditsUsed = 0;
              let deductionBalance = 0;
              
              if (subscriptionTier !== 'free' || hasUsedFreeAction) {
                // Calculate exact credits from token usage
                creditsUsed = estimatedCredits;
                
                if (metadata?.tokenUsage) {
                  creditsUsed = calculateCreditsFromTokens(
                    metadata.tokenUsage.inputTokens,
                    metadata.tokenUsage.outputTokens
                  );
                } else {
                  // Estimate based on message lengths
                  creditsUsed = estimateChatResponseCredits(
                    body.message.length,
                    fullMessage.length
                  );
                }

                // Deduct credits after successful chat response
                const deduction = await deductCredits(
                  user.id,
                  creditsUsed,
                  'chat_message',
                  {
                    chatId: body.chatId,
                    messageLength: body.message.length,
                    responseLength: fullMessage.length,
                  }
                );

                if (!deduction.success) {
                  console.error('Failed to deduct credits:', deduction.error);
                  // Still return response, but log the error
                } else {
                  deductionBalance = deduction.newBalance;
                }
              }

              const data = JSON.stringify({
                type: 'complete',
                message: fullMessage,
                metadata: {
                  ...metadata,
                  ...(subscriptionTier !== 'free' || hasUsedFreeAction ? {
                    credits: {
                      used: creditsUsed,
                      remaining: deductionBalance,
                    },
                  } : {}),
                },
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            },
            onError: (error: Error) => {
              const data = JSON.stringify({
                type: 'error',
                error: error.message,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            },
          });
        } catch (error: any) {
          console.error('Error in streaming:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message || 'Failed to generate chat response',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/ai/chat:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate chat response',
        details: error.message,
        type: error.name,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

