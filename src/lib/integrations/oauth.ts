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
 * Google OAuth Configuration - Service-specific
 */
export function getGoogleOAuthConfig(serviceName?: string) {
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

  // Service-specific scopes
  const scopeMap: Record<string, string[]> = {
    'google-sheets': [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly', // Required to list spreadsheets
      'https://www.googleapis.com/auth/drive.file', // Required to access spreadsheets
      'https://www.googleapis.com/auth/forms.responses.readonly'
    ],
    // Google Forms uses the same scopes as Sheets + Forms responses
    'google-forms': [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/forms.responses.readonly'
    ],
    'google-gmail': [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send'
    ],
    'google-calendar': [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    'google-drive': [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ]
  };

  // Default to all scopes if service not specified (for backward compatibility)
  const scopes = serviceName && scopeMap[serviceName] 
    ? scopeMap[serviceName]
    : [
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
    scopes
  };
}

/**
 * Generate Google OAuth authorization URL - Service-specific
 */
export function getGoogleAuthUrl(state: string, serviceName?: string): string {
  const config = getGoogleOAuthConfig(serviceName);
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
    // Bot scopes — used for sending messages
    scopes: [
      'channels:read',
      'channels:history',
      'chat:write',
      'groups:read',
      'groups:history',
      'im:read',
      'im:history',
      'mpim:read',
      'mpim:history',
    ],
    // User scopes — gives us a user token that can read any channel the user is in
    userScopes: [
      'channels:history',
      'channels:read',
      'groups:history',
      'groups:read',
      'im:history',
      'im:read',
      'mpim:history',
      'mpim:read',
    ],
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
    user_scope: config.userScopes.join(','),
    redirect_uri: config.redirectUri,
    state: state,
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
 * Trello OAuth 1.0a Configuration
 */
export function getTrelloOAuthConfig() {
  const apiKey = process.env.TRELLO_API_KEY?.trim();
  const oauthSecret = process.env.TRELLO_CLIENT_SECRET?.trim();
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/trello'
    : 'http://localhost:3000/api/auth/callback/trello';

  if (!apiKey || !oauthSecret) {
    const missing = [];
    if (!apiKey) missing.push('TRELLO_API_KEY');
    if (!oauthSecret) missing.push('TRELLO_CLIENT_SECRET');
    throw new Error(`Trello integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    apiKey,
    oauthSecret,
    redirectUri,
    requestTokenUrl: 'https://trello.com/1/OAuthGetRequestToken',
    accessTokenUrl: 'https://trello.com/1/OAuthGetAccessToken',
    authorizeUrl: 'https://trello.com/1/OAuthAuthorizeToken'
  };
}

/**
 * Generate OAuth 1.0a signature
 */
function generateOAuth1Signature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
): string {
  const crypto = require('crypto');
  
  // Sort parameters and create parameter string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');
  
  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // Generate HMAC-SHA1 signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');
  
  return signature;
}

/**
 * Generate OAuth 1.0a authorization header
 */
function generateOAuth1Header(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  token?: string,
  tokenSecret?: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...params
  };
  
  if (token) {
    oauthParams.oauth_token = token;
  }
  
  // Generate signature
  const signature = generateOAuth1Signature(
    method,
    url,
    oauthParams,
    consumerSecret,
    tokenSecret || ''
  );
  
  oauthParams.oauth_signature = signature;
  
  // Build Authorization header
  const authParams = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
  
  return `OAuth ${authParams}`;
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
    scopes: ['identify', 'guilds']
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

/**
 * Shopify OAuth Configuration
 * Note: Shopify requires a shop parameter (shop domain) for OAuth
 */
export function getShopifyOAuthConfig(shop?: string) {
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/shopify'
    : 'http://localhost:3000/api/auth/callback/shopify';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('SHOPIFY_CLIENT_ID');
    if (!clientSecret) missing.push('SHOPIFY_CLIENT_SECRET');
    throw new Error(`Shopify integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    shop: shop || '', // Shop domain (e.g., 'mystore' for mystore.myshopify.com)
    scopes: [
      'read_products',
      'write_products',
      'read_orders',
      'read_customers',
      'read_inventory'
    ]
  };
}

/**
 * Generate Shopify OAuth authorization URL
 * Requires shop parameter (shop domain without .myshopify.com)
 */
export function getShopifyAuthUrl(state: string, shop: string): string {
  if (!shop) {
    throw new Error('Shop parameter is required for Shopify OAuth');
  }
  
  // Ensure shop doesn't include .myshopify.com
  const shopDomain = shop.replace('.myshopify.com', '').trim();
  
  const config = getShopifyOAuthConfig(shopDomain);
  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: config.scopes.join(','),
    redirect_uri: config.redirectUri,
    state: state
  });

  return `https://${shopDomain}.myshopify.com/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Airtable OAuth Configuration
 */
export function getAirtableOAuthConfig() {
  const clientId = process.env.AIRTABLE_CLIENT_ID?.trim();
  const clientSecret = process.env.AIRTABLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/airtable'
    : 'http://localhost:3000/api/auth/callback/airtable';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('AIRTABLE_CLIENT_ID');
    if (!clientSecret) missing.push('AIRTABLE_CLIENT_SECRET');
    throw new Error(`Airtable integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: [
      'data.records:read',
      'data.records:write',
      'schema.bases:read'
    ]
  };
}

