import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * Check if a user exists in the users table
 * This is used to prevent new signups via OAuth
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Check if user exists in the users table
    const { data: user, error } = await (adminSupabase
      .from('users') as any)
      .select('id')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected for new users
      console.error('Error checking user existence:', error);
      return NextResponse.json(
        { error: 'Failed to check user existence' },
        { status: 500 }
      );
    }

    // If user exists, return success
    // If user doesn't exist (error.code === 'PGRST116'), return not found
    return NextResponse.json({
      exists: !!user,
    });
  } catch (error) {
    console.error('Unexpected error in check-user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

