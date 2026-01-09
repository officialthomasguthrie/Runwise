/**
 * Airtable Integration API Client
 */

import { getIntegrationCredential, getUserIntegration } from './service';

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel?: string;
}

export interface AirtableTable {
  id: string;
  name: string;
  description?: string;
}

export interface AirtableField {
  id: string;
  name: string;
  type: string;
}

/**
 * Get authenticated Airtable API token
 * Supports both OAuth (preferred) and API token (backward compatibility)
 */
async function getAirtableToken(userId: string): Promise<string> {
  // Try OAuth token first (new method)
  try {
    const oauthIntegration = await getUserIntegration(userId, 'airtable');
    if (oauthIntegration && oauthIntegration.access_token) {
      return oauthIntegration.access_token;
    }
  } catch (error) {
    // OAuth not available, fall back to API token
    console.log('[Airtable] OAuth token not found, trying API token...');
  }
  
  // Fall back to API token (backward compatibility)
  const token = await getIntegrationCredential(userId, 'airtable', 'api_token');
  
  if (!token) {
    throw new Error('Airtable integration not connected. Please connect your Airtable account via OAuth or provide an API token.');
  }
  
  return token;
}

/**
 * Fetch user's Airtable bases
 */
export async function getAirtableBases(userId: string): Promise<AirtableBase[]> {
  const apiToken = await getAirtableToken(userId);
  
  const response = await fetch('https://api.airtable.com/v0/meta/bases', {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch bases: ${error}`);
  }
  
  const data = await response.json();
  
  return (data.bases || []).map((base: any) => ({
    id: base.id,
    name: base.name,
    permissionLevel: base.permissionLevel
  }));
}

/**
 * Fetch tables within an Airtable base
 */
export async function getAirtableTables(
  userId: string,
  baseId: string
): Promise<AirtableTable[]> {
  const apiToken = await getAirtableToken(userId);
  
  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch tables: ${error}`);
  }
  
  const data = await response.json();
  
  return (data.tables || []).map((table: any) => ({
    id: table.id,
    name: table.name,
    description: table.description
  }));
}

/**
 * Fetch fields within an Airtable table
 */
export async function getAirtableFields(
  userId: string,
  baseId: string,
  tableId: string
): Promise<AirtableField[]> {
  const apiToken = await getAirtableToken(userId);
  
  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch fields: ${error}`);
  }
  
  const data = await response.json();
  
  return (data.fields || []).map((field: any) => ({
    id: field.id,
    name: field.name,
    type: field.type
  }));
}


