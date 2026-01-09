/**
 * Google OAuth Callback Route
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
      console.error('[Google OAuth Callback] OAuth error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('oauth_error'), request.url)
      );
    }
    
    if (!code || !state) {
      console.error('[Google OAuth Callback] Missing code or state:', { code: !!code, state: !!state });
      return NextResponse.redirect(
        new URL(getErrorUrl('missing_code'), request.url)
      );
    }
    
    // Validate state token (CSRF protection)
    const storedState = request.cookies.get('oauth_state')?.value;
    const userId = request.cookies.get('oauth_user_id')?.value;
    const serviceName = request.cookies.get('oauth_service_name')?.value || 'google'; // Default to 'google' for backward compatibility
    
    console.log('[Google OAuth Callback] Validating state:', { 
      hasStoredState: !!storedState, 
      hasState: !!state,
      hasUserId: !!userId,
      serviceName: serviceName
    });
    
    if (!storedState || !validateStateToken(state, storedState)) {
      console.error('[Google OAuth Callback] Invalid state token');
      return NextResponse.redirect(
        new URL(getErrorUrl('invalid_state'), request.url)
      );
    }
    
    if (!userId) {
      console.error('[Google OAuth Callback] No user ID in cookie');
      return NextResponse.redirect(
        new URL(getErrorUrl('no_user'), request.url)
      );
    }
    
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('[Google OAuth Callback] Auth error or user mismatch:', { 
        authError: authError?.message, 
        hasUser: !!user,
        userIdMatch: user?.id === userId 
      });
      return NextResponse.redirect(
        new URL(getErrorUrl('unauthorized'), request.url)
      );
    }
    
    // Exchange code for tokens
    const clientId = process.env.GOOGLE_INTEGRATION_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_INTEGRATION_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://runwiseai.app/api/auth/callback/google'
      : 'http://localhost:3000/api/auth/callback/google';
    
    if (!clientId || !clientSecret) {
      throw new Error('Google credentials not configured');
    }
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[Google OAuth Callback] Token exchange error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('token_exchange_failed'), request.url)
      );
    }
    
    const tokens = await tokenResponse.json();
    console.log('[Google OAuth Callback] Token exchange successful');
    
    // Calculate expiration
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;
    
    // Store integration with the specific service name
    console.log('[Google OAuth Callback] Storing integration for user:', user.id, 'service:', serviceName);
    try {
    await storeUserIntegration(
      user.id,
        serviceName, // Use the specific service name (e.g., 'google-sheets', 'google-gmail')
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt
      },
      {
        scope: tokens.scope,
        token_type: tokens.token_type
      }
    );
      console.log('[Google OAuth Callback] Integration stored successfully as:', serviceName);
    } catch (storeError: any) {
      console.error('[Google OAuth Callback] Error storing integration:', storeError);
      return NextResponse.redirect(
        new URL(getErrorUrl('callback_error'), request.url)
      );
    }
    
    // Build success redirect URL
    // For workspace redirects, use generic 'connected' parameter
    // For integrations page, use specific service name
    const isWorkspace = returnUrl.startsWith('/workspace/');
    const successParam = isWorkspace ? 'connected' : (serviceName.replace('google-', '') + '_connected');
    const redirectUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}success=${successParam}`;
    
    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL(redirectUrl, request.url)
    );
    
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_user_id');
    response.cookies.delete('oauth_service_name');
    response.cookies.delete('oauth_return_url');
    
    return response;
  } catch (error: any) {
    console.error('[Google OAuth Callback] Unexpected error:', error);
    const returnUrl = request.cookies.get('oauth_return_url')?.value || '/settings?tab=integrations';
    const separator = returnUrl.includes('?') ? '&' : '?';
    const errorUrl = `${returnUrl}${separator}error=callback_error`;
    return NextResponse.redirect(
      new URL(errorUrl, request.url)
    );
  }
}
