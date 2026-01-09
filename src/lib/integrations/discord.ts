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
 * Get Discord bot token
 * Returns token with appropriate prefix for API calls
 */
async function getDiscordToken(userId: string, needsBotPrefix: boolean = false): Promise<string> {
  const botToken = await getIntegrationCredential(userId, 'discord', 'bot_token');
  if (botToken) {
    // Bot tokens need "Bot " prefix for API calls
    return needsBotPrefix ? `Bot ${botToken}` : botToken;
  }
  
  throw new Error('Discord bot token not found. Please add a bot token in the integration settings.');
}

/**
 * Get Discord guilds (servers) that the bot is in
 * Note: Bot tokens can only see guilds where the bot has been added
 */
export async function getDiscordGuilds(userId: string): Promise<DiscordGuild[]> {
  const token = await getDiscordToken(userId, true); // Needs "Bot " prefix
  
  // Get bot's user info to verify token works
  const botUserResponse = await fetch('https://discord.com/api/v10/users/@me', {
    headers: {
      'Authorization': token
    }
  });
  
  if (!botUserResponse.ok) {
    const errorText = await botUserResponse.text();
    console.error(`[Discord] Failed to verify bot token: ${botUserResponse.status} ${botUserResponse.statusText}`, errorText);
    
    if (botUserResponse.status === 401) {
      throw new Error('Discord bot token is invalid or expired. Please update your bot token in the integration settings.');
    }
    
    throw new Error(`Failed to verify Discord bot token: ${errorText || botUserResponse.statusText}`);
  }
  
  // Get guilds the bot is in
  // Note: Bots can only see guilds they're in, not all user guilds
  const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: {
      'Authorization': token
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Discord] Failed to fetch guilds: ${response.status} ${response.statusText}`, errorText);
    
    if (response.status === 401) {
      throw new Error('Discord bot token is invalid or expired. Please update your bot token in the integration settings.');
    }
    
    throw new Error(`Failed to fetch Discord guilds: ${errorText || response.statusText}`);
  }
  
  const data = await response.json();
  return data.map((guild: any) => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon
  }));
}

/**
 * Get channels in a Discord guild
 * Requires bot token
 */
export async function getDiscordChannels(userId: string, guildId: string): Promise<DiscordChannel[]> {
  const token = await getDiscordToken(userId, true); // Needs "Bot " prefix
  
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: {
      'Authorization': token
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Discord] Failed to fetch channels for guild ${guildId}: ${response.status} ${response.statusText}`, errorText);
    
    if (response.status === 401) {
      throw new Error('Discord bot token is invalid or expired. Please update your bot token in the integration settings.');
    } else if (response.status === 403) {
      throw new Error('Bot does not have permission to access channels in this server. Make sure the bot has "View Channels" permission in the server.');
    }
    
    throw new Error(`Discord API error: ${errorText || response.statusText}`);
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
 * Get all channels from all Discord guilds the user has access to
 */
export async function getAllDiscordChannels(userId: string): Promise<DiscordChannel[]> {
  // First get all guilds
  const guilds = await getDiscordGuilds(userId);
  
  if (guilds.length === 0) {
    return [];
  }
  
  // Fetch channels from all guilds using bot token
  const token = await getDiscordToken(userId, true); // Needs "Bot " prefix
  const allChannels: DiscordChannel[] = [];
  
  // Fetch channels for each guild in parallel
  const channelPromises = guilds.map(async (guild) => {
    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/channels`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (response.ok) {
        const channels = await response.json();
        return channels.map((channel: any) => ({
          id: channel.id,
          name: `${guild.name} - ${channel.name}`, // Include guild name for clarity
          type: channel.type,
          guild_id: channel.guild_id || guild.id
        }));
      } else {
        // Log but don't throw - user might not have access to all guilds
        const errorText = await response.text();
        console.warn(`[Discord] Could not fetch channels for guild ${guild.name} (${guild.id}): ${response.status}`, errorText);
        return [];
      }
    } catch (error) {
      console.error(`[Discord] Error fetching channels for guild ${guild.id}:`, error);
      return [];
    }
  });
  
  const channelArrays = await Promise.all(channelPromises);
  channelArrays.forEach(channels => {
    allChannels.push(...channels);
  });
  
  // Filter to only text channels (type 0) and sort by name
  return allChannels
    .filter(channel => channel.type === 0) // Only text channels
    .sort((a, b) => a.name.localeCompare(b.name));
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

