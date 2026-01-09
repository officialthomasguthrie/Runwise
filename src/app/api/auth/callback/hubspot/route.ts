/**
 * HubSpot OAuth Callback Route
 * Handles OAuth callback and stores tokens
 * Note: HubSpot tokens expire and need to be refreshed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { storeUserIntegration } from '@/lib/integrations/service';
import { validateStateToken, getHubSpotOAuthConfig } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Get return URL from cookie or default to settings
    const returnUrl = request.cookies.get('oauth_return_url')?.value || '/settings?tab=integrations';
    const getErrorUrl = (errorType: string) => {
      const separator = returnUrl.includes('?') ? '&' : '?';
      return `${returnUrl}${separator}error=${errorType}`;
    };
    
    // Check for OAuth errors
    if (error) {
      console.error('[HubSpot OAuth Callback] OAuth error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('oauth_error'), request.url)
      );
    }
    
    if (!code || !state) {
      console.error('[HubSpot OAuth Callback] Missing code or state:', { 
        code: !!code, 
        state: !!state
      });
      return NextResponse.redirect(
        new URL(getErrorUrl('missing_code'), request.url)
      );
    }
    
    // Validate state token (CSRF protection)
    const storedState = request.cookies.get('oauth_state')?.value;
    const userId = request.cookies.get('oauth_user_id')?.value;
    
    console.log('[HubSpot OAuth Callback] Validating state:', { 
      hasStoredState: !!storedState, 
      hasState: !!state,
      hasUserId: !!userId
    });
    
    if (!storedState || !validateStateToken(state, storedState)) {
      console.error('[HubSpot OAuth Callback] Invalid state token');
      return NextResponse.redirect(
        new URL(getErrorUrl('invalid_state'), request.url)
      );
    }
    
    if (!userId) {
      console.error('[HubSpot OAuth Callback] No user ID in cookie');
      return NextResponse.redirect(
        new URL(getErrorUrl('no_user'), request.url)
      );
    }
    
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('[HubSpot OAuth Callback] Auth error or user mismatch:', { 
        authError: authError?.message, 
        hasUser: !!user,
        userIdMatch: user?.id === userId 
      });
      return NextResponse.redirect(
        new URL(getErrorUrl('unauthorized'), request.url)
      );
    }
    
    const config = getHubSpotOAuthConfig();
    
    // Exchange code for tokens
    // HubSpot uses POST to /oauth/v1/token
    const tokenUrl = 'https://api.hubapi.com/oauth/v1/token';
    
    console.log('[HubSpot OAuth Callback] Exchanging code for tokens:', { 
      hasCode: !!code, 
      codeLength: code.length,
      tokenUrl: tokenUrl
    });
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code: code
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[HubSpot OAuth Callback] Token exchange error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('token_exchange_failed'), request.url)
      );
    }
    
    const tokens = await tokenResponse.json();
    console.log('[HubSpot OAuth Callback] Token exchange successful');
    
    // HubSpot tokens expire (expires_in is in seconds)
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;
    
    // Store integration
    console.log('[HubSpot OAuth Callback] Storing integration for user:', user.id);
    try {
      await storeUserIntegration(
        user.id,
        'hubspot',
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt
        },
        {
          scope: tokens.scope,
          token_type: tokens.token_type || 'Bearer'
        }
      );
      console.log('[HubSpot OAuth Callback] Integration stored successfully');
    } catch (storeError: any) {
      console.error('[HubSpot OAuth Callback] Error storing integration:', storeError);
      return NextResponse.redirect(
        new URL(getErrorUrl('callback_error'), request.url)
      );
    }
    
    // Build success redirect URL
    // For workspace redirects, use generic 'connected' parameter
    // For integrations page, use specific service name
    const isWorkspace = returnUrl.startsWith('/workspace/');
    const successParam = isWorkspace ? 'connected' : 'hubspot_connected';
    const redirectUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}success=${successParam}`;
    
    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL(redirectUrl, request.url)
    );
    
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_user_id');
    response.cookies.delete('oauth_return_url');
    
    return response;
  } catch (error: any) {
    console.error('[HubSpot OAuth Callback] Unexpected error:', error);
    const returnUrl = request.cookies.get('oauth_return_url')?.value || '/settings?tab=integrations';
    const separator = returnUrl.includes('?') ? '&' : '?';
    const errorUrl = `${returnUrl}${separator}error=callback_error`;
    return NextResponse.redirect(
      new URL(errorUrl, request.url)
    );
  }
}

