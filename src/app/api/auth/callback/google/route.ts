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
    
    // Check for OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=oauth_error', request.url)
      );
    }
    
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=missing_code', request.url)
      );
    }
    
    // Validate state token (CSRF protection)
    const storedState = request.cookies.get('oauth_state')?.value;
    const userId = request.cookies.get('oauth_user_id')?.value;
    
    if (!storedState || !validateStateToken(state, storedState)) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=invalid_state', request.url)
      );
    }
    
    if (!userId) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=no_user', request.url)
      );
    }
    
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=unauthorized', request.url)
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
      console.error('Token exchange error:', error);
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=token_exchange_failed', request.url)
      );
    }
    
    const tokens = await tokenResponse.json();
    
    // Calculate expiration
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;
    
    // Store integration
    await storeUserIntegration(
      user.id,
      'google',
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
    
    // Get return URL from cookie, default to settings page
    const returnUrl = request.cookies.get('oauth_return_url')?.value;
    const redirectUrl = returnUrl 
      ? decodeURIComponent(returnUrl) + (returnUrl.includes('?') ? '&' : '?') + 'integration_connected=google'
      : '/settings?tab=integrations&success=google_connected';
    
    // Clear OAuth cookies
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_user_id');
    response.cookies.delete('oauth_return_url');
    
    return response;
  } catch (error: any) {
    console.error('Error in Google OAuth callback:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    
    // Include error details in URL for debugging (in development only)
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `callback_error: ${error?.message || 'Unknown error'}`
      : 'callback_error';
    
    return NextResponse.redirect(
      new URL(`/settings?tab=integrations&error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
