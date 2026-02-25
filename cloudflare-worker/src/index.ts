/**
 * Cloudflare Worker: Polling Triggers Scheduler
 *
 * Runs every 1 minute via cron trigger.
 * For each due polling trigger, calls the Next.js /api/polling/execute-trigger
 * endpoint which handles OAuth token retrieval and the external API call.
 * If new data is found, sends a workflow/execute event to Inngest.
 *
 * Architecture:
 * - Cron: Every 1 minute
 * - Fetches polling_triggers where next_poll_at <= now() AND enabled = true
 * - Delegates actual polling (OAuth, API calls) to Next.js API
 * - Sends workflow/execute to Inngest directly when new data is found
 * - Updates next_poll_at per trigger based on poll_interval
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  INNGEST_EVENT_KEY: string;
  INNGEST_SIGNING_KEY: string;
  INNGEST_BASE_URL?: string;
  APP_URL?: string; // e.g. https://runwiseai.app
}

interface PollingTrigger {
  id: string;
  workflow_id: string;
  trigger_type: string;
  config: Record<string, any>;
  last_cursor: string | null;
  last_seen_timestamp: string | null;
  next_poll_at: string;
  poll_interval: number;
  enabled: boolean;
}

interface PollResult {
  hasNewData: boolean;
  newData?: any[];
  newCursor?: string;
  newTimestamp?: string;
  error?: string;
  reason?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date().toISOString();
    console.log('[Worker] Cron triggered at', now);

    await runPollingTriggers(env);

    console.log('[Worker] Cron run complete');
  },
};

// ─── Polling Triggers ────────────────────────────────────────────────────────

async function runPollingTriggers(env: Env): Promise<void> {
  try {
    const dueTriggers = await getDuePollingTriggers(env, 50);

    if (dueTriggers.length === 0) {
      console.log('[Polling] No due triggers');
      return;
    }

    console.log(`[Polling] Found ${dueTriggers.length} due triggers`);

    let triggered = 0;
    let errors = 0;

    for (const trigger of dueTriggers) {
      try {
        const pollResult = await executeTrigger(env, trigger);

        if (pollResult.reason === 'workflow_inactive') {
          await disableTrigger(env, trigger.id);
          continue;
        }

        if (pollResult.error) {
          console.error(`[Polling] Error for trigger ${trigger.id}:`, pollResult.error);
          errors++;
          await updateTriggerNextPoll(env, trigger.id, 300);
          continue;
        }

        if (pollResult.hasNewData && pollResult.newData && pollResult.newData.length > 0) {
          const workflowData = await getWorkflowData(env, trigger.workflow_id);

          if (!workflowData) {
            await disableTrigger(env, trigger.id);
            continue;
          }

          const eventId = `${trigger.id}:${pollResult.newCursor || pollResult.newTimestamp || Date.now()}`;

          await sendToInngest(env, {
            eventId,
            workflowId: trigger.workflow_id,
            nodes: workflowData.nodes,
            edges: workflowData.edges,
            userId: workflowData.user_id,
            triggerType: trigger.trigger_type,
            items: pollResult.newData,
            triggerId: trigger.id,
          });

          triggered++;
        }

        await updateTriggerAfterPoll(
          env,
          trigger.id,
          pollResult.newCursor || null,
          pollResult.newTimestamp || null,
          trigger.poll_interval
        );
      } catch (error: any) {
        console.error(`[Polling] Exception for trigger ${trigger.id}:`, error.message);
        errors++;
        await updateTriggerNextPoll(env, trigger.id, 300);
      }
    }

    console.log(`[Polling] Done: triggered=${triggered}, errors=${errors}`);
  } catch (error: any) {
    console.error('[Polling] Fatal error:', error.message);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Call the Next.js polling execute endpoint to handle OAuth + API call
 */
