/**
 * Node Library Registry
 * Contains all 30 nodes with their definitions and execution code
 */

import type { NodeRegistry, ExecutionContext } from './types';

// Helper function to get auth token
const getAuthToken = (context: ExecutionContext, service: string): string => {
  return context.auth[service]?.token || context.auth[service]?.apiKey || '';
};

// ============================================================================
// ACTION NODES (10)
// ============================================================================

const sendEmailExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, to, subject, body, from } = config;
  
  const response = await context.http.post(
    'https://api.sendgrid.com/v3/mail/send',
    {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from || 'noreply@runwise.ai' },
      subject,
      content: [{ type: 'text/html', value: body }],
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey || getAuthToken(context, 'sendgrid')}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return { success: true, messageId: response.id, ...response };
};

const createNotionPageExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, databaseId, title, content } = config;
  
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
        'Authorization': `Bearer ${apiKey || getAuthToken(context, 'notion')}`,
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
  if (!botToken) {
    throw new Error('Slack bot token is required');
  }
  if (!channel) {
    throw new Error('Slack channel is required');
  }
  if (!message) {
    throw new Error('Message is required');
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
        'Authorization': `Bearer ${botToken || getAuthToken(context, 'slack')}`,
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

const addRowToGoogleSheetExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, spreadsheetId, sheetName, values } = config;
  
  const response = await context.http.post(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:append?valueInputOption=RAW`,
    {
      values: Array.isArray(values[0]) ? values : [values],
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey || getAuthToken(context, 'google')}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return { success: true, updatedRange: response.updates.updatedRange, ...response };
};

const sendDiscordMessageExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { webhookUrl, message, embeds } = config;
  
  // Validate required fields
  if (!webhookUrl) {
    throw new Error('Discord webhook URL is required');
  }
  if (!message) {
    throw new Error('Message is required');
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
  
  const response = await context.http.post(
    webhookUrl,
    {
      content: message,
      embeds: parsedEmbeds,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  return { success: true, ...response };
};

const createTrelloCardExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, token, name, desc, idList, dueDate } = config;
  
  const response = await context.http.post(
    'https://api.trello.com/1/cards',
    {
      name,
      desc,
      idList,
      due: dueDate,
      key: apiKey || context.auth.trello?.apiKey,
      token: token || getAuthToken(context, 'trello'),
    }
  );
  
  return { success: true, cardId: response.id, url: response.url, ...response };
};

const updateAirtableRecordExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, baseId, tableId, recordId, fields } = config;
  
  // Validate required fields
  if (!apiKey) {
    throw new Error('Airtable API key is required');
  }
  if (!baseId || !tableId || !recordId) {
    throw new Error('Base ID, Table ID, and Record ID are required');
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
  
  const response = await context.http.patch(
    `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`,
    { fields: parsedFields },
    {
      headers: {
        'Authorization': `Bearer ${apiKey || getAuthToken(context, 'airtable')}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return { success: true, id: response.id, fields: response.fields, ...response };
};

const createCalendarEventExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, summary, description, start, end, attendees } = config;
  
  const response = await context.http.post(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      summary,
      description,
      start: { dateTime: start, timeZone: 'UTC' },
      end: { dateTime: end, timeZone: 'UTC' },
      attendees: attendees?.map((email: string) => ({ email })) || [],
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey || getAuthToken(context, 'google')}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return { success: true, eventId: response.id, htmlLink: response.htmlLink, ...response };
};

const sendSmsViaTwilioExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { accountSid, authToken, to, message, from } = config;
  
  // Validate required fields
  if (!accountSid) {
    throw new Error('Twilio Account SID is required');
  }
  if (!authToken) {
    throw new Error('Twilio Auth Token is required');
  }
  if (!to || !from || !message) {
    throw new Error('To, From, and Message are required');
  }
  
  const sid = accountSid;
  const token = authToken;
  
  // Twilio uses URL-encoded form data
  const formData = new URLSearchParams({
    To: to,
    From: from,
    Body: message,
  });
  
  const response = await context.http.post(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    formData.toString(),
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  
  return { success: true, messageSid: response.sid, status: response.status, ...response };
};

const uploadFileToGoogleDriveExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, fileName, fileContent, folderId, mimeType } = config;
  
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
        'Authorization': `Bearer ${apiKey || getAuthToken(context, 'google')}`,
      },
    }
  );
  
  return { success: true, fileId: response.id, webViewLink: response.webViewLink, ...response };
};

// ============================================================================
// TRIGGER NODES (10)
// ============================================================================

const newFormSubmissionExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  // This is a trigger, so it polls for new submissions
  const { apiKey, formId, pollInterval } = config;
  const lastCheck = config.lastCheck || new Date().toISOString();
  
  const response = await context.http.get(
    `https://forms.googleapis.com/v1/forms/${formId}/responses?filter=timestamp>${lastCheck}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey || getAuthToken(context, 'google')}`,
      },
    }
  );
  
  const newSubmissions = response.responses || [];
  return {
    submissions: newSubmissions,
    count: newSubmissions.length,
    lastCheck: new Date().toISOString(),
  };
};

const newEmailReceivedExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, inboxId, lastCheck } = config;
  
  const token = apiKey || getAuthToken(context, 'google');
  
  const response = await context.http.get(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=after:${lastCheck || Math.floor(Date.now() / 1000)}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  // Fetch full message details
  const messages = await Promise.all(
    (response.messages || []).map((msg: any) =>
      context.http.get(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )
    )
  );
  
  return { emails: messages, count: messages.length };
};

const newRowInGoogleSheetExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, spreadsheetId, sheetName, lastRow } = config;
  
  const response = await context.http.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey || getAuthToken(context, 'google')}`,
      },
    }
  );
  
  const rows = response.values || [];
  const newRows = lastRow ? rows.slice(lastRow) : rows.slice(-1);
  
  return {
    rows: newRows,
    count: newRows.length,
    lastRow: rows.length,
  };
};

const newMessageInSlackExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  // Slack real-time events are typically handled via webhooks
  // This is a polling fallback
  const { botToken, channel, lastTs } = config;
  
  const response = await context.http.get(
    `https://slack.com/api/conversations.history?channel=${channel}&oldest=${lastTs || 0}`,
    {
      headers: {
        'Authorization': `Bearer ${botToken || getAuthToken(context, 'slack')}`,
      },
    }
  );
  
  // Slack API returns { ok: false, error: "..." } even on 200 status
  if (response.ok === false) {
    throw new Error(response.error || 'Failed to fetch Slack messages');
  }
  
  return { messages: response.messages || [], count: response.messages?.length || 0 };
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
  // Webhook triggers receive data directly
  return { data: inputData, ...inputData };
};

const newGitHubIssueExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { accessToken, owner, repo, lastCheck } = config;
  
  const response = await context.http.get(
    `https://api.github.com/repos/${owner}/${repo}/issues?since=${lastCheck || new Date(Date.now() - 3600000).toISOString()}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken || getAuthToken(context, 'github')}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );
  
  return { issues: response, count: response.length };
};

const paymentCompletedExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  // Typically webhook-based (Stripe, PayPal, etc.)
  return { payment: inputData, ...inputData };
};

const fileUploadedExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, driveId, folderId, lastCheck } = config;
  
  const response = await context.http.get(
    `https://www.googleapis.com/drive/v3/files?q=parents in '${folderId}' and modifiedTime > '${lastCheck || new Date(Date.now() - 3600000).toISOString()}'`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey || getAuthToken(context, 'google')}`,
      },
    }
  );
  
  return { files: response.files || [], count: response.files?.length || 0 };
};

// ============================================================================
// TRANSFORM NODES (10)
// ============================================================================

const formatTextExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { template, variables } = config;
  let formatted = template;
  
  // Replace {{variable}} with values
  Object.keys(variables || {}).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    formatted = formatted.replace(regex, variables[key]);
  });
  
  // Replace input data variables
  if (typeof inputData === 'object') {
    Object.keys(inputData).forEach((key) => {
      const regex = new RegExp(`{{input.${key}}}`, 'g');
      formatted = formatted.replace(regex, String(inputData[key]));
    });
  }
  
  return { formatted, original: template };
};

const parseJsonExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { jsonString, path } = config;
  const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : inputData;
  
  if (path) {
    // Extract nested path (e.g., "data.items[0].name")
    const parts = path.split(/[\.\[\]]/).filter(Boolean);
    let result = data;
    for (const part of parts) {
      result = result?.[part];
    }
    return { parsed: result, path };
  }
  
  return { parsed: data };
};

const filterDataExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { condition, field } = config;
  const data = Array.isArray(inputData) ? inputData : [inputData];
  
  const filtered = data.filter((item: any) => {
    const value = field ? item[field] : item;
    // Simple condition matching (can be expanded)
    if (condition.type === 'equals') {
      return String(value) === String(condition.value);
    } else if (condition.type === 'contains') {
      return String(value).includes(String(condition.value));
    } else if (condition.type === 'greaterThan') {
      return Number(value) > Number(condition.value);
    }
    return false;
  });
  
  return { filtered, originalCount: data.length, filteredCount: filtered.length };
};

const delayExecutionExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { delayMs } = config;
  await new Promise((resolve) => setTimeout(resolve, delayMs || 1000));
  return { delayed: true, delayMs, inputData };
};

const mergeDataObjectsExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { objects, strategy } = config;
  const data = Array.isArray(objects) ? objects : [inputData, ...(objects || [])];
  
  let merged = {};
  if (strategy === 'deep') {
    // Deep merge
    data.forEach((obj: any) => {
      merged = { ...merged, ...obj };
    });
  } else {
    // Shallow merge
    data.forEach((obj: any) => {
      Object.assign(merged, obj);
    });
  }
  
  return { merged, originalCount: data.length };
};

const splitStringExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { text, delimiter, limit } = config;
  const inputText = text || String(inputData);
  const parts = inputText.split(delimiter || ',');
  const result = limit ? parts.slice(0, limit) : parts;
  
  return { parts: result, count: result.length, original: inputText };
};

const convertToCsvExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { headers, delimiter } = config;
  const data = Array.isArray(inputData) ? inputData : [inputData];
  const csvDelimiter = delimiter || ',';
  
  let csv = '';
  if (headers && Array.isArray(headers)) {
    csv += headers.join(csvDelimiter) + '\n';
  }
  
  data.forEach((row: any) => {
    const values = headers
      ? headers.map((h: string) => (row[h] || '').toString().replace(/"/g, '""'))
      : Object.values(row).map((v: any) => String(v).replace(/"/g, '""'));
    csv += values.map((v: string) => `"${v}"`).join(csvDelimiter) + '\n';
  });
  
  return { csv, rowCount: data.length };
};

const extractEmailAddressesExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { text } = config;
  const inputText = text || String(inputData);
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = inputText.match(emailRegex) || [];
  
  return { emails, count: emails.length };
};

const generateSummaryWithAiExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { apiKey, text, maxLength } = config;
  const inputText = text || String(inputData);
  
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
        'Authorization': `Bearer ${apiKey || getAuthToken(context, 'openai')}`,
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

const calculateNumericValuesExecute = async (inputData: any, config: any, context: ExecutionContext) => {
  const { operation, values, field } = config;
  const data = Array.isArray(inputData) ? inputData : [inputData];
  const numbers = field ? data.map((item: any) => Number(item[field])) : data.map((item: any) => Number(item));
  
  let result = 0;
  if (operation === 'sum') {
    result = numbers.reduce((a: number, b: number) => a + b, 0);
  } else if (operation === 'average') {
    result = numbers.reduce((a: number, b: number) => a + b, 0) / numbers.length;
  } else if (operation === 'min') {
    result = Math.min(...numbers);
  } else if (operation === 'max') {
    result = Math.max(...numbers);
  }
  
  return { result, operation, count: numbers.length };
};

// ============================================================================
// NODE REGISTRY
// ============================================================================

export const nodeRegistry: NodeRegistry = {
  // ACTION NODES
  'send-email': {
    id: 'send-email',
    name: 'Send Email',
    type: 'action',
    description: 'Sends an email to specified recipients using SendGrid or SMTP.',
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
      apiKey: { type: 'string', label: 'SendGrid API Key', description: 'Your SendGrid API key (get it from SendGrid Dashboard → Settings → API Keys)', required: true },
      to: { type: 'string', label: 'To', description: 'Recipient email address (e.g., user@example.com)', required: true },
      subject: { type: 'string', label: 'Subject', description: 'Email subject line', required: true },
      body: { type: 'textarea', label: 'Body', description: 'Email body content (HTML supported)', required: true },
      from: { type: 'string', label: 'From', description: 'Sender email address (optional, defaults to noreply@runwise.ai)', required: false },
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
      apiKey: { type: 'string', label: 'Notion API Key', description: 'Your Notion integration token (get it from https://www.notion.so/my-integrations)', required: true },
      databaseId: { type: 'string', label: 'Database ID', description: 'Notion database ID (found in database URL)', required: true },
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
      botToken: { type: 'string', label: 'Bot Token', description: 'Slack Bot User OAuth Token (starts with xoxb-, get it from https://api.slack.com/apps)', required: true },
      channel: { type: 'string', label: 'Channel', description: 'Slack channel ID or name (e.g., #general or C1234567890)', required: true },
      message: { type: 'textarea', label: 'Message', description: 'Message text to post', required: true },
      threadTs: { type: 'string', label: 'Thread TS', description: 'Thread timestamp to reply to (optional)', required: false },
    },
    execute: postToSlackChannelExecute,
    code: postToSlackChannelExecute.toString(),
  },
  
  'add-row-to-google-sheet': {
    id: 'add-row-to-google-sheet',
    name: 'Add Row to Google Sheet',
    type: 'action',
    description: 'Adds a new row to a Google Sheets spreadsheet.',
    icon: 'Table',
    category: 'data',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'updatedRange', type: 'string', description: 'Range of updated cells' },
    ],
    configSchema: {
      apiKey: { type: 'string', label: 'Google API Key', description: 'Google Cloud API key with Sheets API enabled (get it from https://console.cloud.google.com/apis/credentials)', required: true },
      spreadsheetId: { type: 'string', label: 'Spreadsheet ID', description: 'Google Sheets spreadsheet ID (found in the spreadsheet URL)', required: true },
      sheetName: { type: 'string', label: 'Sheet Name', description: 'Sheet name (e.g., "Sheet1")', required: true },
      values: { type: 'array', label: 'Values', description: 'Array of values for the row (e.g., ["value1", "value2", "value3"])', required: true },
    },
    execute: addRowToGoogleSheetExecute,
    code: addRowToGoogleSheetExecute.toString(),
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
      webhookUrl: { type: 'string', label: 'Webhook URL', description: 'Discord webhook URL (get it from Server Settings → Integrations → Webhooks)', required: true },
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
      apiKey: { type: 'string', label: 'Trello API Key', description: 'Your Trello API key (get it from https://trello.com/app-key)', required: true },
      token: { type: 'string', label: 'Trello Token', description: 'Your Trello token (generate from the API key page)', required: true },
      name: { type: 'string', label: 'Card Name', description: 'Card title', required: true },
      desc: { type: 'textarea', label: 'Description', description: 'Card description (supports Markdown)', required: false },
      idList: { type: 'string', label: 'List ID', description: 'Trello list ID (found in list URL)', required: true },
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
      apiKey: { type: 'string', label: 'Airtable API Key', description: 'Your Airtable Personal Access Token (get it from https://airtable.com/create/tokens)', required: true },
      baseId: { type: 'string', label: 'Base ID', description: 'Airtable base ID (found in base URL)', required: true },
      tableId: { type: 'string', label: 'Table ID', description: 'Airtable table ID or name', required: true },
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
      apiKey: { type: 'string', label: 'Google API Key', description: 'Google Cloud API key with Calendar API enabled (get it from https://console.cloud.google.com/apis/credentials)', required: true },
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
      accountSid: { type: 'string', label: 'Account SID', description: 'Twilio Account SID (get it from https://console.twilio.com)', required: true },
      authToken: { type: 'string', label: 'Auth Token', description: 'Twilio Auth Token (found in Twilio Console)', required: true },
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
      apiKey: { type: 'string', label: 'Google API Key', description: 'Google Cloud API key with Drive API enabled (get it from https://console.cloud.google.com/apis/credentials)', required: true },
      fileName: { type: 'string', label: 'File Name', description: 'Name of the file (e.g., "document.pdf")', required: true },
      fileContent: { type: 'textarea', label: 'File Content', description: 'File content (base64 encoded or text)', required: true },
      folderId: { type: 'string', label: 'Folder ID', description: 'Google Drive folder ID (found in folder URL, optional)', required: false },
      mimeType: { type: 'string', label: 'MIME Type', description: 'File MIME type (e.g., "application/pdf", "text/plain", optional)', required: false },
    },
    execute: uploadFileToGoogleDriveExecute,
    code: uploadFileToGoogleDriveExecute.toString(),
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
      { name: 'submissions', type: 'array', description: 'Array of new submissions' },
      { name: 'count', type: 'number', description: 'Number of new submissions' },
    ],
    configSchema: {
      apiKey: { type: 'string', label: 'Google API Key', description: 'Google Cloud API key with Forms API enabled (get it from https://console.cloud.google.com/apis/credentials)', required: true },
      formId: { type: 'string', label: 'Form ID', description: 'Google Forms form ID (found in form URL)', required: true },
      pollInterval: { type: 'number', label: 'Poll Interval', description: 'Polling interval in seconds (default: 60)', required: false, default: 60 },
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
      { name: 'emails', type: 'array', description: 'Array of new emails' },
      { name: 'count', type: 'number', description: 'Number of new emails' },
    ],
    configSchema: {
      apiKey: { type: 'string', label: 'Google API Key', description: 'Google Cloud API key with Gmail API enabled (get it from https://console.cloud.google.com/apis/credentials)', required: true },
      inboxId: { type: 'string', label: 'Inbox ID', description: 'Gmail inbox ID (use "me" for primary inbox)', required: false, default: 'me' },
      lastCheck: { type: 'string', label: 'Last Check', description: 'Last check timestamp (auto-managed)', required: false },
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
      { name: 'rows', type: 'array', description: 'Array of new rows' },
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
      { name: 'messages', type: 'array', description: 'Array of new messages' },
      { name: 'count', type: 'number', description: 'Number of new messages' },
    ],
    configSchema: {
      botToken: { type: 'string', label: 'Bot Token', description: 'Slack Bot User OAuth Token (starts with xoxb-, get it from https://api.slack.com/apps)', required: true },
      channel: { type: 'string', label: 'Channel', description: 'Slack channel ID or name (e.g., #general or C1234567890)', required: true },
      lastTs: { type: 'string', label: 'Last TS', description: 'Last message timestamp (auto-managed)', required: false },
    },
    execute: newMessageInSlackExecute,
    code: newMessageInSlackExecute.toString(),
  },
  
  'new-discord-message': {
    id: 'new-discord-message',
    name: 'New Discord Message',
    type: 'trigger',
    description: 'Triggers when a new message is received via Discord webhook.',
    icon: 'MessageCircle',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'message', type: 'object', description: 'Discord message data' },
    ],
    configSchema: {
      webhookUrl: { type: 'string', label: 'Webhook URL', description: 'Discord webhook URL', required: true },
    },
    execute: newDiscordMessageExecute,
    code: newDiscordMessageExecute.toString(),
  },
  
  'scheduled-time-trigger': {
    id: 'scheduled-time-trigger',
    name: 'Scheduled Time Trigger',
    type: 'trigger',
    description: 'Triggers on a scheduled time using cron syntax.',
    icon: 'Clock',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'triggerTime', type: 'string', description: 'Trigger execution time' },
    ],
    configSchema: {
      schedule: { type: 'string', label: 'Schedule', description: 'Cron expression (e.g., "0 9 * * *" for daily at 9 AM)', required: true },
      timezone: { type: 'string', label: 'Timezone', description: 'Timezone (e.g., "America/New_York")', required: false, default: 'UTC' },
    },
    execute: scheduledTimeTriggerExecute,
    code: scheduledTimeTriggerExecute.toString(),
  },
  
  'webhook-trigger': {
    id: 'webhook-trigger',
    name: 'Webhook Trigger',
    type: 'trigger',
    description: 'Triggers when data is received via webhook endpoint.',
    icon: 'Webhook',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'data', type: 'object', description: 'Webhook payload data' },
    ],
    configSchema: {
      path: { type: 'string', label: 'Webhook Path', description: 'Unique webhook path', required: true },
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
      { name: 'issues', type: 'array', description: 'Array of new issues' },
      { name: 'count', type: 'number', description: 'Number of new issues' },
    ],
    configSchema: {
      accessToken: { type: 'string', label: 'Personal Access Token', description: 'GitHub Personal Access Token (get it from https://github.com/settings/tokens)', required: true },
      owner: { type: 'string', label: 'Owner', description: 'GitHub repository owner (username or organization)', required: true },
      repo: { type: 'string', label: 'Repository', description: 'GitHub repository name', required: true },
      lastCheck: { type: 'string', label: 'Last Check', description: 'Last check timestamp (auto-managed)', required: false },
    },
    execute: newGitHubIssueExecute,
    code: newGitHubIssueExecute.toString(),
  },
  
  'payment-completed': {
    id: 'payment-completed',
    name: 'Payment Completed',
    type: 'trigger',
    description: 'Triggers when a payment is completed (Stripe, PayPal, etc.).',
    icon: 'CreditCard',
    category: 'trigger',
    inputs: [],
    outputs: [
      { name: 'payment', type: 'object', description: 'Payment data' },
    ],
    configSchema: {
      provider: { type: 'select', label: 'Provider', description: 'Payment provider', required: true, options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'PayPal', value: 'paypal' },
      ]},
      apiKey: { type: 'string', label: 'API Key', description: 'Payment provider API key (Stripe or PayPal)', required: true },
      webhookUrl: { type: 'string', label: 'Webhook URL', description: 'Provider webhook URL (auto-generated)', required: false },
    },
    execute: paymentCompletedExecute,
    code: paymentCompletedExecute.toString(),
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
      { name: 'files', type: 'array', description: 'Array of uploaded files' },
      { name: 'count', type: 'number', description: 'Number of new files' },
    ],
    configSchema: {
      apiKey: { type: 'string', label: 'Google API Key', description: 'Google Cloud API key with Drive API enabled (get it from https://console.cloud.google.com/apis/credentials)', required: true },
      driveId: { type: 'string', label: 'Drive ID', description: 'Google Drive ID (optional, for shared drives)', required: false },
      folderId: { type: 'string', label: 'Folder ID', description: 'Google Drive folder ID to monitor (found in folder URL)', required: true },
      lastCheck: { type: 'string', label: 'Last Check', description: 'Last check timestamp (auto-managed)', required: false },
    },
    execute: fileUploadedExecute,
    code: fileUploadedExecute.toString(),
  },
  
  // TRANSFORM NODES
  'format-text': {
    id: 'format-text',
    name: 'Format Text',
    type: 'transform',
    description: 'Formats text using template variables and input data.',
    icon: 'Type',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'formatted', type: 'string', description: 'Formatted text output' },
    ],
    configSchema: {
      template: { type: 'string', label: 'Template', description: 'Text template with {{variables}}', required: true },
      variables: { type: 'object', label: 'Variables', description: 'Variables to use in template', required: false },
    },
    execute: formatTextExecute,
    code: formatTextExecute.toString(),
  },
  
  'parse-json': {
    id: 'parse-json',
    name: 'Parse JSON',
    type: 'transform',
    description: 'Parses JSON string and optionally extracts nested values.',
    icon: 'Code',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'string', description: 'JSON string input' },
    ],
    outputs: [
      { name: 'parsed', type: 'object', description: 'Parsed JSON object' },
    ],
    configSchema: {
      jsonString: { type: 'string', label: 'JSON String', description: 'JSON string to parse', required: false },
      path: { type: 'string', label: 'Path', description: 'Optional path to extract (e.g., "data.items[0].name")', required: false },
    },
    execute: parseJsonExecute,
    code: parseJsonExecute.toString(),
  },
  
  'filter-data': {
    id: 'filter-data',
    name: 'Filter Data',
    type: 'transform',
    description: 'Filters array data based on conditions.',
    icon: 'Filter',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'array', description: 'Array data to filter' },
    ],
    outputs: [
      { name: 'filtered', type: 'array', description: 'Filtered array' },
      { name: 'filteredCount', type: 'number', description: 'Number of items after filtering' },
    ],
    configSchema: {
      condition: { type: 'object', label: 'Condition', description: 'Filter condition object', required: true },
      field: { type: 'string', label: 'Field', description: 'Field name to filter on', required: false },
    },
    execute: filterDataExecute,
    code: filterDataExecute.toString(),
  },
  
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
  
  'merge-data-objects': {
    id: 'merge-data-objects',
    name: 'Merge Data Objects',
    type: 'transform',
    description: 'Merges multiple data objects into one.',
    icon: 'Merge',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'object', description: 'Input data from previous node' },
    ],
    outputs: [
      { name: 'merged', type: 'object', description: 'Merged object' },
    ],
    configSchema: {
      objects: { type: 'array', label: 'Objects', description: 'Array of objects to merge', required: false },
      strategy: { type: 'select', label: 'Strategy', description: 'Merge strategy', required: false, default: 'shallow', options: [
        { label: 'Shallow', value: 'shallow' },
        { label: 'Deep', value: 'deep' },
      ]},
    },
    execute: mergeDataObjectsExecute,
    code: mergeDataObjectsExecute.toString(),
  },
  
  'split-string': {
    id: 'split-string',
    name: 'Split String',
    type: 'transform',
    description: 'Splits a string into an array using a delimiter.',
    icon: 'Scissors',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'string', description: 'String input' },
    ],
    outputs: [
      { name: 'parts', type: 'array', description: 'Array of split parts' },
      { name: 'count', type: 'number', description: 'Number of parts' },
    ],
    configSchema: {
      text: { type: 'string', label: 'Text', description: 'Text to split', required: false },
      delimiter: { type: 'string', label: 'Delimiter', description: 'Character or string to split on', required: false, default: ',' },
      limit: { type: 'number', label: 'Limit', description: 'Maximum number of parts', required: false },
    },
    execute: splitStringExecute,
    code: splitStringExecute.toString(),
  },
  
  'convert-to-csv': {
    id: 'convert-to-csv',
    name: 'Convert to CSV',
    type: 'transform',
    description: 'Converts array of objects to CSV format.',
    icon: 'FileSpreadsheet',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'array', description: 'Array of objects to convert' },
    ],
    outputs: [
      { name: 'csv', type: 'string', description: 'CSV string output' },
      { name: 'rowCount', type: 'number', description: 'Number of rows' },
    ],
    configSchema: {
      headers: { type: 'array', label: 'Headers', description: 'CSV column headers', required: false },
      delimiter: { type: 'string', label: 'Delimiter', description: 'CSV delimiter', required: false, default: ',' },
    },
    execute: convertToCsvExecute,
    code: convertToCsvExecute.toString(),
  },
  
  'extract-email-addresses': {
    id: 'extract-email-addresses',
    name: 'Extract Email Addresses',
    type: 'transform',
    description: 'Extracts email addresses from text using regex.',
    icon: 'Mail',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'string', description: 'Text input' },
    ],
    outputs: [
      { name: 'emails', type: 'array', description: 'Array of extracted email addresses' },
      { name: 'count', type: 'number', description: 'Number of emails found' },
    ],
    configSchema: {
      text: { type: 'string', label: 'Text', description: 'Text to extract emails from', required: false },
    },
    execute: extractEmailAddressesExecute,
    code: extractEmailAddressesExecute.toString(),
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
      apiKey: { type: 'string', label: 'OpenAI API Key', description: 'Your OpenAI API key (get it from https://platform.openai.com/api-keys)', required: true },
      text: { type: 'textarea', label: 'Text', description: 'Text to summarize (or leave empty to use input from previous node)', required: false },
      maxLength: { type: 'number', label: 'Max Length', description: 'Maximum summary length in words (default: 100)', required: false, default: 100 },
    },
    execute: generateSummaryWithAiExecute,
    code: generateSummaryWithAiExecute.toString(),
  },
  
  'calculate-numeric-values': {
    id: 'calculate-numeric-values',
    name: 'Calculate Numeric Values',
    type: 'transform',
    description: 'Performs calculations on numeric data (sum, average, min, max).',
    icon: 'Calculator',
    category: 'transform',
    inputs: [
      { name: 'data', type: 'array', description: 'Array of numbers or objects with numeric fields' },
    ],
    outputs: [
      { name: 'result', type: 'number', description: 'Calculation result' },
    ],
    configSchema: {
      operation: { type: 'select', label: 'Operation', description: 'Mathematical operation', required: true, options: [
        { label: 'Sum', value: 'sum' },
        { label: 'Average', value: 'average' },
        { label: 'Min', value: 'min' },
        { label: 'Max', value: 'max' },
      ]},
      field: { type: 'string', label: 'Field', description: 'Field name if input is array of objects', required: false },
      values: { type: 'array', label: 'Values', description: 'Array of numbers (optional)', required: false },
    },
    execute: calculateNumericValuesExecute,
    code: calculateNumericValuesExecute.toString(),
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

