/**
 * Twitter/X OAuth Connect Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getTwitterAuthUrl, generateStateToken } from '@/lib/integrations/oauth';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const state = generateStateToken();
    
    // Get return URL from query parameter, referer, or default
    const { searchParams } = new URL(request.url);
    const returnUrlParam = searchParams.get('returnUrl');
    let returnUrl = returnUrlParam;
    if (!returnUrl) {
      const referer = request.headers.get('referer') || '';
      returnUrl = referer.includes('/integrations') 
        ? '/integrations' 
        : referer.includes('/workspace/')
        ? referer.split('?')[0]
        : '/settings?tab=integrations';
    }
    
    const response = NextResponse.redirect(getTwitterAuthUrl(state));
    
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    response.cookies.set('oauth_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    response.cookies.set('oauth_return_url', returnUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600
    });
    
    return response;
  } catch (error: any) {
    console.error('Error initiating Twitter OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

