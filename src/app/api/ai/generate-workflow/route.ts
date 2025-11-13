/**
 * API Route: /api/ai/generate-workflow
 * Generates workflows from natural language prompts using OpenAI
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  generateWorkflowFromPrompt,
  getSimplifiedNodeList,
} from '@/lib/ai/workflow-generator';
import type {
  WorkflowGenerationRequest,
  WorkflowGenerationResponse,
} from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Parse request body
    const body: WorkflowGenerationRequest = await request.json();

    // Validate required fields
    if (!body.userPrompt) {
      return NextResponse.json(
        { error: 'Missing required field: userPrompt is required' },
        { status: 400 }
      );
    }

    // Get available nodes (use provided or fetch all)
    const availableNodes =
      body.availableNodes && body.availableNodes.length > 0
        ? body.availableNodes
        : getSimplifiedNodeList();

    // Generate workflow
    const generationResult: WorkflowGenerationResponse =
      await generateWorkflowFromPrompt({
        userPrompt: body.userPrompt,
        availableNodes,
        existingNodes: body.existingNodes,
        existingEdges: body.existingEdges,
      });

    if (!generationResult.success) {
      return NextResponse.json(
        {
          error: generationResult.error || 'Failed to generate workflow',
          workflow: generationResult.workflow,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(generationResult);
  } catch (error: any) {
    console.error('Error in POST /api/ai/generate-workflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate workflow',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

