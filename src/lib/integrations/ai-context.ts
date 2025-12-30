/**
 * Integration Context for AI
 * Provides integration information for AI workflow generation
 */

import { getUserIntegrations, getIntegrationCredential } from './service';
import { getGoogleSpreadsheets, getGoogleCalendars, getGoogleDriveFolders, getGmailLabels, getGoogleForms } from './google';
import { getSlackChannels } from './slack';
import { getGitHubRepositories } from './github';
import { getNotionDatabases } from './notion';
import { getAirtableBases } from './airtable';
import { getTrelloBoards } from './trello';
import { getDiscordGuilds } from './discord';
import { getTwitterProfile } from './twitter';

export interface IntegrationContext {
  google?: {
    connected: boolean;
    spreadsheets?: Array<{
      id: string;
      name: string;
    }>;
    calendars?: Array<{
      id: string;
      name: string;
    }>;
    folders?: Array<{
      id: string;
      name: string;
    }>;
    labels?: Array<{
      id: string;
      name: string;
    }>;
    forms?: Array<{
      id: string;
      name: string;
    }>;
  };
  slack?: {
    connected: boolean;
    channels?: Array<{
      id: string;
      name: string;
    }>;
  };
  github?: {
    connected: boolean;
    repositories?: Array<{
      id: number;
      name: string;
      full_name: string;
    }>;
  };
  notion?: {
    connected: boolean;
    databases?: Array<{
      id: string;
      title: string;
    }>;
  };
  airtable?: {
    connected: boolean;
    bases?: Array<{
      id: string;
      name: string;
    }>;
  };
  trello?: {
    connected: boolean;
    boards?: Array<{
      id: string;
      name: string;
    }>;
  };
  sendgrid?: {
    connected: boolean;
  };
  twilio?: {
    connected: boolean;
  };
  stripe?: {
    connected: boolean;
  };
  discord?: {
    connected: boolean;
    guilds?: Array<{
      id: string;
      name: string;
    }>;
  };
  twitter?: {
    connected: boolean;
    profile?: {
      id: string;
      name: string;
      username: string;
    };
  };
  paypal?: {
    connected: boolean;
  };
}

/**
 * Get integration context for AI workflow generation
 * Returns information about connected integrations and their resources
 */
