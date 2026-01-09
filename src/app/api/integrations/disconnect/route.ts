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
    
    console.log('[API /integrations/disconnect] Received request:', { serviceName, body });
    
    if (!serviceName) {
      console.error('[API /integrations/disconnect] Missing serviceName in request body');
      return NextResponse.json(
        { error: 'Missing required field: serviceName' },
        { status: 400 }
      );
    }
    
    // For OAuth integrations, use deleteUserIntegration
    // Check if it's a Google service (google-sheets, google-gmail, etc.) or base service
    const isGoogleService = serviceName.startsWith('google-');
    const isShopifyService = serviceName.startsWith('shopify-');
    const baseService = isGoogleService ? 'google' : isShopifyService ? 'shopify' : serviceName;
    const oauthServices = ['google', 'slack', 'github', 'notion', 'airtable', 'trello', 'shopify', 'hubspot', 'asana', 'jira', 'twitter', 'paypal'];
    
    if (oauthServices.includes(baseService)) {
      // Use the full service name (e.g., 'google-sheets', 'shopify-{shop}')
      const serviceToDelete = serviceName;
      console.log('[API /integrations/disconnect] Deleting OAuth integration:', serviceToDelete);
      const deleted = await deleteUserIntegration(user.id, serviceToDelete);
      if (!deleted) {
        console.error('[API /integrations/disconnect] Failed to delete integration');
        return NextResponse.json(
          { error: 'Failed to disconnect integration' },
          { status: 500 }
        );
      }
      console.log('[API /integrations/disconnect] Successfully deleted integration');
      return NextResponse.json({ success: true });
    }
    
    // For credential-based integrations, delete from integration_credentials table
    const credentialServices = ['openai', 'stripe', 'sendgrid', 'twilio', 'discord'];
    if (credentialServices.includes(serviceName)) {
      const supabaseAdmin = await createAdminClient();
      
      if (serviceName === 'twilio') {
        // Delete both account_sid and auth_token
        const { error: error1 } = await supabaseAdmin
          .from('integration_credentials')
          .delete()
          .eq('user_id', user.id)
          .eq('service_name', serviceName)
          .eq('credential_type', 'account_sid');
        
        const { error: error2 } = await supabaseAdmin
          .from('integration_credentials')
          .delete()
          .eq('user_id', user.id)
          .eq('service_name', serviceName)
          .eq('credential_type', 'auth_token');
        
        if (error1 || error2) {
          console.error('Error deleting Twilio credentials:', error1 || error2);
          return NextResponse.json(
            { error: 'Failed to disconnect integration' },
            { status: 500 }
          );
        }
      } else if (serviceName === 'openai' || serviceName === 'sendgrid') {
        // Delete api_key
        const { error } = await supabaseAdmin
          .from('integration_credentials')
          .delete()
          .eq('user_id', user.id)
          .eq('service_name', serviceName)
          .eq('credential_type', 'api_key');
        
        if (error) {
          console.error(`Error deleting ${serviceName} credentials:`, error);
          return NextResponse.json(
            { error: 'Failed to disconnect integration' },
            { status: 500 }
          );
        }
      } else if (serviceName === 'stripe') {
        // Delete secret_key
        const { error } = await supabaseAdmin
          .from('integration_credentials')
          .delete()
          .eq('user_id', user.id)
          .eq('service_name', serviceName)
          .eq('credential_type', 'secret_key');
        
        if (error) {
          console.error('Error deleting Stripe credentials:', error);
          return NextResponse.json(
            { error: 'Failed to disconnect integration' },
            { status: 500 }
          );
        }
      } else if (serviceName === 'discord') {
        // Discord can be either OAuth (in user_integrations) or bot token (in integration_credentials)
        // Try to delete from both to handle old OAuth integrations and new bot token integrations
        
        // First, try to delete OAuth integration from user_integrations
        const oauthDeleted = await deleteUserIntegration(user.id, serviceName);
        if (oauthDeleted) {
          console.log('[API /integrations/disconnect] Deleted Discord OAuth integration');
        }
        
        // Then, delete bot_token from integration_credentials
        const { error } = await supabaseAdmin
          .from('integration_credentials')
          .delete()
          .eq('user_id', user.id)
          .eq('service_name', serviceName)
          .eq('credential_type', 'bot_token');
        
        if (error) {
          console.error('Error deleting Discord bot token:', error);
          // If we deleted OAuth integration, still return success
          if (oauthDeleted) {
            return NextResponse.json({ success: true });
          }
          return NextResponse.json(
            { error: 'Failed to disconnect integration' },
            { status: 500 }
          );
        }
        
        console.log('[API /integrations/disconnect] Deleted Discord bot token');
      } else {
        // Delete api_token (fallback)
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

