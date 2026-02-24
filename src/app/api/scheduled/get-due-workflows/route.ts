/**
 * Internal API: POST /api/scheduled/get-due-workflows
 *
 * Called by the Cloudflare Worker every minute.
 * Scans all active workflows that have a scheduled-time-trigger node,
 * evaluates their cron expressions, and returns any that are due to run.
 *
 * The Worker then fires a workflow/execute event for each one via its own
 * sendToInngest function.
 *
 * Authentication: Bearer {SUPABASE_SERVICE_ROLE_KEY}
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { calculateNextRunTime } from '@/lib/workflows/schedule-scheduler';

export const runtime = 'nodejs';

function authenticateRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return false;
  return authHeader === `Bearer ${serviceRoleKey}`;
}

export interface DueWorkflow {
  workflowId: string;
  nodes: any[];
  edges: any[];
  userId: string;
  cronExpression: string;
  timezone: string;
}

export async function POST(request: NextRequest) {
  if (!authenticateRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const supabase = createAdminClient();

    // Fetch all active workflows
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('id, workflow_data, user_id')
      .eq('status', 'active');

    if (error) {
      console.error('[Scheduled Check] DB error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!workflows?.length) {
      return NextResponse.json({ due: [] });
    }

    const due: DueWorkflow[] = [];

    for (const workflow of workflows) {
      const nodes: any[] = (workflow as any).workflow_data?.nodes || [];
      const scheduleNode = nodes.find(
        (n: any) => n.data?.nodeId === 'scheduled-time-trigger'
      );
      if (!scheduleNode) continue;

      const config: any = scheduleNode.data?.config || {};
      const cronExpression: string = config.schedule;
      const timezone: string = config.timezone || 'UTC';
      if (!cronExpression) continue;

      // Check if the cron expression fired within the last minute:
      // Find the next occurrence AFTER (now - 60s). If it's <= now, it's due.
      let isDue = false;
      try {
        const nextAfterOneMinuteAgo = calculateNextRunTime(
          cronExpression,
          timezone,
          new Date(now.getTime() - 60 * 1000)
        );
        isDue = nextAfterOneMinuteAgo <= now;
      } catch (e) {
        console.error(
          `[Scheduled Check] Invalid cron "${cronExpression}" for workflow ${(workflow as any).id}:`,
          e
        );
        continue;
      }

      if (!isDue) continue;

      // Idempotency: skip if a run already started in the last 2 minutes
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
      const { data: recentRuns } = await supabase
        .from('workflow_executions')
        .select('id')
        .eq('workflow_id', (workflow as any).id)
        .gte('started_at', twoMinutesAgo)
        .limit(1);

      if (recentRuns?.length) {
        console.log(
          `[Scheduled Check] Workflow ${(workflow as any).id} already ran recently — skipping`
        );
        continue;
      }

      due.push({
        workflowId: (workflow as any).id,
        nodes: (workflow as any).workflow_data?.nodes || [],
        edges: (workflow as any).workflow_data?.edges || [],
        userId: (workflow as any).user_id,
        cronExpression,
        timezone,
      });

      console.log(
        `[Scheduled Check] Workflow ${(workflow as any).id} is due (cron: ${cronExpression}, tz: ${timezone})`
      );
    }

    return NextResponse.json({ due, checkedAt: now.toISOString() });
  } catch (error: any) {
    console.error('[Scheduled Check] Unexpected error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
