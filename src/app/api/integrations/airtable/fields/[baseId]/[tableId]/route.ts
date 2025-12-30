/**
 * Get fields within an Airtable table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAirtableFields } from '@/lib/integrations/airtable';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ baseId: string; tableId: string }> }
) {
  try {
    const { baseId, tableId } = await params;
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const fields = await getAirtableFields(user.id, baseId, tableId);
    
    return NextResponse.json({ fields });
  } catch (error: any) {
    console.error('Error fetching Airtable fields:', error);
    
    if (error.message.includes('not connected')) {
      return NextResponse.json(
        { error: 'Airtable integration not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fields' },
      { status: 500 }
    );
  }
}


