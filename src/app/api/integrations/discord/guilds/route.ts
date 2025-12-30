/**
 * Get user's Discord guilds (servers)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getDiscordGuilds } from '@/lib/integrations/discord';

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
    
    const guilds = await getDiscordGuilds(user.id);
    
    return NextResponse.json({ guilds });
  } catch (error: any) {
    console.error('Error fetching Discord guilds:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch guilds' },
      { status: 500 }
    );
  }
}

