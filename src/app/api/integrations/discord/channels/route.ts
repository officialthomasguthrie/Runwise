/**
 * Get Discord channels in a guild
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDiscordChannels } from '@/lib/integrations/discord';

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
    
    const { searchParams } = new URL(request.url);
    const guildId = searchParams.get('guildId');
    
    if (!guildId) {
      return NextResponse.json(
        { error: 'guildId parameter is required' },
        { status: 400 }
      );
    }
    
    const channels = await getDiscordChannels(user.id, guildId);
    
    return NextResponse.json({ channels });
  } catch (error: any) {
    console.error('[API /discord/channels] Error fetching Discord channels:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('invalid') || error.message?.includes('expired') || error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'Discord token is invalid or expired. Please reconnect your Discord account.', code: 'NOT_CONNECTED' },
        { status: 401 }
      );
    }
    
    // Check if it's a permission error
    if (error.message?.includes('permission') || error.message?.includes('403')) {
      return NextResponse.json(
        { error: error.message || 'You do not have permission to access channels in this server.' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

