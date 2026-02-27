import type { AgentTool, AgentRunContext } from './types';
import { writeMemory, getAgentMemory } from './memory';
import { getUserIntegration } from '@/lib/integrations/service';
import { getGoogleAccessToken } from '@/lib/integrations/google';
import { sendDiscordMessage } from '@/lib/integrations/discord';
import { getIntegrationCredential } from '@/lib/integrations/service';

// ============================================================================
// TOOL DEFINITIONS (OpenAI ChatCompletionTool format)
// ============================================================================

export const AGENT_TOOLS: AgentTool[] = [
  {
    type: 'function',
    function: {
      name: 'send_email_gmail',
      description: 'Send an email using the user\'s connected Gmail account.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Email body in HTML or plain text' },
          replyToThread: {
            type: 'string',
            description: 'Set to "yes" to reply in an existing thread',
            enum: ['yes', 'no'],
          },
          threadId: {
            type: 'string',
            description: 'Gmail thread ID to reply into (only used when replyToThread is "yes")',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_emails',
      description: 'Fetch recent emails from the user\'s Gmail inbox.',
      parameters: {
        type: 'object',
        properties: {
          label: {
            type: 'string',
            description: 'Gmail label to filter by (e.g. "INBOX", "UNREAD", or a custom label name). Defaults to INBOX.',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of emails to return (1–50). Defaults to 10.',
          },
          query: {
            type: 'string',
            description: 'Optional Gmail search query (e.g. "from:john@example.com is:unread")',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_slack_message',
      description: 'Post a message to a Slack channel using the user\'s connected Slack account.',
      parameters: {
        type: 'object',
        properties: {
          channel: {
            type: 'string',
            description: 'Slack channel ID or name (e.g. "C01234ABC" or "#general")',
          },
          text: { type: 'string', description: 'The message text to send' },
        },
        required: ['channel', 'text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_discord_message',
      description: 'Send a message to a Discord channel using the user\'s connected Discord bot.',
      parameters: {
        type: 'object',
        properties: {
          channelId: { type: 'string', description: 'Discord channel ID' },
          content: { type: 'string', description: 'The message content to send' },
        },
        required: ['channelId', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_notion_page',
      description: 'Create a new page in a Notion database.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the Notion page' },
          content: { type: 'string', description: 'Body content of the page (plain text or markdown)' },
          databaseId: {
            type: 'string',
            description: 'The Notion database ID to create the page in. If omitted, creates a standalone page.',
          },
        },
        required: ['title', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_google_sheet',
      description: 'Append a new row to a Google Sheet.',
      parameters: {
        type: 'object',
        properties: {
          spreadsheetId: { type: 'string', description: 'The Google Sheets spreadsheet ID (from the URL)' },
          sheetName: { type: 'string', description: 'The name of the sheet tab (e.g. "Sheet1")' },
          values: {
            type: 'array',
            description: 'Array of cell values to append as a new row (in column order)',
            items: { type: 'string' },
          },
        },
        required: ['spreadsheetId', 'sheetName', 'values'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_google_sheet',
      description: 'Read all rows from a Google Sheet.',
      parameters: {
        type: 'object',
        properties: {
          spreadsheetId: { type: 'string', description: 'The Google Sheets spreadsheet ID (from the URL)' },
          sheetName: { type: 'string', description: 'The name of the sheet tab (e.g. "Sheet1")' },
          maxRows: { type: 'number', description: 'Maximum number of rows to return. Defaults to 100.' },
        },
        required: ['spreadsheetId', 'sheetName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create a new event in the user\'s Google Calendar.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title/summary' },
          start: {
            type: 'string',
            description: 'Start date/time in ISO 8601 format (e.g. "2026-03-01T10:00:00Z")',
          },
          end: {
            type: 'string',
            description: 'End date/time in ISO 8601 format (e.g. "2026-03-01T11:00:00Z")',
          },
          description: { type: 'string', description: 'Optional event description' },
          calendarId: {
            type: 'string',
            description: 'Calendar ID to add event to. Defaults to "primary".',
          },
        },
        required: ['title', 'start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'http_request',
      description: 'Make a raw HTTP request to any URL. Use for APIs not covered by other tools.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The full URL to call' },
          method: {
            type: 'string',
            description: 'HTTP method',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          },
          headers: {
            type: 'object',
            description: 'Optional HTTP headers as key-value pairs',
            properties: {},
          },
          body: { type: 'string', description: 'Optional JSON body (for POST/PUT/PATCH)' },
        },
        required: ['url', 'method'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remember',
      description: 'Store something in long-term memory for future runs. Use this to remember facts, contacts, preferences, or past events.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'What to remember (be specific and concise)' },
          type: {
            type: 'string',
            description: 'Category of memory',
            enum: ['fact', 'preference', 'contact', 'event', 'instruction'],
          },
          importance: {
            type: 'number',
            description: 'Importance from 1 (low) to 10 (critical). Defaults to 5.',
          },
        },
        required: ['content', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recall',
      description: 'Search your stored memories for relevant information before taking an action.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What you are trying to recall (e.g. "John from Acme", "user preferences")' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_notification_to_user',
      description: 'Send a message directly to the user (your owner). Use Slack if connected, otherwise log it.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The message to send to the user' },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'do_nothing',
      description: 'Explicitly do nothing this run. Call this when the trigger event does not require any action.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Brief explanation of why no action is needed' },
        },
        required: [],
      },
    },
  },
];

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Route a GPT-4o tool call to the correct implementation.
 */
export async function executeAgentTool(
  toolName: string,
  toolParams: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'send_email_gmail':
        return await toolSendEmailGmail(toolParams, context);
      case 'read_emails':
        return await toolReadEmails(toolParams, context);
      case 'send_slack_message':
        return await toolSendSlackMessage(toolParams, context);
      case 'send_discord_message':
        return await toolSendDiscordMessage(toolParams, context);
      case 'create_notion_page':
        return await toolCreateNotionPage(toolParams, context);
      case 'update_google_sheet':
        return await toolUpdateGoogleSheet(toolParams, context);
      case 'search_google_sheet':
        return await toolSearchGoogleSheet(toolParams, context);
      case 'create_calendar_event':
        return await toolCreateCalendarEvent(toolParams, context);
      case 'http_request':
        return await toolHttpRequest(toolParams, context);
      case 'remember':
        return await toolRemember(toolParams, context);
      case 'recall':
        return await toolRecall(toolParams, context);
      case 'send_notification_to_user':
        return await toolSendNotificationToUser(toolParams, context);
      case 'do_nothing':
        return { success: true, data: { reason: toolParams.reason || 'No action needed' } };
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

// ============================================================================
// INDIVIDUAL TOOL IMPLEMENTATIONS
// ============================================================================

async function toolSendEmailGmail(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { to, subject, body, replyToThread, threadId } = params;

  const accessToken = await getGoogleAccessToken(context.userId, 'google-gmail');

  const lines: string[] = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body || '',
  ];
  const rawMessage = lines.join('\r\n');
  const encoded = Buffer.from(rawMessage, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const requestBody: any = { raw: encoded };
  const resolvedThreadId = threadId?.trim();
  if (replyToThread === 'yes' && resolvedThreadId && !resolvedThreadId.includes('{{')) {
    requestBody.threadId = resolvedThreadId;
  }

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gmail send failed: ${errorData?.error?.message || response.statusText}`);
  }

  const result = await response.json();
  return { success: true, data: { messageId: result.id, threadId: result.threadId } };
}

async function toolReadEmails(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { label = 'INBOX', maxResults = 10, query } = params;

  const accessToken = await getGoogleAccessToken(context.userId, 'google-gmail');

  const q = [query, label !== 'INBOX' ? `label:${label}` : ''].filter(Boolean).join(' ');
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  listUrl.searchParams.set('maxResults', String(Math.min(maxResults, 50)));
  if (label === 'INBOX') listUrl.searchParams.set('labelIds', 'INBOX');
  if (q) listUrl.searchParams.set('q', q);

  const listResponse = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listResponse.ok) {
    throw new Error(`Failed to list Gmail messages: ${listResponse.statusText}`);
  }

  const listData = await listResponse.json();
  const messageIds: string[] = (listData.messages || []).map((m: any) => m.id);

  if (messageIds.length === 0) {
    return { success: true, data: { emails: [], count: 0 } };
  }

  // Fetch metadata for each message in parallel (capped at 20)
  const fetchIds = messageIds.slice(0, 20);
  const emails = await Promise.all(
    fetchIds.map(async (id) => {
      const r = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!r.ok) return null;
      const msg = await r.json();
      const headers: Record<string, string> = {};
      for (const h of msg.payload?.headers || []) {
        headers[h.name] = h.value;
      }
      return {
        id: msg.id,
        threadId: msg.threadId,
        from: headers['From'],
        subject: headers['Subject'],
        date: headers['Date'],
        snippet: msg.snippet,
      };
    })
  );

  return {
    success: true,
    data: { emails: emails.filter(Boolean), count: emails.length },
  };
}

async function toolSendSlackMessage(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { channel, text } = params;

  const integration = await getUserIntegration(context.userId, 'slack');
  if (!integration?.access_token) {
    throw new Error('Slack is not connected. Please connect your Slack account in integrations.');
  }

  // Prefer user token for sending (it can post on user's behalf)
  const token = (integration as any).metadata?.user_access_token || integration.access_token;

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, text }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack error: ${data.error}`);
  }

  return { success: true, data: { ts: data.ts, channel: data.channel } };
}

async function toolSendDiscordMessage(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { channelId, content } = params;
  const result = await sendDiscordMessage(context.userId, channelId, { content });
  return { success: true, data: result };
}

async function toolCreateNotionPage(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { title, content, databaseId } = params;

  let notionToken = await getIntegrationCredential(context.userId, 'notion', 'api_token');
  const oauthIntegration = await getUserIntegration(context.userId, 'notion');
  if (!notionToken && oauthIntegration?.access_token) {
    notionToken = oauthIntegration.access_token;
  }
  if (!notionToken) {
    throw new Error('Notion is not connected. Please connect your Notion account in integrations.');
  }

  const body: any = {
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: content || '' } }] },
      },
    ],
  };

  if (databaseId) {
    body.parent = { database_id: databaseId };
  } else {
    // Standalone page requires a parent page — use workspace root
    body.parent = { type: 'workspace', workspace: true };
  }

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Notion error: ${err?.message || response.statusText}`);
  }

  const page = await response.json();
  return { success: true, data: { pageId: page.id, url: page.url } };
}

async function toolUpdateGoogleSheet(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { spreadsheetId, sheetName, values } = params;

  const accessToken = await getGoogleAccessToken(context.userId, 'google-sheets');
  const range = `${sheetName}!A1`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [values] }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Google Sheets error: ${err?.error?.message || response.statusText}`);
  }

  const result = await response.json();
  return { success: true, data: { updatedRange: result.updates?.updatedRange } };
}

