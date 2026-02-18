/**
 * API Route: /api/ai/clarification
 * Analyzes a workflow prompt and determines if clarification questions are needed
 * before generating the workflow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { analyzeClarificationNeeds } from '@/lib/ai/clarification';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service is not configured.' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { prompt, conversationHistory } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    // Analyze clarification needs
    const analysis = await analyzeClarificationNeeds(prompt, conversationHistory);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Error in clarification analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze clarification needs' },
      { status: 500 }
    );
  }
}

