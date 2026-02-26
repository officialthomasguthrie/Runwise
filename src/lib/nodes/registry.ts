/**
 * Node Library Registry
 * Contains all nodes with their definitions and execution code
 */

import type { NodeRegistry, ExecutionContext, NodeDefinition } from './types';

// Helper function to get auth token
const getAuthToken = (context: ExecutionContext, service: string): string => {
  return context.auth[service]?.token || context.auth[service]?.apiKey || '';
};

// ============================================================================
// ACTION NODES
// ============================================================================

const sendEmailGmailExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { to, subject, body, cc, bcc, replyToThread, threadId } = config;

  if (!to?.trim()) throw new Error('Send Email via Gmail: "To" address is required.');
  if (!subject?.trim()) throw new Error('Send Email via Gmail: "Subject" is required.');

  const { getGoogleAccessToken } = await import('@/lib/integrations/google');
  const accessToken = await getGoogleAccessToken(context.userId, 'google-gmail');

  if (!accessToken) {
    throw new Error('Gmail not connected. Please connect your Google account in the integrations settings.');
  }

  // Build RFC 2822 MIME message — Gmail API requires this format
  const lines: string[] = [
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    ...(bcc ? [`Bcc: ${bcc}`] : []),
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body || '',
  ];
  const rawMessage = lines.join('\r\n');

  // Base64url encode — required by the Gmail REST API
  const encoded = Buffer.from(rawMessage, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const requestBody: any = { raw: encoded };

  // Attaching threadId makes Gmail deliver the message as a reply in the same thread.
  // Skip if threadId is empty OR still contains {{ }} (unresolved template variable).
  const resolvedThreadId = threadId?.trim();
  if (replyToThread === 'yes' && resolvedThreadId && !resolvedThreadId.includes('{{')) {
    requestBody.threadId = resolvedThreadId;
  }

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message || errorMessage;
    } catch { /* ignore parse errors */ }
    throw new Error(`Gmail send failed: ${errorMessage}`);
  }

  const result = await response.json();
  return { success: true, messageId: result.id, threadId: result.threadId, status: 'sent' };
};

const sendEmailExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { to, subject, body, from, cc, bcc } = config;
  
  // Get API key from integration
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const sendGridApiKey = await getIntegrationCredential(context.userId, 'sendgrid', 'api_key');
  
  if (!sendGridApiKey) {
    throw new Error('SendGrid API key required. Please connect your SendGrid account.');
  }
  
  // Use SendGrid integration client
  const { sendEmail } = await import('@/lib/integrations/sendgrid');
  const result = await sendEmail(context.userId, {
    to,
    from: from || 'noreply@runwise.ai',
    subject,
    html: body,
    ...(cc && { cc }),
    ...(bcc && { bcc })
  });
  
  return { success: true, messageId: result.messageId, status: result.status };
};

const createNotionPageExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, databaseId, title, content } = config;
  
  // Get token from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  let notionToken = apiKey || context.auth?.notion?.token;
  
  // If not in config or context, try to get from stored credentials
  if (!notionToken) {
    notionToken = await getIntegrationCredential(context.userId, 'notion', 'api_token');
  }
  
  if (!notionToken) {
    throw new Error('Notion API token required. Please connect your Notion account or provide an API token.');
  }
  
  const response = await context.http.post(
    `https://api.notion.com/v1/pages`,
    {
      parent: { database_id: databaseId },
      properties: {
        title: {
          title: [{ text: { content: title } }],
        },
      },
      children: content || [],
    },
    {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    }
  );
  
  return { success: true, pageId: response.id, url: response.url, ...response };
};

const postToSlackChannelExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { botToken, channel, message, threadTs } = config;
  
  // Validate required fields
  if (!channel) {
    throw new Error('Slack channel is required');
  }
  if (!message) {
    throw new Error('Message is required');
  }
  
  // Use integration token from context, fallback to botToken from config, then getAuthToken
  const accessToken = context.auth?.slack?.token || botToken || getAuthToken(context, 'slack');
  
  if (!accessToken) {
    throw new Error('Slack access token required. Please connect your Slack account or provide a bot token.');
  }
  
  const response = await context.http.post(
    'https://slack.com/api/chat.postMessage',
    {
      channel,
      text: message,
      thread_ts: threadTs,
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  // Slack API returns { ok: false, error: "..." } even on 200 status
  if (response.ok === false) {
    throw new Error(response.error || 'Failed to post to Slack');
  }
  
  return { success: true, ts: response.ts, channel: response.channel, ...response };
};

const sendDiscordMessageExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { channelId, message, embeds } = config;
  
  // Validate required fields
  if (!message) {
    throw new Error('Message is required');
  }
  
  if (!channelId) {
    throw new Error('Channel is required. Please select a Discord channel.');
  }
  
  // Parse embeds if it's a JSON string
  let parsedEmbeds = [];
  if (embeds) {
    try {
      parsedEmbeds = typeof embeds === 'string' ? JSON.parse(embeds) : embeds;
    } catch (error) {
      throw new Error(`Invalid embeds JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Use Discord API with integration
  const { sendDiscordMessage } = await import('@/lib/integrations/discord');
  const result = await sendDiscordMessage(context.userId, channelId, {
    content: message,
    embeds: parsedEmbeds
  });
  
  return { success: true, id: result.id, channel_id: result.channel_id, content: result.content };
};

const createTrelloCardExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, token, name, desc, idList, dueDate } = config;
  
  // Get credentials from context (stored via integration)
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  let trelloApiKey = apiKey || context.auth?.trello?.apiKey;
  let trelloToken = token || context.auth?.trello?.token;
  
  // If not in config or context, try to get from stored credentials
  if (!trelloApiKey || !trelloToken) {
    trelloApiKey = trelloApiKey || await getIntegrationCredential(context.userId, 'trello', 'api_key');
    trelloToken = trelloToken || await getIntegrationCredential(context.userId, 'trello', 'token');
  }
  
  if (!trelloApiKey || !trelloToken) {
    throw new Error('Trello API key and token required. Please connect your Trello account or provide API key and token.');
  }
  
  const response = await context.http.post(
    `https://api.trello.com/1/cards?key=${trelloApiKey}&token=${trelloToken}`,
    {
      name,
      desc,
      idList,
      due: dueDate,
    }
  );
  
  return { success: true, cardId: response.id, url: response.url, ...response };
};

const updateAirtableRecordExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, baseId, tableId, recordId, fields } = config;
  
  // Validate required fields
  if (!baseId || !tableId || !recordId) {
    throw new Error('Base ID, Table ID, and Record ID are required');
  }
  
  // Get token from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  let airtableToken = apiKey || context.auth?.airtable?.token;
  
  // If not in config or context, try to get from stored credentials
  if (!airtableToken) {
    airtableToken = await getIntegrationCredential(context.userId, 'airtable', 'api_token');
  }
  
  if (!airtableToken) {
    throw new Error('Airtable API token required. Please connect your Airtable account or provide a Personal Access Token.');
  }
  
  // Parse fields if it's a JSON string
  let parsedFields = fields;
  if (typeof fields === 'string') {
    try {
      parsedFields = JSON.parse(fields);
    } catch (error) {
      throw new Error(`Invalid fields JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  const response = await context.http.put(
    `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`,
    { fields: parsedFields },
    {
      headers: {
        'Authorization': `Bearer ${airtableToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return { success: true, id: response.id, fields: response.fields, ...response };
};

const createCalendarEventExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, calendarId, summary, description, start, end, attendees } = config;
  
  const accessToken = context.auth?.google?.token || apiKey || getAuthToken(context, 'google');
  if (!accessToken) {
    throw new Error('Google access token required. Please connect your Google account or provide an API key.');
  }
  
  const calendar = calendarId || 'primary';
  
  const response = await context.http.post(
    `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events`,
    {
      summary,
      description,
      start: { dateTime: start, timeZone: 'UTC' },
      end: { dateTime: end, timeZone: 'UTC' },
      attendees: attendees?.map((email: string) => ({ email })) || [],
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return { success: true, eventId: response.id, htmlLink: response.htmlLink, ...response };
};

const sendSmsViaTwilioExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { to, message, from } = config;
  
  // Validate required fields
  if (!to || !from || !message) {
    throw new Error('To, From, and Message are required');
  }
  
  // Get credentials from integration
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const twilioAccountSid = await getIntegrationCredential(context.userId, 'twilio', 'account_sid');
  const twilioAuthToken = await getIntegrationCredential(context.userId, 'twilio', 'auth_token');
  
  if (!twilioAccountSid || !twilioAuthToken) {
    throw new Error('Twilio credentials required. Please connect your Twilio account.');
  }
  
  // Use Twilio integration client
  const { sendSMS } = await import('@/lib/integrations/twilio');
  const result = await sendSMS(context.userId, {
    to,
    from,
    body: message
  });
  
  return { success: true, messageSid: result.sid, status: result.status, to: result.to, from: result.from };
};

const uploadFileToGoogleDriveExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, fileName, fileContent, folderId, mimeType } = config;
  
  const accessToken = context.auth?.google?.token || apiKey || getAuthToken(context, 'google');
  if (!accessToken) {
    throw new Error('Google access token required. Please connect your Google account or provide an API key.');
  }
  
  // First, create metadata
  const metadata = {
    name: fileName,
    parents: folderId ? [folderId] : [],
  };
  
  // Upload file
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', new Blob([fileContent], { type: mimeType || 'application/octet-stream' }));
  
  const response = await context.http.post(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  return { success: true, fileId: response.id, webViewLink: response.webViewLink, ...response };
};

const postToXExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { text, replyTo } = config;
  
  if (!text) {
    throw new Error('Tweet text is required');
  }
  
  // Use Twitter integration client
  const { postTweet } = await import('@/lib/integrations/twitter');
  const result = await postTweet(context.userId, {
    text,
    ...(replyTo && { replyTo })
  });
  
  return { success: true, id: result.id, text: result.text, created_at: result.created_at };
};

// ============================================================================
// TRIGGER NODES
// ============================================================================

const newFormSubmissionExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  // If triggered by a polling event, use the pre-fetched items instead of re-fetching
  if (Array.isArray(inputData?.items) && inputData.items.length > 0) {
    const submissions = inputData.items;
    return {
      submissions,
      submission: submissions[0],
      count: submissions.length,
    };
  }

  // Fallback: manual execution — fetch responses directly
  const { formId } = config;
  const accessToken = context.auth?.google?.token || getAuthToken(context, 'google');
  if (!accessToken) {
    throw new Error('Google access token required. Please connect your Google Forms integration.');
  }
  
  const response = await context.http.get(
    `https://forms.googleapis.com/v1/forms/${formId}/responses?pageSize=10`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const submissions = response.responses || [];
  return {
    submissions,
    submission: submissions[0],
    count: submissions.length,
  };
};

/** Extract a named header value from a raw Gmail message */
function gmailHeader(message: any, name: string): string {
  const headers: any[] = message?.payload?.headers || [];
  return headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

/** Extract plain-text body from a Gmail message (best-effort) */
function gmailBody(message: any): string {
  const payload = message?.payload;
  if (!payload) return message?.snippet || '';

  // Inline body (simple messages)
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  // Multipart: find text/plain part first, fall back to text/html
  const findPart = (parts: any[], mime: string): any =>
    parts?.find((p: any) => p.mimeType === mime) ||
    parts?.flatMap((p: any) => findPart(p.parts || [], mime) || []).find(Boolean);

  const textPart = findPart(payload.parts || [], 'text/plain') ||
                   findPart(payload.parts || [], 'text/html');
  if (textPart?.body?.data) {
    return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
  }

  return message?.snippet || '';
}

/** Parse bare email address from RFC 5322 "Name <email>" or plain "email" string */
function extractEmail(addr: string): string {
  const m = addr.match(/<([^>]+)>/);
  return m ? m[1].trim() : addr.trim();
}
function extractName(addr: string): string {
  const m = addr.match(/^"?([^"<]+?)"?\s*</);
  return m ? m[1].trim() : '';
}

/** Normalize a raw Gmail API message into a flat, template-friendly object.
 *  Safe to call on already-normalized messages — detects them via absence of payload.headers. */
function normalizeGmailMessage(message: any): any {
  // Already normalized: payload.headers won't exist; direct fields already extracted
  if (!message?.payload?.headers) {
    const from = message.from || '';
    return {
      id: message.id,
      threadId: message.threadId,
      from,
      fromEmail: message.fromEmail || extractEmail(from),
      fromName: message.fromName || extractName(from),
      to: message.to || '',
      subject: message.subject || '',
      date: message.date || '',
      snippet: message.snippet || '',
      body: message.body || message.snippet || '',
      labelIds: message.labelIds || [],
      raw: message.raw || message,
    };
  }
  // Raw Gmail API format — extract from headers
  const from = gmailHeader(message, 'From');
  return {
    id: message.id,
    threadId: message.threadId,
    from,
    fromEmail: extractEmail(from),
    fromName: extractName(from),
    to: gmailHeader(message, 'To'),
    subject: gmailHeader(message, 'Subject'),
    date: gmailHeader(message, 'Date'),
    snippet: message.snippet || '',
    body: gmailBody(message),
    labelIds: message.labelIds || [],
    raw: message,
  };
}

const newEmailReceivedExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, labelId, lastCheck } = config;

  // If triggered by a polling event, use the pre-fetched items instead of re-fetching
  if (Array.isArray(inputData?.items) && inputData.items.length > 0) {
    const emails = inputData.items.map(normalizeGmailMessage);
    return { emails, email: emails[0], count: emails.length };
  }

  const accessToken = context.auth?.google?.token || apiKey || getAuthToken(context, 'google');
  if (!accessToken) {
    throw new Error('Google access token required. Please connect your Google account or provide an API key.');
  }
  
  const labelQuery = labelId && labelId !== 'INBOX' ? `label:${labelId}` : 'in:inbox';
  const timeQuery = lastCheck ? `after:${lastCheck}` : `after:${Math.floor(Date.now() / 1000)}`;
  
  const response = await context.http.get(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`${labelQuery} ${timeQuery}`)}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  const rawMessages = await Promise.all(
    (response.messages || []).map((msg: any) =>
      context.http.get(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
    )
  );

  const emails = rawMessages.map(normalizeGmailMessage);
  return { emails, email: emails[0], count: emails.length };
};

const newRowInGoogleSheetExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, spreadsheetId, sheetName, lastRow } = config;
  
  // Use integration token from context, fallback to apiKey from config, then getAuthToken
  const accessToken = context.auth?.google?.token || apiKey || getAuthToken(context, 'google');
  
  if (!accessToken) {
    throw new Error('Google access token required. Please connect your Google account or provide an API key.');
  }
  
  const response = await context.http.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  const rows = response.values || [];
  const newRows = lastRow ? rows.slice(lastRow) : rows.slice(-1);
  
  return {
    rows: newRows,
    row: newRows[0],
    count: newRows.length,
    lastRow: rows.length,
  };
};

const newMessageInSlackExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  // Slack real-time events are typically handled via webhooks
  // This is a polling fallback
  const { botToken, channel, lastTs } = config;
  
  // Use integration token from context, fallback to botToken from config, then getAuthToken
  const accessToken = context.auth?.slack?.token || botToken || getAuthToken(context, 'slack');
  
  if (!accessToken) {
    throw new Error('Slack access token required. Please connect your Slack account or provide a bot token.');
  }
  
  const response = await context.http.get(
    `https://slack.com/api/conversations.history?channel=${channel}&oldest=${lastTs || 0}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  // Slack API returns { ok: false, error: "..." } even on 200 status
  if (response.ok === false) {
    throw new Error(response.error || 'Failed to fetch Slack messages');
  }
  
  const messages = response.messages || [];
  return { messages, message: messages[0], count: messages.length };
};

const newDiscordMessageExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  // Discord is typically webhook-based, this is for webhook processing
  return { message: inputData, ...inputData };
};

const scheduledTimeTriggerExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { schedule, timezone } = config;
  // This would be handled by a cron scheduler, not executed here
  // Just return trigger event
  return {
    triggerTime: new Date().toISOString(),
    schedule,
    timezone,
  };
};

const webhookTriggerExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  // Pass the webhook payload straight through so every field sent by the
  // caller is directly referenceable in downstream nodes as {{inputData.field}}.
  return inputData;
};

const newGitHubIssueExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { accessToken, owner, repo, lastCheck } = config;
  
  // Get token from integration (OAuth or PAT)
  const { getUserIntegration, getIntegrationCredential } = await import('@/lib/integrations/service');
  let githubToken = accessToken || context.auth?.github?.token;
  
  if (!githubToken) {
    // Try OAuth token first
    const integration = await getUserIntegration(context.userId, 'github');
    if (integration?.access_token) {
      githubToken = integration.access_token;
    } else {
      // Fallback to PAT
      githubToken = await getIntegrationCredential(context.userId, 'github', 'personal_access_token');
    }
  }
  
  if (!githubToken) {
    throw new Error('GitHub access token required. Please connect your GitHub account or provide a Personal Access Token.');
  }
  
  const response = await context.http.get(
    `https://api.github.com/repos/${owner}/${repo}/issues?since=${lastCheck || new Date(Date.now() - 3600000).toISOString()}`,
    {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );
  
  const issues = Array.isArray(response) ? response : [];
  return { issues, issue: issues[0], count: issues.length };
};


const fileUploadedExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  // If triggered by a polling event, use the pre-fetched items instead of re-fetching
  if (Array.isArray(inputData?.items) && inputData.items.length > 0) {
    const files = inputData.items;
    return { files, file: files[0], count: files.length };
  }

  // Fallback: manual execution — fetch files directly
  const { apiKey, folderId } = config;
  const accessToken = context.auth?.google?.token || apiKey || getAuthToken(context, 'google');
  if (!accessToken) {
    throw new Error('Google access token required. Please connect your Google account or provide an API key.');
  }

  const cutoffIso = new Date(Date.now() - 3600000).toISOString();
  const driveQuery = `'${folderId}' in parents and createdTime > '${cutoffIso}' and trashed = false`;
  const fields = 'files(id,name,mimeType,createdTime,modifiedTime,size,webViewLink,parents)';
  const url =
    `https://www.googleapis.com/drive/v3/files` +
    `?q=${encodeURIComponent(driveQuery)}` +
    `&orderBy=createdTime+desc&pageSize=20` +
    `&fields=${encodeURIComponent(fields)}`;

  const response = await context.http.get(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const files = response.files || [];
  return { files, file: files[0], count: files.length };
};

// ============================================================================
// TRANSFORM NODES
// ============================================================================

const delayExecutionExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { delayMs } = config;
  await new Promise((resolve) => setTimeout(resolve, delayMs || 1000));
  return { delayed: true, delayMs, inputData };
};

const generateSummaryWithAiExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { text, maxLength } = config;
  const inputText = text || String(inputData);
  
  // Get OpenAI API key from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const apiKey = await getIntegrationCredential(context.userId, 'openai', 'api_key');
  
  if (!apiKey) {
    throw new Error('OpenAI API key required. Please connect your OpenAI account.');
  }
  
  // Call OpenAI API for summarization
  const response = await context.http.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Summarize the following text in ${maxLength || 100} words or less:`,
        },
        { role: 'user', content: inputText },
      ],
      max_tokens: maxLength || 100,
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return {
    summary: response.choices[0]?.message?.content || '',
    originalLength: inputText.length,
    summaryLength: response.choices[0]?.message?.content?.length || 0,
  };
};

const generateAiContentExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { prompt } = config;
  
  // Get OpenAI API key from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const apiKey = await getIntegrationCredential(context.userId, 'openai', 'api_key');
  
  if (!apiKey) {
    throw new Error('OpenAI API key required. Please connect your OpenAI account.');
  }
  
  const response = await context.http.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        { role: 'user', content: prompt },
      ],
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return {
    content: response.choices[0]?.message?.content || '',
  };
};

// ============================================================================
// NEW CANONICAL NODES - EXECUTION FUNCTIONS
// ============================================================================

// 1. Manual Trigger
const manualTriggerExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  return {
    triggeredAt: new Date().toISOString(),
    inputData: inputData || {},
  };
};

// 2. HTTP Request
const httpRequestExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { method, url, headers, body, queryParams, timeout } = config;
  
  if (!url) {
    throw new Error('URL is required');
  }

  // Parse headers if string
  let parsedHeaders = headers;
  if (typeof headers === 'string') {
    try {
      parsedHeaders = JSON.parse(headers);
    } catch {
      parsedHeaders = {};
    }
  }

  // Parse query params if string
  let parsedQueryParams = queryParams;
  if (typeof queryParams === 'string') {
    try {
      parsedQueryParams = JSON.parse(queryParams);
    } catch {
      parsedQueryParams = {};
    }
  }

  // Build URL with query params
  let finalUrl = url;
  if (parsedQueryParams && Object.keys(parsedQueryParams).length > 0) {
    const queryString = new URLSearchParams(parsedQueryParams).toString();
    finalUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
  }

  // Parse body if string
  let parsedBody = body;
  if (typeof body === 'string' && body.trim()) {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      // Keep as string if not valid JSON
    }
  }

  let response: any;
  const options: any = {
    headers: parsedHeaders || {},
  };

  if (timeout) {
    options.signal = AbortSignal.timeout(timeout);
  }

  try {
    switch (method?.toUpperCase()) {
      case 'GET':
        response = await context.http.get(finalUrl, options);
        break;
      case 'POST':
        response = await context.http.post(finalUrl, parsedBody, options);
        break;
      case 'PUT':
        response = await context.http.put(finalUrl, parsedBody, options);
        break;
      case 'DELETE':
        response = await context.http.delete(finalUrl, options);
        break;
      case 'PATCH':
        response = await context.http.patch(finalUrl, parsedBody, options);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    return {
      status: response.status || 200,
      headers: response.headers || {},
      body: response.body || response,
      success: true,
    };
  } catch (error: any) {
    return {
      status: error.status || 500,
      headers: {},
      body: error.message || error,
      success: false,
      error: error.message,
    };
  }
};

// 3. Stop Workflow
const stopWorkflowExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { reason } = config;
  // Throw a special error that executor can catch
  const stopError: any = new Error(reason || 'Workflow stopped');
  stopError.isStopSignal = true;
  throw stopError;
};

// 4. Map / Transform Data
const mapTransformDataExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { mapping, inputType } = config;
  
  if (!mapping) {
    throw new Error('Mapping is required');
  }

  // Parse mapping if string
  let parsedMapping = mapping;
  if (typeof mapping === 'string') {
    try {
      parsedMapping = JSON.parse(mapping);
    } catch {
      throw new Error('Invalid mapping JSON');
    }
  }

  // Get input data
  let data = inputData;
  if (inputType === 'array' && Array.isArray(inputData)) {
    // Transform each item in array
    return {
      mapped: inputData.map(item => transformItem(item, parsedMapping)),
      original: inputData,
    };
  } else {
    // Transform single object
    return {
      mapped: transformItem(data, parsedMapping),
      original: data,
    };
  }
};

function transformItem(item: any, mapping: Record<string, string>): any {
  const result: any = {};
  
  for (const [outputKey, inputPath] of Object.entries(mapping)) {
    // Support template strings like {{fieldName}}
    let value = inputPath;
    const templateRegex = /\{\{([^}]+)\}\}/g;
    const matches = inputPath.match(templateRegex);
    
    if (matches) {
      // Replace template variables
      value = inputPath.replace(templateRegex, (match, varName) => {
        const keys = varName.trim().split('.');
        let val = item;
        for (const key of keys) {
          val = val?.[key];
        }
        return val !== undefined && val !== null ? String(val) : '';
      });
    } else {
      // Direct field access
      const keys = inputPath.split('.');
      value = item;
      for (const key of keys) {
        value = (value as any)?.[key];
      }
    }
    
    result[outputKey] = value;
  }
  
  return result;
}

// 5. Sort Data
const sortDataExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { field, order = 'asc', dataType = 'auto' } = config;
  
  if (!Array.isArray(inputData)) {
    throw new Error('Input must be an array');
  }

  const sorted = [...inputData].sort((a, b) => {
    let aVal = field ? a[field] : a;
    let bVal = field ? b[field] : b;

    // Type detection/conversion
    let detectedType = dataType;
    if (dataType === 'auto') {
      // Try to detect type
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        detectedType = 'number';
      } else if (aVal instanceof Date && bVal instanceof Date) {
        detectedType = 'date';
      } else {
        detectedType = 'string';
      }
    }

    // Convert and compare
    if (detectedType === 'number') {
      aVal = Number(aVal);
      bVal = Number(bVal);
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    } else if (detectedType === 'date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    } else {
      // String comparison
      aVal = String(aVal || '');
      bVal = String(bVal || '');
      return order === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
  });

  return {
    sorted,
    original: inputData,
  };
};

// 6. Group Data
const groupDataExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { field } = config;
  
  if (!field) {
    throw new Error('Group by field is required');
  }

  if (!Array.isArray(inputData)) {
    throw new Error('Input must be an array');
  }

  const grouped: Record<string, any[]> = {};
  
  for (const item of inputData) {
    const key = String(item[field] ?? '');
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }

  return {
    grouped,
    groups: Object.keys(grouped),
    count: Object.keys(grouped).length,
  };
};

// 7. Aggregate Data
const aggregateDataExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { operation, field } = config;
  
  if (!Array.isArray(inputData)) {
    throw new Error('Input must be an array');
  }

  let result: any;

  switch (operation) {
    case 'sum':
      if (!field) throw new Error('Field is required for sum operation');
      result = inputData.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
      break;
    case 'average':
      if (!field) throw new Error('Field is required for average operation');
      const sum = inputData.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
      result = inputData.length > 0 ? sum / inputData.length : 0;
      break;
    case 'count':
      result = inputData.length;
      break;
    case 'min':
      if (!field) throw new Error('Field is required for min operation');
      result = Math.min(...inputData.map(item => Number(item[field]) || 0));
      break;
    case 'max':
      if (!field) throw new Error('Field is required for max operation');
      result = Math.max(...inputData.map(item => Number(item[field]) || 0));
      break;
    case 'countDistinct':
      if (!field) throw new Error('Field is required for countDistinct operation');
      const distinct = new Set(inputData.map(item => String(item[field])));
      result = distinct.size;
      break;
    default:
      throw new Error(`Unknown aggregation operation: ${operation}`);
  }

  return {
    result,
    operation,
    count: inputData.length,
  };
};

// 8. Find and Replace Text
const findReplaceTextExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { text, find, replace, useRegex = 'false', caseSensitive = 'false' } = config;
  
  if (!find || replace === undefined) {
    throw new Error('Find and replace values are required');
  }

  const inputText = text || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));
  const useRegexFlag = useRegex === 'true';
  const caseSensitiveFlag = caseSensitive === 'true';

  let result: string;
  let replacements = 0;

  if (useRegexFlag) {
    const flags = caseSensitiveFlag ? 'g' : 'gi';
    const regex = new RegExp(find, flags);
    result = inputText.replace(regex, (_match: string) => {
      replacements++;
      return replace;
    });
  } else {
    if (caseSensitiveFlag) {
      result = inputText.split(find).join(replace);
      replacements = (inputText.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    } else {
      const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = inputText.replace(regex, (_match: string) => {
        replacements++;
        return replace;
      });
    }
  }

  return {
    result,
    replacements,
    original: inputText,
  };
};

// 9. Encode / Decode
const encodeDecodeExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { operation, encoding, text } = config;
  
  const inputText = text || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));

  let result: string;

  if (operation === 'encode') {
    switch (encoding) {
      case 'base64':
        // Node.js environment
        if (typeof Buffer !== 'undefined') {
          result = Buffer.from(inputText, 'utf8').toString('base64');
        } else {
          // Browser fallback (if needed)
          result = btoa(unescape(encodeURIComponent(inputText)));
        }
        break;
      case 'url':
        result = encodeURIComponent(inputText);
        break;
      case 'html':
        result = inputText
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        break;
      case 'hex':
        if (typeof Buffer !== 'undefined') {
          result = Buffer.from(inputText, 'utf8').toString('hex');
        } else {
          result = Array.from(inputText as string).map((c: string) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
        }
        break;
      default:
        throw new Error(`Unknown encoding type: ${encoding}`);
    }
  } else {
    // decode
    switch (encoding) {
      case 'base64':
        if (typeof Buffer !== 'undefined') {
          result = Buffer.from(inputText, 'base64').toString('utf8');
        } else {
          result = decodeURIComponent(escape(atob(inputText)));
        }
        break;
      case 'url':
        result = decodeURIComponent(inputText);
        break;
      case 'html':
        result = inputText
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        break;
      case 'hex':
        if (typeof Buffer !== 'undefined') {
          result = Buffer.from(inputText, 'hex').toString('utf8');
        } else {
          result = inputText.match(/.{1,2}/g)?.map((byte: string) => String.fromCharCode(parseInt(byte, 16))).join('') || '';
        }
        break;
      default:
        throw new Error(`Unknown encoding type: ${encoding}`);
    }
  }

  return {
    result,
    original: inputText,
  };
};

// 10. Date / Time Manipulation
const dateTimeManipulationExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { operation, inputDate, format, amount, unit, extractPart, timezone } = config;
  
  let date: Date;

  if (operation === 'now') {
    date = new Date();
  } else {
    const input = inputDate || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));
    date = input ? new Date(input) : new Date();
  }

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date input');
  }

  let result: any;

  switch (operation) {
    case 'format':
      // Simple format implementation (can be enhanced with date-fns)
      if (!format) {
        result = date.toISOString();
      } else {
        // Basic format replacements
        result = format
          .replace(/YYYY/g, date.getFullYear().toString())
          .replace(/MM/g, String(date.getMonth() + 1).padStart(2, '0'))
          .replace(/DD/g, String(date.getDate()).padStart(2, '0'))
          .replace(/HH/g, String(date.getHours()).padStart(2, '0'))
          .replace(/mm/g, String(date.getMinutes()).padStart(2, '0'))
          .replace(/ss/g, String(date.getSeconds()).padStart(2, '0'));
      }
      break;
    case 'parse':
      // Already parsed above
      result = date.toISOString();
      break;
    case 'add':
      if (!amount || !unit) {
        throw new Error('Amount and unit are required for add operation');
      }
      const addDate = new Date(date);
      switch (unit) {
        case 'milliseconds':
          addDate.setMilliseconds(addDate.getMilliseconds() + amount);
          break;
        case 'seconds':
          addDate.setSeconds(addDate.getSeconds() + amount);
          break;
        case 'minutes':
          addDate.setMinutes(addDate.getMinutes() + amount);
          break;
        case 'hours':
          addDate.setHours(addDate.getHours() + amount);
          break;
        case 'days':
          addDate.setDate(addDate.getDate() + amount);
          break;
        case 'weeks':
          addDate.setDate(addDate.getDate() + amount * 7);
          break;
        case 'months':
          addDate.setMonth(addDate.getMonth() + amount);
          break;
        case 'years':
          addDate.setFullYear(addDate.getFullYear() + amount);
          break;
      }
      result = addDate.toISOString();
      break;
    case 'subtract':
      if (!amount || !unit) {
        throw new Error('Amount and unit are required for subtract operation');
      }
      const subDate = new Date(date);
      switch (unit) {
        case 'milliseconds':
          subDate.setMilliseconds(subDate.getMilliseconds() - amount);
          break;
        case 'seconds':
          subDate.setSeconds(subDate.getSeconds() - amount);
          break;
        case 'minutes':
          subDate.setMinutes(subDate.getMinutes() - amount);
          break;
        case 'hours':
          subDate.setHours(subDate.getHours() - amount);
          break;
        case 'days':
          subDate.setDate(subDate.getDate() - amount);
          break;
        case 'weeks':
          subDate.setDate(subDate.getDate() - amount * 7);
          break;
        case 'months':
          subDate.setMonth(subDate.getMonth() - amount);
          break;
        case 'years':
          subDate.setFullYear(subDate.getFullYear() - amount);
          break;
      }
      result = subDate.toISOString();
      break;
    case 'extract':
      if (!extractPart) {
        throw new Error('Extract part is required');
      }
      switch (extractPart) {
        case 'year':
          result = date.getFullYear();
          break;
        case 'month':
          result = date.getMonth() + 1;
          break;
        case 'day':
          result = date.getDate();
          break;
        case 'hour':
          result = date.getHours();
          break;
        case 'minute':
          result = date.getMinutes();
          break;
        case 'second':
          result = date.getSeconds();
          break;
        case 'dayOfWeek':
          result = date.getDay();
          break;
        case 'timestamp':
          result = date.getTime();
          break;
        default:
          throw new Error(`Unknown extract part: ${extractPart}`);
      }
      break;
    case 'convertTimezone':
      // Basic timezone conversion (can be enhanced with date-fns-tz)
      // For now, return ISO string (timezone conversion requires library)
      result = date.toISOString();
      break;
    default:
      throw new Error(`Unknown date operation: ${operation}`);
  }

  return {
    result,
    original: date.toISOString(),
  };
};

// 11. Math Operations
const mathOperationsExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { operation, value1, value2, precision = 2 } = config;
  
  // Get values from config or input
  let val1 = value1 !== undefined && value1 !== null ? Number(value1) : 
             (typeof inputData === 'number' ? inputData : 
              (typeof inputData === 'object' && inputData?.value !== undefined ? Number(inputData.value) : 0));
  let val2 = value2 !== undefined && value2 !== null ? Number(value2) : 0;

  let result: number;

  switch (operation) {
    case 'add':
      result = val1 + val2;
      break;
    case 'subtract':
      result = val1 - val2;
      break;
    case 'multiply':
      result = val1 * val2;
      break;
    case 'divide':
      if (val2 === 0) throw new Error('Division by zero');
      result = val1 / val2;
      break;
    case 'modulo':
      result = val1 % val2;
      break;
    case 'power':
      result = Math.pow(val1, val2);
      break;
    case 'round':
      result = Math.round(val1 * Math.pow(10, precision)) / Math.pow(10, precision);
      break;
    case 'floor':
      result = Math.floor(val1);
      break;
    case 'ceil':
      result = Math.ceil(val1);
      break;
    case 'abs':
      result = Math.abs(val1);
      break;
    case 'sqrt':
      if (val1 < 0) throw new Error('Square root of negative number');
      result = Math.sqrt(val1);
      break;
    default:
      throw new Error(`Unknown math operation: ${operation}`);
  }

  return {
    result,
    operation,
  };
};

// 12. String Operations
const stringOperationsExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { operation, text, start, end, length, padString = ' ' } = config;
  
  const inputText = text || (typeof inputData === 'string' ? inputData : String(inputData || ''));

  let result: string;

  switch (operation) {
    case 'uppercase':
      result = inputText.toUpperCase();
      break;
    case 'lowercase':
      result = inputText.toLowerCase();
      break;
    case 'trim':
      result = inputText.trim();
      break;
    case 'substring':
      result = inputText.substring(start || 0, end || inputText.length);
      break;
    case 'length':
      return { result: inputText.length, original: inputText };
    case 'replace':
      // Basic replace - requires find and replace in config
      // This is handled by Find and Replace Text node instead
      result = inputText;
      break;
    case 'padStart':
      result = inputText.padStart(length || 0, padString);
      break;
    case 'padEnd':
      result = inputText.padEnd(length || 0, padString);
      break;
    case 'reverse':
      result = inputText.split('').reverse().join('');
      break;
    case 'capitalize':
      result = inputText.charAt(0).toUpperCase() + inputText.slice(1).toLowerCase();
      break;
    case 'camelCase':
      result = inputText
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word: string, index: number) => index === 0 ? word.toLowerCase() : word.toUpperCase())
        .replace(/\s+/g, '');
      break;
    case 'snakeCase':
      result = inputText
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/\s+/g, '_');
      break;
    case 'kebabCase':
      result = inputText
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '')
        .replace(/\s+/g, '-');
      break;
    default:
      throw new Error(`Unknown string operation: ${operation}`);
  }

  return {
    result,
    original: inputText,
  };
};

// 13. Array Operations
const arrayOperationsExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { operation, array, separator = ',', start, end, depth = 1, array2 } = config;
  
  const inputArray = array || (Array.isArray(inputData) ? inputData : [inputData]);

  let result: any;

  switch (operation) {
    case 'join':
      result = inputArray.join(separator);
      break;
    case 'slice':
      result = inputArray.slice(start || 0, end);
      break;
    case 'reverse':
      result = [...inputArray].reverse();
      break;
    case 'unique':
      result = Array.from(new Set(inputArray.map((item: any) => JSON.stringify(item)))).map((item: unknown) => JSON.parse(item as string));
      break;
    case 'flatten':
      result = inputArray.flat(depth);
      break;
    case 'shuffle':
      result = [...inputArray].sort(() => Math.random() - 0.5);
      break;
    case 'length':
      return { result: inputArray.length, original: inputArray, length: inputArray.length };
    case 'first':
      result = inputArray[0];
      break;
    case 'last':
      result = inputArray[inputArray.length - 1];
      break;
    case 'concat':
      if (!array2) throw new Error('Second array is required for concat operation');
      const parsedArray2 = typeof array2 === 'string' ? JSON.parse(array2) : array2;
      result = [...inputArray, ...parsedArray2];
      break;
    default:
      throw new Error(`Unknown array operation: ${operation}`);
  }

  return {
    result,
    original: inputArray,
    length: Array.isArray(result) ? result.length : undefined,
  };
};

// 14. Object Operations
const objectOperationsExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { operation, object, fields, path, value, property } = config;
  
  const inputObject = object || (typeof inputData === 'object' && !Array.isArray(inputData) ? inputData : {});

  let result: any;

  switch (operation) {
    case 'keys':
      result = Object.keys(inputObject);
      break;
    case 'values':
      result = Object.values(inputObject);
      break;
    case 'entries':
      result = Object.entries(inputObject);
      break;
    case 'pick':
      if (!fields) throw new Error('Fields are required for pick operation');
      const pickFields = typeof fields === 'string' ? JSON.parse(fields) : fields;
      result = {};
      for (const field of pickFields) {
        if (inputObject.hasOwnProperty(field)) {
          result[field] = inputObject[field];
        }
      }
      break;
    case 'omit':
      if (!fields) throw new Error('Fields are required for omit operation');
      const omitFields = typeof fields === 'string' ? JSON.parse(fields) : fields;
      result = { ...inputObject };
      for (const field of omitFields) {
        delete result[field];
      }
      break;
    case 'get':
      if (!path) throw new Error('Path is required for get operation');
      const keys = path.split('.');
      result = keys.reduce((obj: any, key: string) => obj?.[key], inputObject);
      break;
    case 'set':
      if (!path || value === undefined) throw new Error('Path and value are required for set operation');
      result = { ...inputObject };
      const setKeys = path.split('.');
      const lastKey = setKeys.pop()!;
      const target = setKeys.reduce((obj: any, key: string) => {
        if (!obj[key]) obj[key] = {};
        return obj[key];
      }, result);
      target[lastKey] = value;
      break;
    case 'has':
      if (!property) throw new Error('Property is required for has operation');
      result = inputObject.hasOwnProperty(property);
      break;
    default:
      throw new Error(`Unknown object operation: ${operation}`);
  }

  return {
    result,
    original: inputObject,
  };
};

// 15. Download File
const downloadFileExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { url, headers, encoding = 'base64', timeout } = config;
  
  if (!url) {
    throw new Error('URL is required');
  }

  const options: any = {
    headers: typeof headers === 'string' ? JSON.parse(headers) : (headers || {}),
  };

  if (timeout) {
    options.signal = AbortSignal.timeout(timeout);
  }

  const response = await context.http.get(url, options);
  
  let content: string;
  const responseText = typeof response === 'string' ? response : JSON.stringify(response);

  if (encoding === 'base64') {
    if (typeof Buffer !== 'undefined') {
      content = Buffer.from(responseText, 'utf8').toString('base64');
    } else {
      content = btoa(unescape(encodeURIComponent(responseText)));
    }
  } else if (encoding === 'binary') {
    content = responseText;
  } else {
    content = responseText;
  }

  // Extract filename from Content-Disposition header if available
  const contentDisposition = (response as any)?.headers?.['content-disposition'] || '';
  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch ? filenameMatch[1] : undefined;

  return {
    content,
    size: typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : 0,
    mimeType: (response as any)?.headers?.['content-type'] || 'application/octet-stream',
    filename,
  };
};

// 16. Upload File
const uploadFileExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { url, method = 'POST', fileContent, fileName, fieldName = 'file', mimeType, headers } = config;
  
  if (!url || !fileName) {
    throw new Error('URL and file name are required');
  }

  const content = fileContent || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));
  
  // Create FormData-like structure
  const formData = new FormData();
  const blob = new Blob([content], { type: mimeType || 'application/octet-stream' });
  formData.append(fieldName, blob, fileName);

  const requestHeaders: any = {
    ...(typeof headers === 'string' ? JSON.parse(headers) : (headers || {})),
  };

  // Don't set Content-Type for FormData (browser will set it with boundary)
  delete requestHeaders['Content-Type'];

  const httpMethod = method === 'PUT' ? context.http.put : context.http.post;
  const response = await httpMethod(url, formData, { headers: requestHeaders });

  return {
    success: true,
    response,
    url: (response as any)?.url || url,
  };
};

// 17. Classify Text
const classifyTextExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { text, categories, prompt } = config;
  
  const inputText = text || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));
  
  if (!categories) {
    throw new Error('Categories are required');
  }

  const categoriesList = typeof categories === 'string' ? JSON.parse(categories) : categories;
  const categoriesStr = categoriesList.join(', ');

  const classificationPrompt = prompt || `Classify the following text into one of these categories: ${categoriesStr}. Return only the category name and a confidence score from 0 to 1. Format: {"category": "category_name", "confidence": 0.95}`;

  // Get OpenAI API key from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const apiKey = await getIntegrationCredential(context.userId, 'openai', 'api_key');
  
  if (!apiKey) {
    throw new Error('OpenAI API key required. Please connect your OpenAI account.');
  }

  const response = await context.http.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a text classification assistant. Return only valid JSON.' },
        { role: 'user', content: `${classificationPrompt}\n\nText: ${inputText}` },
      ],
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  try {
    const result = typeof response.choices[0]?.message?.content === 'string' 
      ? JSON.parse(response.choices[0].message.content)
      : response.choices[0]?.message?.content;
    
    return {
      category: result.category || categoriesList[0],
      confidence: result.confidence || 0.5,
      allScores: result.allScores || {},
    };
  } catch {
    // Fallback parsing
    const content = response.choices[0]?.message?.content || '';
    return {
      category: categoriesList[0],
      confidence: 0.5,
      allScores: {},
    };
  }
};

// 18. Extract Entities
const extractEntitiesExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { text, entityTypes } = config;
  
  const inputText = text || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));
  
  const typesList = entityTypes ? (typeof entityTypes === 'string' ? JSON.parse(entityTypes) : entityTypes) : 
    ['person', 'organization', 'location', 'date', 'money', 'event'];

  const typesStr = typesList.join(', ');

  // Get OpenAI API key from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const apiKey = await getIntegrationCredential(context.userId, 'openai', 'api_key');
  
  if (!apiKey) {
    throw new Error('OpenAI API key required. Please connect your OpenAI account.');
  }

  const response = await context.http.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an entity extraction assistant. Extract named entities from text. Return JSON array with objects containing: text, type, start (character index), end (character index), confidence (0-1). Entity types to look for: ${typesStr}`,
        },
        {
          role: 'user',
          content: `Extract entities from: ${inputText}`,
        },
      ],
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  try {
    const result = typeof response.choices[0]?.message?.content === 'string'
      ? JSON.parse(response.choices[0].message.content)
      : response.choices[0]?.message?.content;
    
    const entities = result.entities || result.entity_list || [];
    
    return {
      entities: Array.isArray(entities) ? entities : [],
      count: Array.isArray(entities) ? entities.length : 0,
    };
  } catch {
    return {
      entities: [],
      count: 0,
    };
  }
};

