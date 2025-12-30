/**
 * API route to list user's Gmail labels
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGmailLabels } from '@/lib/integrations/google';

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
    
    // Fetch labels
    const labels = await getGmailLabels(user.id);
    
    return NextResponse.json({ labels });
  } catch (error: any) {
    console.error('Error fetching Gmail labels:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch labels' },
      { status: 500 }
    );
  }
}

