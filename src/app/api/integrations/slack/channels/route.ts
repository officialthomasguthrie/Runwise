/**
 * Get user's Slack channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSlackChannels } from '@/lib/integrations/slack';

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
    
    const channels = await getSlackChannels(user.id);
    
    return NextResponse.json({ channels });
  } catch (error: any) {
    console.error('Error fetching Slack channels:', error);
    
    if (error.message.includes('not connected')) {
      return NextResponse.json(
        { error: 'Slack integration not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