// 19. Sentiment Analysis
const sentimentAnalysisExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { text, granularity = 'simple' } = config;
  
  const inputText = text || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));

  // Get OpenAI API key from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const apiKey = await getIntegrationCredential(context.userId, 'openai', 'api_key');
  
  if (!apiKey) {
    throw new Error('OpenAI API key required. Please connect your OpenAI account.');
  }

  const prompt = granularity === 'detailed'
    ? `Analyze the sentiment of this text and return detailed emotions. Return JSON: {"sentiment": "emotion_name", "score": -1_to_1, "confidence": 0_to_1, "emotions": {"joy": 0.8, "sadness": 0.2, ...}}`
    : `Analyze the sentiment of this text. Return JSON: {"sentiment": "positive|negative|neutral", "score": -1_to_1, "confidence": 0_to_1}`;

  const response = await context.http.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a sentiment analysis assistant. Return only valid JSON.' },
        { role: 'user', content: `${prompt}\n\nText: ${inputText}` },
      ],
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  try {
    const result = typeof response.choices[0]?.message?.content === 'string'
      ? JSON.parse(response.choices[0].message.content)
      : response.choices[0]?.message?.content;
    
    return {
      sentiment: result.sentiment || 'neutral',
      score: result.score || 0,
      confidence: result.confidence || 0.5,
    };
  } catch {
    return {
      sentiment: 'neutral',
      score: 0,
      confidence: 0.5,
    };
  }
};

// 20. Translate Text
const translateTextExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { text, sourceLanguage = 'auto', targetLanguage } = config;
  
  if (!targetLanguage) {
    throw new Error('Target language is required');
  }

  const inputText = text || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));

  // Get OpenAI API key from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const apiKey = await getIntegrationCredential(context.userId, 'openai', 'api_key');
  
  if (!apiKey) {
    throw new Error('OpenAI API key required. Please connect your OpenAI account.');
  }

  const languageMap: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
    ru: 'Russian',
    ar: 'Arabic',
    it: 'Italian',
  };

  const targetLangName = languageMap[targetLanguage] || targetLanguage;
  const sourceLangName = sourceLanguage === 'auto' ? 'the detected language' : (languageMap[sourceLanguage] || sourceLanguage);

  const response = await context.http.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `Translate the following text from ${sourceLangName} to ${targetLangName}. Return only the translated text, nothing else:\n\n${inputText}`,
        },
      ],
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const translated = response.choices[0]?.message?.content || inputText;

  return {
    translated: translated.trim(),
    sourceLanguage: sourceLanguage === 'auto' ? 'auto-detected' : sourceLanguage,
    targetLanguage,
  };
};

// 21. Log / Print
const logPrintExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { message, level = 'info', includeInput = 'false' } = config;
  
  const logMessage = message || JSON.stringify(inputData);
  const includeInputFlag = includeInput === 'true';

  const logData = includeInputFlag ? { message: logMessage, inputData } : { message: logMessage };

  switch (level) {
    case 'debug':
      context.logger.debug(logMessage, logData);
      break;
    case 'info':
      context.logger.info(logMessage, logData);
      break;
    case 'warning':
      context.logger.warn(logMessage, logData);
      break;
    case 'error':
      context.logger.error(logMessage, logData);
      break;
    default:
      context.logger.info(logMessage, logData);
  }

  return {
    logged: true,
    data: inputData,
  };
};

// 22. Comment / Note
const commentNoteExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  // No-op node - just passes data through
  return {
    data: inputData,
  };
};

// ============================================================================
// INFRASTRUCTURE NODES - FILE SYSTEM OPERATIONS
// ============================================================================

// 27. Read File
const readFileExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { source, filePath, base64Data, encoding = 'utf8' } = config;
  const fs = await import('fs/promises');
  const path = await import('path');
  
  let content: string | Buffer;
  let size: number;
  let mimeType = 'application/octet-stream';
  
  if (source === 'url') {
    if (!filePath) {
      throw new Error('File path/URL is required for URL source');
    }
    const response = await context.http.get(filePath, {});
    content = typeof response === 'string' ? response : JSON.stringify(response);
    size = Buffer.byteLength(content, 'utf8');
    // Try to detect MIME type from URL
    if (filePath.endsWith('.json')) mimeType = 'application/json';
    else if (filePath.endsWith('.txt')) mimeType = 'text/plain';
    else if (filePath.endsWith('.html')) mimeType = 'text/html';
  } else if (source === 'base64') {
    if (!base64Data) {
      throw new Error('Base64 data is required for base64 source');
    }
    const base64Content = base64Data.replace(/^data:[^;]+;base64,/, '');
    content = Buffer.from(base64Content, 'base64');
    size = content.length;
  } else if (source === 'input') {
    if (typeof inputData === 'string') {
      content = inputData;
      size = Buffer.byteLength(content, 'utf8');
    } else if (inputData?.content) {
      content = inputData.content;
      size = inputData.size || Buffer.byteLength(String(content), 'utf8');
    } else {
      throw new Error('Input data must contain file content');
    }
  } else {
    // Local file path
    if (!filePath) {
      throw new Error('File path is required');
    }
    
    // Security: Prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(process.cwd())) {
      throw new Error('File path must be within workspace directory');
    }
    
    try {
      const fileContent = await fs.readFile(resolvedPath, encoding === 'base64' ? undefined : encoding);
      content = fileContent;
      size = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8');
      
      // Detect MIME type from extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
      };
      mimeType = mimeTypes[ext] || mimeType;
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }
  
  // Convert to base64 if needed
  let finalContent: string;
  if (encoding === 'base64') {
    finalContent = Buffer.isBuffer(content) ? content.toString('base64') : Buffer.from(String(content)).toString('base64');
  } else if (encoding === 'binary') {
    finalContent = Buffer.isBuffer(content) ? content.toString('binary') : Buffer.from(String(content)).toString('binary');
  } else {
    finalContent = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
  }
  
  return {
    content: finalContent,
    size,
    mimeType,
    encoding,
  };
};

// 28. Write File
const writeFileExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { destination, filePath, uploadUrl, content, encoding = 'utf8', mimeType } = config;
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const fileContent = content || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));
  
  if (destination === 'url') {
    if (!uploadUrl) {
      throw new Error('Upload URL is required for URL destination');
    }
    const response = await context.http.post(uploadUrl, fileContent, {
      headers: {
        'Content-Type': mimeType || 'application/octet-stream',
      },
    });
    return {
      filePath: uploadUrl,
      size: Buffer.byteLength(fileContent, 'utf8'),
      success: true,
      response,
    };
  } else if (destination === 'base64') {
    const base64Content = Buffer.from(fileContent).toString('base64');
    return {
      filePath: 'base64',
      size: Buffer.byteLength(base64Content, 'utf8'),
      success: true,
      content: base64Content,
    };
  } else {
    // Local file path
    if (!filePath) {
      throw new Error('File path is required for local destination');
    }
    
    // Security: Prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(process.cwd())) {
      throw new Error('File path must be within workspace directory');
    }
    
    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    const buffer = encoding === 'base64' 
      ? Buffer.from(fileContent, 'base64')
      : encoding === 'binary'
      ? Buffer.from(fileContent, 'binary')
      : Buffer.from(fileContent, 'utf8');
    
    await fs.writeFile(resolvedPath, buffer);
    
    return {
      filePath: resolvedPath,
      size: buffer.length,
      success: true,
    };
  }
};

// 29. Delete File
const deleteFileExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { filePath, requireAuth = 'false' } = config;
  const fs = await import('fs/promises');
  const path = await import('path');
  
  if (!filePath) {
    throw new Error('File path is required');
  }
  
  // Check if it's a URL
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    const headers: any = {};
    if (requireAuth === 'true') {
      // Would need auth token from context
      headers['Authorization'] = 'Bearer ' + (context.auth?.default?.token || '');
    }
    await context.http.delete(filePath, { headers });
    return {
      success: true,
      filePath,
    };
  }
  
  // Local file
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(process.cwd())) {
    throw new Error('File path must be within workspace directory');
  }
  
  try {
    await fs.unlink(resolvedPath);
    return {
      success: true,
      filePath: resolvedPath,
    };
  } catch (error: any) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

// 30. List Files
const listFilesExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { directoryPath, recursive = 'false', filter, includeDirectories = 'false' } = config;
  const fs = await import('fs/promises');
  const path = await import('path');
  
  if (!directoryPath) {
    throw new Error('Directory path is required');
  }
  
  // Security: Prevent directory traversal
  const resolvedPath = path.resolve(directoryPath);
  if (!resolvedPath.startsWith(process.cwd())) {
    throw new Error('Directory path must be within workspace directory');
  }
  
  const files: any[] = [];
  
  async function scanDirectory(dir: string, currentDepth: number = 0): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(resolvedPath, fullPath);
        
        if (entry.isDirectory()) {
          if (includeDirectories === 'true') {
            files.push({
              name: entry.name,
              path: relativePath,
              size: 0,
              mimeType: 'directory',
              modifiedAt: (await fs.stat(fullPath)).mtime.toISOString(),
              isDirectory: true,
            });
          }
          
          if (recursive === 'true' || currentDepth === 0) {
            await scanDirectory(fullPath, currentDepth + 1);
          }
        } else {
          // Apply filter if provided
          if (filter) {
            const pattern = filter.replace(/\*/g, '.*');
            const regex = new RegExp(`^${pattern}$`);
            if (!regex.test(entry.name)) {
              continue;
            }
          }
          
          const stats = await fs.stat(fullPath);
          const ext = path.extname(entry.name).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.pdf': 'application/pdf',
          };
          
          files.push({
            name: entry.name,
            path: relativePath,
            size: stats.size,
            mimeType: mimeTypes[ext] || 'application/octet-stream',
            modifiedAt: stats.mtime.toISOString(),
            isDirectory: false,
          });
        }
      }
    } catch (error: any) {
      context.logger.warn(`Error scanning directory ${dir}: ${error.message}`);
    }
  }
  
  await scanDirectory(resolvedPath);
  
  return {
    files,
    count: files.length,
  };
};

// ============================================================================
// INFRASTRUCTURE NODES - FILE PROCESSING
// ============================================================================

// 31. Convert File Format
const convertFileFormatExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { inputFormat, outputFormat, fileContent, options = {} } = config;
  
  let inputDataContent = fileContent;
  if (!inputDataContent && inputData) {
    if (typeof inputData === 'string') {
      inputDataContent = inputData;
    } else if (inputData.content) {
      inputDataContent = inputData.content;
    }
  }
  
  if (!inputDataContent) {
    throw new Error('File content is required');
  }
  
  // Remove data URL prefix if present
  const base64Data = inputDataContent.replace(/^data:[^;]+;base64,/, '');
  const inputBuffer = Buffer.from(base64Data, 'base64');
  
  let outputBuffer: Buffer | undefined;
  let outputMimeType: string | undefined;
  
  // Text format conversions (no library needed)
  if (['text', 'json', 'csv', 'html', 'markdown'].includes(inputFormat) && 
      ['text', 'json', 'csv', 'html', 'markdown'].includes(outputFormat)) {
    let text = inputBuffer.toString('utf8');
    
    if (inputFormat === 'json' && outputFormat !== 'json') {
      const parsed = JSON.parse(text);
      if (outputFormat === 'csv') {
        // Simple CSV conversion
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) {
            text = '';
          } else {
            const headers = Object.keys(parsed[0]).join(',');
            const rows = parsed.map((row: any) => Object.values(row).join(','));
            text = [headers, ...rows].join('\n');
          }
        }
      } else if (outputFormat === 'html') {
        text = `<pre>${text}</pre>`;
      }
    }
    
    outputBuffer = Buffer.from(text, 'utf8');
    outputMimeType = `text/${outputFormat === 'json' ? 'json' : outputFormat === 'html' ? 'html' : 'plain'}`;
  }
  // Image format conversion
  else if (['png', 'jpeg', 'gif', 'webp'].includes(inputFormat) && 
           ['png', 'jpeg', 'gif', 'webp'].includes(outputFormat)) {
    try {
      const sharp = (await import('sharp')).default;
      let image = sharp(inputBuffer);
      
      if (outputFormat === 'jpeg') {
        image = image.jpeg({ quality: options.quality || 90 });
        outputMimeType = 'image/jpeg';
      } else if (outputFormat === 'png') {
        image = image.png();
        outputMimeType = 'image/png';
      } else if (outputFormat === 'webp') {
        image = image.webp({ quality: options.quality || 90 });
        outputMimeType = 'image/webp';
      } else if (outputFormat === 'gif') {
        image = image.gif();
        outputMimeType = 'image/gif';
      }
      
      outputBuffer = await image.toBuffer();
    } catch (error: any) {
      throw new Error(`Image conversion failed. Please install 'sharp' package: ${error.message}`);
    }
  }
  // PDF to text
  else if (inputFormat === 'pdf' && outputFormat === 'text') {
    try {
      const pdfParseModule = await import('pdf-parse') as any;
      const pdfParse = 'default' in pdfParseModule ? pdfParseModule.default : pdfParseModule;
      const pdfData = await pdfParse(inputBuffer) as { text: string };
      outputBuffer = Buffer.from(pdfData.text, 'utf8');
      outputMimeType = 'text/plain';
    } catch (error: any) {
      throw new Error(`PDF parsing failed. Please install 'pdf-parse' package: ${error.message}`);
    }
  }
  else {
    throw new Error(`Conversion from ${inputFormat} to ${outputFormat} is not supported`);
  }
  
  // Ensure outputBuffer and outputMimeType are defined
  if (!outputBuffer || !outputMimeType) {
    throw new Error(`Failed to convert file format from ${inputFormat} to ${outputFormat}`);
  }
  
  return {
    content: outputBuffer.toString('base64'),
    mimeType: outputMimeType,
    size: outputBuffer.length,
  };
};

// 32. Compress / Decompress
const compressDecompressExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { operation, format, files, archiveContent, outputFileName = 'archive' } = config;
  const zlib = await import('zlib');
  const { promisify } = await import('util');
  
  if (operation === 'compress') {
    if (format === 'gzip') {
      const gzip = promisify(zlib.gzip);
      const inputContent = files?.[0]?.content || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));
      const inputBuffer = Buffer.from(inputContent, 'utf8');
      const compressed = await gzip(inputBuffer);
      return {
        content: compressed.toString('base64'),
        size: compressed.length,
      };
    } else if (format === 'zip') {
      try {
        // @ts-ignore - archiver module types not available
        const archiver = await import('archiver') as any;
        const { Readable } = await import('stream');
        
        const archive = archiver.default('zip', { zlib: { level: 9 } });
        const chunks: Buffer[] = [];
        
        archive.on('data', (chunk: Buffer) => chunks.push(chunk));
        
        // Add files to archive
        if (Array.isArray(files)) {
          for (const file of files) {
            const content = file.content || file;
            const name = file.name || `file_${Date.now()}`;
            const fileBuffer = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'base64');
            archive.append(fileBuffer, { name });
          }
        } else {
          archive.append(JSON.stringify(inputData), { name: 'data.json' });
        }
        
        // Wait for archive to finish
        await new Promise<void>((resolve, reject) => {
          archive.on('end', () => resolve());
          archive.on('error', (err: any) => reject(err));
          archive.finalize();
        });
        
        const archiveBuffer = Buffer.concat(chunks);
        return {
          content: archiveBuffer.toString('base64'),
          size: archiveBuffer.length,
        };
      } catch (error: any) {
        throw new Error(`ZIP compression failed. Please install 'archiver' package: ${error.message}`);
      }
    } else {
      throw new Error(`Compression format ${format} is not yet supported`);
    }
  } else {
    // Decompress
    if (format === 'gzip') {
      const gunzip = promisify(zlib.gunzip);
      const base64Data = archiveContent?.replace(/^data:[^;]+;base64,/, '') || 
                        (typeof inputData === 'string' ? inputData : '');
      const compressedBuffer = Buffer.from(base64Data, 'base64');
      const decompressed = await gunzip(compressedBuffer);
      return {
        content: decompressed.toString('utf8'),
        size: decompressed.length,
      };
    } else if (format === 'zip') {
      try {
        // @ts-ignore - adm-zip module types not available
        const AdmZipModule = await import('adm-zip') as any;
        const AdmZip = AdmZipModule.default || AdmZipModule;
        const base64Data = archiveContent?.replace(/^data:[^;]+;base64,/, '') || 
                          (typeof inputData === 'string' ? inputData : '');
        const zipBuffer = Buffer.from(base64Data, 'base64');
        const zip = new AdmZip(zipBuffer);
        const zipEntries = zip.getEntries();
        
        const extractedFiles = zipEntries.map((entry: any) => ({
          name: entry.entryName,
          content: entry.getData().toString('base64'),
          size: entry.header.size,
          path: entry.entryName,
        }));
        
        return {
          files: extractedFiles,
          content: base64Data, // Return original archive
          size: zipBuffer.length,
        };
      } catch (error: any) {
        throw new Error(`ZIP decompression failed. Please install 'adm-zip' package: ${error.message}`);
      }
    } else {
      throw new Error(`Decompression format ${format} is not yet supported`);
    }
  }
};

