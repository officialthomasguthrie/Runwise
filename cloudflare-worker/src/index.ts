/**
 * Cloudflare Worker: Polling Triggers Engine
 * 
 * Runs every 1 minute via cron trigger.
 * Fetches due polling triggers from database and polls them.
 * Only emits Inngest events when new data is detected.
 * 
 * Architecture:
 * - Cron: Every 1 minute
 * - Fetches triggers where next_poll_at <= now()
 * - Batches: Max 50 triggers per run (Worker limit)
 * - Idempotent: Event IDs prevent duplicate workflow runs
 * - Updates next_poll_at per trigger based on poll_interval
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  INNGEST_EVENT_KEY: string;
  INNGEST_SIGNING_KEY: string;
  INNGEST_BASE_URL?: string;
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
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[Polling Worker] Cron triggered at', new Date().toISOString());
    
    try {
      // Step 1: Fetch due triggers (next_poll_at <= now, enabled = true)
      // Limit to 50 to respect Worker CPU time limits
      const dueTriggers = await getDuePollingTriggers(env, 50);
      
      if (dueTriggers.length === 0) {
        console.log('[Polling Worker] No due triggers found');
        return;
      }
      
      console.log(`[Polling Worker] Found ${dueTriggers.length} due triggers`);
      
      // Step 2: Poll each trigger
      const results = {
        polled: 0,
        triggered: 0,
        errors: 0,
      };
      
      for (const trigger of dueTriggers) {
        try {
          results.polled++;
          
          // Poll the external API
          const pollResult = await pollTrigger(trigger, env);
          
          if (pollResult.error) {
            console.error(
              `[Polling Worker] Error polling trigger ${trigger.id} (${trigger.trigger_type}):`,
              pollResult.error
            );
            results.errors++;
            
            // Reschedule for retry (add 5 minutes to avoid immediate retry)
            await updateTriggerNextPoll(env, trigger.id, 300);
            continue;
          }
          
          // Only emit Inngest event if new data found
          if (pollResult.hasNewData && pollResult.newData && pollResult.newData.length > 0) {
            console.log(
              `[Polling Worker] New data found for trigger ${trigger.id}: ${pollResult.newData.length} items`
            );
            
          // Fetch workflow data (nodes, edges, user_id) from database
          const workflowData = await getWorkflowData(env, trigger.workflow_id);
          
          if (!workflowData) {
            console.error(`[Polling Worker] Workflow ${trigger.workflow_id} not found or inactive`);
            // Disable trigger if workflow doesn't exist
            await disableTrigger(env, trigger.id);
            continue;
          }
          
          // Create idempotent event ID
          const eventId = `${trigger.id}:${pollResult.newCursor || pollResult.newTimestamp || Date.now()}`;
          
          // Emit Inngest event (workflow/execute format)
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
            
            results.triggered++;
          }
          
          // Update trigger state and next_poll_at
          await updateTriggerAfterPoll(
            env,
            trigger.id,
            pollResult.newCursor || null,
            pollResult.newTimestamp || null,
            trigger.poll_interval
          );
          
        } catch (error: any) {
          console.error(
            `[Polling Worker] Error processing trigger ${trigger.id}:`,
            error.message
          );
          results.errors++;
          
          // Reschedule for retry
          await updateTriggerNextPoll(env, trigger.id, 300);
        }
      }
      
      console.log(
        `[Polling Worker] Completed: Polled ${results.polled}, Triggered ${results.triggered}, Errors ${results.errors}`
      );
      
    } catch (error: any) {
      console.error('[Polling Worker] Fatal error:', error);
      // Don't throw - let the cron retry on next run
    }
  },
};

/**
 * Fetch due polling triggers from database
 */
async function getDuePollingTriggers(env: Env, limit: number): Promise<PollingTrigger[]> {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  const now = new Date().toISOString();
  
  // Query: Get triggers where next_poll_at <= now AND enabled = true
  // Order by next_poll_at ASC to process oldest first
  // Limit to respect Worker CPU time limits
  const response = await fetch(
    `${supabaseUrl}/rest/v1/polling_triggers?next_poll_at=lte.${now}&enabled=eq.true&order=next_poll_at.asc&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch due triggers: ${response.statusText}`);
  }
  
  const triggers = await response.json() as PollingTrigger[];
  return triggers || [];
}

/**
 * Poll a trigger's external API
 */