async function executeTrigger(env: Env, trigger: PollingTrigger): Promise<PollResult> {
  const appUrl = env.APP_URL || 'https://runwiseai.app';

  const response = await fetch(`${appUrl}/api/polling/execute-trigger`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflowId: trigger.workflow_id,
      triggerType: trigger.trigger_type,
      lastTimestamp: trigger.last_seen_timestamp,
      lastCursor: trigger.last_cursor,
      config: trigger.config,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Poll API responded ${response.status}: ${errorText}`);
  }

  return (await response.json()) as PollResult;
}

/**
 * Fetch due polling triggers from Supabase
 */
async function getDuePollingTriggers(env: Env, limit: number): Promise<PollingTrigger[]> {
  const now = new Date().toISOString();
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/polling_triggers?next_poll_at=lte.${now}&enabled=eq.true&order=next_poll_at.asc&limit=${limit}`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch due triggers: ${response.statusText}`);
  }

  return ((await response.json()) as PollingTrigger[]) || [];
}

/**
 * Get workflow data (nodes, edges, user_id) for firing an Inngest event
 */
async function getWorkflowData(
  env: Env,
  workflowId: string
): Promise<{ nodes: any[]; edges: any[]; user_id: string } | null> {
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/workflows?id=eq.${workflowId}&status=eq.active&select=id,workflow_data,user_id`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) return null;

  const workflows = (await response.json()) as Array<{
    id: string;
    workflow_data?: { nodes?: any[]; edges?: any[] };
    user_id: string;
  }>;

  if (!workflows?.length) return null;

  const workflow = workflows[0];
  return {
    nodes: workflow.workflow_data?.nodes || [],
    edges: workflow.workflow_data?.edges || [],
    user_id: workflow.user_id,
  };
}


/**
 * Send workflow/execute event to Inngest (polling format — wraps items in triggerData)
 */
async function sendToInngest(
  env: Env,
  data: {
    eventId: string;
    workflowId: string;
    nodes: any[];
    edges: any[];
    userId: string;
    triggerType: string;
    items: any[];
    triggerId: string;
  }
): Promise<void> {
  const inngestUrl = env.INNGEST_BASE_URL || 'https://api.inngest.com';

  const response = await fetch(`${inngestUrl}/e/${env.INNGEST_EVENT_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'workflow/execute',
      id: data.eventId,
      data: {
        workflowId: data.workflowId,
        nodes: data.nodes,
        edges: data.edges,
        userId: data.userId,
        triggerType: 'polling',
        triggerData: {
          triggerType: data.triggerType,
          items: data.items,
          triggerId: data.triggerId,
          polledAt: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send Inngest event: ${response.statusText} - ${errorText}`);
  }
}

/**
 * Disable a polling trigger (workflow no longer active)
 */
async function disableTrigger(env: Env, triggerId: string): Promise<void> {
  await fetch(`${env.SUPABASE_URL}/rest/v1/polling_triggers?id=eq.${triggerId}`, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ enabled: false, updated_at: new Date().toISOString() }),
  });
}

/**
 * Update trigger after successful poll (cursor, timestamp, next_poll_at)
 */
async function updateTriggerAfterPoll(
  env: Env,
  triggerId: string,
  newCursor: string | null,
  newTimestamp: string | null,
  pollInterval: number
): Promise<void> {
  const nextPollAt = new Date(Date.now() + pollInterval * 1000).toISOString();
  const updateData: any = { next_poll_at: nextPollAt, updated_at: new Date().toISOString() };
  if (newCursor !== null) updateData.last_cursor = newCursor;
  if (newTimestamp !== null) updateData.last_seen_timestamp = newTimestamp;

  await fetch(`${env.SUPABASE_URL}/rest/v1/polling_triggers?id=eq.${triggerId}`, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(updateData),
  });
}

/**
 * Update only next_poll_at (for retries / errors)
 */
async function updateTriggerNextPoll(env: Env, triggerId: string, delaySeconds: number): Promise<void> {
  const nextPollAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
  await fetch(`${env.SUPABASE_URL}/rest/v1/polling_triggers?id=eq.${triggerId}`, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ next_poll_at: nextPollAt, updated_at: new Date().toISOString() }),
  });
}