// 33. Extract Archive
const extractArchiveExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { archiveContent, format, extractPath } = config;
  
  const base64Data = archiveContent?.replace(/^data:[^;]+;base64,/, '') || 
                    (typeof inputData === 'string' ? inputData : '');
  
  if (!base64Data) {
    throw new Error('Archive content is required');
  }
  
  const archiveBuffer = Buffer.from(base64Data, 'base64');
  const files: any[] = [];
  
  if (format === 'zip' || format === 'auto') {
    try {
      // @ts-ignore - adm-zip module types not available
      const AdmZipModule = await import('adm-zip') as any;
      const AdmZip = AdmZipModule.default || AdmZipModule;
      const zip = new AdmZip(archiveBuffer);
      const zipEntries = extractPath 
        ? zip.getEntries().filter((e: any) => e.entryName.startsWith(extractPath))
        : zip.getEntries();
      
      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          files.push({
            name: entry.entryName.split('/').pop() || entry.entryName,
            content: entry.getData().toString('base64'),
            size: entry.header.size,
            path: entry.entryName,
          });
        }
      }
        } catch (error: any) {
          if (format === 'auto') {
            // Try TAR
            try {
              const tarModule = await import('tar') as any;
              const tar = tarModule.default || tarModule;
          const extracted: any[] = [];
          await tar.extract({
            file: archiveBuffer,
              onentry: (entry: any) => {
              if (entry.type === 'File') {
                const chunks: Buffer[] = [];
                entry.on('data', (chunk: Buffer) => chunks.push(chunk));
                entry.on('end', () => {
                  extracted.push({
                    name: entry.path.split('/').pop() || entry.path,
                    content: Buffer.concat(chunks).toString('base64'),
                    size: entry.size,
                    path: entry.path,
                  });
                });
              }
            },
          });
          files.push(...extracted);
        } catch (tarError: any) {
          throw new Error(`Archive extraction failed. Please install 'adm-zip' or 'tar' package: ${tarError.message}`);
        }
      } else {
        throw new Error(`ZIP extraction failed. Please install 'adm-zip' package: ${error.message}`);
      }
    }
  } else if (format === 'tar' || format === 'targz') {
    try {
      const tarModule = await import('tar') as any;
      const tar = tarModule.default || tarModule;
      const extracted: any[] = [];
      await tar.extract({
        file: archiveBuffer,
              onentry: (entry: any) => {
          if (entry.type === 'File' && (!extractPath || entry.path.startsWith(extractPath))) {
            const chunks: Buffer[] = [];
            entry.on('data', (chunk: Buffer) => chunks.push(chunk));
            entry.on('end', () => {
              extracted.push({
                name: entry.path.split('/').pop() || entry.path,
                content: Buffer.concat(chunks).toString('base64'),
                size: entry.size,
                path: entry.path,
              });
            });
          }
        },
      });
      files.push(...extracted);
    } catch (error: any) {
      throw new Error(`TAR extraction failed. Please install 'tar' package: ${error.message}`);
    }
  } else {
    throw new Error(`Archive format ${format} is not yet supported`);
  }
  
  return {
    files,
    count: files.length,
  };
};

// 34. Image Manipulation
const imageManipulationExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { operation, imageContent, width, height, maintainAspectRatio = 'true', x, y, angle, direction, outputFormat, filter, quality = 90 } = config;
  
  let imageData = imageContent;
  if (!imageData && inputData) {
    if (typeof inputData === 'string') {
      imageData = inputData;
    } else if (inputData.image || inputData.content) {
      imageData = inputData.image || inputData.content;
    }
  }
  
  if (!imageData) {
    throw new Error('Image content is required');
  }
  
  try {
    const sharp = (await import('sharp')).default;
    const base64Data = imageData.replace(/^data:[^;]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    let image = sharp(imageBuffer);
    
    // Apply operation
    if (operation === 'resize') {
      image = image.resize(width, height, {
        fit: maintainAspectRatio === 'true' ? 'inside' : 'fill',
      });
    } else if (operation === 'crop') {
      if (width && height && x !== undefined && y !== undefined) {
        image = image.extract({ left: x, top: y, width, height });
      }
    } else if (operation === 'rotate') {
      image = image.rotate(angle || 0);
    } else if (operation === 'flip') {
      if (direction === 'horizontal') {
        image = image.flop();
      } else {
        image = image.flip();
      }
    } else if (operation === 'convert') {
      if (outputFormat === 'jpeg') {
        image = image.jpeg({ quality });
      } else if (outputFormat === 'png') {
        image = image.png();
      } else if (outputFormat === 'webp') {
        image = image.webp({ quality });
      } else if (outputFormat === 'gif') {
        image = image.gif();
      }
    } else if (operation === 'filter') {
      if (filter === 'grayscale') {
        image = image.greyscale();
      } else if (filter === 'sepia') {
        image = image.modulate({ saturation: 0.5 }).tint({ r: 112, g: 66, b: 20 });
      } else if (filter === 'blur') {
        image = image.blur(5);
      } else if (filter === 'sharpen') {
        image = image.sharpen();
      } else if (filter === 'brighten') {
        image = image.modulate({ brightness: 1.2 });
      } else if (filter === 'darken') {
        image = image.modulate({ brightness: 0.8 });
      }
    } else if (operation === 'metadata') {
      const metadata = await image.metadata();
      return {
        metadata,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length,
      };
    }
    
    const outputBuffer = await image.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();
    
    return {
      image: outputBuffer.toString('base64'),
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: outputBuffer.length,
    };
  } catch (error: any) {
    throw new Error(`Image manipulation failed. Please install 'sharp' package: ${error.message}`);
  }
};

// ============================================================================
// INFRASTRUCTURE NODES - DATABASE OPERATIONS
// ============================================================================

// Helper function to get database connection
async function getDbConnection(databaseType: string, connectionString: string) {
  if (databaseType === 'postgresql') {
    const { Client } = await import('pg');
    const client = new Client({ connectionString });
    await client.connect();
    return { client, type: 'postgresql' };
  } else if (databaseType === 'mysql') {
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection(connectionString);
    return { client: connection, type: 'mysql' };
  } else if (databaseType === 'sqlite') {
    // @ts-ignore - better-sqlite3 module types not available
    const DatabaseModule = await import('better-sqlite3') as any;
    const Database = DatabaseModule.default || DatabaseModule;
    const db = new Database(connectionString);
    return { client: db, type: 'sqlite' };
  } else if (databaseType === 'mongodb') {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(connectionString);
    await client.connect();
    return { client, type: 'mongodb' };
  } else {
    throw new Error(`Unsupported database type: ${databaseType}`);
  }
};

// 35. Database Query
const databaseQueryExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { databaseType, connectionString, query, parameters = [] } = config;
  
  if (!databaseType || !connectionString || !query) {
    throw new Error('Database type, connection string, and query are required');
  }
  
  const { client, type } = await getDbConnection(databaseType, connectionString);
  
  try {
    if (type === 'postgresql') {
      const result = await (client as any).query(query, parameters);
      await (client as any).end();
      
      return {
        results: result.rows,
        rowCount: result.rowCount,
        columns: result.fields?.map((f: any) => f.name) || [],
      };
    } else if (type === 'mysql') {
      const [rows, fields] = await (client as any).execute(query, parameters);
      await (client as any).end();
      
      return {
        results: rows,
        rowCount: Array.isArray(rows) ? rows.length : (rows as any).affectedRows || 0,
        columns: fields?.map((f: any) => f.name) || [],
      };
    } else if (type === 'sqlite') {
      const stmt = (client as any).prepare(query);
      const result = stmt.all(...parameters);
      return {
        results: result,
        rowCount: result.length,
        columns: result.length > 0 ? Object.keys(result[0]) : [],
      };
    } else if (type === 'mongodb') {
      // For MongoDB, query should be a JSON object
      const queryObj = typeof query === 'string' ? JSON.parse(query) : query;
      const db = (client as any).db();
      const collection = queryObj.collection || 'default';
      const results = await db.collection(collection).find(queryObj.filter || {}).toArray();
      await (client as any).close();
      
      return {
        results,
        rowCount: results.length,
        columns: results.length > 0 ? Object.keys(results[0]) : [],
      };
    }
  } catch (error: any) {
    // Close connection on error
    try {
      if (type === 'postgresql') await (client as any).end();
      else if (type === 'mysql') await (client as any).end();
      else if (type === 'mongodb') await (client as any).close();
    } catch {}
    
    throw new Error(`Database query failed: ${error.message}`);
  }
  
  return { results: [], rowCount: 0, columns: [] };
};

// 36. Insert Database Record
const insertDatabaseRecordExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { databaseType, connectionString, table, data } = config;
  
  if (!databaseType || !connectionString || !table || !data) {
    throw new Error('Database type, connection string, table, and data are required');
  }
  
  const { client, type } = await getDbConnection(databaseType, connectionString);
  
  try {
    if (type === 'postgresql') {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const result = await (client as any).query(query, values);
      await (client as any).end();
      
      return {
        id: result.rows[0]?.id || null,
        success: true,
        affectedRows: result.rowCount,
      };
    } else if (type === 'mysql') {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
      const [result] = await (client as any).execute(query, values);
      await (client as any).end();
      
      return {
        id: (result as any).insertId || null,
        success: true,
        affectedRows: (result as any).affectedRows || 0,
      };
    } else if (type === 'sqlite') {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
      const stmt = (client as any).prepare(query);
      const result = stmt.run(...values);
      
      return {
        id: (result as any).lastInsertRowid || null,
        success: true,
        affectedRows: (result as any).changes || 0,
      };
    } else if (type === 'mongodb') {
      const db = (client as any).db();
      const result = await db.collection(table).insertOne(data);
      await (client as any).close();
      
      return {
        id: result.insertedId.toString(),
        success: true,
        affectedRows: 1,
      };
    }
  } catch (error: any) {
    try {
      if (type === 'postgresql') await (client as any).end();
      else if (type === 'mysql') await (client as any).end();
      else if (type === 'mongodb') await (client as any).close();
    } catch {}
    
    throw new Error(`Database insert failed: ${error.message}`);
  }
  
  return { id: null, success: false, affectedRows: 0 };
};

// 37. Update Database Record
const updateDatabaseRecordExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { databaseType, connectionString, table, where, data } = config;
  
  if (!databaseType || !connectionString || !table || !where || !data) {
    throw new Error('Database type, connection string, table, where clause, and data are required');
  }
  
  const { client, type } = await getDbConnection(databaseType, connectionString);
  
  try {
    if (type === 'postgresql') {
      const setClause = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
      const whereClause = Object.keys(where).map((key, i) => `${key} = $${Object.keys(data).length + i + 1}`).join(' AND ');
      const values = [...Object.values(data), ...Object.values(where)];
      const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      const result = await (client as any).query(query, values);
      await (client as any).end();
      
      return {
        affectedRows: result.rowCount,
        success: true,
      };
    } else if (type === 'mysql') {
      const setClause = Object.keys(data).map(() => '?').join(', ');
      const whereClause = Object.keys(where).map(() => '?').join(' AND ');
      const values = [...Object.values(data), ...Object.values(where)];
      const query = `UPDATE ${table} SET ${Object.keys(data).map(k => `${k} = ?`).join(', ')} WHERE ${Object.keys(where).map(k => `${k} = ?`).join(' AND ')}`;
      const [result] = await (client as any).execute(query, values);
      await (client as any).end();
      
      return {
        affectedRows: (result as any).affectedRows || 0,
        success: true,
      };
    } else if (type === 'sqlite') {
      const setClause = Object.keys(data).map(() => '?').join(', ');
      const whereClause = Object.keys(where).map(() => '?').join(' AND ');
      const values = [...Object.values(data), ...Object.values(where)];
      const query = `UPDATE ${table} SET ${Object.keys(data).map(k => `${k} = ?`).join(', ')} WHERE ${Object.keys(where).map(k => `${k} = ?`).join(' AND ')}`;
      const stmt = (client as any).prepare(query);
      const result = stmt.run(...values);
      
      return {
        affectedRows: (result as any).changes || 0,
        success: true,
      };
    } else if (type === 'mongodb') {
      const db = (client as any).db();
      const result = await db.collection(table).updateMany(where, { $set: data });
      await (client as any).close();
      
      return {
        affectedRows: result.modifiedCount,
        success: true,
      };
    }
  } catch (error: any) {
    try {
      if (type === 'postgresql') await (client as any).end();
      else if (type === 'mysql') await (client as any).end();
      else if (type === 'mongodb') await (client as any).close();
    } catch {}
    
    throw new Error(`Database update failed: ${error.message}`);
  }
  
  return { affectedRows: 0, success: false };
};

// 38. Delete Database Record
const deleteDatabaseRecordExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { databaseType, connectionString, table, where } = config;
  
  if (!databaseType || !connectionString || !table || !where) {
    throw new Error('Database type, connection string, table, and where clause are required');
  }
  
  const { client, type } = await getDbConnection(databaseType, connectionString);
  
  try {
    if (type === 'postgresql') {
      const whereClause = Object.keys(where).map((key, i) => `${key} = $${i + 1}`).join(' AND ');
      const values = Object.values(where);
      const query = `DELETE FROM ${table} WHERE ${whereClause}`;
      const result = await (client as any).query(query, values);
      await (client as any).end();
      
      return {
        affectedRows: result.rowCount,
        success: true,
      };
    } else if (type === 'mysql') {
      const whereClause = Object.keys(where).map(() => '?').join(' AND ');
      const values = Object.values(where);
      const query = `DELETE FROM ${table} WHERE ${Object.keys(where).map(k => `${k} = ?`).join(' AND ')}`;
      const [result] = await (client as any).execute(query, values);
      await (client as any).end();
      
      return {
        affectedRows: (result as any).affectedRows || 0,
        success: true,
      };
    } else if (type === 'sqlite') {
      const whereClause = Object.keys(where).map(() => '?').join(' AND ');
      const values = Object.values(where);
      const query = `DELETE FROM ${table} WHERE ${Object.keys(where).map(k => `${k} = ?`).join(' AND ')}`;
      const stmt = (client as any).prepare(query);
      const result = stmt.run(...values);
      
      return {
        affectedRows: (result as any).changes || 0,
        success: true,
      };
    } else if (type === 'mongodb') {
      const db = (client as any).db();
      const result = await db.collection(table).deleteMany(where);
      await (client as any).close();
      
      return {
        affectedRows: result.deletedCount,
        success: true,
      };
    }
  } catch (error: any) {
    try {
      if (type === 'postgresql') await (client as any).end();
      else if (type === 'mysql') await (client as any).end();
      else if (type === 'mongodb') await (client as any).close();
    } catch {}
    
    throw new Error(`Database delete failed: ${error.message}`);
  }
  
  return { affectedRows: 0, success: false };
};

// ============================================================================
// INFRASTRUCTURE NODES - WORKFLOW STATE MANAGEMENT
// ============================================================================

// 39. Wait for Webhook
const waitForWebhookExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { timeout = 300, webhookPath } = config;
  
  // Generate unique webhook path if not provided
  const finalWebhookPath = webhookPath || `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Note: Full webhook functionality requires:
  // 1. A workflow_executions table in Supabase to store execution state
  // 2. An API route at /api/webhooks/[path] to receive webhook calls
  // 3. A mechanism to resume workflow execution when webhook is received
  // 
  // For now, this is a simplified implementation that just waits for the timeout period.
  // The webhook path is logged so users can set up their webhook endpoint.
  context.logger.info(`Waiting for webhook at path: ${finalWebhookPath} (timeout: ${timeout}s)`);
  context.logger.warn('Full webhook functionality requires additional infrastructure. Currently using timeout-based wait.');
  
  // Wait for the specified timeout period
  // In a full implementation, this would pause the workflow execution and resume when webhook is received
  await new Promise((resolve) => setTimeout(resolve, timeout * 1000));
  
  // Return timeout result
  // In production, this would check if webhook was received and return that data instead
  return {
    data: inputData,
    headers: {},
    receivedAt: null,
    timeout: true,
    webhookPath: finalWebhookPath,
    message: 'Webhook wait timed out. Full webhook functionality requires additional infrastructure setup.',
  };
};

// 23. Generate Image (DALL-E)
const generateImageExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { prompt, size = '1024x1024', style, quality = 'standard' } = config;
  
  if (!prompt) {
    throw new Error('Prompt is required');
  }

  // Get OpenAI API key from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const openaiApiKey = await getIntegrationCredential(context.userId, 'openai', 'api_key');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key required. Please connect your OpenAI account.');
  }

  const response = await context.http.post(
    'https://api.openai.com/v1/images/generations',
    {
      model: 'dall-e-3',
      prompt,
      size,
      quality: quality === 'hd' ? 'hd' : 'standard',
      style: style || 'vivid',
      n: 1,
    },
    {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // DALL-E returns image URL, we'll return that
  // Users can download it using the Download File node if needed
  return {
    image: response.data?.[0]?.url,
    url: response.data?.[0]?.url,
    revisedPrompt: response.data?.[0]?.revised_prompt || prompt,
  };
};

// 24. Image Recognition (GPT-4 Vision)
const imageRecognitionExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { imageContent, imageUrl, task, maxResults = 10 } = config;
  
  if (!imageContent && !imageUrl && !inputData) {
    throw new Error('Image content, image URL, or input data is required');
  }

  // Get OpenAI API key from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const openaiApiKey = await getIntegrationCredential(context.userId, 'openai', 'api_key');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key required. Please connect your OpenAI account.');
  }

  // Determine image source
  let imageData = imageContent || imageUrl;
  if (!imageData && inputData) {
    // Try to extract image from input data
    if (typeof inputData === 'string') {
      imageData = inputData;
    } else if (inputData.image || inputData.imageUrl || inputData.imageContent) {
      imageData = inputData.image || inputData.imageUrl || inputData.imageContent;
    }
  }

  if (!imageData) {
    throw new Error('No image data found');
  }

  // Build the prompt based on task
  const taskPrompts: Record<string, string> = {
    objects: 'Identify and describe all objects in this image. Return a JSON array with objects containing "label", "confidence" (0-1), and "description".',
    scene: 'Describe the scene in this image in detail. What is happening? What is the setting?',
    ocr: 'Extract all text from this image. Return only the extracted text.',
    faces: 'Detect and describe any faces in this image. Return a JSON array with objects containing "description" and "confidence" (0-1).',
    labels: 'Generate descriptive labels for this image. Return a JSON array of label strings.',
  };

  const systemPrompt = taskPrompts[task] || taskPrompts.labels;

  // Format image for API
  const imageContentType = imageData.startsWith('http') 
    ? { type: 'image_url', image_url: { url: imageData } }
    : { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageData.replace(/^data:image\/[a-z]+;base64,/, '')}` } };

  const response = await context.http.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            imageContentType,
            { type: 'text', text: `Please analyze this image and ${task === 'ocr' ? 'extract all text' : 'provide the requested information'}.` },
          ],
        },
      ],
      max_tokens: 1000,
    },
    {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const content = response.choices?.[0]?.message?.content || '';
  
  // Parse results based on task
  let results: any[] = [];
  let text = '';
  
  if (task === 'ocr') {
    text = content;
  } else {
    try {
      results = JSON.parse(content);
      if (!Array.isArray(results)) {
        results = [results];
      }
    } catch {
      // If not JSON, create a single result object
      results = [{ label: content, confidence: 0.9 }];
    }
  }

  // Limit results
  if (results.length > maxResults) {
    results = results.slice(0, maxResults);
  }

  return {
    results: task !== 'ocr' ? results : [],
    text: task === 'ocr' ? text : undefined,
    count: task === 'ocr' ? text.length : results.length,
  };
};

// 25. Text to Speech (OpenAI TTS)
const textToSpeechExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { text, voice = 'alloy', speed = 1.0, format = 'mp3' } = config;
  
  const inputText = text || (typeof inputData === 'string' ? inputData : JSON.stringify(inputData));
  
  if (!inputText) {
    throw new Error('Text is required');
  }

  // Get OpenAI API key from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const openaiApiKey = await getIntegrationCredential(context.userId, 'openai', 'api_key');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key required. Please connect your OpenAI account.');
  }

  // Validate voice
  const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  const selectedVoice = validVoices.includes(voice) ? voice : 'alloy';

  // Validate speed
  const validatedSpeed = Math.max(0.25, Math.min(4.0, speed));

  // Validate format
  const validFormats = ['mp3', 'opus', 'aac', 'flac'];
  const selectedFormat = validFormats.includes(format) ? format : 'mp3';

  // Use fetch for binary response (TTS returns audio file)
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: inputText,
      voice: selectedVoice,
      speed: validatedSpeed,
      response_format: selectedFormat,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS API error: ${response.status} - ${errorText}`);
  }

  // Convert audio to base64
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const audioBase64 = buffer.toString('base64');

  // Estimate duration (rough estimate: ~150 words per minute at normal speed)
  const wordCount = inputText.split(/\s+/).length;
  const estimatedDuration = (wordCount / 150) * 60 / validatedSpeed;

  return {
    audio: audioBase64,
    format: selectedFormat,
    duration: estimatedDuration,
    mimeType: `audio/${selectedFormat}`,
  };
};

// 26. Speech to Text (OpenAI Whisper)
const speechToTextExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { audioContent, audioUrl, language = 'auto', responseFormat = 'text' } = config;
  
  // Determine audio source
  let audioData = audioContent || audioUrl;
  if (!audioData && inputData) {
    if (typeof inputData === 'string') {
      audioData = inputData;
    } else if (inputData.audio || inputData.audioUrl || inputData.audioContent) {
      audioData = inputData.audio || inputData.audioUrl || inputData.audioContent;
    }
  }

  if (!audioData) {
    throw new Error('Audio content, audio URL, or input data is required');
  }

  // Get OpenAI API key from integration credentials
  const { getIntegrationCredential } = await import('@/lib/integrations/service');
  const openaiApiKey = await getIntegrationCredential(context.userId, 'openai', 'api_key');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key required. Please connect your OpenAI account.');
  }

  // Use native FormData (Node 18+ has native FormData support)
  const formData = new FormData();
  
  if (audioUrl) {
    // Fetch audio from URL and add to form
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    // Create File object for native FormData (Node 18+)
    const file = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });
    formData.append('file', file);
  } else if (audioContent) {
    // Convert base64 to buffer
    const base64Data = audioContent.replace(/^data:audio\/[a-z]+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');
    // Create File object for native FormData (Node 18+)
    const file = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });
    formData.append('file', file);
  }

  formData.append('model', 'whisper-1');
  if (language !== 'auto') {
    formData.append('language', language);
  }
  formData.append('response_format', responseFormat);

  // Use fetch for multipart/form-data (native FormData works with fetch in Node 18+)
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      // Let fetch set Content-Type with boundary for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Whisper API error: ${response.status} - ${errorText}`);
  }

  let result: any;
  if (responseFormat === 'text' || responseFormat === 'srt' || responseFormat === 'vtt') {
    result = await response.text();
  } else {
    result = await response.json();
  }

  // Parse result based on format
  if (responseFormat === 'json') {
    return {
      text: result.text,
      segments: result.segments || [],
      language: result.language || language,
      duration: result.duration,
    };
  } else if (responseFormat === 'srt' || responseFormat === 'vtt') {
    return {
      text: result,
      format: responseFormat,
      language: language === 'auto' ? 'auto-detected' : language,
    };
  } else {
    return {
      text: result.text || result,
      language: result.language || (language === 'auto' ? 'auto-detected' : language),
    };
  }
};


