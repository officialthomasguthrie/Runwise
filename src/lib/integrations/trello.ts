/**
 * Trello Integration API Client
 */

import { getIntegrationCredential, getUserIntegration } from './service';

export interface TrelloBoard {
  id: string;
  name: string;
  url?: string;
  closed: boolean;
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  idBoard: string;
}

/**
 * Get authenticated Trello API key and token
 * Supports both OAuth (preferred) and API key + token (backward compatibility)
 */
async function getTrelloCredentials(userId: string): Promise<{ apiKey: string; token: string }> {
  // Try OAuth token first (new method)
  try {
    const oauthIntegration = await getUserIntegration(userId, 'trello');
    if (oauthIntegration && oauthIntegration.access_token) {
      // For OAuth, access_token is the OAuth token, and metadata contains api_key
      const apiKey = oauthIntegration.metadata?.api_key || process.env.TRELLO_API_KEY;
      if (apiKey && oauthIntegration.access_token) {
        return {
          apiKey,
          token: oauthIntegration.access_token // OAuth access token
        };
      }
    }
  } catch (error) {
    // OAuth not available, fall back to API key + token
    console.log('[Trello] OAuth token not found, trying API key + token...');
  }
  
  // Fall back to API key + token (backward compatibility)
  const apiKey = await getIntegrationCredential(userId, 'trello', 'api_key');
  const token = await getIntegrationCredential(userId, 'trello', 'token');
  
  if (!apiKey || !token) {
    throw new Error('Trello integration not connected. Please connect your Trello account via OAuth or provide your API key and token.');
  }
  
  return { apiKey, token };
}

/**
 * Fetch user's Trello boards
 */
export async function getTrelloBoards(userId: string): Promise<TrelloBoard[]> {
  const { apiKey, token } = await getTrelloCredentials(userId);
  
  const response = await fetch(`https://api.trello.com/1/members/me/boards?filter=open&fields=id,name,url,closed&key=${apiKey}&token=${token}`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch boards: ${error}`);
  }
  
  const boards = await response.json();
  
  return boards.map((board: any) => ({
    id: board.id,
    name: board.name,
    url: board.url,
    closed: board.closed || false
  }));
}

/**
 * Fetch lists within a Trello board
 */
export async function getTrelloLists(
  userId: string,
  boardId: string
): Promise<TrelloList[]> {
  const { apiKey, token } = await getTrelloCredentials(userId);
  
  const response = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?filter=open&fields=id,name,closed,idBoard&key=${apiKey}&token=${token}`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch lists: ${error}`);
  }
  
  const lists = await response.json();
  
  return lists.map((list: any) => ({
    id: list.id,
    name: list.name,
    closed: list.closed || false,
    idBoard: list.idBoard
  }));
}


