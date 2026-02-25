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
    const { data: workflow } = await supabase
      .from('workflows')
      .select('id, user_id, status')
      .eq('id', workflowId)
      .single();

    if (!workflow || (workflow as any).status !== 'active') {
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
  const lastCheck = lastTimestamp
    ? Math.floor(new Date(lastTimestamp).getTime() / 1000)
    : Math.floor((Date.now() - 3600000) / 1000);

  const labelId = config?.labelId || 'INBOX';
  const listResponse = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=after:${lastCheck}&maxResults=10&labelIds=${labelId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listResponse.ok) {
    throw new Error(`Gmail API error: ${listResponse.status} ${listResponse.statusText}`);
  }

  const listData = (await listResponse.json()) as { messages?: any[] };
  const messageIds = listData.messages || [];

  if (messageIds.length === 0) return { hasNewData: false };

  const rawMessages = await Promise.all(
    messageIds.slice(0, 10).map((msg: any) =>
      fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json())
    )
  );

  const latestTimestamp = Math.max(
    ...rawMessages.map((m: any) => (m.internalDate ? parseInt(m.internalDate) : 0))
  );

  // Normalize messages so downstream templates can use {{items[0].from}}, {{items[0].subject}} etc.
  const messages = rawMessages.map((m: any) => {
    const getHeader = (name: string) =>
      (m?.payload?.headers || []).find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
    return {
      id: m.id,
      threadId: m.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: m.snippet || '',
      labelIds: m.labelIds || [],
      raw: m,
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
  const lastCheck = lastTimestamp || new Date(Date.now() - 3600000).toISOString();

  const response = await fetch(
    `https://forms.googleapis.com/v1/forms/${formId}/responses?filter=timestamp>${lastCheck}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Google Forms API error: ${response.statusText}`);
  }

  const data = (await response.json()) as { responses?: any[] };
  const submissions = data.responses || [];

  if (submissions.length === 0) return { hasNewData: false };

  const latestTimestamp = submissions.map((s: any) => s.createTime).sort().reverse()[0];

  return {
    hasNewData: true,
    newData: submissions,
    newTimestamp: latestTimestamp || new Date().toISOString(),
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

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.statusText}`);
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
  const lastCheck = lastTimestamp || new Date(Date.now() - 3600000).toISOString();

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=parents in '${folderId}' and modifiedTime > '${lastCheck}'&orderBy=modifiedTime desc&pageSize=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Google Drive API error: ${response.statusText}`);
  }

  const data = (await response.json()) as { files?: any[] };
  const files = data.files || [];

  if (files.length === 0) return { hasNewData: false };

  const latestModified = files.map((f: any) => f.modifiedTime).sort().reverse()[0];

  return {
    hasNewData: true,
    newData: files,
    newTimestamp: latestModified,
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
  const lastTs = lastCursor || '0';

  const response = await fetch(
    `https://slack.com/api/conversations.history?channel=${channel}&oldest=${lastTs}`,
    { headers: { Authorization: `Bearer ${botToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.statusText}`);
  }

  const data = (await response.json()) as { ok?: boolean; error?: string; messages?: any[] };

  if (data.ok === false) {
    throw new Error(data.error || 'Slack API error');
  }

  const messages = data.messages || [];
  if (messages.length === 0) return { hasNewData: false };

  const latestTs = messages.map((m: any) => m.ts).sort().reverse()[0];

  return {
    hasNewData: true,
    newData: messages,
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

  const { owner, repo } = config;
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