// ============================================================================
// NODE REGISTRY
// ============================================================================

export const nodeRegistry: NodeRegistry = {
  // ACTION NODES
  'send-email-gmail': {
    id: 'send-email-gmail',
    name: 'Send Email via Gmail',
    type: 'action',
    description: 'Send an email from your connected Gmail account. No extra accounts needed — just connect Google.',
    icon: 'Mail',
    category: 'communication',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'success', type: 'boolean', description: 'Whether the email was sent successfully' },
      { name: 'messageId', type: 'string', description: 'Gmail message ID' },
      { name: 'threadId', type: 'string', description: 'Gmail thread ID' },
    ],
    configSchema: {
      to: {
        type: 'string',
        label: 'To',
        description: 'Who to send the email to',
        required: true,
        placeholder: 'e.g. friend@example.com — or use {{inputData.email.fromEmail}} to reply to whoever emailed you',
      },
      subject: {
        type: 'string',
        label: 'Subject',
        description: 'Email subject line',
        required: true,
        placeholder: 'e.g. Hello! — or use Re: {{inputData.email.subject}}',
      },
      body: {
        type: 'textarea',
        label: 'Message',
        description: 'What to say in the email. HTML is supported for formatting.',
        required: true,
        placeholder: 'Write your message here...',
      },
      cc: {
        type: 'string',
        label: 'CC (optional)',
        description: 'Send a copy to another address',
        required: false,
        placeholder: 'e.g. manager@example.com',
      },
      bcc: {
        type: 'string',
        label: 'BCC (optional)',
        description: 'Send a hidden copy to another address',
        required: false,
        placeholder: 'e.g. archive@example.com',
      },
      replyToThread: {
        type: 'select',
        label: 'Send as a reply?',
        description: 'Reply inside an existing email thread instead of starting a new conversation',
        required: false,
        default: 'no',
        options: [
          { value: 'no', label: 'No — start a new email' },
          { value: 'yes', label: 'Yes — reply in an existing thread' },
        ],
      },
      threadId: {
        type: 'string',
        label: 'Thread ID',
        description: 'The email thread to reply to. If this workflow was triggered by a received email, use {{inputData.email.threadId}} here.',
        required: false,
        placeholder: '{{inputData.email.threadId}}',
      },
    },
    execute: sendEmailGmailExecute,
    code: sendEmailGmailExecute.toString(),
  },

  'send-email': {
    id: 'send-email',
    name: 'Send Email via SendGrid',
    type: 'action',
    description: 'Sends an email using a connected SendGrid account.',
    icon: 'Mail',
    category: 'communication',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'success', type: 'boolean', description: 'Whether email was sent successfully' },
      { name: 'messageId', type: 'string', description: 'Message ID from email service' },
    ],
    configSchema: {
      to: { type: 'string', label: 'To', description: 'Recipient email address (e.g., user@example.com)', required: true },
      subject: { type: 'string', label: 'Subject', description: 'Email subject line', required: true },
      body: { type: 'textarea', label: 'Body', description: 'Email body content (HTML supported)', required: true },
      from: { type: 'string', label: 'From', description: 'Sender email address (optional, defaults to noreply@runwise.ai)', required: false },
      cc: { type: 'string', label: 'CC', description: 'CC recipient email address (optional)', required: false },
      bcc: { type: 'string', label: 'BCC', description: 'BCC recipient email address (optional)', required: false },
    },
    execute: sendEmailExecute,
    code: sendEmailExecute.toString(),
  },
  
  'create-notion-page': {
    id: 'create-notion-page',
    name: 'Create Notion Page',
    type: 'action',
    description: 'Creates a new page in a Notion database.',
    icon: 'FileText',
    category: 'productivity',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'pageId', type: 'string', description: 'Created page ID' },
      { name: 'url', type: 'string', description: 'URL of created page' },
    ],
    configSchema: {
      apiKey: { type: 'string', label: 'Notion API Key', description: 'Optional: Notion integration token (or connect Notion account above)', required: false },
      databaseId: { type: 'string', label: 'Database', description: 'Select a Notion database', required: true },
      title: { type: 'string', label: 'Title', description: 'Page title', required: true },
      content: { type: 'textarea', label: 'Content', description: 'Page content blocks (JSON format)', required: false },
    },
    execute: createNotionPageExecute,
    code: createNotionPageExecute.toString(),
  },
  
  'post-to-slack-channel': {
    id: 'post-to-slack-channel',
    name: 'Post to Slack Channel',
    type: 'action',
    description: 'Posts a message to a Slack channel.',
    icon: 'MessageSquare',
    category: 'communication',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'ts', type: 'string', description: 'Message timestamp' },
      { name: 'channel', type: 'string', description: 'Channel ID' },
    ],
    configSchema: {
      botToken: { type: 'string', label: 'Bot Token', description: 'Optional: Slack Bot Token (or connect Slack account above)', required: false },
      channel: { type: 'string', label: 'Channel', description: 'Select a Slack channel', required: true },
      message: { type: 'textarea', label: 'Message', description: 'Message text to post', required: true },
      threadTs: { type: 'string', label: 'Thread TS', description: 'Thread timestamp to reply to (optional)', required: false },
    },
    execute: postToSlackChannelExecute,
    code: postToSlackChannelExecute.toString(),
  },
  
  'send-discord-message': {
    id: 'send-discord-message',
    name: 'Send Discord Message',
    type: 'action',
    description: 'Sends a message to a Discord channel via webhook.',
    icon: 'MessageCircle',
    category: 'communication',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'success', type: 'boolean', description: 'Whether message was sent' },
    ],
    configSchema: {
      guildId: { type: 'string', label: 'Server', description: 'Select a Discord server', required: true, serviceName: 'discord', resourceType: 'guild' },
      channelId: { type: 'string', label: 'Channel', description: 'Select a Discord channel', required: true, serviceName: 'discord', resourceType: 'channel' },
      message: { type: 'textarea', label: 'Message', description: 'Message content to send', required: true },
      embeds: { type: 'textarea', label: 'Embeds', description: 'Discord embed objects (JSON format, optional)', required: false },
    },
    execute: sendDiscordMessageExecute,
    code: sendDiscordMessageExecute.toString(),
  },
  
  'create-trello-card': {
    id: 'create-trello-card',
    name: 'Create Trello Card',
    type: 'action',
    description: 'Creates a new card in a Trello board list.',
    icon: 'Trello',
    category: 'productivity',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'cardId', type: 'string', description: 'Created card ID' },
      { name: 'url', type: 'string', description: 'URL of created card' },
    ],
    configSchema: {
      apiKey: { type: 'string', label: 'Trello API Key', description: 'Optional: Trello API key (or connect Trello account above)', required: false },
      token: { type: 'string', label: 'Trello Token', description: 'Optional: Trello token (or connect Trello account above)', required: false },
      boardId: { type: 'string', label: 'Board', description: 'Select a Trello board', required: true },
      idList: { type: 'string', label: 'List', description: 'Select a list in the board', required: true },
      name: { type: 'string', label: 'Card Name', description: 'Card title', required: true },
      desc: { type: 'textarea', label: 'Description', description: 'Card description (supports Markdown)', required: false },
      dueDate: { type: 'string', label: 'Due Date', description: 'Due date (ISO format, e.g., 2024-12-31T23:59:59Z)', required: false },
    },
    execute: createTrelloCardExecute,
    code: createTrelloCardExecute.toString(),
  },
  
  'update-airtable-record': {
    id: 'update-airtable-record',
    name: 'Update Airtable Record',
    type: 'action',
    description: 'Updates an existing record in an Airtable base.',
    icon: 'Database',
    category: 'data',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'id', type: 'string', description: 'Updated record ID' },
      { name: 'fields', type: 'object', description: 'Updated fields' },
    ],
    configSchema: {
      apiKey: { type: 'string', label: 'Airtable API Key', description: 'Optional: Airtable Personal Access Token (or connect Airtable account above)', required: false },
      baseId: { type: 'string', label: 'Base', description: 'Select an Airtable base', required: true },
      tableId: { type: 'string', label: 'Table', description: 'Select a table in the base', required: true },
      recordId: { type: 'string', label: 'Record ID', description: 'Record ID to update', required: true },
      fields: { type: 'object', label: 'Fields', description: 'Fields to update (JSON format, e.g., {"Name": "John", "Email": "john@example.com"})', required: true },
    },
    execute: updateAirtableRecordExecute,
    code: updateAirtableRecordExecute.toString(),
  },
  
  'create-calendar-event': {
    id: 'create-calendar-event',
    name: 'Create Calendar Event',
    type: 'action',
    description: 'Creates a new event in Google Calendar.',
    icon: 'Calendar',
    category: 'productivity',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'eventId', type: 'string', description: 'Created event ID' },
      { name: 'htmlLink', type: 'string', description: 'URL of calendar event' },
    ],
    configSchema: {
      calendarId: { 
        type: 'integration', 
        label: 'Calendar', 
        description: 'Select a Google Calendar', 
        required: true,
        integrationType: 'google',
        resourceType: 'calendar'
      },
      apiKey: { type: 'string', label: 'Google API Key', description: 'Optional: Google Cloud API key (or connect Google account above)', required: false },
      summary: { type: 'string', label: 'Title', description: 'Event title', required: true },
      description: { type: 'textarea', label: 'Description', description: 'Event description', required: false },
      start: { type: 'string', label: 'Start Time', description: 'Start datetime (ISO format, e.g., 2024-12-31T10:00:00Z)', required: true },
      end: { type: 'string', label: 'End Time', description: 'End datetime (ISO format, e.g., 2024-12-31T11:00:00Z)', required: true },
      attendees: { type: 'array', label: 'Attendees', description: 'Array of attendee emails (e.g., ["user1@example.com", "user2@example.com"])', required: false },
    },
    execute: createCalendarEventExecute,
    code: createCalendarEventExecute.toString(),
  },
  
  'send-sms-via-twilio': {
    id: 'send-sms-via-twilio',
    name: 'Send SMS via Twilio',
    type: 'action',
    description: 'Sends an SMS message using Twilio.',
    icon: 'Smartphone',
    category: 'communication',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'messageSid', type: 'string', description: 'Twilio message SID' },
      { name: 'status', type: 'string', description: 'Message status' },
    ],
    configSchema: {
      to: { type: 'string', label: 'To', description: 'Recipient phone number (E.164 format, e.g., +1234567890)', required: true },
      message: { type: 'textarea', label: 'Message', description: 'SMS message text (max 1600 characters)', required: true },
      from: { type: 'string', label: 'From', description: 'Your Twilio phone number (E.164 format, e.g., +1234567890)', required: true },
    },
    execute: sendSmsViaTwilioExecute,
    code: sendSmsViaTwilioExecute.toString(),
  },
  
  'upload-file-to-google-drive': {
    id: 'upload-file-to-google-drive',
    name: 'Upload File to Google Drive',
    type: 'action',
    description: 'Uploads a file to Google Drive.',
    icon: 'Upload',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'fileId', type: 'string', description: 'Uploaded file ID' },
      { name: 'webViewLink', type: 'string', description: 'Web view link' },
    ],
    configSchema: {
      folderId: { 
        type: 'integration', 
        label: 'Folder', 
        description: 'Select a Google Drive folder (optional)', 
        required: false,
        integrationType: 'google',
        resourceType: 'folder'
      },
      apiKey: { type: 'string', label: 'Google API Key', description: 'Optional: Google Cloud API key (or connect Google account above)', required: false },
      fileName: { type: 'string', label: 'File Name', description: 'Name of the file (e.g., "document.pdf")', required: true },
      fileContent: { type: 'textarea', label: 'File Content', description: 'File content (base64 encoded or text)', required: true },
      mimeType: { type: 'string', label: 'MIME Type', description: 'File MIME type (e.g., "application/pdf", "text/plain", optional)', required: false },
    },
    execute: uploadFileToGoogleDriveExecute,
    code: uploadFileToGoogleDriveExecute.toString(),
  },

  'post-to-x': {
    id: 'post-to-x',
    name: 'Post to X',
    type: 'action',
    description: 'Posts a tweet to X (Twitter).',
    icon: 'Twitter',
    category: 'social',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'success', type: 'boolean', description: 'Whether tweet was posted successfully' },
      { name: 'id', type: 'string', description: 'Tweet ID' },
      { name: 'text', type: 'string', description: 'Tweet text' },
      { name: 'created_at', type: 'string', description: 'Tweet creation timestamp' },
    ],
    configSchema: {
      text: { type: 'textarea', label: 'Tweet Text', description: 'Content of the tweet (280 character limit)', required: true },
      replyTo: { type: 'string', label: 'Reply To', description: 'Tweet ID to reply to (optional)', required: false },
    },
    execute: postToXExecute,
    code: postToXExecute.toString(),
  },
  
  // TRIGGER NODES
  'new-form-submission': {
    id: 'new-form-submission',
    name: 'New Form Submission',
    type: 'trigger',
    description: 'Triggers when a new submission is received in a Google Form.',
    icon: 'FileCheck',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'submission', type: 'object', description: 'First (most recent) form submission' },
      { name: 'submission.responseId', type: 'string', description: 'Unique submission ID' },
      { name: 'submission.createTime', type: 'string', description: 'Submission timestamp' },
      { name: 'submission.answers', type: 'object', description: 'All question answers' },
      { name: 'submissions', type: 'array', description: 'All new submissions' },
      { name: 'count', type: 'number', description: 'Number of new submissions' },
    ],
    configSchema: {
      formId: { 
        type: 'integration', 
        label: 'Form', 
        description: 'Select a Google Form', 
        required: true,
        integrationType: 'google',
        resourceType: 'form'
      },
    },
    execute: newFormSubmissionExecute,
    code: newFormSubmissionExecute.toString(),
  },
  
  'new-email-received': {
    id: 'new-email-received',
    name: 'New Email Received',
    type: 'trigger',
    description: 'Triggers when a new email is received in Gmail inbox.',
    icon: 'Mail',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'email', type: 'object', description: 'First (most recent) email — use this for single-email workflows' },
      { name: 'email.id', type: 'string', description: 'Gmail message ID' },
      { name: 'email.threadId', type: 'string', description: 'Thread ID — use in Send Email via Gmail to reply in this thread' },
      { name: 'email.from', type: 'string', description: 'Sender full address (e.g. "John Smith <john@example.com>")' },
      { name: 'email.fromEmail', type: 'string', description: 'Sender email address only' },
      { name: 'email.fromName', type: 'string', description: 'Sender display name' },
      { name: 'email.to', type: 'string', description: 'Recipient address' },
      { name: 'email.subject', type: 'string', description: 'Email subject line' },
      { name: 'email.date', type: 'string', description: 'Date and time the email was received' },
      { name: 'email.snippet', type: 'string', description: 'Short preview of the email body' },
      { name: 'email.body', type: 'string', description: 'Full email body text' },
      { name: 'emails', type: 'array', description: 'All new emails (use when processing multiple at once)' },
      { name: 'count', type: 'number', description: 'Number of new emails received' },
    ],
    configSchema: {
      categoryId: {
        type: 'select',
        label: 'Category',
        description: 'Only trigger for emails in this inbox category',
        required: false,
        default: 'CATEGORY_PERSONAL',
        options: [
          { value: 'all', label: 'All categories' },
          { value: 'CATEGORY_PERSONAL', label: 'Primary' },
          { value: 'CATEGORY_PROMOTIONS', label: 'Promotions' },
          { value: 'CATEGORY_SOCIAL', label: 'Social' },
          { value: 'CATEGORY_UPDATES', label: 'Updates' },
          { value: 'CATEGORY_FORUMS', label: 'Forums' },
        ],
      },
      apiKey: { type: 'string', label: 'Google API Key', description: 'Optional: Google Cloud API key (or connect Google account above)', required: false },
    },
    execute: newEmailReceivedExecute,
    code: newEmailReceivedExecute.toString(),
  },
  
  'new-row-in-google-sheet': {
    id: 'new-row-in-google-sheet',
    name: 'New Row in Google Sheet',
    type: 'trigger',
    description: 'Triggers when a new row is added to a Google Sheet.',
    icon: 'Table',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'row', type: 'array', description: 'First new row (array of cell values)' },
      { name: 'rows', type: 'array', description: 'All new rows' },
      { name: 'count', type: 'number', description: 'Number of new rows' },
    ],
    configSchema: {
      apiKey: { type: 'string', label: 'Google API Key', description: 'Google Cloud API key with Sheets API enabled (get it from https://console.cloud.google.com/apis/credentials)', required: true },
      spreadsheetId: { type: 'string', label: 'Spreadsheet ID', description: 'Google Sheets spreadsheet ID (found in spreadsheet URL)', required: true },
      sheetName: { type: 'string', label: 'Sheet Name', description: 'Sheet name to monitor (e.g., "Sheet1")', required: true },
      lastRow: { type: 'number', label: 'Last Row', description: 'Last checked row number (auto-managed)', required: false },
    },
    execute: newRowInGoogleSheetExecute,
    code: newRowInGoogleSheetExecute.toString(),
  },
  
  'new-message-in-slack': {
    id: 'new-message-in-slack',
    name: 'New Message in Slack',
    type: 'trigger',
    description: 'Triggers when a new message is posted in a Slack channel.',
    icon: 'MessageSquare',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'message', type: 'object', description: 'First (most recent) message' },
      { name: 'message.text', type: 'string', description: 'Message text content' },
      { name: 'message.user', type: 'string', description: 'Slack user ID who sent the message' },
      { name: 'message.ts', type: 'string', description: 'Message timestamp' },
      { name: 'message.thread_ts', type: 'string', description: 'Thread timestamp (if in a thread)' },
      { name: 'messages', type: 'array', description: 'All new messages' },
      { name: 'count', type: 'number', description: 'Number of new messages' },
    ],
    configSchema: {
      botToken: { type: 'string', label: 'Bot Token', description: 'Optional: Slack Bot Token (or connect Slack account above)', required: false },
      channel: { type: 'string', label: 'Channel', description: 'Select a Slack channel', required: true },
      lastTs: { type: 'string', label: 'Last TS', description: 'Last message timestamp (auto-managed)', required: false },
    },
    execute: newMessageInSlackExecute,
    code: newMessageInSlackExecute.toString(),
  },
  
  'new-discord-message': {
    id: 'new-discord-message',
    name: 'New Discord Message',
    type: 'trigger',
    description: 'Triggers when a new message is received in a Discord channel.',
    icon: 'MessageCircle',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'message', type: 'object', description: 'Discord message data' },
      { name: 'message.content', type: 'string', description: 'Message text content' },
      { name: 'message.id', type: 'string', description: 'Discord message ID' },
      { name: 'message.author.username', type: 'string', description: 'Username of the message author' },
      { name: 'message.channel_id', type: 'string', description: 'Channel the message was posted in' },
      { name: 'message.timestamp', type: 'string', description: 'Message timestamp' },
    ],
    configSchema: {
      guildId: { type: 'string', label: 'Server', description: 'Select a Discord server', required: true, serviceName: 'discord', resourceType: 'guild' },
      channelId: { type: 'string', label: 'Channel', description: 'Select a Discord channel to monitor', required: true, serviceName: 'discord', resourceType: 'channel' },
    },
    execute: newDiscordMessageExecute,
    code: newDiscordMessageExecute.toString(),
  },
  
  'scheduled-time-trigger': {
    id: 'scheduled-time-trigger',
    name: 'Time Schedule',
    type: 'trigger',
    description: 'Triggers on a scheduled time using cron syntax.',
    icon: 'Clock',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'triggerTime', type: 'string', description: 'Trigger execution time' },
    ],
    configSchema: {
      schedule: { type: 'string', label: 'Schedule', description: 'Select frequency and time for scheduled execution', required: true },
      timezone: { type: 'string', label: 'Timezone', description: 'Timezone (e.g., "America/New_York")', required: false, default: 'UTC' },
    },
    execute: scheduledTimeTriggerExecute,
    code: scheduledTimeTriggerExecute.toString(),
  },
  
  'webhook-trigger': {
    id: 'webhook-trigger',
    name: 'Webhook Trigger',
    type: 'trigger',
    description: 'Triggers when an external app sends a request to this webhook URL. All fields from the payload are available in downstream nodes.',
    icon: 'Webhook',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'payload fields', type: 'object', description: 'Every field from the JSON body sent by the caller is available directly. For example, if the caller sends { "email": "x", "plan": "pro" }, reference them as {{inputData.email}} and {{inputData.plan}} in any downstream node. Internal metadata is available as {{inputData._webhookPath}}, {{inputData._receivedAt}}, and {{inputData._headers}}.' },
    ],
    configSchema: {
      path: { type: 'string', label: 'Webhook Path', description: 'Unique path for this webhook trigger (e.g. "new-signup"). Your full webhook URL will be: https://yourdomain.com/api/webhooks/{path}', required: true },
    },
    execute: webhookTriggerExecute,
    code: webhookTriggerExecute.toString(),
  },
  
  'new-github-issue': {
    id: 'new-github-issue',
    name: 'New GitHub Issue',
    type: 'trigger',
    description: 'Triggers when a new issue is created in a GitHub repository.',
    icon: 'GitBranch',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'issue', type: 'object', description: 'First (most recent) issue' },
      { name: 'issue.number', type: 'number', description: 'Issue number' },
      { name: 'issue.title', type: 'string', description: 'Issue title' },
      { name: 'issue.body', type: 'string', description: 'Issue description/body' },
      { name: 'issue.html_url', type: 'string', description: 'Link to the issue on GitHub' },
      { name: 'issue.state', type: 'string', description: 'Issue state (open/closed)' },
      { name: 'issue.user.login', type: 'string', description: 'Username of who opened the issue' },
      { name: 'issue.created_at', type: 'string', description: 'Date issue was created' },
      { name: 'issues', type: 'array', description: 'All new issues' },
      { name: 'count', type: 'number', description: 'Number of new issues' },
    ],
    configSchema: {
      accessToken: { type: 'string', label: 'Personal Access Token', description: 'Optional: GitHub Personal Access Token (or connect GitHub account above)', required: false },
      owner: { type: 'string', label: 'Owner', description: 'Repository owner (auto-filled from repository selection)', required: true },
      repo: { type: 'string', label: 'Repository', description: 'Select a GitHub repository', required: true },
      lastCheck: { type: 'string', label: 'Last Check', description: 'Last check timestamp (auto-managed)', required: false },
    },
    execute: newGitHubIssueExecute,
    code: newGitHubIssueExecute.toString(),
  },
  
  'file-uploaded': {
    id: 'file-uploaded',
    name: 'File Uploaded',
    type: 'trigger',
    description: 'Triggers when a new file is uploaded to Google Drive folder.',
    icon: 'Upload',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'file', type: 'object', description: 'First (most recent) uploaded file' },
      { name: 'file.id', type: 'string', description: 'Google Drive file ID' },
      { name: 'file.name', type: 'string', description: 'File name' },
      { name: 'file.mimeType', type: 'string', description: 'File MIME type' },
      { name: 'file.webViewLink', type: 'string', description: 'Link to view the file in Google Drive' },
      { name: 'files', type: 'array', description: 'All new files' },
      { name: 'count', type: 'number', description: 'Number of new files' },
    ],
    configSchema: {
      folderId: { 
        type: 'integration', 
        label: 'Folder', 
        description: 'Select a Google Drive folder to monitor', 
        required: true,
        integrationType: 'google',
        resourceType: 'folder'
      },
      apiKey: { type: 'string', label: 'Google API Key', description: 'Optional: Google Cloud API key (or connect Google account above)', required: false },
      driveId: { type: 'string', label: 'Drive ID', description: 'Google Drive ID (optional, for shared drives)', required: false },
      lastCheck: { type: 'string', label: 'Last Check', description: 'Last check timestamp (auto-managed)', required: false },
    },
    execute: fileUploadedExecute,
    code: fileUploadedExecute.toString(),
  },
  
  // TRANSFORM NODES
  'delay-execution': {
    id: 'delay-execution',
    name: 'Delay Execution',
    type: 'transform',
    description: 'Delays workflow execution for a specified duration.',
    icon: 'Hourglass',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'inputData', type: 'object', description: 'Original input data' },
    ],
    configSchema: {
      delayMs: { type: 'number', label: 'Delay (ms)', description: 'Delay duration in milliseconds', required: true, default: 1000 },
    },
    execute: delayExecutionExecute,
    code: delayExecutionExecute.toString(),
  },
  
  'generate-summary-with-ai': {
    id: 'generate-summary-with-ai',
    name: 'Generate Summary with AI',
    type: 'transform',
    description: 'Generates a summary of text using OpenAI.',
    icon: 'Sparkles',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'string', description: 'Text to summarize' },
    ],
    outputs: [
      { name: 'summary', type: 'string', description: 'Generated summary' },
      { name: 'summaryLength', type: 'number', description: 'Summary character count' },
    ],
    configSchema: {
      text: { type: 'textarea', label: 'Text', description: 'Text to summarize (or leave empty to use input from previous node)', required: false },
      maxLength: { type: 'number', label: 'Max Length', description: 'Maximum summary length in words (default: 100)', required: false, default: 100 },
    },
    execute: generateSummaryWithAiExecute,
    code: generateSummaryWithAiExecute.toString(),
  },

  'generate-ai-content': {
    id: 'generate-ai-content',
    name: 'Generate AI Content',
    type: 'transform',
    description: 'Generates content using OpenAI based on a custom prompt.',
    icon: 'Sparkles',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'content', type: 'string', description: 'Generated content' },
    ],
    configSchema: {
      prompt: { type: 'textarea', label: 'Prompt', description: 'Instructions for the AI (e.g. "Write a social media post about...")', required: true },
    },
    execute: generateAiContentExecute,
    code: generateAiContentExecute.toString(),
  },
  
  // NEW CANONICAL NODES
  
  // TRIGGERS
  'manual-trigger': {
    id: 'manual-trigger',
    name: 'Manual Trigger',
    type: 'trigger',
    description: 'Allows users to manually trigger a workflow execution via a button or API call.',
    icon: 'Play',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'triggeredAt', type: 'string', description: 'Timestamp of trigger' },
      { name: 'inputData', type: 'object', description: 'Optional input data passed to trigger' },
    ],
    configSchema: {
      triggerName: { type: 'string', label: 'Trigger Name', description: 'Unique name for this trigger', required: true },
      requireAuth: { 
        type: 'select', 
        label: 'Require Authentication', 
        description: 'Require user authentication to trigger', 
        required: false, 
        default: 'true',
        options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]
      },
    },
    execute: manualTriggerExecute,
    code: manualTriggerExecute.toString(),
  },
  
  // ACTIONS
  'http-request': {
    id: 'http-request',
    name: 'HTTP Request',
    type: 'action',
    description: 'Makes HTTP requests (GET, POST, PUT, DELETE, PATCH) to any URL. Essential for integrating with REST APIs.',
    icon: 'Link',
    category: 'communication',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'status', type: 'number', description: 'HTTP status code' },
      { name: 'headers', type: 'object', description: 'Response headers' },
      { name: 'body', type: 'any', description: 'Response body' },
      { name: 'success', type: 'boolean', description: 'Boolean indicating success' },
    ],
    configSchema: {
      method: { 
        type: 'select', 
        label: 'Method', 
        description: 'HTTP method', 
        required: true, 
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
          { label: 'PATCH', value: 'PATCH' }
        ]
      },
      url: { type: 'string', label: 'URL', description: 'Request URL', required: true },
      headers: { type: 'object', label: 'Headers', description: 'HTTP headers (JSON object, e.g., {"Authorization": "Bearer token"})', required: false },
      body: { type: 'textarea', label: 'Body', description: 'Request body (JSON, form-data, or raw text)', required: false },
      queryParams: { type: 'object', label: 'Query Parameters', description: 'URL query parameters (JSON object)', required: false },
      timeout: { type: 'number', label: 'Timeout (ms)', description: 'Request timeout in milliseconds', required: false, default: 30000 },
    },
    execute: httpRequestExecute,
    code: httpRequestExecute.toString(),
  },
  
  'stop-workflow': {
    id: 'stop-workflow',
    name: 'Stop Workflow',
    type: 'action',
    description: 'Stops workflow execution immediately. Useful for error handling or conditional stops.',
    icon: 'Square',
    category: 'utilities',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [],
    configSchema: {
      reason: { type: 'string', label: 'Reason', description: 'Reason for stopping workflow', required: false },
    },
    execute: stopWorkflowExecute,
    code: stopWorkflowExecute.toString(),
  },
  
  // TRANSFORMS
  'map-transform-data': {
    id: 'map-transform-data',
    name: 'Map / Transform Data',
    type: 'transform',
    description: 'Transforms each item in an array or object using a mapping function. Essential for data transformation.',
    icon: 'ArrowRightLeft',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'mapped', type: 'object', description: 'Transformed data' },
      { name: 'original', type: 'object', description: 'Original input data' },
    ],
    configSchema: {
      mapping: { type: 'object', label: 'Field Mapping', description: 'Object mapping input fields to output fields (e.g., {"newField": "oldField", "fullName": "{{firstName}} {{lastName}}"})', required: true },
      inputType: { 
        type: 'select', 
        label: 'Input Type', 
        description: 'Type of input data', 
        required: false, 
        default: 'object', 
        options: [
          { label: 'Object', value: 'object' },
          { label: 'Array', value: 'array' }
        ]
      },
    },
    execute: mapTransformDataExecute,
    code: mapTransformDataExecute.toString(),
  },
  
  'sort-data': {
    id: 'sort-data',
    name: 'Sort Data',
    type: 'transform',
    description: 'Sorts an array by a specified field in ascending or descending order.',
    icon: 'ArrowUpDown',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'array', description: 'Input array from previous node' },
    ],
    outputs: [
      { name: 'sorted', type: 'array', description: 'Sorted array' },
      { name: 'original', type: 'array', description: 'Original array' },
    ],
    configSchema: {
      field: { type: 'string', label: 'Field', description: 'Field name to sort by (leave empty to sort array of primitives)', required: false },
      order: { 
        type: 'select', 
        label: 'Order', 
        description: 'Sort order', 
        required: false, 
        default: 'asc', 
        options: [
          { label: 'Ascending', value: 'asc' },
          { label: 'Descending', value: 'desc' }
        ]
      },
      dataType: { 
        type: 'select', 
        label: 'Data Type', 
        description: 'Data type for comparison', 
        required: false, 
        default: 'auto', 
        options: [
          { label: 'Auto Detect', value: 'auto' },
          { label: 'String', value: 'string' },
          { label: 'Number', value: 'number' },
          { label: 'Date', value: 'date' }
        ]
      },
    },
    execute: sortDataExecute,
    code: sortDataExecute.toString(),
  },
  
  'group-data': {
    id: 'group-data',
    name: 'Group Data',
    type: 'transform',
    description: 'Groups array items by a specified field value. Creates an object with keys as group values and arrays as grouped items.',
    icon: 'Layers',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'array', description: 'Input array from previous node' },
    ],
    outputs: [
      { name: 'grouped', type: 'object', description: 'Object with grouped data' },
      { name: 'groups', type: 'array', description: 'Array of group keys' },
      { name: 'count', type: 'number', description: 'Number of groups' },
    ],
    configSchema: {
      field: { type: 'string', label: 'Group By Field', description: 'Field name to group by', required: true },
    },
    execute: groupDataExecute,
    code: groupDataExecute.toString(),
  },
  
  'aggregate-data': {
    id: 'aggregate-data',
    name: 'Aggregate Data',
    type: 'transform',
    description: 'Performs aggregation operations (sum, average, count, min, max) on array data.',
    icon: 'Function',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'array', description: 'Input array from previous node' },
    ],
    outputs: [
      { name: 'result', type: 'number', description: 'Aggregation result' },
      { name: 'operation', type: 'string', description: 'Operation performed' },
      { name: 'count', type: 'number', description: 'Number of items processed' },
    ],
    configSchema: {
      operation: { 
        type: 'select', 
        label: 'Operation', 
        description: 'Aggregation operation', 
        required: true, 
        options: [
          { label: 'Sum', value: 'sum' },
          { label: 'Average', value: 'average' },
          { label: 'Count', value: 'count' },
          { label: 'Min', value: 'min' },
          { label: 'Max', value: 'max' },
          { label: 'Count Distinct', value: 'countDistinct' }
        ]
      },
      field: { type: 'string', label: 'Field', description: 'Field name to aggregate (leave empty for count operations)', required: false },
    },
    execute: aggregateDataExecute,
    code: aggregateDataExecute.toString(),
  },
  
  'find-replace-text': {
    id: 'find-replace-text',
    name: 'Find and Replace Text',
    type: 'transform',
    description: 'Finds and replaces text patterns in a string using plain text or regex.',
    icon: 'SearchReplace',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'string', description: 'Input text from previous node' },
    ],
    outputs: [
      { name: 'result', type: 'string', description: 'Text with replacements applied' },
      { name: 'replacements', type: 'number', description: 'Number of replacements made' },
      { name: 'original', type: 'string', description: 'Original text' },
    ],
    configSchema: {
      text: { type: 'textarea', label: 'Text', description: 'Text to search in (leave empty to use input from previous node)', required: false },
      find: { type: 'string', label: 'Find', description: 'Text or regex pattern to find', required: true },
      replace: { type: 'string', label: 'Replace', description: 'Replacement text', required: true },
      useRegex: { 
        type: 'select', 
        label: 'Use Regex', 
        description: 'Treat find pattern as regular expression', 
        required: false, 
        default: 'false',
        options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]
      },
      caseSensitive: { 
        type: 'select', 
        label: 'Case Sensitive', 
        description: 'Case-sensitive matching', 
        required: false, 
        default: 'false',
        options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]
      },
    },
    execute: findReplaceTextExecute,
    code: findReplaceTextExecute.toString(),
  },
  
  'encode-decode': {
    id: 'encode-decode',
    name: 'Encode / Decode',
    type: 'transform',
    description: 'Encodes or decodes text using Base64, URL encoding, HTML entities, or other encoding schemes.',
    icon: 'Code',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'string', description: 'Input text from previous node' },
    ],
    outputs: [
      { name: 'result', type: 'string', description: 'Encoded/decoded text' },
      { name: 'original', type: 'string', description: 'Original text' },
    ],
    configSchema: {
      operation: { 
        type: 'select', 
        label: 'Operation', 
        description: 'Encode or decode', 
        required: true, 
        options: [
          { label: 'Encode', value: 'encode' },
          { label: 'Decode', value: 'decode' }
        ]
      },
      encoding: { 
        type: 'select', 
        label: 'Encoding Type', 
        description: 'Type of encoding', 
        required: true, 
        options: [
          { label: 'Base64', value: 'base64' },
          { label: 'URL', value: 'url' },
          { label: 'HTML Entities', value: 'html' },
          { label: 'Hex', value: 'hex' }
        ]
      },
      text: { type: 'textarea', label: 'Text', description: 'Text to encode/decode (leave empty to use input from previous node)', required: false },
    },
    execute: encodeDecodeExecute,
    code: encodeDecodeExecute.toString(),
  },
  
  'date-time-manipulation': {
    id: 'date-time-manipulation',
    name: 'Date / Time Manipulation',
    type: 'transform',
    description: 'Performs date/time operations like parsing, formatting, adding/subtracting time, extracting parts, and timezone conversion.',
    icon: 'Calendar',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'string', description: 'Input date/time from previous node' },
    ],
    outputs: [
      { name: 'result', type: 'any', description: 'Result of date/time operation' },
      { name: 'original', type: 'string', description: 'Original input date/time' },
    ],
    configSchema: {
      operation: { 
        type: 'select', 
        label: 'Operation', 
        description: 'Date/time operation', 
        required: true, 
        options: [
          { label: 'Format', value: 'format' },
          { label: 'Parse', value: 'parse' },
          { label: 'Add Time', value: 'add' },
          { label: 'Subtract Time', value: 'subtract' },
          { label: 'Extract Part', value: 'extract' },
          { label: 'Convert Timezone', value: 'convertTimezone' },
          { label: 'Get Current Time', value: 'now' }
        ]
      },
      inputDate: { type: 'string', label: 'Input Date', description: 'Input date/time (ISO format or leave empty to use input from previous node)', required: false },
      format: { type: 'string', label: 'Format', description: 'Output format (e.g., "YYYY-MM-DD HH:mm:ss" for format, or input format for parse)', required: false },
      amount: { type: 'number', label: 'Amount', description: 'Amount to add/subtract (for add/subtract operations)', required: false },
      unit: { 
        type: 'select', 
        label: 'Unit', 
        description: 'Time unit (for add/subtract operations)', 
        required: false, 
        options: [
          { label: 'Milliseconds', value: 'milliseconds' },
          { label: 'Seconds', value: 'seconds' },
          { label: 'Minutes', value: 'minutes' },
          { label: 'Hours', value: 'hours' },
          { label: 'Days', value: 'days' },
          { label: 'Weeks', value: 'weeks' },
          { label: 'Months', value: 'months' },
          { label: 'Years', value: 'years' }
        ]
      },
      extractPart: { 
        type: 'select', 
        label: 'Extract Part', 
        description: 'Part to extract (for extract operation)', 
        required: false, 
        options: [
          { label: 'Year', value: 'year' },
          { label: 'Month', value: 'month' },
          { label: 'Day', value: 'day' },
          { label: 'Hour', value: 'hour' },
          { label: 'Minute', value: 'minute' },
          { label: 'Second', value: 'second' },
          { label: 'Day of Week', value: 'dayOfWeek' },
          { label: 'Unix Timestamp', value: 'timestamp' }
        ]
      },
      timezone: { type: 'string', label: 'Timezone', description: 'Target timezone (e.g., "America/New_York") for convertTimezone operation', required: false },
    },
    execute: dateTimeManipulationExecute,
    code: dateTimeManipulationExecute.toString(),
  },
  
  'math-operations': {
    id: 'math-operations',
    name: 'Math Operations',
    type: 'transform',
    description: 'Performs mathematical operations (add, subtract, multiply, divide, modulo, power, round, etc.) on numeric values.',
    icon: 'Calculator',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'number', description: 'Input number from previous node' },
    ],
    outputs: [
      { name: 'result', type: 'number', description: 'Mathematical operation result' },
      { name: 'operation', type: 'string', description: 'Operation performed' },
    ],
    configSchema: {
      operation: { 
        type: 'select', 
        label: 'Operation', 
        description: 'Mathematical operation', 
        required: true, 
        options: [
          { label: 'Add', value: 'add' },
          { label: 'Subtract', value: 'subtract' },
          { label: 'Multiply', value: 'multiply' },
          { label: 'Divide', value: 'divide' },
          { label: 'Modulo', value: 'modulo' },
          { label: 'Power', value: 'power' },
          { label: 'Round', value: 'round' },
          { label: 'Floor', value: 'floor' },
          { label: 'Ceil', value: 'ceil' },
          { label: 'Absolute', value: 'abs' },
          { label: 'Square Root', value: 'sqrt' }
        ]
      },
      value1: { type: 'number', label: 'Value 1', description: 'First value (or leave empty to use input from previous node)', required: false },
      value2: { type: 'number', label: 'Value 2', description: 'Second value (for binary operations)', required: false },
      precision: { type: 'number', label: 'Precision', description: 'Decimal places for round operation', required: false, default: 2 },
    },
    execute: mathOperationsExecute,
    code: mathOperationsExecute.toString(),
  },
  
  'string-operations': {
    id: 'string-operations',
    name: 'String Operations',
    type: 'transform',
    description: 'Performs string manipulation operations (uppercase, lowercase, trim, substring, length, etc.).',
    icon: 'Type',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'string', description: 'Input text from previous node' },
    ],
    outputs: [
      { name: 'result', type: 'string', description: 'Result of string operation' },
      { name: 'original', type: 'string', description: 'Original input text' },
    ],
    configSchema: {
      operation: { 
        type: 'select', 
        label: 'Operation', 
        description: 'String operation', 
        required: true, 
        options: [
          { label: 'Uppercase', value: 'uppercase' },
          { label: 'Lowercase', value: 'lowercase' },
          { label: 'Trim', value: 'trim' },
          { label: 'Substring', value: 'substring' },
          { label: 'Length', value: 'length' },
          { label: 'Pad Start', value: 'padStart' },
          { label: 'Pad End', value: 'padEnd' },
          { label: 'Reverse', value: 'reverse' },
          { label: 'Capitalize', value: 'capitalize' },
          { label: 'Camel Case', value: 'camelCase' },
          { label: 'Snake Case', value: 'snakeCase' },
          { label: 'Kebab Case', value: 'kebabCase' }
        ]
      },
      text: { type: 'textarea', label: 'Text', description: 'Input text (leave empty to use input from previous node)', required: false },
      start: { type: 'number', label: 'Start Index', description: 'Start index for substring operation', required: false },
      end: { type: 'number', label: 'End Index', description: 'End index for substring operation', required: false },
      length: { type: 'number', label: 'Length', description: 'Length for pad operations', required: false },
      padString: { type: 'string', label: 'Pad String', description: 'String to pad with (for pad operations)', required: false, default: ' ' },
    },
    execute: stringOperationsExecute,
    code: stringOperationsExecute.toString(),
  },
  
  'array-operations': {
    id: 'array-operations',
    name: 'Array Operations',
    type: 'transform',
    description: 'Performs array manipulation operations (join, slice, reverse, unique, flatten, etc.).',
    icon: 'List',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'array', description: 'Input array from previous node' },
    ],
    outputs: [
      { name: 'result', type: 'any', description: 'Result of array operation' },
      { name: 'original', type: 'array', description: 'Original input array' },
      { name: 'length', type: 'number', description: 'Length of result (for applicable operations)' },
    ],
    configSchema: {
      operation: { 
        type: 'select', 
        label: 'Operation', 
        description: 'Array operation', 
        required: true, 
        options: [
          { label: 'Join', value: 'join' },
          { label: 'Slice', value: 'slice' },
          { label: 'Reverse', value: 'reverse' },
          { label: 'Unique', value: 'unique' },
          { label: 'Flatten', value: 'flatten' },
          { label: 'Shuffle', value: 'shuffle' },
          { label: 'Length', value: 'length' },
          { label: 'First', value: 'first' },
          { label: 'Last', value: 'last' },
          { label: 'Concat', value: 'concat' }
        ]
      },
      array: { type: 'array', label: 'Array', description: 'Input array (leave empty to use input from previous node)', required: false },
      separator: { type: 'string', label: 'Separator', description: 'Separator for join operation', required: false, default: ',' },
      start: { type: 'number', label: 'Start Index', description: 'Start index for slice operation', required: false },
      end: { type: 'number', label: 'End Index', description: 'End index for slice operation', required: false },
      depth: { type: 'number', label: 'Depth', description: 'Flattening depth (for flatten operation)', required: false, default: 1 },
      array2: { type: 'array', label: 'Second Array', description: 'Second array for concat operation', required: false },
    },
    execute: arrayOperationsExecute,
    code: arrayOperationsExecute.toString(),
  },
  
  'object-operations': {
    id: 'object-operations',
    name: 'Object Operations',
    type: 'transform',
    description: 'Performs object manipulation operations (get keys, get values, get entries, merge, pick, omit, etc.).',
    icon: 'Box',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'object', description: 'Input object from previous node' },
    ],
    outputs: [
      { name: 'result', type: 'any', description: 'Result of object operation' },
      { name: 'original', type: 'object', description: 'Original input object' },
    ],
    configSchema: {
      operation: { 
        type: 'select', 
        label: 'Operation', 
        description: 'Object operation', 
        required: true, 
        options: [
          { label: 'Get Keys', value: 'keys' },
          { label: 'Get Values', value: 'values' },
          { label: 'Get Entries', value: 'entries' },
          { label: 'Pick Fields', value: 'pick' },
          { label: 'Omit Fields', value: 'omit' },
          { label: 'Get Nested Value', value: 'get' },
          { label: 'Set Nested Value', value: 'set' },
          { label: 'Has Property', value: 'has' }
        ]
      },
      object: { type: 'object', label: 'Object', description: 'Input object (leave empty to use input from previous node)', required: false },
      fields: { type: 'array', label: 'Fields', description: 'Field names for pick/omit operations (e.g., ["name", "email"])', required: false },
      path: { type: 'string', label: 'Path', description: 'Dot-notation path for get/set operations (e.g., "user.profile.name")', required: false },
      value: { type: 'string', label: 'Value', description: 'Value to set (for set operation)', required: false },
      property: { type: 'string', label: 'Property', description: 'Property name to check (for has operation)', required: false },
    },
    execute: objectOperationsExecute,
    code: objectOperationsExecute.toString(),
  },
  
  // FILE OPERATIONS
  'download-file': {
    id: 'download-file',
    name: 'Download File',
    type: 'action',
    description: 'Downloads a file from a URL and returns its content.',
    icon: 'Download',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'content', type: 'string', description: 'File content (base64, binary, or text)' },
      { name: 'size', type: 'number', description: 'File size in bytes' },
      { name: 'mimeType', type: 'string', description: 'Content type from response headers' },
      { name: 'filename', type: 'string', description: 'Filename from Content-Disposition header (if available)' },
    ],
    configSchema: {
      url: { type: 'string', label: 'URL', description: 'URL of file to download', required: true },
      headers: { type: 'object', label: 'Headers', description: 'HTTP headers (JSON object)', required: false },
      encoding: { 
        type: 'select', 
        label: 'Encoding', 
        description: 'Response encoding', 
        required: false, 
        default: 'base64', 
        options: [
          { label: 'Base64', value: 'base64' },
          { label: 'Binary', value: 'binary' },
          { label: 'Text', value: 'text' }
        ]
      },
      timeout: { type: 'number', label: 'Timeout (ms)', description: 'Download timeout', required: false, default: 30000 },
    },
    execute: downloadFileExecute,
    code: downloadFileExecute.toString(),
  },
  
  'upload-file': {
    id: 'upload-file',
    name: 'Upload File',
    type: 'action',
    description: 'Uploads a file to a URL via HTTP POST/PUT request.',
    icon: 'Upload',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'success', type: 'boolean', description: 'Boolean indicating success' },
      { name: 'response', type: 'object', description: 'Upload response data' },
      { name: 'url', type: 'string', description: 'Final URL of uploaded file (if returned by server)' },
    ],
    configSchema: {
      url: { type: 'string', label: 'Upload URL', description: 'URL to upload file to', required: true },
      method: { 
        type: 'select', 
        label: 'Method', 
        description: 'HTTP method', 
        required: false, 
        default: 'POST', 
        options: [
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' }
        ]
      },
      fileContent: { type: 'textarea', label: 'File Content', description: 'File content (base64 or text, leave empty to use input from previous node)', required: false },
      fileName: { type: 'string', label: 'File Name', description: 'Name of file to upload', required: true },
      fieldName: { type: 'string', label: 'Field Name', description: 'Form field name for multipart upload (default: "file")', required: false, default: 'file' },
      mimeType: { type: 'string', label: 'MIME Type', description: 'File MIME type', required: false },
      headers: { type: 'object', label: 'Headers', description: 'Additional HTTP headers', required: false },
    },
    execute: uploadFileExecute,
    code: uploadFileExecute.toString(),
  },
  
  // AI/ML NODES
  'classify-text': {
    id: 'classify-text',
    name: 'Classify Text',
    type: 'transform',
    description: 'Classifies text into predefined categories using AI. Useful for content moderation, categorization, etc.',
    icon: 'Tags',
    category: 'ai',
    inputs: [
      { name: 'data', type: 'string', description: 'Input text from previous node' },
    ],
    outputs: [
      { name: 'category', type: 'string', description: 'Assigned category' },
      { name: 'confidence', type: 'number', description: 'Confidence score (0-1)' },
      { name: 'allScores', type: 'object', description: 'Object with scores for all categories' },
    ],
    configSchema: {
      text: { type: 'textarea', label: 'Text', description: 'Text to classify (leave empty to use input from previous node)', required: false },
      categories: { type: 'array', label: 'Categories', description: 'Array of category labels (e.g., ["positive", "negative", "neutral"])', required: true },
      prompt: { type: 'textarea', label: 'Custom Prompt', description: 'Optional custom classification prompt', required: false },
    },
    execute: classifyTextExecute,
    code: classifyTextExecute.toString(),
  },
  
  'extract-entities': {
    id: 'extract-entities',
    name: 'Extract Entities',
    type: 'transform',
    description: 'Extracts named entities (people, places, organizations, dates, etc.) from text using AI.',
    icon: 'ScanSearch',
    category: 'ai',
    inputs: [
      { name: 'data', type: 'string', description: 'Input text from previous node' },
    ],
    outputs: [
      { name: 'entities', type: 'array', description: 'Array of extracted entities' },
      { name: 'count', type: 'number', description: 'Number of entities found' },
    ],
    configSchema: {
      text: { type: 'textarea', label: 'Text', description: 'Text to extract entities from (leave empty to use input from previous node)', required: false },
      entityTypes: { type: 'array', label: 'Entity Types', description: 'Types of entities to extract (e.g., ["person", "organization", "location", "date"])', required: false },
    },
    execute: extractEntitiesExecute,
    code: extractEntitiesExecute.toString(),
  },
  
  'sentiment-analysis': {
    id: 'sentiment-analysis',
    name: 'Sentiment Analysis',
    type: 'transform',
    description: 'Analyzes sentiment of text (positive, negative, neutral) using AI.',
    icon: 'Heart',
    category: 'ai',
    inputs: [
      { name: 'data', type: 'string', description: 'Input text from previous node' },
    ],
    outputs: [
      { name: 'sentiment', type: 'string', description: 'Sentiment label' },
      { name: 'score', type: 'number', description: 'Sentiment score (-1 to 1)' },
      { name: 'confidence', type: 'number', description: 'Confidence score (0-1)' },
    ],
    configSchema: {
      text: { type: 'textarea', label: 'Text', description: 'Text to analyze (leave empty to use input from previous node)', required: false },
      granularity: { 
        type: 'select', 
        label: 'Granularity', 
        description: 'Level of sentiment analysis', 
        required: false, 
        default: 'simple', 
        options: [
          { label: 'Simple (positive/negative/neutral)', value: 'simple' },
          { label: 'Detailed (emotions)', value: 'detailed' }
        ]
      },
    },
    execute: sentimentAnalysisExecute,
    code: sentimentAnalysisExecute.toString(),
  },
  
  'translate-text': {
    id: 'translate-text',
    name: 'Translate Text',
    type: 'transform',
    description: 'Translates text from one language to another using AI.',
    icon: 'Languages',
    category: 'ai',
    inputs: [
      { name: 'data', type: 'string', description: 'Input text from previous node' },
    ],
    outputs: [
      { name: 'translated', type: 'string', description: 'Translated text' },
      { name: 'sourceLanguage', type: 'string', description: 'Detected source language' },
      { name: 'targetLanguage', type: 'string', description: 'Target language used' },
    ],
    configSchema: {
      text: { type: 'textarea', label: 'Text', description: 'Text to translate (leave empty to use input from previous node)', required: false },
      sourceLanguage: { 
        type: 'select', 
        label: 'Source Language', 
        description: 'Source language (or auto-detect)', 
        required: false, 
        default: 'auto', 
        options: [
          { label: 'Auto Detect', value: 'auto' },
          { label: 'English', value: 'en' },
          { label: 'Spanish', value: 'es' },
          { label: 'French', value: 'fr' },
          { label: 'German', value: 'de' },
          { label: 'Chinese', value: 'zh' },
          { label: 'Japanese', value: 'ja' },
          { label: 'Korean', value: 'ko' },
          { label: 'Portuguese', value: 'pt' },
          { label: 'Russian', value: 'ru' },
          { label: 'Arabic', value: 'ar' },
          { label: 'Italian', value: 'it' }
        ]
      },
      targetLanguage: { 
        type: 'select', 
        label: 'Target Language', 
        description: 'Target language', 
        required: true, 
        options: [
          { label: 'English', value: 'en' },
          { label: 'Spanish', value: 'es' },
          { label: 'French', value: 'fr' },
          { label: 'German', value: 'de' },
          { label: 'Chinese', value: 'zh' },
          { label: 'Japanese', value: 'ja' },
          { label: 'Korean', value: 'ko' },
          { label: 'Portuguese', value: 'pt' },
          { label: 'Russian', value: 'ru' },
          { label: 'Arabic', value: 'ar' },
          { label: 'Italian', value: 'it' }
        ]
      },
    },
    execute: translateTextExecute,
    code: translateTextExecute.toString(),
  },
  
  // UTILITIES
  'log-print': {
    id: 'log-print',
    name: 'Log / Print',
    type: 'transform',
    description: 'Logs data to console or workflow execution logs. Useful for debugging and monitoring.',
    icon: 'FileText',
    category: 'utilities',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'logged', type: 'boolean', description: 'Boolean indicating log was written' },
      { name: 'data', type: 'object', description: 'Original input data (passed through)' },
    ],
    configSchema: {
      message: { type: 'textarea', label: 'Message', description: 'Message to log (can reference input data with {{fieldName}})', required: false },
      level: { 
        type: 'select', 
        label: 'Log Level', 
        description: 'Log level', 
        required: false, 
        default: 'info', 
        options: [
          { label: 'Debug', value: 'debug' },
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' }
        ]
      },
      includeInput: { 
        type: 'select', 
        label: 'Include Input Data', 
        description: 'Include full input data in log', 
        required: false, 
        default: 'false',
        options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]
      },
    },
    execute: logPrintExecute,
    code: logPrintExecute.toString(),
  },
  
  'comment-note': {
    id: 'comment-note',
    name: 'Comment / Note',
    type: 'transform',
    description: 'Adds a comment or note in the workflow. Does not affect execution, purely for documentation.',
    icon: 'MessageSquare',
    category: 'utilities',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'data', type: 'object', description: 'Original input data (passed through unchanged)' },
    ],
    configSchema: {
      comment: { type: 'textarea', label: 'Comment', description: 'Comment or note text', required: true },
    },
    execute: commentNoteExecute,
    code: commentNoteExecute.toString(),
  },
  
  // AI/ML EXTERNAL SERVICES
  'generate-image': {
    id: 'generate-image',
    name: 'Generate Image',
    type: 'action',
    description: 'Generates images from text prompts using AI image generation models (DALL-E).',
    icon: 'Image',
    category: 'ai',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'image', type: 'string', description: 'Generated image URL' },
      { name: 'url', type: 'string', description: 'URL of generated image' },
      { name: 'revisedPrompt', type: 'string', description: 'Revised prompt used (if API modifies prompt)' },
    ],
    configSchema: {
      prompt: { type: 'textarea', label: 'Prompt', description: 'Text prompt describing image to generate', required: true },
      size: { 
        type: 'select', 
        label: 'Image Size', 
        description: 'Generated image dimensions', 
        required: false, 
        default: '1024x1024', 
        options: [
          { label: '1024x1024', value: '1024x1024' },
          { label: '1024x1792', value: '1024x1792' },
          { label: '1792x1024', value: '1792x1024' }
        ]
      },
      style: { 
        type: 'select', 
        label: 'Style', 
        description: 'Image generation style', 
        required: false, 
        options: [
          { label: 'Natural', value: 'natural' },
          { label: 'Vivid', value: 'vivid' }
        ]
      },
      quality: { 
        type: 'select', 
        label: 'Quality', 
        description: 'Image quality', 
        required: false, 
        default: 'standard', 
        options: [
          { label: 'Standard', value: 'standard' },
          { label: 'HD', value: 'hd' }
        ]
      },
    },
    execute: generateImageExecute,
    code: generateImageExecute.toString(),
  },
  
  'image-recognition': {
    id: 'image-recognition',
    name: 'Image Recognition',
    type: 'transform',
    description: 'Identifies objects, scenes, or text in images using AI vision models (GPT-4 Vision).',
    icon: 'ScanSearch',
    category: 'ai',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'results', type: 'array', description: 'Array of detected objects/labels' },
      { name: 'text', type: 'string', description: 'Extracted text (for OCR task)' },
      { name: 'count', type: 'number', description: 'Number of detections' },
    ],
    configSchema: {
      imageContent: { type: 'textarea', label: 'Image Content', description: 'Image content (base64 or URL, leave empty to use input from previous node)', required: false },
      imageUrl: { type: 'string', label: 'Image URL', description: 'URL of image to analyze', required: false },
      task: { 
        type: 'select', 
        label: 'Task', 
        description: 'Recognition task', 
        required: true, 
        options: [
          { label: 'Object Detection', value: 'objects' },
          { label: 'Scene Recognition', value: 'scene' },
          { label: 'Text Extraction (OCR)', value: 'ocr' },
          { label: 'Face Detection', value: 'faces' },
          { label: 'Label Detection', value: 'labels' }
        ]
      },
      maxResults: { type: 'number', label: 'Max Results', description: 'Maximum number of results to return', required: false, default: 10 },
    },
    execute: imageRecognitionExecute,
    code: imageRecognitionExecute.toString(),
  },
  
  'text-to-speech': {
    id: 'text-to-speech',
    name: 'Text to Speech',
    type: 'action',
    description: 'Converts text to speech audio using AI TTS models (OpenAI TTS).',
    icon: 'Volume2',
    category: 'ai',
    inputs: [
      { name: 'data', type: 'string', description: 'Input text from previous node' },
    ],
    outputs: [
      { name: 'audio', type: 'string', description: 'Audio content (base64)' },
      { name: 'format', type: 'string', description: 'Audio format' },
      { name: 'duration', type: 'number', description: 'Audio duration in seconds' },
      { name: 'mimeType', type: 'string', description: 'Audio MIME type' },
    ],
    configSchema: {
      text: { type: 'textarea', label: 'Text', description: 'Text to convert to speech (leave empty to use input from previous node)', required: false },
      voice: { 
        type: 'select', 
        label: 'Voice', 
        description: 'Voice to use', 
        required: false, 
        default: 'alloy', 
        options: [
          { label: 'Alloy', value: 'alloy' },
          { label: 'Echo', value: 'echo' },
          { label: 'Fable', value: 'fable' },
          { label: 'Onyx', value: 'onyx' },
          { label: 'Nova', value: 'nova' },
          { label: 'Shimmer', value: 'shimmer' }
        ]
      },
      speed: { type: 'number', label: 'Speed', description: 'Speech speed (0.25 to 4.0)', required: false, default: 1.0 },
      format: { 
        type: 'select', 
        label: 'Format', 
        description: 'Audio format', 
        required: false, 
        default: 'mp3', 
        options: [
          { label: 'MP3', value: 'mp3' },
          { label: 'Opus', value: 'opus' },
          { label: 'AAC', value: 'aac' },
          { label: 'FLAC', value: 'flac' }
        ]
      },
    },
    execute: textToSpeechExecute,
    code: textToSpeechExecute.toString(),
  },
  
  'speech-to-text': {
    id: 'speech-to-text',
    name: 'Speech to Text',
    type: 'transform',
    description: 'Converts speech/audio to text using AI speech recognition models (OpenAI Whisper).',
    icon: 'Mic',
    category: 'ai',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'text', type: 'string', description: 'Transcribed text' },
      { name: 'segments', type: 'array', description: 'Array of text segments with timestamps (for JSON format)' },
      { name: 'language', type: 'string', description: 'Detected language' },
      { name: 'duration', type: 'number', description: 'Audio duration in seconds' },
    ],
    configSchema: {
      audioContent: { type: 'textarea', label: 'Audio Content', description: 'Audio content (base64, leave empty to use input from previous node)', required: false },
      audioUrl: { type: 'string', label: 'Audio URL', description: 'URL of audio file to transcribe', required: false },
      language: { 
        type: 'select', 
        label: 'Language', 
        description: 'Audio language (or auto-detect)', 
        required: false, 
        default: 'auto', 
        options: [
          { label: 'Auto Detect', value: 'auto' },
          { label: 'English', value: 'en' },
          { label: 'Spanish', value: 'es' },
          { label: 'French', value: 'fr' },
          { label: 'German', value: 'de' },
          { label: 'Chinese', value: 'zh' },
          { label: 'Japanese', value: 'ja' },
          { label: 'Korean', value: 'ko' },
          { label: 'Portuguese', value: 'pt' },
          { label: 'Russian', value: 'ru' }
        ]
      },
      responseFormat: { 
        type: 'select', 
        label: 'Response Format', 
        description: 'Transcription format', 
        required: false, 
        default: 'text', 
        options: [
          { label: 'Text', value: 'text' },
          { label: 'JSON with Timestamps', value: 'json' },
          { label: 'SRT Subtitles', value: 'srt' },
          { label: 'VTT Subtitles', value: 'vtt' }
        ]
      },
    },
    execute: speechToTextExecute,
    code: speechToTextExecute.toString(),
  },
  
  // ============================================================================
  // INFRASTRUCTURE NODES - FILE SYSTEM OPERATIONS
  // ============================================================================
  
  'read-file': {
    id: 'read-file',
    name: 'Read File',
    type: 'action',
    description: 'Reads content from a file. Supports text files, binary files, and various formats.',
    icon: 'FileText',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'content', type: 'string', description: 'File content (text or base64)' },
      { name: 'size', type: 'number', description: 'File size in bytes' },
      { name: 'mimeType', type: 'string', description: 'Detected MIME type' },
      { name: 'encoding', type: 'string', description: 'Encoding used' },
    ],
    configSchema: {
      source: { 
        type: 'select', 
        label: 'Source', 
        description: 'File source type', 
        required: true, 
        options: [
          { label: 'URL', value: 'url' },
          { label: 'Base64', value: 'base64' },
          { label: 'Previous Node Output', value: 'input' },
          { label: 'Local File Path', value: 'local' }
        ]
      },
      filePath: { type: 'string', label: 'File Path / URL', description: 'File path or URL (for URL/local source)', required: false },
      base64Data: { type: 'textarea', label: 'Base64 Data', description: 'Base64-encoded file data (for base64 source)', required: false },
      encoding: { 
        type: 'select', 
        label: 'Encoding', 
        description: 'File encoding', 
        required: false, 
        default: 'utf8', 
        options: [
          { label: 'UTF-8', value: 'utf8' },
          { label: 'Base64', value: 'base64' },
          { label: 'Binary', value: 'binary' }
        ]
      },
    },
    execute: readFileExecute,
    code: readFileExecute.toString(),
  },
  
  'write-file': {
    id: 'write-file',
    name: 'Write File',
    type: 'action',
    description: 'Writes content to a file. Can create new files or overwrite existing ones.',
    icon: 'FileText',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'filePath', type: 'string', description: 'Path/URL where file was written' },
      { name: 'size', type: 'number', description: 'File size in bytes' },
      { name: 'success', type: 'boolean', description: 'Boolean indicating success' },
    ],
    configSchema: {
      destination: { 
        type: 'select', 
        label: 'Destination', 
        description: 'File destination type', 
        required: true, 
        options: [
          { label: 'Local Path', value: 'local' },
          { label: 'Upload to URL', value: 'url' },
          { label: 'Return as Base64', value: 'base64' }
        ]
      },
      filePath: { type: 'string', label: 'File Path', description: 'File path (for local destination)', required: false },
      uploadUrl: { type: 'string', label: 'Upload URL', description: 'URL to upload file to (for URL destination)', required: false },
      content: { type: 'textarea', label: 'Content', description: 'File content (text or base64, leave empty to use input from previous node)', required: false },
      encoding: { 
        type: 'select', 
        label: 'Encoding', 
        description: 'File encoding', 
        required: false, 
        default: 'utf8', 
        options: [
          { label: 'UTF-8', value: 'utf8' },
          { label: 'Base64', value: 'base64' },
          { label: 'Binary', value: 'binary' }
        ]
      },
      mimeType: { type: 'string', label: 'MIME Type', description: 'File MIME type (e.g., "text/plain", "application/json")', required: false },
    },
    execute: writeFileExecute,
    code: writeFileExecute.toString(),
  },
  
  'delete-file': {
    id: 'delete-file',
    name: 'Delete File',
    type: 'action',
    description: 'Deletes a file from local filesystem or remote location.',
    icon: 'Trash2',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'success', type: 'boolean', description: 'Boolean indicating success' },
      { name: 'filePath', type: 'string', description: 'Path/URL of deleted file' },
    ],
    configSchema: {
      filePath: { type: 'string', label: 'File Path / URL', description: 'Path or URL of file to delete', required: true },
      requireAuth: { 
        type: 'select', 
        label: 'Require Authentication', 
        description: 'Require authentication for remote deletion', 
        required: false, 
        default: 'false',
        options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]
      },
    },
    execute: deleteFileExecute,
    code: deleteFileExecute.toString(),
  },
  
  'list-files': {
    id: 'list-files',
    name: 'List Files',
    type: 'action',
    description: 'Lists files in a directory or folder. Supports local filesystem and remote storage.',
    icon: 'Folder',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'files', type: 'array', description: 'Array of file objects with properties: name, path, size, mimeType, modifiedAt' },
      { name: 'count', type: 'number', description: 'Number of files found' },
    ],
    configSchema: {
      directoryPath: { type: 'string', label: 'Directory Path', description: 'Path to directory to list', required: true },
      recursive: { 
        type: 'select', 
        label: 'Recursive', 
        description: 'Include subdirectories', 
        required: false, 
        default: 'false',
        options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]
      },
      filter: { type: 'string', label: 'Filter', description: 'File pattern filter (e.g., "*.txt", "*.pdf")', required: false },
      includeDirectories: { 
        type: 'select', 
        label: 'Include Directories', 
        description: 'Include directories in results', 
        required: false, 
        default: 'false',
        options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]
      },
    },
    execute: listFilesExecute,
    code: listFilesExecute.toString(),
  },
  
  // ============================================================================
  // INFRASTRUCTURE NODES - FILE PROCESSING
  // ============================================================================
  
  'convert-file-format': {
    id: 'convert-file-format',
    name: 'Convert File Format',
    type: 'transform',
    description: 'Converts files between different formats (e.g., PDF to text, image format conversion, etc.).',
    icon: 'FileCode',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'content', type: 'string', description: 'Converted file content (base64)' },
      { name: 'mimeType', type: 'string', description: 'Output MIME type' },
      { name: 'size', type: 'number', description: 'Output file size in bytes' },
    ],
    configSchema: {
      inputFormat: { 
        type: 'select', 
        label: 'Input Format', 
        description: 'Input file format', 
        required: true, 
        options: [
          { label: 'Auto Detect', value: 'auto' },
          { label: 'PDF', value: 'pdf' },
          { label: 'Image (PNG)', value: 'png' },
          { label: 'Image (JPEG)', value: 'jpeg' },
          { label: 'Image (GIF)', value: 'gif' },
          { label: 'Image (WebP)', value: 'webp' },
          { label: 'Text', value: 'text' },
          { label: 'Markdown', value: 'markdown' },
          { label: 'HTML', value: 'html' },
          { label: 'JSON', value: 'json' },
          { label: 'CSV', value: 'csv' }
        ]
      },
      outputFormat: { 
        type: 'select', 
        label: 'Output Format', 
        description: 'Output file format', 
        required: true, 
        options: [
          { label: 'PDF', value: 'pdf' },
          { label: 'Image (PNG)', value: 'png' },
          { label: 'Image (JPEG)', value: 'jpeg' },
          { label: 'Image (GIF)', value: 'gif' },
          { label: 'Image (WebP)', value: 'webp' },
          { label: 'Text', value: 'text' },
          { label: 'Markdown', value: 'markdown' },
          { label: 'HTML', value: 'html' },
          { label: 'JSON', value: 'json' },
          { label: 'CSV', value: 'csv' }
        ]
      },
      fileContent: { type: 'textarea', label: 'File Content', description: 'Input file content (base64, leave empty to use input from previous node)', required: false },
      options: { type: 'object', label: 'Conversion Options', description: 'Format-specific options (JSON object, e.g., {"quality": 90} for images)', required: false },
    },
    execute: convertFileFormatExecute,
    code: convertFileFormatExecute.toString(),
  },
  
  'compress-decompress': {
    id: 'compress-decompress',
    name: 'Compress / Decompress',
    type: 'transform',
    description: 'Compresses files to ZIP/GZIP format or decompresses compressed files.',
    icon: 'Archive',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'content', type: 'string', description: 'Compressed/decompressed content' },
      { name: 'files', type: 'array', description: 'Array of extracted files (for decompress)' },
      { name: 'size', type: 'number', description: 'Output size in bytes' },
    ],
    configSchema: {
      operation: { 
        type: 'select', 
        label: 'Operation', 
        description: 'Compress or decompress', 
        required: true, 
        options: [
          { label: 'Compress', value: 'compress' },
          { label: 'Decompress', value: 'decompress' }
        ]
      },
      format: { 
        type: 'select', 
        label: 'Format', 
        description: 'Archive format', 
        required: true, 
        options: [
          { label: 'ZIP', value: 'zip' },
          { label: 'GZIP', value: 'gzip' },
          { label: 'TAR', value: 'tar' },
          { label: 'TAR.GZ', value: 'targz' }
        ]
      },
      files: { type: 'array', label: 'Files', description: 'Array of files to compress (for compress operation) or archive content (for decompress)', required: false },
      archiveContent: { type: 'textarea', label: 'Archive Content', description: 'Compressed archive content (base64, for decompress operation)', required: false },
      outputFileName: { type: 'string', label: 'Output File Name', description: 'Name for output archive (for compress operation)', required: false },
    },
    execute: compressDecompressExecute,
    code: compressDecompressExecute.toString(),
  },
  
  'extract-archive': {
    id: 'extract-archive',
    name: 'Extract Archive',
    type: 'transform',
    description: 'Extracts files from compressed archives (ZIP, TAR, etc.).',
    icon: 'Package',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'files', type: 'array', description: 'Array of extracted files with properties: name, content (base64), size, path' },
      { name: 'count', type: 'number', description: 'Number of files extracted' },
    ],
    configSchema: {
      archiveContent: { type: 'textarea', label: 'Archive Content', description: 'Archive file content (base64, leave empty to use input from previous node)', required: false },
      format: { 
        type: 'select', 
        label: 'Format', 
        description: 'Archive format', 
        required: true, 
        options: [
          { label: 'Auto Detect', value: 'auto' },
          { label: 'ZIP', value: 'zip' },
          { label: 'TAR', value: 'tar' },
          { label: 'TAR.GZ', value: 'targz' },
          { label: 'RAR', value: 'rar' },
          { label: '7Z', value: '7z' }
        ]
      },
      extractPath: { type: 'string', label: 'Extract Path', description: 'Specific file/folder to extract (optional, extracts all if empty)', required: false },
    },
    execute: extractArchiveExecute,
    code: extractArchiveExecute.toString(),
  },
  
  'image-manipulation': {
    id: 'image-manipulation',
    name: 'Image Manipulation',
    type: 'transform',
    description: 'Performs image operations like resize, crop, rotate, apply filters, convert format, etc.',
    icon: 'Image',
    category: 'storage',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'image', type: 'string', description: 'Modified image content (base64)' },
      { name: 'width', type: 'number', description: 'Image width in pixels' },
      { name: 'height', type: 'number', description: 'Image height in pixels' },
      { name: 'format', type: 'string', description: 'Image format' },
      { name: 'size', type: 'number', description: 'Image size in bytes' },
      { name: 'metadata', type: 'object', description: 'Image metadata (for metadata operation)' },
    ],
    configSchema: {
      operation: { 
        type: 'select', 
        label: 'Operation', 
        description: 'Image operation', 
        required: true, 
        options: [
          { label: 'Resize', value: 'resize' },
          { label: 'Crop', value: 'crop' },
          { label: 'Rotate', value: 'rotate' },
          { label: 'Flip', value: 'flip' },
          { label: 'Convert Format', value: 'convert' },
          { label: 'Apply Filter', value: 'filter' },
          { label: 'Add Watermark', value: 'watermark' },
          { label: 'Get Metadata', value: 'metadata' }
        ]
      },
      imageContent: { type: 'textarea', label: 'Image Content', description: 'Image content (base64, leave empty to use input from previous node)', required: false },
      width: { type: 'number', label: 'Width', description: 'Target width in pixels (for resize/crop)', required: false },
      height: { type: 'number', label: 'Height', description: 'Target height in pixels (for resize/crop)', required: false },
      maintainAspectRatio: { 
        type: 'select', 
        label: 'Maintain Aspect Ratio', 
        description: 'Maintain aspect ratio when resizing', 
        required: false, 
        default: 'true',
        options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]
      },
      x: { type: 'number', label: 'X Position', description: 'X position for crop operation', required: false },
      y: { type: 'number', label: 'Y Position', description: 'Y position for crop operation', required: false },
      angle: { type: 'number', label: 'Angle', description: 'Rotation angle in degrees (for rotate operation)', required: false },
      direction: { 
        type: 'select', 
        label: 'Direction', 
        description: 'Flip direction (for flip operation)', 
        required: false, 
        options: [
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' }
        ]
      },
      outputFormat: { 
        type: 'select', 
        label: 'Output Format', 
        description: 'Output image format (for convert operation)', 
        required: false, 
        options: [
          { label: 'PNG', value: 'png' },
          { label: 'JPEG', value: 'jpeg' },
          { label: 'WebP', value: 'webp' },
          { label: 'GIF', value: 'gif' }
        ]
      },
      filter: { 
        type: 'select', 
        label: 'Filter', 
        description: 'Filter to apply (for filter operation)', 
        required: false, 
        options: [
          { label: 'Grayscale', value: 'grayscale' },
          { label: 'Sepia', value: 'sepia' },
          { label: 'Blur', value: 'blur' },
          { label: 'Sharpen', value: 'sharpen' },
          { label: 'Brighten', value: 'brighten' },
          { label: 'Darken', value: 'darken' }
        ]
      },
      quality: { type: 'number', label: 'Quality', description: 'Image quality (1-100, for JPEG/WebP)', required: false, default: 90 },
    },
    execute: imageManipulationExecute,
    code: imageManipulationExecute.toString(),
  },
  
  // ============================================================================
  // INFRASTRUCTURE NODES - DATABASE OPERATIONS
  // ============================================================================
  
  'database-query': {
    id: 'database-query',
    name: 'Database Query',
    type: 'action',
    description: 'Executes SQL queries against a database. Supports PostgreSQL, MySQL, SQLite, MongoDB.',
    icon: 'Database',
    category: 'data',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'results', type: 'array', description: 'Query results (array of objects for SELECT, affected rows count for INSERT/UPDATE/DELETE)' },
      { name: 'rowCount', type: 'number', description: 'Number of rows returned/affected' },
      { name: 'columns', type: 'array', description: 'Column names (for SELECT queries)' },
    ],
    configSchema: {
      databaseType: { 
        type: 'select', 
        label: 'Database Type', 
        description: 'Database type', 
        required: true, 
        options: [
          { label: 'PostgreSQL', value: 'postgresql' },
          { label: 'MySQL', value: 'mysql' },
          { label: 'SQLite', value: 'sqlite' },
          { label: 'MongoDB', value: 'mongodb' }
        ]
      },
      connectionString: { type: 'string', label: 'Connection String', description: 'Database connection string', required: true },
      query: { type: 'textarea', label: 'SQL Query', description: 'SQL query to execute (can reference variables with {{variableName}})', required: true },
      parameters: { type: 'array', label: 'Parameters', description: 'Query parameters array (for parameterized queries)', required: false },
    },
    execute: databaseQueryExecute,
    code: databaseQueryExecute.toString(),
  },
  
  'insert-database-record': {
    id: 'insert-database-record',
    name: 'Insert Database Record',
    type: 'action',
    description: 'Inserts a new record into a database table.',
    icon: 'Plus',
    category: 'data',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'id', type: 'string', description: 'Inserted record ID' },
      { name: 'success', type: 'boolean', description: 'Boolean indicating success' },
      { name: 'affectedRows', type: 'number', description: 'Number of rows affected' },
    ],
    configSchema: {
      databaseType: { 
        type: 'select', 
        label: 'Database Type', 
        description: 'Database type', 
        required: true, 
        options: [
          { label: 'PostgreSQL', value: 'postgresql' },
          { label: 'MySQL', value: 'mysql' },
          { label: 'SQLite', value: 'sqlite' },
          { label: 'MongoDB', value: 'mongodb' }
        ]
      },
      connectionString: { type: 'string', label: 'Connection String', description: 'Database connection string', required: true },
      table: { type: 'string', label: 'Table Name', description: 'Table name to insert into', required: true },
      data: { type: 'object', label: 'Data', description: 'Record data (JSON object, e.g., {"name": "John", "email": "john@example.com"})', required: true },
    },
    execute: insertDatabaseRecordExecute,
    code: insertDatabaseRecordExecute.toString(),
  },
  
  'update-database-record': {
    id: 'update-database-record',
    name: 'Update Database Record',
    type: 'action',
    description: 'Updates existing records in a database table.',
    icon: 'Edit',
    category: 'data',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'affectedRows', type: 'number', description: 'Number of rows updated' },
      { name: 'success', type: 'boolean', description: 'Boolean indicating success' },
    ],
    configSchema: {
      databaseType: { 
        type: 'select', 
        label: 'Database Type', 
        description: 'Database type', 
        required: true, 
        options: [
          { label: 'PostgreSQL', value: 'postgresql' },
          { label: 'MySQL', value: 'mysql' },
          { label: 'SQLite', value: 'sqlite' },
          { label: 'MongoDB', value: 'mongodb' }
        ]
      },
      connectionString: { type: 'string', label: 'Connection String', description: 'Database connection string', required: true },
      table: { type: 'string', label: 'Table Name', description: 'Table name to update', required: true },
      where: { type: 'object', label: 'Where Clause', description: 'Conditions for which records to update (e.g., {"id": 123})', required: true },
      data: { type: 'object', label: 'Update Data', description: 'Fields to update (JSON object)', required: true },
    },
    execute: updateDatabaseRecordExecute,
    code: updateDatabaseRecordExecute.toString(),
  },
  
  'delete-database-record': {
    id: 'delete-database-record',
    name: 'Delete Database Record',
    type: 'action',
    description: 'Deletes records from a database table.',
    icon: 'Trash2',
    category: 'data',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'affectedRows', type: 'number', description: 'Number of rows deleted' },
      { name: 'success', type: 'boolean', description: 'Boolean indicating success' },
    ],
    configSchema: {
      databaseType: { 
        type: 'select', 
        label: 'Database Type', 
        description: 'Database type', 
        required: true, 
        options: [
          { label: 'PostgreSQL', value: 'postgresql' },
          { label: 'MySQL', value: 'mysql' },
          { label: 'SQLite', value: 'sqlite' },
          { label: 'MongoDB', value: 'mongodb' }
        ]
      },
      connectionString: { type: 'string', label: 'Connection String', description: 'Database connection string', required: true },
      table: { type: 'string', label: 'Table Name', description: 'Table name to delete from', required: true },
      where: { type: 'object', label: 'Where Clause', description: 'Conditions for which records to delete (e.g., {"id": 123})', required: true },
    },
    execute: deleteDatabaseRecordExecute,
    code: deleteDatabaseRecordExecute.toString(),
  },
  
  // ============================================================================
  // INFRASTRUCTURE NODES - WORKFLOW STATE MANAGEMENT
  // ============================================================================
  
  'wait-for-webhook': {
    id: 'wait-for-webhook',
    name: 'Wait for Webhook',
    type: 'action',
    description: 'Pauses workflow execution and waits for a webhook call before continuing.',
    icon: 'Clock',
    category: 'utilities',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'data', type: 'object', description: 'Webhook payload data' },
      { name: 'headers', type: 'object', description: 'Webhook request headers' },
      { name: 'receivedAt', type: 'string', description: 'Timestamp when webhook was received' },
      { name: 'timeout', type: 'boolean', description: 'Whether the wait timed out' },
    ],
    configSchema: {
      timeout: { type: 'number', label: 'Timeout (seconds)', description: 'Maximum time to wait for webhook', required: false, default: 300 },
      webhookPath: { type: 'string', label: 'Webhook Path', description: 'Unique path for webhook (auto-generated if empty)', required: false },
    },
    execute: waitForWebhookExecute,
    code: waitForWebhookExecute.toString(),
  },
  
};

// Helper function to get node by ID
export const getNodeById = (nodeId: string): NodeDefinition | undefined => {
  return nodeRegistry[nodeId];
};

// Helper function to get nodes by type
export const getNodesByType = (type: 'trigger' | 'action' | 'transform'): NodeDefinition[] => {
  return Object.values(nodeRegistry).filter((node) => node.type === type);
};

// Helper function to get nodes by category
export const getNodesByCategory = (category: string): NodeDefinition[] => {
  return Object.values(nodeRegistry).filter((node) => node.category === category);
};

// Helper function to search nodes
export const searchNodes = (query: string): NodeDefinition[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(nodeRegistry).filter(
    (node) =>
      node.name.toLowerCase().includes(lowerQuery) ||
      node.description.toLowerCase().includes(lowerQuery) ||
      node.category.toLowerCase().includes(lowerQuery)
  );
};
