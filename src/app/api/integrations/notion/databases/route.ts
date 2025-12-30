/**
 * Get user's Notion databases
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getNotionDatabases } from '@/lib/integrations/notion';

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
    
    const databases = await getNotionDatabases(user.id);
    
    return NextResponse.json({ databases });
  } catch (error: any) {
    console.error('Error fetching Notion databases:', error);
    
    if (error.message.includes('not connected')) {
      return NextResponse.json(
        { error: 'Notion integration not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch databases' },
      { status: 500 }
    );
  }
}


