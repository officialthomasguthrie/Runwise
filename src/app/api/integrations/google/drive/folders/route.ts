/**
 * API route to list user's Google Drive folders
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGoogleDriveFolders } from '@/lib/integrations/google';

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
    
    // Get optional parent folder ID from query params
    const searchParams = request.nextUrl.searchParams;
    const parentFolderId = searchParams.get('parentFolderId') || undefined;
    
    // Fetch folders
    const folders = await getGoogleDriveFolders(user.id, parentFolderId);
    
    return NextResponse.json({ folders });
  } catch (error: any) {
    console.error('Error fetching Google Drive folders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

