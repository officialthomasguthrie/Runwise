/**
 * Twitter/X OAuth Callback Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { storeUserIntegration } from '@/lib/integrations/service';
import { validateStateToken, getTwitterOAuthConfig } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('Twitter OAuth error:', error);
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=oauth_error', request.url)
      );
    }
    
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=missing_code', request.url)
      );
    }
    
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
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=unauthorized', request.url)
      );
    }
    
    // Exchange code for tokens
    const config = getTwitterOAuthConfig();
    
    // Twitter uses Basic Auth with client_id:client_secret as credentials
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
        code_verifier: 'challenge' // Simplified - should use proper PKCE
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange error:', error);
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=token_exchange_failed', request.url)
      );
    }
    
    const data = await tokenResponse.json();
    
    if (data.error) {
      console.error('Twitter API error:', data.error);
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=twitter_api_error', request.url)
      );
    }
    
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;
    
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : undefined;
    
    await storeUserIntegration(
      user.id,
      'twitter',
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt
      },
      {
        scope: data.scope,
        token_type: data.token_type
      }
    );
    
    const response = NextResponse.redirect(
      new URL('/settings?tab=integrations&success=twitter_connected', request.url)
    );
    
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_user_id');
    
    return response;
  } catch (error: any) {
    console.error('Error in Twitter OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=callback_error', request.url)
    );
  }
}

