/**
 * Google OAuth Connect Route
 * Initiates OAuth flow for Google integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGoogleAuthUrl, generateStateToken, getGoogleScopesForResourceType } from '@/lib/integrations/oauth';

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
    
    // Get return URL and resourceType from query params
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('returnUrl');
    const resourceType = searchParams.get('resourceType'); // e.g., 'spreadsheet', 'calendar', 'folder', etc.
    
    // Get scopes for this specific resource type
    const scopes = getGoogleScopesForResourceType(resourceType || undefined);
    
    // Generate state token for CSRF protection
    const state = generateStateToken();
    
    // Store state in session/cookie (simplified - in production use secure session storage)
    const response = NextResponse.redirect(getGoogleAuthUrl(state, scopes));
    
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
    
    // Store return URL if provided
    if (returnUrl) {
      response.cookies.set('oauth_return_url', returnUrl, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600
      });
    }
    
    // Store resourceType for reference (optional, for logging/debugging)
    if (resourceType) {
      response.cookies.set('oauth_resource_type', resourceType, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600
      });
    }
    
    return response;
  } catch (error: any) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

