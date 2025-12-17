import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getInngestUsageStats } from '@/lib/inngest/monitoring';

export const dynamic = 'force-dynamic';

/**
 * GET - Get Inngest usage statistics
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - functionId: Filter by function ID (optional)
 * - userId: Filter by user ID (optional, requires auth)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const functionId = searchParams.get('functionId');
    const userIdParam = searchParams.get('userId');

    // If userId is specified, require authentication and check if user is admin or viewing their own data
    let userId: string | undefined;
    if (userIdParam) {
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // Users can only view their own stats unless they're admin
      // For now, allow users to view their own stats
      if (userIdParam !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: Can only view your own stats' },
          { status: 403 }
        );
      }
      userId = userIdParam;
    }

    const stats = await getInngestUsageStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      functionId: functionId || undefined,
      userId: userId,
    });

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching Inngest monitoring stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch monitoring stats' },
      { status: 500 }
    );
  }
}