async function pollTrigger(trigger: PollingTrigger, env: Env): Promise<PollResult> {
  const { trigger_type, config, last_cursor, last_seen_timestamp } = trigger;
  
  try {
    switch (trigger_type) {
      case 'new-form-submission':
        return await pollGoogleForms(config, last_seen_timestamp);
      
      case 'new-email-received':
        return await pollGmail(config, last_seen_timestamp);
      
      case 'new-row-in-google-sheet':
        return await pollGoogleSheets(config, last_cursor);
      
      case 'new-message-in-slack':
        return await pollSlack(config, last_cursor);
      
      case 'new-github-issue':
        return await pollGitHub(config, last_seen_timestamp);
      
      case 'file-uploaded':
        return await pollGoogleDrive(config, last_seen_timestamp);
      
      default:
        return {
          hasNewData: false,
          error: `Unknown trigger type: ${trigger_type}`,
        };
    }
  } catch (error: any) {
    return {
      hasNewData: false,
      error: error.message || 'Failed to poll API',
    };
  }
}

/**
 * Poll Google Forms
 */
async function pollGoogleForms(
  config: Record<string, any>,
  lastTimestamp: string | null
): Promise<PollResult> {
  const { apiKey, formId } = config;
  const lastCheck = lastTimestamp || new Date(Date.now() - 3600000).toISOString();
  
  const response = await fetch(
    `https://forms.googleapis.com/v1/forms/${formId}/responses?filter=timestamp>${lastCheck}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Google Forms API error: ${response.statusText}`);
  }
  
  const data = await response.json() as { responses?: any[] };
  const submissions = data.responses || [];
  
  if (submissions.length === 0) {
    return { hasNewData: false };
  }
  
  const latestTimestamp = submissions
    .map((s: any) => s.createTime)
    .sort()
    .reverse()[0];
  
  return {
    hasNewData: true,
    newData: submissions,
    newTimestamp: latestTimestamp || new Date().toISOString(),
  };
}

/**
 * Poll Gmail
 */
async function pollGmail(
  config: Record<string, any>,
  lastTimestamp: string | null
): Promise<PollResult> {
  const { apiKey } = config;
  const lastCheck = lastTimestamp
    ? Math.floor(new Date(lastTimestamp).getTime() / 1000)
    : Math.floor((Date.now() - 3600000) / 1000);
  
  // Get message list
  const listResponse = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=after:${lastCheck}&maxResults=10`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );
  
  if (!listResponse.ok) {
    throw new Error(`Gmail API error: ${listResponse.statusText}`);
  }
  
  const listData = await listResponse.json() as { messages?: any[] };
  const messageIds = listData.messages || [];
  
  if (messageIds.length === 0) {
    return { hasNewData: false };
  }
  
  // Fetch message details (limit to 10 to avoid timeout)
  const messages = await Promise.all(
    messageIds.slice(0, 10).map((msg: any) =>
      fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      ).then(r => r.json())
    )
  );
  
  const latestTimestamp = Math.max(
    ...messages.map((m: any) => m.internalDate ? parseInt(m.internalDate) : 0)
  );
  
  return {
    hasNewData: true,
    newData: messages,
    newTimestamp: new Date(latestTimestamp).toISOString(),
  };
}

/**
 * Poll Google Sheets
 */
async function pollGoogleSheets(
  config: Record<string, any>,
  lastCursor: string | null
): Promise<PollResult> {
  const { apiKey, spreadsheetId, sheetName } = config;
  const lastRow = lastCursor ? parseInt(lastCursor) : 0;
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.statusText}`);
  }
  
  const data = await response.json() as { values?: any[][] };
  const rows = data.values || [];
  const currentRowCount = rows.length;
  
  if (currentRowCount <= lastRow) {
    return { hasNewData: false };
  }
  
  const newRows = rows.slice(lastRow);
  
  return {
    hasNewData: true,
    newData: newRows,
    newCursor: currentRowCount.toString(),
  };
}

/**
 * Poll Slack
 */
