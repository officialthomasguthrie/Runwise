/**
 * API Route: /api/ai/generate-workflow
 * Generates workflows from natural language prompts using OpenAI with streaming support
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  generateWorkflowFromPromptStreaming,
  getSimplifiedNodeList,
} from '@/lib/ai/workflow-generator';
import type {
  WorkflowGenerationRequest,
} from '@/lib/ai/types';

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
            onComplete: (workflow: any) => {
              const data = JSON.stringify({
                type: 'complete',
                success: true,
                workflow,
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

