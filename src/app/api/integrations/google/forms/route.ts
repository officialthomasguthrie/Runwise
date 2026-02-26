/**
 * API route to list user's Google Forms
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGoogleForms } from '@/lib/integrations/google';

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
    
    // Fetch forms
    const forms = await getGoogleForms(user.id);
    
    return NextResponse.json({ forms });
  } catch (error: any) {
    console.error('Error fetching Google Forms:', error);
    // Scope errors mean the stored token is missing permissions — prompt reconnection
    if (error.message?.startsWith('SCOPE_INSUFFICIENT:')) {
      return NextResponse.json(
        { error: error.message.replace('SCOPE_INSUFFICIENT: ', ''), code: 'NOT_CONNECTED' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

