/**
 * API Route: /api/ai/generate-workflow
 * Generates workflows from natural language prompts using OpenAI with streaming support
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  generateWorkflowFromPromptStreaming,
  getSimplifiedNodeList,
} from '@/lib/ai/workflow-generator';
import { getIntegrationContextForAI } from '@/lib/integrations/ai-context';
import type {
  WorkflowGenerationRequest,
} from '@/lib/ai/types';
import { checkCreditsAvailable, deductCredits } from '@/lib/credits/tracker';
import { calculateCreditsFromTokens, estimateWorkflowGenerationCredits } from '@/lib/credits/calculator';
import { assertStepsLimit } from '@/lib/usage';
import { subscriptionTierToPlanId } from '@/lib/plans/config';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service is not configured. Please contact support.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if free user has already generated a workflow
    // Free users can generate ONE workflow, then they must upgrade
    let subscriptionTier = 'free';
    let hasUsedFreeAction = false;
    
    try {
      const adminSupabase = createAdminClient();
      const { data: userRow, error: userError } = await (adminSupabase as any)
        .from('users')
        .select('subscription_tier, has_used_free_action')
        .eq('id', user.id)
        .single();

      if (!userError && userRow) {
        subscriptionTier = (userRow as any)?.subscription_tier || 'free';
        
        if (subscriptionTier === 'free') {
          // Check if column exists (handle migration scenario gracefully)
          hasUsedFreeAction = (userRow as any)?.has_used_free_action === true;
          
          if (hasUsedFreeAction) {
            // Free user has already generated a workflow, block further workflow generation
            return new Response(
              JSON.stringify({
                error: 'You have reached your free limit. You can generate one workflow for free. Upgrade to continue.',
                requiresSubscription: true,
              }),
              { status: 402, headers: { 'Content-Type': 'application/json' } }
            );
          }
          // Free user hasn't generated a workflow yet, allow generation (will be marked after successful generation)
        }
      }
    } catch (limitError: any) {
      console.error('Error checking free limit in workflow generation:', limitError);
      // On error, treat as free user who hasn't generated workflow yet (fail open)
      // This ensures free users aren't blocked by database errors
      subscriptionTier = 'free';
      hasUsedFreeAction = false;
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.userPrompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: userPrompt is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get available nodes (use provided or fetch all)
    // getSimplifiedNodeList() already filters out nodes that require unavailable integrations
    const availableNodes =
      body.availableNodes && body.availableNodes.length > 0
        ? body.availableNodes
        : getSimplifiedNodeList();

    // Extract existing nodes/edges from currentWorkflow if provided
    const existingNodes = body.currentWorkflow?.nodes || body.existingNodes || [];
    const existingEdges = body.currentWorkflow?.edges || body.existingEdges || [];

    // Get user's integration context for AI
    const integrationContext = await getIntegrationContextForAI(user.id);

    // Estimate credits needed (we'll calculate exact amount after generation)
    const estimatedCredits = estimateWorkflowGenerationCredits(
      existingNodes.length + 5, // Estimate based on existing + new nodes
      false // Will check for custom nodes after generation
    );

    // Only check credits for paid users or free users who have already used their free action
    // Free users who haven't used their free action yet should not be blocked by credit checks
    const shouldCheckCredits = subscriptionTier !== 'free' || hasUsedFreeAction;
    console.log('[Workflow API] Credit check decision:', { 
      subscriptionTier, 
      hasUsedFreeAction, 
      shouldCheckCredits,
      userId: user.id 
    });
    
    if (shouldCheckCredits) {
      console.log('[Workflow API] Checking credits for user:', user.id);
      const creditCheck = await checkCreditsAvailable(user.id, estimatedCredits);
      if (!creditCheck.available) {
        console.log('[Workflow API] Credit check failed:', creditCheck);
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
      console.log('[Workflow API] Credit check passed');
    } else {
      console.log('[Workflow API] Skipping credit check for free user who hasn\'t used free action');
    }

    // Track token usage for credit deduction
    let tokenUsage: { inputTokens: number; outputTokens: number } | null = null;

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Generate workflow with streaming
          await generateWorkflowFromPromptStreaming({
            userPrompt: body.userPrompt,
            availableNodes,
            existingNodes,
            existingEdges,
            integrationContext,
            onChunk: (jsonChunk: string, isComplete: boolean) => {
              const data = JSON.stringify({
                type: 'json-chunk',
                content: jsonChunk,
                isComplete,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            onComplete: async (workflow: any, usage?: { inputTokens: number; outputTokens: number }) => {
              // Mark free action as used for free users BEFORE other checks (to prevent race conditions)
              if (subscriptionTier === 'free' && !hasUsedFreeAction) {
                try {
                  const adminSupabase = createAdminClient();
                  const { error: markError } = await (adminSupabase as any)
                    .from('users')
                    .update({ has_used_free_action: true })
                    .eq('id', user.id)
                    .eq('subscription_tier', 'free');
                  
                  if (markError) {
                    console.error('Error marking free action as used:', markError);
                  } else {
                    console.log('Marked free action as used for workflow generation:', user.id);
                  }
                } catch (markError) {
                  console.error('Error marking free action as used:', markError);
                  // Don't block the response, just log the error
                }
              }

              // Check step limit based on user's plan
              const adminSupabase = createAdminClient();
              const { data: userRow } = await (adminSupabase as any)
                .from('users')
                .select('subscription_tier')
                .eq('id', user.id)
                .single();
              const subscriptionTierForPlan = (userRow as any)?.subscription_tier || 'free';
              const planId = subscriptionTierToPlanId(subscriptionTierForPlan);
              
              // Count nodes in generated workflow (excluding placeholder nodes)
              const nodes = workflow.nodes || [];
              const nodeCount = nodes.filter((node: any) => 
                node.type !== 'placeholder' && node.data?.nodeId !== 'placeholder'
              ).length;
              
              // Check step limit
              try {
                assertStepsLimit(planId, nodeCount);
              } catch (limitError: any) {
                const errorData = JSON.stringify({
                  type: 'error',
                  error: limitError.message,
                });
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                controller.close();
                return;
              }
              
              // Only calculate and deduct credits for paid users or free users who have used their free action
              // Free users using their first action should not be charged credits
              let creditsUsed = 0;
              let deductionBalance = 0;
              
              if (subscriptionTier !== 'free' || hasUsedFreeAction) {
                // Calculate exact credits from token usage
                creditsUsed = estimatedCredits;
                
                // Use actual token usage if available, otherwise estimate
                if (usage) {
                  creditsUsed = calculateCreditsFromTokens(
                    usage.inputTokens,
                    usage.outputTokens
                  );
                  tokenUsage = usage; // Store for reference
                } else {
                  // Estimate based on workflow complexity
                  const hasCustomNodes = workflow.nodes?.some((n: any) => 
                    n.data?.nodeId === 'CUSTOM_GENERATED'
                  ) || false;
                  creditsUsed = estimateWorkflowGenerationCredits(nodeCount, hasCustomNodes);
                }

                // Deduct credits after successful generation
                const deduction = await deductCredits(
                  user.id,
                  creditsUsed,
                  'workflow_generation',
                  {
                    workflowName: workflow.workflowName,
                    nodeCount: nodeCount,
                    prompt: body.userPrompt.substring(0, 100), // First 100 chars
                  }
                );

                if (!deduction.success) {
                  console.error('Failed to deduct credits:', deduction.error);
                  // Still return workflow, but log the error
                } else {
                  deductionBalance = deduction.newBalance;
                }
              }

              const data = JSON.stringify({
                type: 'complete',
                success: true,
                workflow,
                ...(subscriptionTier !== 'free' || hasUsedFreeAction ? {
                  credits: {
                    used: creditsUsed,
                    remaining: deductionBalance,
                  },
                } : {}),
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
          console.error('Error in streaming workflow generation:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message || 'Failed to generate workflow',
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
    console.error('Error in POST /api/ai/generate-workflow:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate workflow',
        details: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

