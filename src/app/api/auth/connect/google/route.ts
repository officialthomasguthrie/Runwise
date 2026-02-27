/**
 * Google OAuth Connect Route
 * Initiates OAuth flow for Google integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGoogleAuthUrl, generateStateToken } from '@/lib/integrations/oauth';

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
    
    // Get service name and return URL from query parameters
    const { searchParams } = new URL(request.url);
    const serviceName = searchParams.get('service') || 'google'; // Default to 'google' for backward compatibility
    const returnUrlParam = searchParams.get('returnUrl');
    
    console.log('[API /auth/connect/google] Connecting service:', serviceName);
    
    // Generate state token for CSRF protection
    const state = generateStateToken();
    
    // Get return URL: prioritize query parameter, then referer, then default
    let returnUrl = returnUrlParam;
    if (!returnUrl) {
      const referer = request.headers.get('referer') || '';
      returnUrl = referer.includes('/agents/new')
        ? '/agents/new?resume=1'
        : referer.includes('/integrations')
        ? '/integrations'
        : referer.includes('/workspace/')
        ? referer.split('?')[0] // Use workspace path without query params
        : '/settings?tab=integrations';
    }
    
    // Store state in session/cookie (simplified - in production use secure session storage)
    // Pass serviceName to get service-specific scopes
    const response = NextResponse.redirect(getGoogleAuthUrl(state, serviceName));
    
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
    
    // Store service name for callback (so we know which service to store)
    response.cookies.set('oauth_service_name', serviceName, {
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
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