async function toolSearchGoogleSheet(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { spreadsheetId, sheetName, maxRows = 100 } = params;

  const accessToken = await getGoogleAccessToken(context.userId, 'google-sheets');
  const range = `${sheetName}!A1:Z${maxRows}`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Google Sheets error: ${err?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];

  // Map headers (first row) to objects
  if (rows.length === 0) {
    return { success: true, data: { rows: [], count: 0 } };
  }

  const headers = rows[0];
  const records = rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = row[i] ?? '';
    });
    return record;
  });

  return { success: true, data: { rows: records, count: records.length, headers } };
}

async function toolCreateCalendarEvent(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { title, start, end, description, calendarId = 'primary' } = params;

  const accessToken = await getGoogleAccessToken(context.userId, 'google-calendar');

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: title,
        description,
        start: { dateTime: start, timeZone: 'UTC' },
        end: { dateTime: end, timeZone: 'UTC' },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Google Calendar error: ${err?.error?.message || response.statusText}`);
  }

  const event = await response.json();
  return { success: true, data: { eventId: event.id, htmlLink: event.htmlLink } };
}

async function toolHttpRequest(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { url, method, headers = {}, body } = params;

  const fetchOptions: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const responseText = await response.text();

  let responseData: any = responseText;
  try {
    responseData = JSON.parse(responseText);
  } catch { /* keep as text */ }

  return {
    success: response.ok,
    data: { status: response.status, body: responseData },
    ...(response.ok ? {} : { error: `HTTP ${response.status}: ${response.statusText}` }),
  };
}

async function toolRemember(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { content, type = 'fact', importance = 5 } = params;

  const memory = await writeMemory(
    context.agentId,
    context.userId,
    content,
    type,
    importance,
    'agent'
  );

  return { success: true, data: { memoryId: memory.id, content: memory.content } };
}

async function toolRecall(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { query } = params;

  const allMemories = await getAgentMemory(context.agentId, context.userId, 100);

  // Simple relevance filter: case-insensitive substring match on content
  const queryLower = query.toLowerCase();
  const relevant = allMemories.filter((m) =>
    m.content.toLowerCase().includes(queryLower)
  );

  // Fall back to top-10 by importance if no matches found
  const results = relevant.length > 0 ? relevant.slice(0, 10) : allMemories.slice(0, 10);

  return {
    success: true,
    data: {
      memories: results.map((m) => ({
        content: m.content,
        type: m.memory_type,
        importance: m.importance,
      })),
      count: results.length,
    },
  };
}

async function toolSendNotificationToUser(
  params: Record<string, any>,
  context: AgentRunContext
): Promise<ToolResult> {
  const { message } = params;

  // Try Slack first (most common)
  const slackIntegration = await getUserIntegration(context.userId, 'slack');
  if (slackIntegration?.access_token) {
    const token =
      (slackIntegration as any).metadata?.user_access_token || slackIntegration.access_token;

    // Post to the user's Slackbot (DM to self — always available)
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: '@me', text: `🤖 Agent: ${message}` }),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, data: { channel: 'slack', ts: data.ts } };
    }
    // Slack failed — fall through to log
  }

  // No notification channel available — log it to the run result
  console.log(`[Agent Notification] userId=${context.userId}: ${message}`);
  return { success: true, data: { channel: 'log', message } };
}
