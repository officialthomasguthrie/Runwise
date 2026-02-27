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

    // Pass the scheduled time so next_poll_at is computed relative to the
    // cron boundary rather than mid-loop, preventing the 2-minute polling bug.
    await runPollingTriggers(env, event.scheduledTime);

    console.log('[Worker] Cron run complete');
  },
};

// ─── Polling Triggers ────────────────────────────────────────────────────────

async function runPollingTriggers(env: Env, cronScheduledTime?: number): Promise<void> {
  // Use the cron's own scheduled time as the base for next_poll_at calculations.
  // If unavailable, fall back to Date.now().
  const cronStartMs = cronScheduledTime ?? Date.now();

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
          // The execute-trigger API confirmed this workflow is not active in the DB.
          // Disable the polling trigger so it stops being picked up on future polls.
          // This is the reliable cleanup path for cases where the activation route
          // failed to set enabled=false when the user deactivated the workflow.
          console.log(`[Polling] Trigger ${trigger.id}: workflow inactive — disabling trigger`);
          await disableTrigger(env, trigger.id);
          continue;
        }

        if (pollResult.error) {
          console.error(`[Polling] Error for trigger ${trigger.id}:`, pollResult.error);
          errors++;
          await updateTriggerNextPoll(env, trigger.id, trigger.poll_interval || 60, cronStartMs);
          continue;
        }

        if (pollResult.hasNewData && pollResult.newData && pollResult.newData.length > 0) {
          // Use sorted message IDs so Inngest correctly deduplicates re-polls of the same items
          const msgIds = pollResult.newData
            .map((m: any) => m.id)
            .filter(Boolean)
            .sort()
            .join(',');
          const eventId = `${trigger.id}:${msgIds || pollResult.newCursor || pollResult.newTimestamp || Date.now()}`;

          console.log(`[Polling] Trigger ${trigger.id}: found ${pollResult.newData.length} item(s), eventId=${eventId}`);

          // ── Agent trigger: fire agent/run ────────────────────────────────
          if (trigger.config?.isAgent === true) {
            const { agentId, behaviourId, userId } = trigger.config as {
              agentId: string;
              behaviourId: string;
              userId: string;
            };

            if (!agentId || !userId) {
              console.error(`[Polling] Agent trigger ${trigger.id} missing agentId or userId in config`);
              await disableTrigger(env, trigger.id);
              continue;
            }

            await sendAgentRunToInngest(env, {
              eventId,
              agentId,
              userId,
              behaviourId: behaviourId ?? null,
              triggerType: trigger.trigger_type,
              items: pollResult.newData,
            });
          } else {
            // ── Workflow trigger: existing path ────────────────────────────
            const workflowData = await getWorkflowData(env, trigger.workflow_id);

            if (!workflowData) {
              await disableTrigger(env, trigger.id);
              continue;
            }

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
          }

          triggered++;
        }

        await updateTriggerAfterPoll(
          env,
          trigger.id,
          pollResult.newCursor || null,
          pollResult.newTimestamp || null,
          trigger.poll_interval,
          cronStartMs
        );
      } catch (error: any) {
        console.error(`[Polling] Exception for trigger ${trigger.id}:`, error.message);
        errors++;
        await updateTriggerNextPoll(env, trigger.id, trigger.poll_interval || 60, cronStartMs);
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
  const inngestUrl = env.INNGEST_BASE_URL || 'https://inn.gs';

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
 * Send agent/run event to Inngest when an agent polling trigger fires.
 */
async function sendAgentRunToInngest(
  env: Env,
  data: {
    eventId: string;
    agentId: string;
    userId: string;
    behaviourId: string | null;
    triggerType: string;
    items: any[];
  }
): Promise<void> {
  const inngestUrl = env.INNGEST_BASE_URL || 'https://inn.gs';

  const response = await fetch(`${inngestUrl}/e/${env.INNGEST_EVENT_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'agent/run',
      id: data.eventId,
      data: {
        agentId: data.agentId,
        userId: data.userId,
        behaviourId: data.behaviourId,
        triggerType: data.triggerType,
        triggerData: {
          items: data.items,
          polledAt: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send agent/run Inngest event: ${response.statusText} - ${errorText}`);
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
 * Update trigger after successful poll (cursor, timestamp, next_poll_at).
 * Uses pollStartTime (captured before any HTTP calls) so that HTTP latency does not
 * push next_poll_at past the next cron boundary, which would cause the trigger to be
 * skipped an extra minute and only fire every 2 minutes instead of every 1 minute.
 */
async function updateTriggerAfterPoll(
  env: Env,
  triggerId: string,
  newCursor: string | null,
  newTimestamp: string | null,
  pollInterval: number,
  pollStartTime: number
): Promise<void> {
  const nextPollAt = new Date(pollStartTime + pollInterval * 1000).toISOString();
  const updateData: any = { next_poll_at: nextPollAt, updated_at: new Date().toISOString() };
  if (newCursor !== null) updateData.last_cursor = newCursor;
  if (newTimestamp !== null) updateData.last_seen_timestamp = newTimestamp;

  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/polling_triggers?id=eq.${triggerId}`, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`[Polling] Failed to update trigger ${triggerId}: HTTP ${response.status} ${body}`);
  } else {
    console.log(`[Polling] Trigger ${triggerId} updated: next_poll_at=${nextPollAt}${newTimestamp ? `, last_seen=${newTimestamp}` : ''}`);
  }
}

/**
 * Update only next_poll_at (for retries / errors).
 */
async function updateTriggerNextPoll(env: Env, triggerId: string, delaySeconds: number, pollStartTime: number): Promise<void> {
  const nextPollAt = new Date(pollStartTime + delaySeconds * 1000).toISOString();
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
