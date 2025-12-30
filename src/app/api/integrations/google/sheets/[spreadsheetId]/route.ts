/**
 * Get sheets within a Google Spreadsheet
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGoogleSheets } from '@/lib/integrations/google';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spreadsheetId: string }> }
) {
  try {
    const { spreadsheetId } = await params;
    
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch sheets
    const sheets = await getGoogleSheets(user.id, spreadsheetId);
    
    return NextResponse.json({ sheets });
  } catch (error: any) {
    console.error('Error fetching Google sheets:', error);
    
    if (error.message.includes('not connected')) {
      return NextResponse.json(
        { error: 'Google integration not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sheets' },
      { status: 500 }
    );
  }
}

