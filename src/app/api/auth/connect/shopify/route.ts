/**
 * Shopify OAuth Connect Route
 * Initiates OAuth flow for Shopify integration
 * Note: Shopify requires a shop parameter (shop domain)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getShopifyAuthUrl, generateStateToken } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get shop parameter from query string
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const returnUrlParam = searchParams.get('returnUrl');
    
    if (!shop) {
      return NextResponse.json(
        { error: 'Shop parameter is required. Please provide your Shopify shop domain (e.g., mystore or mystore.myshopify.com)' },
        { status: 400 }
      );
    }
    
    // Clean shop domain (remove .myshopify.com if present)
    const shopDomain = shop.replace('.myshopify.com', '').trim();
    
    console.log('[API /auth/connect/shopify] Initiating Shopify OAuth flow for shop:', shopDomain);
    
    // Generate state token for CSRF protection
    const state = generateStateToken();
    
    // Get return URL: prioritize query parameter, then referer, then default
    let returnUrl = returnUrlParam;
    if (!returnUrl) {
      const referer = request.headers.get('referer') || '';
      returnUrl = referer.includes('/integrations') 
        ? '/integrations' 
        : referer.includes('/workspace/')
        ? referer.split('?')[0]
        : '/settings?tab=integrations';
    }
    
    // Store state in session/cookie
    const response = NextResponse.redirect(getShopifyAuthUrl(state, shopDomain));
    
    // Store state in httpOnly cookie
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });
    
    // Store user ID for callback
    response.cookies.set('oauth_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    // Store shop domain for callback
    response.cookies.set('oauth_shop', shopDomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    // Store return URL for callback
    response.cookies.set('oauth_return_url', returnUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    return response;
  } catch (error: any) {
    console.error('Error initiating Shopify OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

