/**
 * Google Integration API Client
 * Handles Google API calls (Sheets, Drive, Calendar, etc.)
 */

import { getUserIntegration } from './service';

export interface GoogleSpreadsheet {
  id: string;
  name: string;
  url?: string;
}

export interface GoogleSheet {
  name: string;
  id?: number;
}

export interface GoogleColumn {
  name: string;
  index: number;
}

/**
 * Get authenticated Google API client
 */
async function getGoogleClient(userId: string) {
  const integration = await getUserIntegration(userId, 'google');
  
  if (!integration || !integration.access_token) {
    throw new Error('Google integration not connected');
  }
  
  // Check if token is expired
  if (integration.expires_at && new Date() >= integration.expires_at) {
    // Token refresh would happen here
    // For now, throw error
    throw new Error('Google token expired. Please reconnect.');
  }
  
  return integration.access_token;
}

/**
 * Fetch user's Google Spreadsheets
 */
export async function getGoogleSpreadsheets(userId: string): Promise<GoogleSpreadsheet[]> {
  const accessToken = await getGoogleClient(userId);
  
  const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&fields=files(id,name,webViewLink)', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch spreadsheets: ${error}`);
  }
  
  const data = await response.json();
  return (data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    url: file.webViewLink
  }));
}

/**
 * Fetch sheets within a spreadsheet
 */
export async function getGoogleSheets(
  userId: string,
  spreadsheetId: string
): Promise<GoogleSheet[]> {
  const accessToken = await getGoogleClient(userId);
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch sheets: ${error}`);
  }
  
  const data = await response.json();
  return (data.sheets || []).map((sheet: any, index: number) => ({
    name: sheet.properties?.title || `Sheet${index + 1}`,
    id: sheet.properties?.sheetId
  }));
}

/**
 * Fetch column headers from a sheet
 */
export async function getGoogleSheetColumns(
  userId: string,
  spreadsheetId: string,
  sheetName: string
): Promise<GoogleColumn[]> {
  const accessToken = await getGoogleClient(userId);
  
  // Get first row (headers)
  const range = `${sheetName}!1:1`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch columns: ${error}`);
  }
  
  const data = await response.json();
  const headers = data.values?.[0] || [];
  
  return headers.map((header: string, index: number) => ({
    name: header || `Column ${index + 1}`,
    index: index
  }));
}

/**
 * Fetch user's Google Calendars
 */
export interface GoogleCalendar {
  id: string;
  name: string;
  summary?: string;
  primary?: boolean;
}

export async function getGoogleCalendars(userId: string): Promise<GoogleCalendar[]> {
  const accessToken = await getGoogleClient(userId);
  
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch calendars: ${error}`);
  }
  
  const data = await response.json();
  return (data.items || []).map((cal: any) => ({
    id: cal.id,
    name: cal.summary || cal.id,
    summary: cal.summary,
    primary: cal.primary || false
  }));
}

/**
 * Fetch user's Google Drive folders
 */
export interface GoogleDriveFolder {
  id: string;
  name: string;
  parents?: string[];
}

export async function getGoogleDriveFolders(userId: string, parentFolderId?: string): Promise<GoogleDriveFolder[]> {
  const accessToken = await getGoogleClient(userId);
  
  let query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  } else {
    query += " and 'root' in parents";
  }
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch folders: ${error}`);
  }
  
  const data = await response.json();
  return (data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    parents: file.parents || []
  }));
}

/**
 * Fetch user's Gmail labels
 */
export interface GmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
}

export async function getGmailLabels(userId: string): Promise<GmailLabel[]> {
  const accessToken = await getGoogleClient(userId);
  
  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/labels', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Gmail labels: ${error}`);
  }
  
  const data = await response.json();
  return (data.labels || [])
    .filter((label: any) => label.type === 'user' || ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH'].includes(label.id))
    .map((label: any) => ({
      id: label.id,
      name: label.name,
      type: label.type === 'user' ? 'user' : 'system'
    }));
}

/**
 * Fetch user's Google Forms
 */
export interface GoogleForm {
  id: string;
  name: string;
  url?: string;
}

export async function getGoogleForms(userId: string): Promise<GoogleForm[]> {
  const accessToken = await getGoogleClient(userId);
  
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.form"&fields=files(id,name,webViewLink)',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch forms: ${error}`);
  }
  
  const data = await response.json();
  return (data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    url: file.webViewLink
  }));
}

/**
 * Refresh Google access token and update stored integration
 */
export async function refreshGoogleToken(
  userId: string,
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const clientSecret = process.env.GOOGLE_INTEGRATION_CLIENT_SECRET;
  const clientId = process.env.GOOGLE_INTEGRATION_CLIENT_ID;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google credentials not configured');
  }
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }
  
  const tokens = await response.json();
  
  // Update stored integration with new token
  const { storeUserIntegration } = await import('./service');
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : undefined;
  
  await storeUserIntegration(
    userId,
    'google',
    {
      access_token: tokens.access_token,
      refresh_token: refreshToken, // Keep the same refresh token
      expires_at: expiresAt
    }
  );
  
  return tokens;
}

