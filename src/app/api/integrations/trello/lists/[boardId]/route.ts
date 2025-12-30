/**
 * Get lists within a Trello board
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getTrelloLists } from '@/lib/integrations/trello';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const lists = await getTrelloLists(user.id, boardId);
    
    return NextResponse.json({ lists });
  } catch (error: any) {
    console.error('Error fetching Trello lists:', error);
    
    if (error.message.includes('not connected')) {
      return NextResponse.json(
        { error: 'Trello integration not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch lists' },
      { status: 500 }
    );
  }
}


