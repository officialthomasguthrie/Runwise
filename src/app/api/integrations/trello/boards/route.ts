/**
 * Get user's Trello boards
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getTrelloBoards } from '@/lib/integrations/trello';

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
    
    const boards = await getTrelloBoards(user.id);
    
    return NextResponse.json({ boards });
  } catch (error: any) {
    console.error('Error fetching Trello boards:', error);
    
    if (error.message.includes('not connected')) {
      return NextResponse.json(
        { error: 'Trello integration not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch boards' },
      { status: 500 }
    );
  }
}


