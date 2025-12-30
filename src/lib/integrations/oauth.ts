/**
 * OAuth Utilities
 * Handles OAuth flow for various services
 */

import crypto from 'crypto';

/**
 * Generate CSRF state token for OAuth flow
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store state token in session (for verification)
 * In a real implementation, you'd use Redis or session storage
 * For now, we'll validate it in the callback
 */
export function validateStateToken(state: string, storedState: string): boolean {
  return state === storedState && state.length === 64;
}

/**
 * Map Google resource types to their required scopes
 */
export function getGoogleScopesForResourceType(resourceType?: string): string[] {
  const scopeMap: Record<string, string[]> = {
    spreadsheet: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    sheet: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    column: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    calendar: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    folder: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ],
    label: [
      'https://www.googleapis.com/auth/gmail.readonly'
    ],
    form: [
      'https://www.googleapis.com/auth/forms.responses.readonly'
    ]
  };

  return scopeMap[resourceType || ''] || getGoogleOAuthConfig().scopes; // Fallback to all scopes if unknown
}

/**
 * Google OAuth Configuration
 */
export function getGoogleOAuthConfig(scopes?: string[]) {
  const clientId = process.env.GOOGLE_INTEGRATION_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_INTEGRATION_CLIENT_SECRET?.trim();
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/google'
    : 'http://localhost:3000/api/auth/callback/google';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('GOOGLE_INTEGRATION_CLIENT_ID');
    if (!clientSecret) missing.push('GOOGLE_INTEGRATION_CLIENT_SECRET');
    
    // Debug: Log what we found (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Google OAuth Config Debug:', {
        hasClientId: !!process.env.GOOGLE_INTEGRATION_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_INTEGRATION_CLIENT_SECRET,
        clientIdLength: process.env.GOOGLE_INTEGRATION_CLIENT_ID?.length || 0,
        clientSecretLength: process.env.GOOGLE_INTEGRATION_CLIENT_SECRET?.length || 0,
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('GOOGLE'))
      });
    }
    
    throw new Error(`Google integration credentials not configured. Missing: ${missing.join(', ')}. Please ensure these are set in .env.local and restart your dev server (npm run dev)`);
  }

  // Use provided scopes or default to all scopes
  const defaultScopes = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/forms.responses.readonly',
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: scopes || defaultScopes
  };
}

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state: string, scopes?: string[]): string {
  const config = getGoogleOAuthConfig(scopes);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Slack OAuth Configuration
 */
export function getSlackOAuthConfig() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/slack'
    : 'http://localhost:3000/api/auth/callback/slack';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('SLACK_CLIENT_ID');
    if (!clientSecret) missing.push('SLACK_CLIENT_SECRET');
    throw new Error(`Slack integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: [
      'channels:read',
      'channels:history',
      'chat:write',
      'groups:read',
      'groups:history',
      'im:read',
      'im:history',
      'mpim:read',
      'mpim:history'
    ]
  };
}

/**
 * Generate Slack OAuth authorization URL
 */
export function getSlackAuthUrl(state: string): string {
  const config = getSlackOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: config.scopes.join(','),
    redirect_uri: config.redirectUri,
    state: state
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * GitHub OAuth Configuration
 */
export function getGitHubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/github'
    : 'http://localhost:3000/api/auth/callback/github';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('GITHUB_CLIENT_ID');
    if (!clientSecret) missing.push('GITHUB_CLIENT_SECRET');
    throw new Error(`GitHub integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: ['repo', 'read:org']
  };
}

/**
 * Generate GitHub OAuth authorization URL
 */
export function getGitHubAuthUrl(state: string): string {
  const config = getGitHubOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state: state
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Trello OAuth Configuration (if needed in future)
 * For now, using API key + token approach
 */
export function getTrelloOAuthConfig() {
  const apiKey = process.env.TRELLO_API_KEY;
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/trello'
    : 'http://localhost:3000/api/auth/callback/trello';

  if (!apiKey) {
    throw new Error('Trello API key not configured');
  }

  return {
    apiKey,
    redirectUri,
    scopes: ['read', 'write']
  };
}

/**
 * Discord OAuth Configuration
 */
export function getDiscordOAuthConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/discord'
    : 'http://localhost:3000/api/auth/callback/discord';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('DISCORD_CLIENT_ID');
    if (!clientSecret) missing.push('DISCORD_CLIENT_SECRET');
    throw new Error(`Discord integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: ['identify', 'guilds', 'guilds.members.read', 'bot', 'messages.read', 'messages.send']
  };
}

/**
 * Generate Discord OAuth authorization URL
 */
export function getDiscordAuthUrl(state: string): string {
  const config = getDiscordOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Twitter/X OAuth Configuration
 */
export function getTwitterOAuthConfig() {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/twitter'
    : 'http://localhost:3000/api/auth/callback/twitter';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('TWITTER_CLIENT_ID');
    if (!clientSecret) missing.push('TWITTER_CLIENT_SECRET');
    throw new Error(`Twitter/X integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
  };
}

/**
 * Generate Twitter OAuth authorization URL
 */
export function getTwitterAuthUrl(state: string): string {
  const config = getTwitterOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state,
    code_challenge: 'challenge', // PKCE will be implemented properly in callback
    code_challenge_method: 'plain'
  });

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

/**
 * PayPal OAuth Configuration
 */
export function getPayPalOAuthConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/paypal'
    : 'http://localhost:3000/api/auth/callback/paypal';
  
  // PayPal supports both sandbox and live environments
  const useSandbox = process.env.PAYPAL_SANDBOX === 'true';
  const baseUrl = useSandbox 
    ? 'https://www.sandbox.paypal.com'
    : 'https://www.paypal.com';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('PAYPAL_CLIENT_ID');
    if (!clientSecret) missing.push('PAYPAL_CLIENT_SECRET');
    throw new Error(`PayPal integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    baseUrl,
    scopes: ['openid', 'profile', 'email', 'https://uri.paypal.com/services/payments/realtimepayment']
  };
}

/**
 * Generate PayPal OAuth authorization URL
 */
export function getPayPalAuthUrl(state: string): string {
  const config = getPayPalOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state
  });

  return `${config.baseUrl}/connect?${params.toString()}`;
}

