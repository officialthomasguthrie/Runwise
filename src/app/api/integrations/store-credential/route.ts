/**
 * Store user-provided integration credential (API key/token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { storeIntegrationCredential } from '@/lib/integrations/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { serviceName, credentialType, credentialValue } = body;
    
    if (!serviceName || !credentialType || !credentialValue) {
      return NextResponse.json(
        { error: 'Missing required fields: serviceName, credentialType, credentialValue' },
        { status: 400 }
      );
    }
    
    await storeIntegrationCredential(
      user.id,
      serviceName,
      credentialType,
      credentialValue
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error storing credential:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store credential' },
      { status: 500 }
    );
  }
}


