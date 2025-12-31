/**
 * GitHub OAuth Callback Route
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
      console.error('GitHub OAuth error:', error);
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
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://runwiseai.app/api/auth/callback/github'
      : 'http://localhost:3000/api/auth/callback/github';
    
    if (!clientId || !clientSecret) {
      throw new Error('GitHub credentials not configured');
    }
    
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
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
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error('GitHub OAuth error:', tokens.error);
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=github_oauth_error', request.url)
      );
    }
    
    // GitHub tokens don't expire, but store for consistency
    await storeUserIntegration(
      user.id,
      'github',
      {
        access_token: tokens.access_token,
        // GitHub doesn't provide refresh tokens for OAuth apps
      },
      {
        scope: tokens.scope,
        token_type: tokens.token_type
      }
    );
    
    const response = NextResponse.redirect(
      new URL('/settings?tab=integrations&success=github_connected', request.url)
    );
    
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_user_id');
    
    return response;
  } catch (error: any) {
    console.error('Error in GitHub OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=callback_error', request.url)
    );
  }
}


