/**
 * Get column headers from a Google Sheet
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGoogleSheetColumns } from '@/lib/integrations/google';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spreadsheetId: string; sheetName: string }> }
) {
  try {
    const { spreadsheetId, sheetName } = await params;
    
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Decode sheet name (URL encoded)
    const decodedSheetName = decodeURIComponent(sheetName);
    
    // Fetch columns
    const columns = await getGoogleSheetColumns(user.id, spreadsheetId, decodedSheetName);
    
    return NextResponse.json({ columns });
  } catch (error: any) {
    console.error('Error fetching Google columns:', error);
    
    if (error.message.includes('not connected')) {
      return NextResponse.json(
        { error: 'Google integration not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch columns' },
      { status: 500 }
    );
  }
}

