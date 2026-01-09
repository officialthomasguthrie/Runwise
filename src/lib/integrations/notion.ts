/**
 * Notion Integration API Client
 */

import { getIntegrationCredential, getUserIntegration } from './service';

export interface NotionDatabase {
  id: string;
  title: string;
  url?: string;
}

/**
 * Get authenticated Notion API token
 * Supports both OAuth (preferred) and API token (backward compatibility)
 */
async function getNotionToken(userId: string): Promise<string> {
  // Try OAuth token first (new method)
  try {
    const oauthIntegration = await getUserIntegration(userId, 'notion');
    if (oauthIntegration && oauthIntegration.access_token) {
      return oauthIntegration.access_token;
    }
  } catch (error) {
    // OAuth not available, fall back to API token
    console.log('[Notion] OAuth token not found, trying API token...');
  }
  
  // Fall back to API token (backward compatibility)
  const token = await getIntegrationCredential(userId, 'notion', 'api_token');
  
  if (!token) {
    throw new Error('Notion integration not connected. Please connect your Notion account via OAuth or provide an API token.');
  }
  
  return token;
}

/**
 * Fetch user's Notion databases
 */
export async function getNotionDatabases(userId: string): Promise<NotionDatabase[]> {
  const apiToken = await getNotionToken(userId);
  
  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter: {
        property: 'object',
        value: 'database'
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch databases: ${error}`);
  }
  
  const data = await response.json();
  
  return (data.results || []).map((db: any) => {
    // Extract title from database properties
    let title = 'Untitled Database';
    if (db.title && db.title.length > 0) {
      title = db.title.map((t: any) => t.plain_text || '').join('');
    } else if (db.properties) {
      // Try to find a title property
      const titleProp = Object.values(db.properties).find((p: any) => 
        p.type === 'title' || p.name?.toLowerCase().includes('title')
      ) as any;
      if (titleProp) {
        title = titleProp.name || 'Untitled Database';
      }
    }
    
    return {
      id: db.id,
      title: title || 'Untitled Database',
      url: db.url
    };
  });
}


