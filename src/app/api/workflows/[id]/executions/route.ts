/**
 * API Route: /api/workflows/[id]/executions
 * Gets the latest execution for a workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const { id: workflowId } = await context.params;

    console.log('📥 GET /api/workflows/[id]/executions:', {
      workflowId,
      userId: user.id,
    });

    // Get most recent execution for this workflow
    const { data: executions, error: executionsError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10); // Get more executions to help debug

    console.log('📋 Executions query result:', {
      count: executions?.length || 0,
      error: executionsError?.message,
      executions: executions?.map((e: any) => ({
        id: e.id,
        workflow_id: e.workflow_id,
        status: e.status,
        created_at: e.created_at,
        started_at: e.started_at,
      })),
    });

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

