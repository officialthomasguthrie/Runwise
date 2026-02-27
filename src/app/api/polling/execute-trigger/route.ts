/**
 * Internal API: POST /api/polling/execute-trigger
 *
 * Called by the Cloudflare Worker for each due polling trigger.
 * This endpoint handles OAuth token retrieval and calls the external API,
 * returning the poll result. The Worker then decides whether to fire a
 * workflow/execute event based on the result.
 *
 * Authentication: Bearer {SUPABASE_SERVICE_ROLE_KEY}
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getGoogleAccessToken } from '@/lib/integrations/google';
import { getUserIntegration } from '@/lib/integrations/service';

function authenticateRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return false;
  return authHeader === `Bearer ${serviceRoleKey}`;
}

export async function POST(request: NextRequest) {
  if (!authenticateRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { workflowId, triggerType, lastTimestamp, lastCursor, config } = body;

  if (!workflowId || !triggerType) {
    return NextResponse.json({ error: 'Missing workflowId or triggerType' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    // Look up the workflow to get user_id and verify it's active
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, user_id, status')
      .eq('id', workflowId)
      .single();

    if (workflowError) {
      // DB error — don't disable the trigger, just fail this cycle
      console.error(`[Execute Trigger] DB error fetching workflow ${workflowId}:`, workflowError);
      return NextResponse.json({ error: workflowError.message, hasNewData: false }, { status: 500 });
    }

    if (!workflow || (workflow as any).status !== 'active') {
      console.log(`[Execute Trigger] Workflow ${workflowId} is not active (status: ${(workflow as any)?.status ?? 'not found'})`);
      return NextResponse.json({ hasNewData: false, reason: 'workflow_inactive' });
    }

    const userId = (workflow as any).user_id as string;
    let pollResult: {
      hasNewData: boolean;
      newData?: any[];
      newTimestamp?: string;
      newCursor?: string;
    };

    switch (triggerType) {
      case 'new-email-received':
        pollResult = await pollGmail(userId, config, lastTimestamp);
        break;
      case 'new-form-submission':
        pollResult = await pollGoogleForms(userId, config, lastTimestamp);
        break;
      case 'new-row-in-google-sheet':
        pollResult = await pollGoogleSheets(userId, config, lastCursor);
        break;
      case 'file-uploaded':
        pollResult = await pollGoogleDrive(userId, config, lastTimestamp);
        break;
      case 'new-message-in-slack':
        pollResult = await pollSlack(userId, config, lastCursor);
        break;
      case 'new-github-issue':
        pollResult = await pollGitHub(userId, config, lastTimestamp);
        break;
      case 'new-discord-message':
        pollResult = await pollDiscord(userId, config, lastCursor);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported trigger type: ${triggerType}`, hasNewData: false },
          { status: 400 }
        );
    }

    return NextResponse.json(pollResult);
  } catch (error: any) {
    console.error(`[Polling Execute] Error for ${triggerType}:`, error.message);
    return NextResponse.json({ error: error.message, hasNewData: false }, { status: 500 });
  }
}

// ─── Poll Functions ───────────────────────────────────────────────────────────

async function pollGmail(
  userId: string,
  config: Record<string, any>,
  lastTimestamp: string | null
): Promise<{ hasNewData: boolean; newData?: any[]; newTimestamp?: string }> {
  const accessToken = await getGoogleAccessToken(userId, 'google-gmail');

  // When Inbox is selected and a real category is set, filter by that category label instead
  // Treat '' and 'all' as "no specific category" (keep INBOX)
  const baseLabel = config?.labelId || 'INBOX';
  const categoryId = config?.categoryId;
  const hasCategory = categoryId && categoryId !== '' && categoryId !== 'all';
  const labelId = (baseLabel === 'INBOX' && hasCategory) ? categoryId : baseLabel;

  // Fetch the latest 20 messages by label only — no search query.
  // Using q=after:{unix_timestamp} hits Gmail's search index which can take several minutes
  // to index newly arrived messages, causing missed triggers. Fetching by label and filtering
  // client-side on internalDate is immediate and reliable.
  const listResponse = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=${encodeURIComponent(labelId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listResponse.ok) {
    throw new Error(`Gmail API error: ${listResponse.status} ${listResponse.statusText}`);
  }

  const listData = (await listResponse.json()) as { messages?: any[] };
  const messageIds = listData.messages || [];

  if (messageIds.length === 0) return { hasNewData: false };

  // Use format=metadata with only the headers we need — avoids fetching multi-KB base64 email bodies
  // internalDate, id, threadId, labelIds, snippet are always returned with metadata format
  const metadataHeaders = ['From', 'To', 'Subject', 'Date']
    .map(h => `metadataHeaders=${h}`)
    .join('&');

  const rawMessages = await Promise.all(
    messageIds.slice(0, 20).map((msg: any) =>
      fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&${metadataHeaders}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ).then((r) => r.json())
    )
  );

  // Filter client-side to only messages strictly newer than the last-seen timestamp.
  // This is the sole deduplication mechanism — no dependency on Gmail's search index.
  const lastCheckMs = lastTimestamp
    ? new Date(lastTimestamp).getTime()
    : Date.now() - 3600000;

  const freshMessages = rawMessages.filter((m: any) => {
    const msgTs = m.internalDate ? parseInt(m.internalDate) : 0;
    return msgTs > lastCheckMs;
  });

  if (freshMessages.length === 0) return { hasNewData: false };

  const latestTimestamp = Math.max(
    ...freshMessages.map((m: any) => parseInt(m.internalDate))
  );

  if (!isFinite(latestTimestamp)) {
    return { hasNewData: false };
  }

  // Normalize messages — no `raw` field to keep the Inngest event payload small
  const messages = freshMessages.map((m: any) => {
    const getHeader = (name: string) =>
      (m?.payload?.headers || []).find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
    const from = getHeader('From');
    const emailMatch = from.match(/<([^>]+)>/);
    const nameMatch = from.match(/^"?([^"<]+?)"?\s*</);
    return {
      id: m.id,
      threadId: m.threadId,
      from,
      fromEmail: emailMatch ? emailMatch[1].trim() : from.trim(),
      fromName: nameMatch ? nameMatch[1].trim() : '',
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: m.snippet || '',
      labelIds: m.labelIds || [],
    };
  });

  return {
    hasNewData: true,
    newData: messages,
    newTimestamp: new Date(latestTimestamp).toISOString(),
  };
}

async function pollGoogleForms(
  userId: string,
  config: Record<string, any>,
  lastTimestamp: string | null
): Promise<{ hasNewData: boolean; newData?: any[]; newTimestamp?: string }> {
  const accessToken = await getGoogleAccessToken(userId, 'google-forms');
  const { formId } = config;

  // Determine the cutoff time for new submissions.
  // Strip any stray quote characters and normalize to a Date object — Supabase
  // can return timestamptz values in formats like "2026-02-26T01:25:00+00" that
  // can accumulate embedded quotes after round-trips.
  const rawTimestamp = lastTimestamp
    ? lastTimestamp.replace(/"/g, '').trim()
    : new Date(Date.now() - 3600000).toISOString();
  const cutoffMs = new Date(rawTimestamp).getTime() || Date.now() - 3600000;

  // Fetch up to 500 responses with NO server-side filter — the Google Forms
  // timestamp filter API is unreliable across Supabase timestamp round-trips.
  // We filter client-side by createTime (same pattern as Gmail polling).
  const response = await fetch(
    `https://forms.googleapis.com/v1/forms/${formId}/responses?pageSize=500`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => response.statusText);
    throw new Error(`Google Forms API error: ${errorBody}`);
  }

  const data = (await response.json()) as { responses?: any[] };
  const allSubmissions = data.responses || [];

  // Keep only submissions created after the cutoff
  const newSubmissions = allSubmissions.filter((s: any) => {
    if (!s.createTime) return false;
    return new Date(s.createTime).getTime() > cutoffMs;
  });

  if (newSubmissions.length === 0) return { hasNewData: false };

  // Store the latest createTime as a clean ISO string so future polls don't re-trigger
  const latestRaw = newSubmissions.map((s: any) => s.createTime).sort().reverse()[0];
  const newTimestamp = new Date(latestRaw).toISOString();

  return {
    hasNewData: true,
    newData: newSubmissions,
    newTimestamp,
  };
}

async function pollGoogleSheets(
  userId: string,
  config: Record<string, any>,
  lastCursor: string | null
): Promise<{ hasNewData: boolean; newData?: any[]; newCursor?: string }> {
  const accessToken = await getGoogleAccessToken(userId, 'google-sheets');
  const { spreadsheetId, sheetName } = config;
  const lastRow = lastCursor ? parseInt(lastCursor) : 0;

  // URL-encode the sheet name/range so names with spaces or special chars work correctly
  const encodedRange = encodeURIComponent(sheetName);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => response.statusText);
    throw new Error(`Google Sheets API error: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as { values?: any[][] };
  const rows = data.values || [];
  const currentRowCount = rows.length;

  if (currentRowCount <= lastRow) return { hasNewData: false };

  return {
    hasNewData: true,
    newData: rows.slice(lastRow),
    newCursor: currentRowCount.toString(),
  };
}

async function pollGoogleDrive(
  userId: string,
  config: Record<string, any>,
  lastTimestamp: string | null
): Promise<{ hasNewData: boolean; newData?: any[]; newTimestamp?: string }> {
  const accessToken = await getGoogleAccessToken(userId, 'google-drive');
  const { folderId } = config;

  // Normalize timestamp (strip stray quotes, ensure Z suffix)
  const rawTimestamp = lastTimestamp
    ? lastTimestamp.replace(/"/g, '').trim()
    : new Date(Date.now() - 3600000).toISOString();
  const cutoffMs = new Date(rawTimestamp).getTime() || Date.now() - 3600000;
  const cutoffIso = new Date(cutoffMs).toISOString();

  // Drive API query: 'folderId' in parents (not "parents in 'folderId'"),
  // use createdTime (not modifiedTime) to detect NEW uploads only,
  // and URL-encode the entire query string.
  const driveQuery = `'${folderId}' in parents and createdTime > '${cutoffIso}' and trashed = false`;
  const fields = 'files(id,name,mimeType,createdTime,modifiedTime,size,webViewLink,parents)';
  const url =
    `https://www.googleapis.com/drive/v3/files` +
    `?q=${encodeURIComponent(driveQuery)}` +
    `&orderBy=createdTime+desc` +
    `&pageSize=20` +
    `&fields=${encodeURIComponent(fields)}`;

  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => response.statusText);
    throw new Error(`Google Drive API error: ${errorBody}`);
  }

  const data = (await response.json()) as { files?: any[] };
  const files = data.files || [];

  if (files.length === 0) return { hasNewData: false };

  const latestCreated = files.map((f: any) => f.createdTime).sort().reverse()[0];
  const newTimestamp = new Date(latestCreated).toISOString();

  return {
    hasNewData: true,
    newData: files,
    newTimestamp,
  };
}

async function pollSlack(
  userId: string,
  config: Record<string, any>,
  lastCursor: string | null
): Promise<{ hasNewData: boolean; newData?: any[]; newCursor?: string }> {
  // Use OAuth token if available, fall back to config.botToken
  let botToken: string | null = config?.botToken || null;
  if (!botToken) {
    const integration = await getUserIntegration(userId, 'slack');
    if (integration?.access_token) {
      botToken = integration.access_token;
    }
  }

  if (!botToken) {
    throw new Error('Slack bot token not found — please connect your Slack integration');
  }

  const channel = config?.channel;

  // On the first poll (no cursor), set the baseline to "now" so we don't
  // trigger on existing messages. Slack timestamps are Unix seconds as strings.
  if (!lastCursor) {
    const nowTs = (Date.now() / 1000).toFixed(6);
    console.log(`[Slack Poll] First poll for channel ${channel} — setting initial cursor ${nowTs}`);
    return { hasNewData: false, newCursor: nowTs };
  }

  const fetchSlackHistory = async (): Promise<{ ok?: boolean; error?: string; messages?: any[] }> => {
    const response = await fetch(
      `https://slack.com/api/conversations.history?channel=${channel}&oldest=${lastCursor}`,
      { headers: { Authorization: `Bearer ${botToken}` } }
    );
    if (!response.ok) {
      throw new Error(`Slack API HTTP error: ${response.statusText}`);
    }
    return response.json();
  };

  let data = await fetchSlackHistory();

  // Bot is not in the channel — tell the user to invite it manually
  if (data.ok === false && data.error === 'not_in_channel') {
    throw new Error(
      'Slack bot is not in this channel. Open Slack, go to the channel, and type: /invite @YourBotName'
    );
  }

  if (data.ok === false) {
    throw new Error(data.error || 'Slack API error');
  }

  const messages = (data.messages || []).filter((m: any) => m.type === 'message' && !m.subtype);
  if (messages.length === 0) return { hasNewData: false };

  // Slack returns newest-first; sort oldest-first and advance the cursor
  const sorted = [...messages].sort((a: any, b: any) => parseFloat(a.ts) - parseFloat(b.ts));
  const latestTs = sorted[sorted.length - 1].ts;

  return {
    hasNewData: true,
    newData: sorted,
    newCursor: latestTs,
  };
}

async function pollGitHub(
  userId: string,
  config: Record<string, any>,
  lastTimestamp: string | null
): Promise<{ hasNewData: boolean; newData?: any[]; newTimestamp?: string }> {
  // Use config token (personal access token) or OAuth token
  let accessToken: string | null = config?.accessToken || null;
  if (!accessToken) {
    const integration = await getUserIntegration(userId, 'github');
    if (integration?.access_token) {
      accessToken = integration.access_token;
    }
  }

  if (!accessToken) {
    throw new Error('GitHub access token not found — please connect your GitHub integration');
  }

  // repo is stored as "owner/repo" (full_name) — split it here
  const rawRepo: string = config.repo || '';
  const [owner, repo] = rawRepo.includes('/') ? rawRepo.split('/') : [config.owner || '', rawRepo];
  const lastCheck = lastTimestamp || new Date(Date.now() - 3600000).toISOString();

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?since=${lastCheck}&state=all&per_page=10`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const issues = (await response.json()) as any[];
  if (issues.length === 0) return { hasNewData: false };

  const latestUpdated = issues.map((i: any) => i.updated_at).sort().reverse()[0];

  return {
    hasNewData: true,
    newData: issues,
    newTimestamp: latestUpdated,
  };
}

/** Generate a Discord snowflake ID representing the current moment.
 *  Any message sent after this snowflake will have a higher ID and be
 *  detected by the `after=<cursor>` query without reading existing messages.
 *  Uses string-based math to avoid BigInt ES2020 requirement.
 */
