/**
 * Jira OAuth Connect Route (3LO - 3-Legged OAuth)
 * Initiates OAuth flow for Jira integration
 * Note: Jira uses Atlassian's OAuth 2.0 authorization server
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getJiraAuthUrl, generateStateToken } from '@/lib/integrations/oauth';

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
    
    console.log('[API /auth/connect/jira] Initiating Jira OAuth flow');
    
    // Generate state token for CSRF protection
    const state = generateStateToken();
    
    // Get return URL: prioritize query parameter, then referer, then default
    const { searchParams } = new URL(request.url);
    let returnUrl = searchParams.get('returnUrl');
    const audience = searchParams.get('audience') || 'api.atlassian.com';
    
    if (!returnUrl) {
      const referer = request.headers.get('referer') || '';
      returnUrl = referer.includes('/integrations') 
        ? '/integrations' 
        : referer.includes('/workspace/')
        ? referer.split('?')[0]
        : '/settings?tab=integrations';
    }
    
    // Store state in session/cookie
    const response = NextResponse.redirect(getJiraAuthUrl(state, audience));
    
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
    
    // Store return URL for callback
    response.cookies.set('oauth_return_url', returnUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    // Store audience for callback (needed for token exchange)
    response.cookies.set('oauth_audience', audience, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    return response;
  } catch (error: any) {
    console.error('Error initiating Jira OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

