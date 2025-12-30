/**
 * API route to list user's Google Calendars
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGoogleCalendars } from '@/lib/integrations/google';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch calendars
    const calendars = await getGoogleCalendars(user.id);
    
    return NextResponse.json({ calendars });
  } catch (error: any) {
    console.error('Error fetching Google calendars:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}

