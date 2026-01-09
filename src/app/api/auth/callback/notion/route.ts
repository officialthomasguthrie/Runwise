/**
 * Notion OAuth Callback Route
 * Handles OAuth callback and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { storeUserIntegration } from '@/lib/integrations/service';
import { validateStateToken } from '@/lib/integrations/oauth';

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
      console.error('[Notion OAuth Callback] OAuth error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('oauth_error'), request.url)
      );
    }
    
    if (!code || !state) {
      console.error('[Notion OAuth Callback] Missing code or state:', { code: !!code, state: !!state });
      return NextResponse.redirect(
        new URL(getErrorUrl('missing_code'), request.url)
      );
    }
    
    // Validate state token (CSRF protection)
    const storedState = request.cookies.get('oauth_state')?.value;
    const userId = request.cookies.get('oauth_user_id')?.value;
    
    console.log('[Notion OAuth Callback] Validating state:', { 
      hasStoredState: !!storedState, 
      hasState: !!state,
      hasUserId: !!userId 
    });
    
    if (!storedState || !validateStateToken(state, storedState)) {
      console.error('[Notion OAuth Callback] Invalid state token');
      return NextResponse.redirect(
        new URL(getErrorUrl('invalid_state'), request.url)
      );
    }
    
    if (!userId) {
      console.error('[Notion OAuth Callback] No user ID in cookie');
      return NextResponse.redirect(
        new URL(getErrorUrl('no_user'), request.url)
      );
    }
    
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('[Notion OAuth Callback] Auth error or user mismatch:', { 
        authError: authError?.message, 
        hasUser: !!user,
        userIdMatch: user?.id === userId 
      });
      return NextResponse.redirect(
        new URL(getErrorUrl('unauthorized'), request.url)
      );
    }
    
    // Exchange code for tokens
    const clientId = process.env.NOTION_CLIENT_ID?.trim();
    const clientSecret = process.env.NOTION_CLIENT_SECRET?.trim();
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://runwiseai.app/api/auth/callback/notion'
      : 'http://localhost:3000/api/auth/callback/notion';
    
    if (!clientId || !clientSecret) {
      throw new Error('Notion credentials not configured');
    }
    
    // Notion uses Basic Auth for token exchange
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[Notion OAuth Callback] Token exchange error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('token_exchange_failed'), request.url)
      );
    }
    
    const tokens = await tokenResponse.json();
    console.log('[Notion OAuth Callback] Token exchange successful');
    
    // Notion tokens don't typically expire, but check if expires_in is provided
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;
    
    // Store integration
    console.log('[Notion OAuth Callback] Storing integration for user:', user.id);
    try {
      await storeUserIntegration(
        user.id,
        'notion',
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token, // Notion may not provide refresh tokens
          expires_at: expiresAt
        },
        {
          workspace_id: tokens.workspace_id,
          workspace_name: tokens.workspace_name,
          bot_id: tokens.bot_id,
          owner: tokens.owner
        }
      );
      console.log('[Notion OAuth Callback] Integration stored successfully');
    } catch (storeError: any) {
      console.error('[Notion OAuth Callback] Error storing integration:', storeError);
      return NextResponse.redirect(
        new URL(getErrorUrl('callback_error'), request.url)
      );
    }
    
    // Build success redirect URL
    const isWorkspace = returnUrl.startsWith('/workspace/');
    const successParam = isWorkspace ? 'connected' : 'notion_connected';
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
    console.error('[Notion OAuth Callback] Unexpected error:', error);
    const returnUrl = request.cookies.get('oauth_return_url')?.value || '/settings?tab=integrations';
    const separator = returnUrl.includes('?') ? '&' : '?';
    const errorUrl = `${returnUrl}${separator}error=callback_error`;
    return NextResponse.redirect(
      new URL(errorUrl, request.url)
    );
  }
}

