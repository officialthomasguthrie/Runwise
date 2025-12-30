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
    console.error('Error fetching Discord channels:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

