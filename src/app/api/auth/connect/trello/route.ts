/**
 * Trello OAuth Connect Route
 * Initiates OAuth 1.0a flow for Trello integration
 * Step 1: Get request token from Trello
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getTrelloOAuthConfig, generateStateToken } from '@/lib/integrations/oauth';
import crypto from 'crypto';

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

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[API /auth/connect/trello] Initiating Trello OAuth 1.0a flow');
    
    const config = getTrelloOAuthConfig();
    
    // Generate state token for CSRF protection
    const state = generateStateToken();
    
    // Get return URL from query parameter, referer, or default
    const { searchParams } = new URL(request.url);
    const returnUrlParam = searchParams.get('returnUrl');
    let returnUrl = returnUrlParam;
    if (!returnUrl) {
      const referer = request.headers.get('referer') || '';
      returnUrl = referer.includes('/integrations') 
        ? '/integrations' 
        : referer.includes('/workspace/')
        ? referer.split('?')[0]
        : '/settings?tab=integrations';
    }
    
    // Step 1: Get request token from Trello
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: config.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
      oauth_callback: config.redirectUri
    };
    
    // Generate signature
    const signature = generateOAuth1Signature(
      'POST',
      config.requestTokenUrl,
      oauthParams,
      config.oauthSecret
    );
    
    oauthParams.oauth_signature = signature;
    
    // Build request body
    const requestBody = Object.keys(oauthParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
      .join('&');
    
    // Request token from Trello
    const tokenResponse = await fetch(config.requestTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestBody
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[API /auth/connect/trello] Request token error:', error);
      throw new Error(`Failed to get request token: ${error}`);
    }
    
    const tokenData = await tokenResponse.text();
    const tokenParams = new URLSearchParams(tokenData);
    const oauthToken = tokenParams.get('oauth_token');
    const oauthTokenSecret = tokenParams.get('oauth_token_secret');
    
    if (!oauthToken || !oauthTokenSecret) {
      throw new Error('Invalid response from Trello: missing oauth_token or oauth_token_secret');
    }
    
    console.log('[API /auth/connect/trello] Request token received');
    
    // Build authorization URL
    const authUrl = new URL(config.authorizeUrl);
    authUrl.searchParams.set('oauth_token', oauthToken);
    authUrl.searchParams.set('name', 'Runwise');
    authUrl.searchParams.set('scope', 'read,write');
    authUrl.searchParams.set('expiration', 'never');
    
    // Store state and token secret in cookies
    const response = NextResponse.redirect(authUrl.toString());
    
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });
    
    response.cookies.set('oauth_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    response.cookies.set('oauth_token_secret', oauthTokenSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    response.cookies.set('oauth_return_url', returnUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    return response;
  } catch (error: any) {
    console.error('Error initiating Trello OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

