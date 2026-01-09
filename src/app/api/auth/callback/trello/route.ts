/**
 * Trello OAuth Callback Route
 * Handles OAuth 1.0a callback and exchanges request token for access token
 * Step 2: Exchange request token for access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { storeUserIntegration } from '@/lib/integrations/service';
import { getTrelloOAuthConfig } from '@/lib/integrations/oauth';
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
    const { searchParams } = new URL(request.url);
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    const denied = searchParams.get('denied');
    
    // Get return URL from cookie or default to settings
    const returnUrl = request.cookies.get('oauth_return_url')?.value || '/settings?tab=integrations';
    const getErrorUrl = (errorType: string) => {
      const separator = returnUrl.includes('?') ? '&' : '?';
      return `${returnUrl}${separator}error=${errorType}`;
    };
    
    // Check if user denied authorization
    if (denied) {
      console.error('[Trello OAuth Callback] User denied authorization');
      return NextResponse.redirect(
        new URL(getErrorUrl('oauth_denied'), request.url)
      );
    }
    
    if (!oauthToken || !oauthVerifier) {
      console.error('[Trello OAuth Callback] Missing oauth_token or oauth_verifier:', { 
        oauthToken: !!oauthToken, 
        oauthVerifier: !!oauthVerifier 
      });
      return NextResponse.redirect(
        new URL(getErrorUrl('missing_token'), request.url)
      );
    }
    
    // Validate cookies (CSRF protection for OAuth 1.0a)
    // Note: OAuth 1.0a doesn't use state parameter like OAuth 2.0
    // We validate by checking required cookies exist
    const storedState = request.cookies.get('oauth_state')?.value;
    const userId = request.cookies.get('oauth_user_id')?.value;
    const oauthTokenSecret = request.cookies.get('oauth_token_secret')?.value;
    
    console.log('[Trello OAuth Callback] Validating cookies:', { 
      hasStoredState: !!storedState, 
      hasUserId: !!userId,
      hasTokenSecret: !!oauthTokenSecret
    });
    
    if (!storedState || !userId || !oauthTokenSecret) {
      console.error('[Trello OAuth Callback] Missing required cookies');
      return NextResponse.redirect(
        new URL(getErrorUrl('invalid_state'), request.url)
      );
    }
    
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('[Trello OAuth Callback] Auth error or user mismatch:', { 
        authError: authError?.message, 
        hasUser: !!user,
        userIdMatch: user?.id === userId 
      });
      return NextResponse.redirect(
        new URL(getErrorUrl('unauthorized'), request.url)
      );
    }
    
    const config = getTrelloOAuthConfig();
    
    // Step 2: Exchange request token for access token
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: config.apiKey,
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0'
    };
    
    // Generate signature using token secret
    const signature = generateOAuth1Signature(
      'POST',
      config.accessTokenUrl,
      oauthParams,
      config.oauthSecret,
      oauthTokenSecret
    );
    
    oauthParams.oauth_signature = signature;
    
    // Build request body
    const requestBody = Object.keys(oauthParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
      .join('&');
    
    // Exchange for access token
    const tokenResponse = await fetch(config.accessTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestBody
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[Trello OAuth Callback] Access token exchange error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('token_exchange_failed'), request.url)
      );
    }
    
    const tokenData = await tokenResponse.text();
    const tokenParams = new URLSearchParams(tokenData);
    const accessToken = tokenParams.get('oauth_token');
    const accessTokenSecret = tokenParams.get('oauth_token_secret');
    
    if (!accessToken || !accessTokenSecret) {
      console.error('[Trello OAuth Callback] Invalid token response:', tokenData);
      return NextResponse.redirect(
        new URL(getErrorUrl('invalid_token_response'), request.url)
      );
    }
    
    console.log('[Trello OAuth Callback] Access token exchange successful');
    
    // Store integration
    // For Trello OAuth 1.0a, we store both the API key and access token
    // The access token acts as the "token" in the old API key + token system
    console.log('[Trello OAuth Callback] Storing integration for user:', user.id);
    try {
      await storeUserIntegration(
        user.id,
        'trello',
        {
          access_token: accessToken, // This is the OAuth access token
          refresh_token: accessTokenSecret, // Store token secret as refresh_token for OAuth 1.0a
          expires_at: undefined // Trello tokens don't expire
        },
        {
          api_key: config.apiKey, // Store API key in metadata
          token_type: 'oauth1'
        }
      );
      console.log('[Trello OAuth Callback] Integration stored successfully');
    } catch (storeError: any) {
      console.error('[Trello OAuth Callback] Error storing integration:', storeError);
      return NextResponse.redirect(
        new URL(getErrorUrl('callback_error'), request.url)
      );
    }
    
    // Build success redirect URL
    const isWorkspace = returnUrl.startsWith('/workspace/');
    const successParam = isWorkspace ? 'connected' : 'trello_connected';
    const redirectUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}success=${successParam}`;
    
    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL(redirectUrl, request.url)
    );
    
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_user_id');
    response.cookies.delete('oauth_token_secret');
    response.cookies.delete('oauth_return_url');
    
    return response;
  } catch (error: any) {
    console.error('[Trello OAuth Callback] Unexpected error:', error);
    const returnUrl = request.cookies.get('oauth_return_url')?.value || '/settings?tab=integrations';
    const separator = returnUrl.includes('?') ? '&' : '?';
    const errorUrl = `${returnUrl}${separator}error=callback_error`;
    return NextResponse.redirect(
      new URL(errorUrl, request.url)
    );
  }
}

