/**
 * Jira OAuth Callback Route (3LO)
 * Handles OAuth callback and stores tokens
 * Note: Jira tokens expire and need to be refreshed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { storeUserIntegration } from '@/lib/integrations/service';
import { validateStateToken, getJiraOAuthConfig } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Get return URL from cookie or default to settings
    const returnUrl = request.cookies.get('oauth_return_url')?.value || '/settings?tab=integrations';
    const audience = request.cookies.get('oauth_audience')?.value || 'api.atlassian.com';
    const getErrorUrl = (errorType: string) => {
      const separator = returnUrl.includes('?') ? '&' : '?';
      return `${returnUrl}${separator}error=${errorType}`;
    };
    
    // Check for OAuth errors
    if (error) {
      console.error('[Jira OAuth Callback] OAuth error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('oauth_error'), request.url)
      );
    }
    
    if (!code || !state) {
      console.error('[Jira OAuth Callback] Missing code or state:', { 
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
    
    console.log('[Jira OAuth Callback] Validating state:', { 
      hasStoredState: !!storedState, 
      hasState: !!state,
      hasUserId: !!userId
    });
    
    if (!storedState || !validateStateToken(state, storedState)) {
      console.error('[Jira OAuth Callback] Invalid state token');
      return NextResponse.redirect(
        new URL(getErrorUrl('invalid_state'), request.url)
      );
    }
    
    if (!userId) {
      console.error('[Jira OAuth Callback] No user ID in cookie');
      return NextResponse.redirect(
        new URL(getErrorUrl('no_user'), request.url)
      );
    }
    
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('[Jira OAuth Callback] Auth error or user mismatch:', { 
        authError: authError?.message, 
        hasUser: !!user,
        userIdMatch: user?.id === userId 
      });
      return NextResponse.redirect(
        new URL(getErrorUrl('unauthorized'), request.url)
      );
    }
    
    const config = getJiraOAuthConfig();
    
    // Exchange code for tokens
    // Jira uses Atlassian's token endpoint
    const tokenUrl = 'https://auth.atlassian.com/oauth/token';
    
    console.log('[Jira OAuth Callback] Exchanging code for tokens:', { 
      hasCode: !!code, 
      codeLength: code.length,
      tokenUrl: tokenUrl,
      audience: audience
    });
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.redirectUri
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[Jira OAuth Callback] Token exchange error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('token_exchange_failed'), request.url)
      );
    }
    
    const tokens = await tokenResponse.json();
    console.log('[Jira OAuth Callback] Token exchange successful');
    
    // Jira tokens expire (expires_in is in seconds)
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;
    
    // Store integration
    console.log('[Jira OAuth Callback] Storing integration for user:', user.id);
    try {
      await storeUserIntegration(
        user.id,
        'jira',
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt
        },
        {
          scope: tokens.scope,
          token_type: tokens.token_type || 'Bearer',
          audience: audience
        }
      );
      console.log('[Jira OAuth Callback] Integration stored successfully');
    } catch (storeError: any) {
      console.error('[Jira OAuth Callback] Error storing integration:', storeError);
      return NextResponse.redirect(
        new URL(getErrorUrl('callback_error'), request.url)
      );
    }
    
    // Build success redirect URL
    // For workspace redirects, use generic 'connected' parameter
    // For integrations page, use specific service name
    const isWorkspace = returnUrl.startsWith('/workspace/');
    const successParam = isWorkspace ? 'connected' : 'jira_connected';
    const redirectUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}success=${successParam}`;
    
    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL(redirectUrl, request.url)
    );
    
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_user_id');
    response.cookies.delete('oauth_return_url');
    response.cookies.delete('oauth_audience');
    
    return response;
  } catch (error: any) {
    console.error('[Jira OAuth Callback] Unexpected error:', error);
    const returnUrl = request.cookies.get('oauth_return_url')?.value || '/settings?tab=integrations';
    const separator = returnUrl.includes('?') ? '&' : '?';
    const errorUrl = `${returnUrl}${separator}error=callback_error`;
    return NextResponse.redirect(
      new URL(errorUrl, request.url)
    );
  }
}

