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
 * Get the best available Slack token for reading channel history.
 * Prefers the user token (xoxp-) so the bot doesn't need to be invited
 * to every channel. Falls back to the bot token (xoxb-) for older connections.
 */
async function getSlackToken(userId: string): Promise<string> {
  const integration = await getUserIntegration(userId, 'slack');

  if (!integration || !integration.access_token) {
    throw new Error('Slack integration not connected');
  }

  // Prefer user token stored in metadata (available after reconnecting with user_scope)
  const userToken = (integration as any).metadata?.user_access_token as string | undefined;
  if (userToken) {
    return userToken;
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

