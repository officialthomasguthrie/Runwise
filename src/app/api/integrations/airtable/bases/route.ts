/**
 * Get user's Airtable bases
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAirtableBases } from '@/lib/integrations/airtable';

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
    
    const bases = await getAirtableBases(user.id);
    
    return NextResponse.json({ bases });
  } catch (error: any) {
    console.error('Error fetching Airtable bases:', error);
    
    if (error.message.includes('not connected')) {
      return NextResponse.json(
        { error: 'Airtable integration not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bases' },
      { status: 500 }
    );
  }
}


