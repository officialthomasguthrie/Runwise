/**
 * Get all Discord channels from all guilds
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAllDiscordChannels } from '@/lib/integrations/discord';

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
    
    const channels = await getAllDiscordChannels(user.id);
    
    return NextResponse.json({ channels });
  } catch (error: any) {
    console.error('[API /discord/channels/all] Error fetching all Discord channels:', error);
    
    // Check if it's a "not connected" error
    if (error.message?.includes('not connected') || error.message?.includes('Discord integration not connected')) {
      return NextResponse.json(
        { error: 'Discord integration not connected', code: 'NOT_CONNECTED' },
        { status: 400 }
      );
    }
    
    // Check if it's an authentication error
    if (error.message?.includes('invalid') || error.message?.includes('expired') || error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'Discord token is invalid or expired. Please reconnect your Discord account.', code: 'NOT_CONNECTED' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

