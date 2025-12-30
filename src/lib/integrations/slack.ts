/**
 * Slack Integration API Client
 */

import { getUserIntegration } from './service';

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
}

/**
 * Get authenticated Slack access token
 */
async function getSlackToken(userId: string): Promise<string> {
  const integration = await getUserIntegration(userId, 'slack');
  
  if (!integration || !integration.access_token) {
    throw new Error('Slack integration not connected');
  }
  
  if (integration.expires_at && new Date() >= integration.expires_at) {
    throw new Error('Slack token expired. Please reconnect.');
  }
  
  return integration.access_token;
}

/**
 * Fetch user's Slack channels
 */
export async function getSlackChannels(userId: string): Promise<SlackChannel[]> {
  const accessToken = await getSlackToken(userId);
  
  const response = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch channels: ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(data.error || 'Failed to fetch channels');
  }
  
  return (data.channels || []).map((channel: any) => ({
    id: channel.id,
    name: channel.name,
    is_private: channel.is_private || false,
    is_archived: channel.is_archived || false
  }));
}