/**
 * HubSpot OAuth Configuration
 */
export function getHubSpotOAuthConfig() {
  const clientId = process.env.HUBSPOT_CLIENT_ID?.trim();
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET?.trim();
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/hubspot'
    : 'http://localhost:3000/api/auth/callback/hubspot';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('HUBSPOT_CLIENT_ID');
    if (!clientSecret) missing.push('HUBSPOT_CLIENT_SECRET');
    throw new Error(`HubSpot integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    baseUrl: 'https://app.hubspot.com',
    scopes: [
      'contacts',
      'content',
      'files',
      'forms',
      'tickets'
    ]
  };
}

/**
 * Generate HubSpot OAuth authorization URL
 */
export function getHubSpotAuthUrl(state: string): string {
  const config = getHubSpotOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state: state
  });

  return `${config.baseUrl}/oauth/authorize?${params.toString()}`;
}

/**
 * Generate Airtable OAuth authorization URL
 */
export function getAirtableAuthUrl(state: string): string {
  const config = getAirtableOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state
  });

  return `https://airtable.com/oauth2/v1/authorize?${params.toString()}`;
}

/**
 * Asana OAuth Configuration
 */
export function getAsanaOAuthConfig() {
  const clientId = process.env.ASANA_CLIENT_ID?.trim();
  const clientSecret = process.env.ASANA_CLIENT_SECRET?.trim();
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/asana'
    : 'http://localhost:3000/api/auth/callback/asana';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('ASANA_CLIENT_ID');
    if (!clientSecret) missing.push('ASANA_CLIENT_SECRET');
    throw new Error(`Asana integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    baseUrl: 'https://app.asana.com',
    scopes: [
      'default',
      'default:write'
    ]
  };
}

/**
 * Generate Asana OAuth authorization URL
 */
export function getAsanaAuthUrl(state: string): string {
  const config = getAsanaOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state
  });

  return `${config.baseUrl}/-/oauth_authorize?${params.toString()}`;
}

/**
 * Jira OAuth Configuration (3LO - 3-Legged OAuth)
 * Uses Atlassian's OAuth 2.0 authorization server
 */
export function getJiraOAuthConfig() {
  const clientId = process.env.JIRA_CLIENT_ID?.trim();
  const clientSecret = process.env.JIRA_CLIENT_SECRET?.trim();
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/jira'
    : 'http://localhost:3000/api/auth/callback/jira';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('JIRA_CLIENT_ID');
    if (!clientSecret) missing.push('JIRA_CLIENT_SECRET');
    throw new Error(`Jira integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    baseUrl: 'https://auth.atlassian.com',
    scopes: [
      'read:jira-work',
      'write:jira-work',
      'read:jira-user'
    ]
  };
}

/**
 * Generate Jira OAuth authorization URL (3LO)
 */
export function getJiraAuthUrl(state: string, audience?: string): string {
  const config = getJiraOAuthConfig();
  const params = new URLSearchParams({
    audience: audience || 'api.atlassian.com',
    client_id: config.clientId,
    scope: config.scopes.join(' '),
    redirect_uri: config.redirectUri,
    state: state,
    response_type: 'code',
    prompt: 'consent'
  });

  return `${config.baseUrl}/authorize?${params.toString()}`;
}

/**
 * Notion OAuth Configuration
 */
export function getNotionOAuthConfig() {
  const clientId = process.env.NOTION_CLIENT_ID?.trim();
  const clientSecret = process.env.NOTION_CLIENT_SECRET?.trim();
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://runwiseai.app/api/auth/callback/notion'
    : 'http://localhost:3000/api/auth/callback/notion';

  if (!clientId || !clientSecret) {
    const missing = [];
    if (!clientId) missing.push('NOTION_CLIENT_ID');
    if (!clientSecret) missing.push('NOTION_CLIENT_SECRET');
    throw new Error(`Notion integration credentials not configured. Missing: ${missing.join(', ')}. Please set these environment variables in .env.local`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri
  };
}

/**
 * Generate Notion OAuth authorization URL
 */
export function getNotionAuthUrl(state: string): string {
  const config = getNotionOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    owner: 'user', // 'user' for user-level access, 'workspace' for workspace-level
    state: state
  });

  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

