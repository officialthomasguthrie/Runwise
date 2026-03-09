/**
 * Behaviour Config Validator
 *
 * Validates agent behaviour config before enabling. Performs lightweight
 * API calls to ensure Form ID exists, Slack channel is accessible, etc.
 */

import { getGoogleAccessToken } from '@/lib/integrations/google';
import { getUserIntegration, getIntegrationCredential } from '@/lib/integrations/service';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate a single behaviour's config for the given trigger type */
export async function validateBehaviourConfig(
  userId: string,
  triggerType: string,
  config: Record<string, any>
): Promise<ValidationResult> {
  const safeConfig = config ?? {};

  switch (triggerType) {
    case 'new-email-received':
      return validateGmail(userId, safeConfig);
    case 'new-form-submission':
      return validateGoogleForms(userId, safeConfig);
    case 'new-row-in-google-sheet':
      return validateGoogleSheets(userId, safeConfig);
    case 'file-uploaded':
      return validateGoogleDrive(userId, safeConfig);
    case 'new-message-in-slack':
      return validateSlack(userId, safeConfig);
    case 'new-discord-message':
      return validateDiscord(userId, safeConfig);
    case 'new-github-issue':
      return validateGitHub(userId, safeConfig);
    case 'new-calendar-event':
      return validateGoogleCalendar(userId, safeConfig);
    case 'heartbeat':
    case 'manual':
      return { valid: true };
    default:
      return { valid: true };
  }
}

async function validateGmail(_userId: string, _config: Record<string, any>): Promise<ValidationResult> {
  // Gmail uses INBOX by default; labelId/categoryId are optional
  return { valid: true };
}

async function validateGoogleForms(userId: string, config: Record<string, any>): Promise<ValidationResult> {
  const formId = config.formId ?? config.form_id;
  if (!formId?.trim()) {
    return { valid: false, error: 'Form ID is required' };
  }
  try {
    const accessToken = await getGoogleAccessToken(userId, 'google-forms');
    const res = await fetch(
      `https://forms.googleapis.com/v1/forms/${formId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 404) {
        return { valid: false, error: 'Form not found. Check the Form ID or ensure the form exists.' };
      }
      return { valid: false, error: `Google Forms error: ${res.status} ${body.slice(0, 100)}` };
    }
    return { valid: true };
  } catch (e: any) {
    if (e?.message?.includes('connect') || e?.message?.includes('integration')) {
      return { valid: false, error: 'Google Forms integration not connected' };
    }
    return { valid: false, error: e?.message ?? 'Failed to validate form' };
  }
}

async function validateGoogleSheets(userId: string, config: Record<string, any>): Promise<ValidationResult> {
  const spreadsheetId = config.spreadsheetId ?? config.spreadsheet_id;
  const sheetName = config.sheetName ?? config.sheet_name ?? 'Sheet1';
  if (!spreadsheetId?.trim()) {
    return { valid: false, error: 'Spreadsheet ID is required' };
  }
  try {
    const accessToken = await getGoogleAccessToken(userId, 'google-sheets');
    const encodedRange = encodeURIComponent(sheetName);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 404) {
        return { valid: false, error: 'Spreadsheet or sheet not found. Check the IDs.' };
      }
      return { valid: false, error: `Google Sheets error: ${res.status} ${body.slice(0, 100)}` };
    }
    return { valid: true };
  } catch (e: any) {
    if (e?.message?.includes('connect') || e?.message?.includes('integration')) {
      return { valid: false, error: 'Google Sheets integration not connected' };
    }
    return { valid: false, error: e?.message ?? 'Failed to validate spreadsheet' };
  }
}

async function validateGoogleDrive(userId: string, config: Record<string, any>): Promise<ValidationResult> {
  const folderId = config.folderId ?? config.folder_id;
  if (!folderId?.trim()) {
    return { valid: false, error: 'Folder ID is required' };
  }
  try {
    const accessToken = await getGoogleAccessToken(userId, 'google-drive');
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,mimeType`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 404) {
        return { valid: false, error: 'Folder not found. Check the Folder ID.' };
      }
      return { valid: false, error: `Google Drive error: ${res.status} ${body.slice(0, 100)}` };
    }
    const data = await res.json();
    if (data.mimeType !== 'application/vnd.google-apps.folder') {
      return { valid: false, error: 'ID is not a folder. Use a Drive folder ID.' };
    }
    return { valid: true };
  } catch (e: any) {
    if (e?.message?.includes('connect') || e?.message?.includes('integration')) {
      return { valid: false, error: 'Google Drive integration not connected' };
    }
    return { valid: false, error: e?.message ?? 'Failed to validate folder' };
  }
}

