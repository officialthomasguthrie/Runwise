/**
 * Disconnect an integration (OAuth or credential-based)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { deleteUserIntegration, getIntegrationCredential } from '@/lib/integrations/service';
import { createAdminClient } from '@/lib/supabase-admin';

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
    const { serviceName } = body;
    
    if (!serviceName) {
      return NextResponse.json(
        { error: 'Missing required field: serviceName' },
        { status: 400 }
      );
    }
    
    // For OAuth integrations, use deleteUserIntegration
    const oauthServices = ['google', 'slack', 'github'];
    if (oauthServices.includes(serviceName)) {
      const deleted = await deleteUserIntegration(user.id, serviceName);
      if (!deleted) {
        return NextResponse.json(
          { error: 'Failed to disconnect integration' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }
    
    // For credential-based integrations, delete from integration_credentials table
    const credentialServices = ['notion', 'airtable', 'trello', 'openai'];
    if (credentialServices.includes(serviceName)) {
      const supabaseAdmin = await createAdminClient();
      
      if (serviceName === 'trello') {
        // Delete both api_key and token
        const { error: error1 } = await supabaseAdmin
          .from('integration_credentials')
          .delete()
          .eq('user_id', user.id)
          .eq('service_name', serviceName)
          .eq('credential_type', 'api_key');
        
        const { error: error2 } = await supabaseAdmin
          .from('integration_credentials')
          .delete()
          .eq('user_id', user.id)
          .eq('service_name', serviceName)
          .eq('credential_type', 'token');
        
        if (error1 || error2) {
          console.error('Error deleting Trello credentials:', error1 || error2);
          return NextResponse.json(
            { error: 'Failed to disconnect integration' },
            { status: 500 }
          );
        }
      } else if (serviceName === 'openai') {
        // Delete api_key
        const { error } = await supabaseAdmin
          .from('integration_credentials')
          .delete()
          .eq('user_id', user.id)
          .eq('service_name', serviceName)
          .eq('credential_type', 'api_key');
        
        if (error) {
          console.error('Error deleting OpenAI credentials:', error);
          return NextResponse.json(
            { error: 'Failed to disconnect integration' },
            { status: 500 }
          );
        }
      } else {
        // Delete api_token (Notion, Airtable)
        const { error } = await supabaseAdmin
          .from('integration_credentials')
          .delete()
          .eq('user_id', user.id)
          .eq('service_name', serviceName)
          .eq('credential_type', 'api_token');
        
        if (error) {
          console.error('Error deleting credentials:', error);
          return NextResponse.json(
            { error: 'Failed to disconnect integration' },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json(
      { error: 'Unknown service' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error disconnecting integration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}

