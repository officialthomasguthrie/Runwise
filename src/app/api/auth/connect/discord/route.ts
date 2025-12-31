/**
 * Discord OAuth Connect Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDiscordAuthUrl, generateStateToken } from '@/lib/integrations/oauth';

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
    const response = NextResponse.redirect(getDiscordAuthUrl(state));
    
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
    
    return response;
  } catch (error: any) {
    console.error('Error initiating Discord OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