export async function getIntegrationContextForAI(
  userId: string
): Promise<IntegrationContext> {
  const context: IntegrationContext = {};
  
  try {
    // Get all user integrations (OAuth-based)
    const integrations = await getUserIntegrations(userId);
    
    // Check Google integration
    const googleIntegration = integrations.find(i => i.service_name === 'google');
    if (googleIntegration && googleIntegration.access_token) {
      try {
        const [spreadsheets, calendars, folders, labels, forms] = await Promise.allSettled([
          getGoogleSpreadsheets(userId),
          getGoogleCalendars(userId),
          getGoogleDriveFolders(userId),
          getGmailLabels(userId),
          getGoogleForms(userId)
        ]);
        
        context.google = {
          connected: true,
          spreadsheets: spreadsheets.status === 'fulfilled' ? spreadsheets.value.map(s => ({ id: s.id, name: s.name })) : [],
          calendars: calendars.status === 'fulfilled' ? calendars.value.map(c => ({ id: c.id, name: c.name })) : [],
          folders: folders.status === 'fulfilled' ? folders.value.map(f => ({ id: f.id, name: f.name })) : [],
          labels: labels.status === 'fulfilled' ? labels.value.map(l => ({ id: l.id, name: l.name })) : [],
          forms: forms.status === 'fulfilled' ? forms.value.map(f => ({ id: f.id, name: f.name })) : []
        };
      } catch (error) {
        context.google = { connected: true, spreadsheets: [], calendars: [], folders: [], labels: [], forms: [] };
      }
    }
    
    // Check Slack integration
    const slackIntegration = integrations.find(i => i.service_name === 'slack');
    if (slackIntegration && slackIntegration.access_token) {
      try {
        const channels = await getSlackChannels(userId);
        context.slack = {
          connected: true,
          channels: channels.map(c => ({
            id: c.id,
            name: c.name
          }))
        };
      } catch (error) {
        context.slack = { connected: true, channels: [] };
      }
    }
    
    // Check GitHub integration (OAuth)
    const githubIntegration = integrations.find(i => i.service_name === 'github');
    if (githubIntegration && githubIntegration.access_token) {
      try {
        const repos = await getGitHubRepositories(userId);
        context.github = {
          connected: true,
          repositories: repos.map(r => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name
          }))
        };
      } catch (error) {
        context.github = { connected: true, repositories: [] };
      }
    }
    
    // Check Notion integration (API token)
    const notionToken = await getIntegrationCredential(userId, 'notion', 'api_token');
    if (notionToken) {
      try {
        const databases = await getNotionDatabases(userId);
        context.notion = {
          connected: true,
          databases: databases.map(d => ({
            id: d.id,
            title: d.title
          }))
        };
      } catch (error) {
        context.notion = { connected: true, databases: [] };
      }
    }
    
    // Check Airtable integration (API token)
    const airtableToken = await getIntegrationCredential(userId, 'airtable', 'api_token');
    if (airtableToken) {
      try {
        const bases = await getAirtableBases(userId);
        context.airtable = {
          connected: true,
          bases: bases.map(b => ({
            id: b.id,
            name: b.name
          }))
        };
      } catch (error) {
        context.airtable = { connected: true, bases: [] };
      }
    }
    
    // Check Trello integration (API key + token)
    const trelloApiKey = await getIntegrationCredential(userId, 'trello', 'api_key');
    const trelloToken = await getIntegrationCredential(userId, 'trello', 'token');
    if (trelloApiKey && trelloToken) {
      try {
        const boards = await getTrelloBoards(userId);
        context.trello = {
          connected: true,
          boards: boards.map(b => ({
            id: b.id,
            name: b.name
          }))
        };
      } catch (error) {
        context.trello = { connected: true, boards: [] };
      }
    }
    
    // Check SendGrid integration (API key)
    const sendGridApiKey = await getIntegrationCredential(userId, 'sendgrid', 'api_key');
    if (sendGridApiKey) {
      context.sendgrid = { connected: true };
    }
    
    // Check Twilio integration (Account SID + Auth Token)
    const twilioAccountSid = await getIntegrationCredential(userId, 'twilio', 'account_sid');
    const twilioAuthToken = await getIntegrationCredential(userId, 'twilio', 'auth_token');
    if (twilioAccountSid && twilioAuthToken) {
      context.twilio = { connected: true };
    }
    
    // Check Stripe integration (Secret Key)
    const stripeSecretKey = await getIntegrationCredential(userId, 'stripe', 'secret_key');
    if (stripeSecretKey) {
      context.stripe = { connected: true };
    }
    
    // Check Discord integration (OAuth or Bot Token)
    const discordIntegration = integrations.find(i => i.service_name === 'discord');
    const discordBotToken = await getIntegrationCredential(userId, 'discord', 'bot_token');
    if (discordIntegration?.access_token || discordBotToken) {
      try {
        const guilds = await getDiscordGuilds(userId);
        context.discord = {
          connected: true,
          guilds: guilds.map(g => ({
            id: g.id,
            name: g.name
          }))
        };
      } catch (error) {
        context.discord = { connected: true, guilds: [] };
      }
    }
    
    // Check Twitter/X integration (OAuth)
    const twitterIntegration = integrations.find(i => i.service_name === 'twitter');
    if (twitterIntegration?.access_token) {
      try {
        const profile = await getTwitterProfile(userId);
        context.twitter = {
          connected: true,
          profile: {
            id: profile.id,
            name: profile.name,
            username: profile.username
          }
        };
      } catch (error) {
        context.twitter = { connected: true };
      }
    }
    
    // Check PayPal integration (OAuth)
    const paypalIntegration = integrations.find(i => i.service_name === 'paypal');
    if (paypalIntegration?.access_token) {
      context.paypal = { connected: true };
    }
  } catch (error) {
    console.error('Error getting integration context for AI:', error);
    // Return empty context on error
  }
  
  return context;
}

/**
 * Format integration context as a string for AI prompts
 */
