/**
 * Slack OAuth Callback Route
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
    
    if (error) {
      console.error('Slack OAuth error:', error);
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
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://runwiseai.app/api/auth/callback/slack'
      : 'http://localhost:3000/api/auth/callback/slack';
    
    if (!clientId || !clientSecret) {
      throw new Error('Slack credentials not configured');
    }
    
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
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
    
    if (!data.ok) {
      console.error('Slack API error:', data.error);
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=slack_api_error', request.url)
      );
    }
    
    // Slack returns access_token in authed_user or bot
    const accessToken = data.authed_user?.access_token || data.access_token;
    const refreshToken = data.authed_user?.refresh_token;
    const expiresIn = data.authed_user?.expires_in;
    
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : undefined;
    
    await storeUserIntegration(
      user.id,
      'slack',
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt
      },
      {
        team_id: data.team?.id,
        team_name: data.team?.name,
        bot_user_id: data.bot_user_id,
        scope: data.scope
      }
    );
    
    // Get return URL from cookie, default to settings page
    const returnUrl = request.cookies.get('oauth_return_url')?.value;
    const redirectUrl = returnUrl 
      ? decodeURIComponent(returnUrl) + (returnUrl.includes('?') ? '&' : '?') + 'integration_connected=slack'
      : '/settings?tab=integrations&success=slack_connected';
    
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_user_id');
    response.cookies.delete('oauth_return_url');
    
    return response;
  } catch (error: any) {
    console.error('Error in Slack OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=callback_error', request.url)
    );
  }
}

