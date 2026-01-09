/**
 * Shopify OAuth Callback Route
 * Handles OAuth callback and stores tokens
 * Note: Shopify returns shop parameter in callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { storeUserIntegration } from '@/lib/integrations/service';
import { validateStateToken, getShopifyOAuthConfig } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const shop = searchParams.get('shop');
    const error = searchParams.get('error');
    
    // Get return URL from cookie or default to settings
    const returnUrl = request.cookies.get('oauth_return_url')?.value || '/settings?tab=integrations';
    const getErrorUrl = (errorType: string) => {
      const separator = returnUrl.includes('?') ? '&' : '?';
      return `${returnUrl}${separator}error=${errorType}`;
    };
    
    // Check for OAuth errors
    if (error) {
      console.error('[Shopify OAuth Callback] OAuth error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('oauth_error'), request.url)
      );
    }
    
    if (!code || !state || !shop) {
      console.error('[Shopify OAuth Callback] Missing code, state, or shop:', { 
        code: !!code, 
        state: !!state,
        shop: !!shop 
      });
      return NextResponse.redirect(
        new URL(getErrorUrl('missing_code'), request.url)
      );
    }
    
    // Validate state token (CSRF protection)
    const storedState = request.cookies.get('oauth_state')?.value;
    const userId = request.cookies.get('oauth_user_id')?.value;
    const storedShop = request.cookies.get('oauth_shop')?.value;
    
    console.log('[Shopify OAuth Callback] Validating state:', { 
      hasStoredState: !!storedState, 
      hasState: !!state,
      hasUserId: !!userId,
      shop: shop,
      storedShop: storedShop
    });
    
    if (!storedState || !validateStateToken(state, storedState)) {
      console.error('[Shopify OAuth Callback] Invalid state token');
      return NextResponse.redirect(
        new URL(getErrorUrl('invalid_state'), request.url)
      );
    }
    
    if (!userId) {
      console.error('[Shopify OAuth Callback] No user ID in cookie');
      return NextResponse.redirect(
        new URL(getErrorUrl('no_user'), request.url)
      );
    }
    
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('[Shopify OAuth Callback] Auth error or user mismatch:', { 
        authError: authError?.message, 
        hasUser: !!user,
        userIdMatch: user?.id === userId 
      });
      return NextResponse.redirect(
        new URL(getErrorUrl('unauthorized'), request.url)
      );
    }
    
    // Clean shop domain
    const shopDomain = shop.replace('.myshopify.com', '').trim();
    const config = getShopifyOAuthConfig(shopDomain);
    
    // Exchange code for tokens
    // Shopify uses POST to {shop}.myshopify.com/admin/oauth/access_token
    const tokenUrl = `https://${shopDomain}.myshopify.com/admin/oauth/access_token`;
    
    console.log('[Shopify OAuth Callback] Exchanging code for tokens:', { 
      hasCode: !!code, 
      codeLength: code.length,
      shop: shopDomain,
      tokenUrl: tokenUrl
    });
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[Shopify OAuth Callback] Token exchange error:', error);
      return NextResponse.redirect(
        new URL(getErrorUrl('token_exchange_failed'), request.url)
      );
    }
    
    const tokens = await tokenResponse.json();
    console.log('[Shopify OAuth Callback] Token exchange successful');
    
    // Shopify tokens don't expire, but check if expires_in is provided
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;
    
    // Store integration with shop-specific service name
    // Use 'shopify-{shop}' as service name to support multiple shops
    const serviceName = `shopify-${shopDomain}`;
    console.log('[Shopify OAuth Callback] Storing integration for user:', user.id, 'service:', serviceName);
    try {
      await storeUserIntegration(
        user.id,
        serviceName,
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token, // Shopify may not provide refresh tokens
          expires_at: expiresAt
        },
        {
          shop: shopDomain,
          scope: tokens.scope,
          associated_user_scope: tokens.associated_user_scope,
          associated_user: tokens.associated_user
        }
      );
      console.log('[Shopify OAuth Callback] Integration stored successfully');
    } catch (storeError: any) {
      console.error('[Shopify OAuth Callback] Error storing integration:', storeError);
      return NextResponse.redirect(
        new URL(getErrorUrl('callback_error'), request.url)
      );
    }
    
    // Build success redirect URL
    // For workspace redirects, use generic 'connected' parameter
    // For integrations page, use specific service name
    const isWorkspace = returnUrl.startsWith('/workspace/');
    const successParam = isWorkspace ? 'connected' : 'shopify_connected';
    const redirectUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}success=${successParam}`;
    
    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL(redirectUrl, request.url)
    );
    
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_user_id');
    response.cookies.delete('oauth_shop');
    response.cookies.delete('oauth_return_url');
    
    return response;
  } catch (error: any) {
    console.error('[Shopify OAuth Callback] Unexpected error:', error);
    const returnUrl = request.cookies.get('oauth_return_url')?.value || '/settings?tab=integrations';
    const separator = returnUrl.includes('?') ? '&' : '?';
    const errorUrl = `${returnUrl}${separator}error=callback_error`;
    return NextResponse.redirect(
      new URL(errorUrl, request.url)
    );
  }
}