export function formatIntegrationContextForPrompt(
  context: IntegrationContext
): string {
  const parts: string[] = [];
  
  if (context.google?.connected) {
    parts.push('GOOGLE INTEGRATION:');
    parts.push('  - Connected: Yes');
    if (context.google.spreadsheets && context.google.spreadsheets.length > 0) {
      parts.push('  - Available Spreadsheets:');
      context.google.spreadsheets.slice(0, 5).forEach(spreadsheet => {
        parts.push(`    - "${spreadsheet.name}" (ID: ${spreadsheet.id})`);
      });
      if (context.google.spreadsheets.length > 5) parts.push(`    (and ${context.google.spreadsheets.length - 5} more)`);
    }
    if (context.google.calendars && context.google.calendars.length > 0) {
      parts.push('  - Available Calendars:');
      context.google.calendars.slice(0, 5).forEach(calendar => {
        parts.push(`    - "${calendar.name}" (ID: ${calendar.id})`);
      });
      if (context.google.calendars.length > 5) parts.push(`    (and ${context.google.calendars.length - 5} more)`);
    }
    if (context.google.folders && context.google.folders.length > 0) {
      parts.push('  - Available Drive Folders:');
      context.google.folders.slice(0, 5).forEach(folder => {
        parts.push(`    - "${folder.name}" (ID: ${folder.id})`);
      });
      if (context.google.folders.length > 5) parts.push(`    (and ${context.google.folders.length - 5} more)`);
    }
    if (context.google.labels && context.google.labels.length > 0) {
      parts.push('  - Available Gmail Labels:');
      context.google.labels.slice(0, 5).forEach(label => {
        parts.push(`    - "${label.name}" (ID: ${label.id})`);
      });
      if (context.google.labels.length > 5) parts.push(`    (and ${context.google.labels.length - 5} more)`);
    }
    if (context.google.forms && context.google.forms.length > 0) {
      parts.push('  - Available Forms:');
      context.google.forms.slice(0, 5).forEach(form => {
        parts.push(`    - "${form.name}" (ID: ${form.id})`);
      });
      if (context.google.forms.length > 5) parts.push(`    (and ${context.google.forms.length - 5} more)`);
    }
    parts.push('');
  }
  
  if (context.slack?.connected) {
    parts.push('SLACK INTEGRATION:');
    parts.push('  - Connected: Yes');
    if (context.slack.channels && context.slack.channels.length > 0) {
      parts.push('  - Available Channels:');
      context.slack.channels.forEach(channel => {
        parts.push(`    - #${channel.name} (ID: ${channel.id})`);
      });
    } else {
      parts.push('  - Available Channels: None (user can connect and select)');
    }
    parts.push('');
  }
  
  if (context.github?.connected) {
    parts.push('GITHUB INTEGRATION:');
    parts.push('  - Connected: Yes');
    if (context.github.repositories && context.github.repositories.length > 0) {
      parts.push('  - Available Repositories:');
      context.github.repositories.forEach(repo => {
        parts.push(`    - ${repo.full_name} (${repo.name})`);
      });
    } else {
      parts.push('  - Available Repositories: None (user can connect and select)');
    }
    parts.push('');
  }
  
  if (context.notion?.connected) {
    parts.push('NOTION INTEGRATION:');
    parts.push('  - Connected: Yes');
    if (context.notion.databases && context.notion.databases.length > 0) {
      parts.push('  - Available Databases:');
      context.notion.databases.forEach(db => {
        parts.push(`    - "${db.title}" (ID: ${db.id})`);
      });
    } else {
      parts.push('  - Available Databases: None (user can connect and select)');
    }
    parts.push('');
  }
  
  if (context.airtable?.connected) {
    parts.push('AIRTABLE INTEGRATION:');
    parts.push('  - Connected: Yes');
    if (context.airtable.bases && context.airtable.bases.length > 0) {
      parts.push('  - Available Bases:');
      context.airtable.bases.forEach(base => {
        parts.push(`    - "${base.name}" (ID: ${base.id})`);
      });
    } else {
      parts.push('  - Available Bases: None (user can connect and select)');
    }
    parts.push('');
  }
  
  if (context.trello?.connected) {
    parts.push('TRELLO INTEGRATION:');
    parts.push('  - Connected: Yes');
    if (context.trello.boards && context.trello.boards.length > 0) {
      parts.push('  - Available Boards:');
      context.trello.boards.forEach(board => {
        parts.push(`    - "${board.name}" (ID: ${board.id})`);
      });
    } else {
      parts.push('  - Available Boards: None (user can connect and select)');
    }
    parts.push('');
  }
  
  if (context.sendgrid?.connected) {
    parts.push('SENDGRID INTEGRATION:');
    parts.push('  - Connected: Yes');
    parts.push('');
  }
  
  if (context.twilio?.connected) {
    parts.push('TWILIO INTEGRATION:');
    parts.push('  - Connected: Yes');
    parts.push('');
  }
  
  if (context.stripe?.connected) {
    parts.push('STRIPE INTEGRATION:');
    parts.push('  - Connected: Yes');
    parts.push('');
  }
  
  if (context.discord?.connected) {
    parts.push('DISCORD INTEGRATION:');
    parts.push('  - Connected: Yes');
    if (context.discord.guilds && context.discord.guilds.length > 0) {
      parts.push('  - Available Servers:');
      context.discord.guilds.slice(0, 5).forEach(guild => {
        parts.push(`    - "${guild.name}" (ID: ${guild.id})`);
      });
      if (context.discord.guilds.length > 5) parts.push(`    (and ${context.discord.guilds.length - 5} more)`);
    }
    parts.push('');
  }
  
  if (context.twitter?.connected) {
    parts.push('TWITTER/X INTEGRATION:');
    parts.push('  - Connected: Yes');
    if (context.twitter.profile) {
      parts.push(`  - Account: @${context.twitter.profile.username} (${context.twitter.profile.name})`);
    }
    parts.push('');
  }
  
  if (context.paypal?.connected) {
    parts.push('PAYPAL INTEGRATION:');
    parts.push('  - Connected: Yes');
    parts.push('');
  }
  
  if (parts.length === 0) {
    return 'USER INTEGRATIONS: None connected (user can connect Google, Slack, GitHub, Notion, Airtable, Trello, SendGrid, Twilio, Stripe, Discord, Twitter, PayPal, etc. through settings)';
  }
  
  return parts.join('\n');
}

