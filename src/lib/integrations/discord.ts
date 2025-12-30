/**
 * Discord Integration API Client
 */

import { getUserIntegration, getIntegrationCredential } from './service';

export interface DiscordChannel {
  id: string;
  name: string;
  type: number; // 0 = text, 2 = voice, 4 = category, etc.
  guild_id?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Get Discord access token (OAuth) or bot token
 * Returns token with appropriate prefix for API calls
 */
async function getDiscordToken(userId: string, needsBotPrefix: boolean = false): Promise<string> {
  // Try OAuth token first
  const integration = await getUserIntegration(userId, 'discord');
  if (integration?.access_token) {
    // OAuth tokens use "Bearer" prefix
    return needsBotPrefix ? `Bearer ${integration.access_token}` : integration.access_token;
  }
  
  // Fall back to bot token
  const botToken = await getIntegrationCredential(userId, 'discord', 'bot_token');
  if (botToken) {
    // Bot tokens need "Bot " prefix
    return needsBotPrefix ? `Bot ${botToken}` : botToken;
  }
  
  throw new Error('Discord integration not connected. Please connect your Discord account or add a bot token.');
}

/**
 * Get user's Discord guilds (servers)
 */
export async function getDiscordGuilds(userId: string): Promise<DiscordGuild[]> {
  // Try OAuth token first (for user guilds)
  const integration = await getUserIntegration(userId, 'discord');
  if (integration?.access_token) {
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.map((guild: any) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon
      }));
    }
  }
  
  // If OAuth fails or not available, we can't get user guilds with bot token
  // Return empty array - user will need to connect via OAuth
  return [];
}

/**
 * Get channels in a Discord guild
 */
export async function getDiscordChannels(userId: string, guildId: string): Promise<DiscordChannel[]> {
  const token = await getDiscordToken(userId, true); // Needs prefix for API calls
  
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: {
      'Authorization': token
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord API error: ${error}`);
  }
  
  const data = await response.json();
  
  return data.map((channel: any) => ({
    id: channel.id,
    name: channel.name,
    type: channel.type,
    guild_id: channel.guild_id
  }));
}

/**
 * Send message to Discord channel
 */
export async function sendDiscordMessage(
  userId: string,
  channelId: string,
  params: {
    content?: string;
    embeds?: any[];
  }
): Promise<{ id: string; channel_id: string; content: string }> {
  const token = await getDiscordToken(userId, true); // Needs prefix for API calls
  
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: params.content,
      embeds: params.embeds
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord API error: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    channel_id: data.channel_id,
    content: data.content
  };
}

