/**
 * GET /api/webhooks/sample/[workflowId]
 *
 * Returns the last captured webhook payload for a workflow.
 * This is used by the "Test Webhook" UI in the workflow editor so users can
 * fire a real webhook once and then see — and insert — every field it contained.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params;

  // Authenticate the caller
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch the workflow (admin client so we can read it regardless of RLS)
  const admin = createAdminClient();
  const { data: workflow, error } = await (admin as any)
    .from('workflows')
    .select('id, user_id, workflow_data')
    .eq('id', workflowId)
    .single();

  if (error || !workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Ensure the requesting user owns this workflow
  if (workflow.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sample = workflow.workflow_data?.lastWebhookSample ?? null;
  return NextResponse.json({ sample });
}
