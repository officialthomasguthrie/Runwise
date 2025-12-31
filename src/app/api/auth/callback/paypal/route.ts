/**
 * PayPal OAuth Callback Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { storeUserIntegration } from '@/lib/integrations/service';
import { validateStateToken, getPayPalOAuthConfig } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('PayPal OAuth error:', error);
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
    const config = getPayPalOAuthConfig();
    
    // PayPal uses Basic Auth with client_id:client_secret
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    
    // PayPal token endpoint
    const tokenUrl = config.baseUrl.includes('sandbox')
      ? 'https://api.sandbox.paypal.com/v1/oauth2/token'
      : 'https://api.paypal.com/v1/oauth2/token';
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri
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
      console.error('PayPal API error:', data.error);
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=paypal_api_error', request.url)
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
      'paypal',
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
      new URL('/settings?tab=integrations&success=paypal_connected', request.url)
    );
    
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_user_id');
    
    return response;
  } catch (error: any) {
    console.error('Error in PayPal OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=callback_error', request.url)
    );
  }
}