async function validateSlack(userId: string, config: Record<string, any>): Promise<ValidationResult> {
  const channel = config.channel;
  if (!channel?.trim()) {
    return { valid: false, error: 'Slack channel is required' };
  }
  let token: string | null = config?.botToken ?? null;
  if (!token) {
    const integration = await getUserIntegration(userId, 'slack');
    token = (integration as any)?.metadata?.user_access_token
      ?? integration?.access_token
      ?? null;
  }
  if (!token) {
    return { valid: false, error: 'Slack integration not connected' };
  }
  try {
    const res = await fetch(
      `https://slack.com/api/conversations.info?channel=${channel}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (!data.ok) {
      if (data.error === 'channel_not_found') {
        return { valid: false, error: 'Channel not found. Use a channel ID (e.g. C01234ABC).' };
      }
      if (data.error === 'not_in_channel') {
        return {
          valid: false,
          error: 'Bot is not in this channel. Open Slack and type: /invite @YourBotName',
        };
      }
      return { valid: false, error: data.error ?? 'Slack API error' };
    }
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e?.message ?? 'Failed to validate Slack channel' };
  }
}

async function validateDiscord(userId: string, config: Record<string, any>): Promise<ValidationResult> {
  const channelId = config.channelId ?? config.channel_id;
  if (!channelId?.trim()) {
    return { valid: false, error: 'Discord channel is required' };
  }
  const botToken = await getIntegrationCredential(userId, 'discord', 'bot_token');
  if (!botToken) {
    return { valid: false, error: 'Discord integration not connected' };
  }
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) {
      if (res.status === 404) {
        return { valid: false, error: 'Channel not found. Check the channel ID.' };
      }
      return { valid: false, error: `Discord API error: ${res.status}` };
    }
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e?.message ?? 'Failed to validate Discord channel' };
  }
}

async function validateGoogleCalendar(userId: string, config: Record<string, any>): Promise<ValidationResult> {
  const calendarId = config.calendarId ?? config.calendar_id ?? 'primary';
  try {
    const accessToken = await getGoogleAccessToken(userId, 'google-calendar');
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 404) {
        return { valid: false, error: 'Calendar not found. Check the calendar ID or use "primary".' };
      }
      return { valid: false, error: `Google Calendar error: ${res.status} ${body.slice(0, 100)}` };
    }
    return { valid: true };
  } catch (e: any) {
    if (e?.message?.includes('connect') || e?.message?.includes('integration')) {
      return { valid: false, error: 'Google Calendar integration not connected' };
    }
    return { valid: false, error: e?.message ?? 'Failed to validate calendar' };
  }
}

async function validateGitHub(userId: string, config: Record<string, any>): Promise<ValidationResult> {
  const rawRepo = config.repo ?? '';
  if (!rawRepo?.trim()) {
    return { valid: false, error: 'Repository is required (e.g. owner/repo)' };
  }
  const [owner, repo] = rawRepo.includes('/') ? rawRepo.split('/') : [config.owner ?? '', rawRepo];
  if (!owner || !repo) {
    return { valid: false, error: 'Repository must be in owner/repo format' };
  }
  let token: string | null = config?.accessToken ?? null;
  if (!token) {
    const integration = await getUserIntegration(userId, 'github');
    token = integration?.access_token ?? null;
  }
  if (!token) {
    return { valid: false, error: 'GitHub integration not connected' };
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    if (!res.ok) {
      if (res.status === 404) {
        return { valid: false, error: 'Repository not found. Check owner/repo and access.' };
      }
      return { valid: false, error: `GitHub API error: ${res.status}` };
    }
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e?.message ?? 'Failed to validate repository' };
  }
}
