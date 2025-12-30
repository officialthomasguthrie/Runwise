/**
 * Trello Integration API Client
 */

import { getIntegrationCredential } from './service';

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
 */
async function getTrelloCredentials(userId: string): Promise<{ apiKey: string; token: string }> {
  const apiKey = await getIntegrationCredential(userId, 'trello', 'api_key');
  const token = await getIntegrationCredential(userId, 'trello', 'token');
  
  if (!apiKey || !token) {
    throw new Error('Trello integration not connected. Please provide your Trello API key and token.');
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


