/**
 * API Route: /api/workflows/[id]/executions
 * Gets the latest execution for a workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const workflowId = params.id;

    // Get most recent execution for this workflow
    const { data: executions, error: executionsError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (executionsError) {
      return NextResponse.json(
        { error: 'Failed to get executions' },
        { status: 500 }
      );
    }

    return NextResponse.json(executions || []);
  } catch (error: any) {
    console.error('Error in GET /api/workflows/[id]/executions:', error);
    return NextResponse.json(
      {
        error: 'Failed to get executions',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