async function pollSlack(
  config: Record<string, any>,
  lastCursor: string | null
): Promise<PollResult> {
  const { botToken, channel } = config;
  const lastTs = lastCursor || '0';
  
  const response = await fetch(
    `https://slack.com/api/conversations.history?channel=${channel}&oldest=${lastTs}`,
    {
      headers: {
        'Authorization': `Bearer ${botToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Slack API error: ${response.statusText}`);
  }
  
  const data = await response.json() as { ok?: boolean; error?: string; messages?: any[] };
  
  if (data.ok === false) {
    throw new Error(data.error || 'Slack API error');
  }
  
  const messages = data.messages || [];
  
  if (messages.length === 0) {
    return { hasNewData: false };
  }
  
  const latestTs = messages
    .map((m: any) => m.ts)
    .sort()
    .reverse()[0];
  
  return {
    hasNewData: true,
    newData: messages,
    newCursor: latestTs,
  };
}

/**
 * Poll GitHub
 */
async function pollGitHub(
  config: Record<string, any>,
  lastTimestamp: string | null
): Promise<PollResult> {
  const { accessToken, owner, repo } = config;
  const lastCheck = lastTimestamp || new Date(Date.now() - 3600000).toISOString();
  
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?since=${lastCheck}&state=all&per_page=10`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }
  
  const issues = await response.json() as any[];
  
  if (issues.length === 0) {
    return { hasNewData: false };
  }
  
  const latestUpdated = issues
    .map((i: any) => i.updated_at)
    .sort()
    .reverse()[0];
  
  return {
    hasNewData: true,
    newData: issues,
    newTimestamp: latestUpdated,
  };
}

/**
 * Poll Google Drive
 */
async function pollGoogleDrive(
  config: Record<string, any>,
  lastTimestamp: string | null
): Promise<PollResult> {
  const { apiKey, folderId } = config;
  const lastCheck = lastTimestamp || new Date(Date.now() - 3600000).toISOString();
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=parents in '${folderId}' and modifiedTime > '${lastCheck}'&orderBy=modifiedTime desc&pageSize=10`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Google Drive API error: ${response.statusText}`);
  }
  
  const data = await response.json() as { files?: any[] };
  const files = data.files || [];
  
  if (files.length === 0) {
    return { hasNewData: false };
  }
  
  const latestModified = files
    .map((f: any) => f.modifiedTime)
    .sort()
    .reverse()[0];
  
  return {
    hasNewData: true,
    newData: files,
    newTimestamp: latestModified,
  };
}

/**
 * Get workflow data from database
 */
async function getWorkflowData(env: Env, workflowId: string): Promise<{
  nodes: any[];
  edges: any[];
  user_id: string;
} | null> {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/workflows?id=eq.${workflowId}&status=eq.active&select=id,workflow_data,user_id`,
    {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch workflow: ${response.statusText}`);
  }
  
  const workflows = await response.json() as Array<{
    id: string;
    workflow_data?: { nodes?: any[]; edges?: any[] };
    user_id: string;
  }>;
  if (!workflows || workflows.length === 0) {
    return null;
  }
  
  const workflow = workflows[0];
  const workflowData = workflow.workflow_data || {};
  
  return {
    nodes: workflowData.nodes || [],
    edges: workflowData.edges || [],
    user_id: workflow.user_id,
  };
}

/**
 * Send event to Inngest (workflow/execute format)
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
  const eventKey = env.INNGEST_EVENT_KEY;
  
  const response = await fetch(`${inngestUrl}/v1/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${eventKey}`,
    },
    body: JSON.stringify({
      name: 'workflow/execute',
      id: data.eventId, // Idempotent event ID
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
 * Disable a polling trigger
 */
async function disableTrigger(env: Env, triggerId: string): Promise<void> {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/polling_triggers?id=eq.${triggerId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        enabled: false,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to disable trigger: ${response.statusText}`);
  }
}

/**
 * Update trigger after successful poll
 */
async function updateTriggerAfterPoll(
  env: Env,
  triggerId: string,
  newCursor: string | null,
  newTimestamp: string | null,
  pollInterval: number
): Promise<void> {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Calculate next_poll_at based on poll_interval
  const nextPollAt = new Date(Date.now() + pollInterval * 1000).toISOString();
  
  const updateData: any = {
    next_poll_at: nextPollAt,
    updated_at: new Date().toISOString(),
  };
  
  if (newCursor !== null) {
    updateData.last_cursor = newCursor;
  }
  
  if (newTimestamp !== null) {
    updateData.last_seen_timestamp = newTimestamp;
  }
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/polling_triggers?id=eq.${triggerId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(updateData),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to update trigger: ${response.statusText}`);
  }
}

/**
 * Update trigger next_poll_at (for retries)
 */
async function updateTriggerNextPoll(env: Env, triggerId: string, delaySeconds: number): Promise<void> {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  const nextPollAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/polling_triggers?id=eq.${triggerId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        next_poll_at: nextPollAt,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to update trigger next_poll_at: ${response.statusText}`);
  }
}

