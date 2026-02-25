/**
 * Integration Tokens for Execution
 * Provides integration tokens for workflow execution with automatic refresh
 */

import { getUserIntegration, getIntegrationCredential } from './service';
import { refreshGoogleToken } from './google';

export interface IntegrationTokenResult {
  access_token: string;
  refresh_token?: string;
  expires_at?: Date;
}

/**
 * Get integration token for execution, with automatic refresh if needed
 */
export async function getIntegrationTokenForExecution(
  userId: string,
  serviceName: string
): Promise<IntegrationTokenResult | null> {
  try {
    const integration = await getUserIntegration(userId, serviceName);
    
    if (!integration || !integration.access_token) {
      return null;
    }
    
    // Check if token is expired or will expire soon (within 5 minutes)
    const now = new Date();
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    // If token is expired or expiring soon, try to refresh
    if (expiresAt && expiresAt <= fiveMinutesFromNow && integration.refresh_token) {
      try {
        if (serviceName === 'google' || serviceName.startsWith('google-')) {
          const refreshed = await refreshGoogleToken(userId, integration.refresh_token);
          
          // refreshGoogleToken already updates the stored token
          // Return the new token
          return {
            access_token: refreshed.access_token,
            refresh_token: integration.refresh_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000)
          };
        }
        // Add other services' refresh logic here as needed (Slack, GitHub, etc.)
      } catch (refreshError) {
        console.error(`Failed to refresh ${serviceName} token:`, refreshError);
        // Return existing token even if expired - let API call fail with proper error
      }
    }
    
    return {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expires_at: integration.expires_at
    };
  } catch (error) {
    console.error(`Error getting ${serviceName} integration token:`, error);
    return null;
  }
}

/**
 * Get all integration tokens for a user (lazy-loaded as needed)
 */
export async function loadIntegrationTokensForExecution(
  userId: string
): Promise<Record<string, IntegrationTokenResult | null>> {
  // Pre-load common integrations (OAuth-based).
  // For Google, try 'google' first then fall back to service-specific names,
  // since users may have connected via google-gmail, google-sheets, etc.
  const googleBase = await getIntegrationTokenForExecution(userId, 'google')
    || await getIntegrationTokenForExecution(userId, 'google-gmail')
    || await getIntegrationTokenForExecution(userId, 'google-sheets');

  const [slack, github, discord, twitter, paypal] = await Promise.all([
    getIntegrationTokenForExecution(userId, 'slack'),
    getIntegrationTokenForExecution(userId, 'github').catch(() => null),
    getIntegrationTokenForExecution(userId, 'discord').catch(() => null),
    getIntegrationTokenForExecution(userId, 'twitter').catch(() => null),
    getIntegrationTokenForExecution(userId, 'paypal').catch(() => null)
  ]);
  
  // Load API key-based integrations from credentials
  const [openaiApiKey, sendgridApiKey, twilioAccountSid, twilioAuthToken, stripeSecretKey] = await Promise.all([
    getIntegrationCredential(userId, 'openai', 'api_key').catch(() => null),
    getIntegrationCredential(userId, 'sendgrid', 'api_key').catch(() => null),
    getIntegrationCredential(userId, 'twilio', 'account_sid').catch(() => null),
    getIntegrationCredential(userId, 'twilio', 'auth_token').catch(() => null),
    getIntegrationCredential(userId, 'stripe', 'secret_key').catch(() => null)
  ]);
  
  // Also check for Discord bot token
  const discordBotToken = await getIntegrationCredential(userId, 'discord', 'bot_token').catch(() => null);
  
  return {
    google: googleBase || null,
    slack: slack || null,
    github: github || null,
    discord: discord || (discordBotToken ? { access_token: discordBotToken } : null),
    twitter: twitter || null,
    paypal: paypal || null,
    openai: openaiApiKey ? { access_token: openaiApiKey } : null,
    sendgrid: sendgridApiKey ? { access_token: sendgridApiKey } : null,
    twilio: (twilioAccountSid && twilioAuthToken) ? { 
      access_token: twilioAccountSid, 
      refresh_token: twilioAuthToken // Using refresh_token field to store auth token
    } : null,
    stripe: stripeSecretKey ? { access_token: stripeSecretKey } : null
  };
}

