/**
 * API Route: /api/ai/chat
 * Handles chat interactions with the AI assistant with streaming support
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { generateStreamingChatResponse } from '@/lib/ai/chat';
import type { ChatRequest } from '@/lib/ai/types';
import { checkCreditsAvailable, deductCredits } from '@/lib/credits/tracker';
import { calculateCreditsFromTokens, estimateChatResponseCredits } from '@/lib/credits/calculator';

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

    console.log('User authenticated:', user.id);

    // Check subscription tier - free users can chat, but check if they've reached workflow limit
    try {
      const { data: userRow, error: userError } = await (supabase as any)
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      const subscriptionTier = userError
        ? 'free'
        : ((userRow as any)?.subscription_tier || 'free');

      // Free users can chat, but check if they've reached their workflow generation limit
      if (subscriptionTier === 'free') {
        // Check if free user has generated a workflow
        const { count, error: countError } = await supabase
          .from('workflows')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('ai_generated', true);
        
        if (!countError && count && count >= 1) {
          // Free user has generated a workflow, block AI chat
          return new Response(
            JSON.stringify({
              error: 'You have reached your free limit. Upgrade to continue.',
              requiresSubscription: true,
            }),
            { status: 402, headers: { 'Content-Type': 'application/json' } }
          );
        }
        // Free user hasn't generated a workflow yet, allow chat
      }
    } catch (subError) {
      console.error('Error checking subscription tier in /api/ai/chat:', subError);
      // On error, allow the request to proceed (fail open for chat)
    }

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

    // Check if user has enough credits
    const creditCheck = await checkCreditsAvailable(user.id, estimatedCredits);
    if (!creditCheck.available) {
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

    console.log('Calling generateStreamingChatResponse...');
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Generate streaming chat response
          await generateStreamingChatResponse({
            message: body.message,
            chatId: body.chatId,
            conversationHistory: body.conversationHistory || [],
            context: body.context,
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
              // Calculate exact credits from token usage
              let creditsUsed = estimatedCredits;
              
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
              }

              const data = JSON.stringify({
                type: 'complete',
                message: fullMessage,
                metadata: {
                  ...metadata,
                  credits: {
                    used: creditsUsed,
                    remaining: deduction.newBalance,
                  },
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

