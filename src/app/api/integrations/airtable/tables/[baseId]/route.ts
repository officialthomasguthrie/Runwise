/**
 * Get tables within an Airtable base
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAirtableTables } from '@/lib/integrations/airtable';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ baseId: string }> }
) {
  try {
    const { baseId } = await params;
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const tables = await getAirtableTables(user.id, baseId);
    
    return NextResponse.json({ tables });
  } catch (error: any) {
    console.error('Error fetching Airtable tables:', error);
    
    if (error.message.includes('not connected')) {
      return NextResponse.json(
        { error: 'Airtable integration not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}


