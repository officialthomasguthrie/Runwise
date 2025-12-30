/**
 * Get user's GitHub repositories
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getGitHubRepositories } from '@/lib/integrations/github';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const repositories = await getGitHubRepositories(user.id);
    
    return NextResponse.json({ repositories });
  } catch (error: any) {
    console.error('Error fetching GitHub repositories:', error);
    
    if (error.message.includes('not connected')) {
      return NextResponse.json(
        { error: 'GitHub integration not connected', code: 'NOT_CONNECTED' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}