function discordSnowflakeNow(): string {
  const DISCORD_EPOCH = 1420070400000;
  const ms = Date.now() - DISCORD_EPOCH;
  // Snowflake = (ms << 22) — simulate with multiplication since ms fits in safe integer range
  // 2^22 = 4194304
  return (ms * 4194304).toString();
}

async function pollDiscord(
  userId: string,
  config: Record<string, any>,
  lastCursor: string | null
): Promise<{ hasNewData: boolean; newData?: any[]; newCursor?: string }> {
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const botToken = await getIntegrationCredential(userId, 'discord', 'bot_token');

  if (!botToken) {
    throw new Error('Discord bot token not found. Please connect your Discord integration.');
  }

  const { channelId } = config;
  if (!channelId) {
    throw new Error('Discord channel ID not configured.');
  }

  // On the very first poll (no cursor), set the cursor to "now" using a
  // synthetic Discord snowflake so any message sent after activation triggers.
  // This avoids relying on existing channel history (which may be empty or
  // inaccessible), and means we never need to read historical messages.
  if (!lastCursor) {
    const initialCursor = discordSnowflakeNow();
    console.log(`[Discord Poll] First poll for channel ${channelId} — setting initial cursor ${initialCursor}`);
    return { hasNewData: false, newCursor: initialCursor };
  }

  const url = `https://discord.com/api/v10/channels/${channelId}/messages?after=${lastCursor}&limit=100`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
  });

  const responseBody = await response.text();
  console.log(`[Discord Poll] channelId=${channelId} lastCursor=${lastCursor} status=${response.status} messages=${responseBody.slice(0, 200)}`);

  if (!response.ok) {
    throw new Error(`Discord API error: ${response.status} ${responseBody}`);
  }

  let messages: any[];
  try {
    messages = JSON.parse(responseBody);
    if (!Array.isArray(messages)) {
      throw new Error(`Discord API returned non-array: ${responseBody.slice(0, 200)}`);
    }
  } catch (e: any) {
    throw new Error(`Discord API parse error: ${e.message}`);
  }

  if (messages.length === 0) return { hasNewData: false };

  // Discord returns messages newest-first; sort oldest-first for processing
  const sorted = [...messages].sort((a, b) => a.id.localeCompare(b.id));
  const latestId = sorted[sorted.length - 1].id;

  return {
    hasNewData: true,
    newData: sorted,
    newCursor: latestId,
  };
}
