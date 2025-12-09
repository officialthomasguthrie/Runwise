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
import type {
  WorkflowGenerationRequest,
} from '@/lib/ai/types';
import { checkCreditsAvailable, deductCredits } from '@/lib/credits/tracker';
import { calculateCreditsFromTokens, estimateWorkflowGenerationCredits } from '@/lib/credits/calculator';
import { assertStepsLimit } from '@/lib/usage';

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
    const availableNodes =
      body.availableNodes && body.availableNodes.length > 0
        ? body.availableNodes
        : getSimplifiedNodeList();

    // Extract existing nodes/edges from currentWorkflow if provided
    const existingNodes = body.currentWorkflow?.nodes || body.existingNodes || [];
    const existingEdges = body.currentWorkflow?.edges || body.existingEdges || [];

    // Estimate credits needed (we'll calculate exact amount after generation)
    const estimatedCredits = estimateWorkflowGenerationCredits(
      existingNodes.length + 5, // Estimate based on existing + new nodes
      false // Will check for custom nodes after generation
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
            onChunk: (jsonChunk: string, isComplete: boolean) => {
              const data = JSON.stringify({
                type: 'json-chunk',
                content: jsonChunk,
                isComplete,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            onComplete: async (workflow: any, usage?: { inputTokens: number; outputTokens: number }) => {
              // Check step limit based on user's plan
              const adminSupabase = createAdminClient();
              const { data: userRow } = await (adminSupabase as any)
                .from('users')
                .select('plan_id')
                .eq('id', user.id)
                .single();
              const planId = (userRow as any)?.plan_id ?? 'personal';
              
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
              
              // Calculate exact credits from token usage
              let creditsUsed = estimatedCredits;
              
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
              }

              const data = JSON.stringify({
                type: 'complete',
                success: true,
                workflow,
                credits: {
                  used: creditsUsed,
                  remaining: deduction.newBalance,
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

