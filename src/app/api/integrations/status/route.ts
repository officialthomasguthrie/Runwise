/**
 * Get user's integration status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getUserIntegrations, getIntegrationCredential } from '@/lib/integrations/service';

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
    
    // Get all OAuth integrations
    const integrations = await getUserIntegrations(user.id);
    
    // Return simplified status (without sensitive data)
    const status: Array<{
      service: string;
      connected: boolean;
      expiresAt?: string | Date | null;
      createdAt?: string | Date | null;
    }> = integrations
      .filter(integration => integration.service_name) // Filter out null/empty service names
      .map(integration => ({
        service: integration.service_name!,
        connected: true,
        expiresAt: integration.token_expires_at || undefined,
        createdAt: integration.created_at || undefined
      }));
    
    // Check credential-based integrations (Notion, Airtable, Trello, OpenAI, SendGrid, Twilio, Stripe, Discord)
    const credentialServices = ['notion', 'airtable', 'trello', 'openai', 'sendgrid', 'twilio', 'stripe', 'discord'];
    for (const service of credentialServices) {
      let hasCredential = false;
      
      if (service === 'notion') {
        const token = await getIntegrationCredential(user.id, service, 'api_token');
        hasCredential = !!token;
      } else if (service === 'airtable') {
        const token = await getIntegrationCredential(user.id, service, 'api_token');
        hasCredential = !!token;
      } else if (service === 'trello') {
        const apiKey = await getIntegrationCredential(user.id, service, 'api_key');
        const token = await getIntegrationCredential(user.id, service, 'token');
        hasCredential = !!(apiKey && token);
      } else if (service === 'openai') {
        const apiKey = await getIntegrationCredential(user.id, service, 'api_key');
        hasCredential = !!apiKey;
      } else if (service === 'sendgrid') {
        const apiKey = await getIntegrationCredential(user.id, service, 'api_key');
        hasCredential = !!apiKey;
      } else if (service === 'twilio') {
        const accountSid = await getIntegrationCredential(user.id, service, 'account_sid');
        const authToken = await getIntegrationCredential(user.id, service, 'auth_token');
        hasCredential = !!(accountSid && authToken);
      } else if (service === 'stripe') {
        const secretKey = await getIntegrationCredential(user.id, service, 'secret_key');
        hasCredential = !!secretKey;
      } else if (service === 'discord') {
        // Check for OAuth token or bot token
        const discordIntegration = integrations.find(i => i.service_name === 'discord');
        const botToken = await getIntegrationCredential(user.id, service, 'bot_token');
        hasCredential = !!(discordIntegration?.access_token || botToken);
      }
      
      if (hasCredential) {
        // Check if already in status array
        const existing = status.find(s => s.service === service);
        if (!existing) {
          status.push({
            service,
            connected: true,
            expiresAt: undefined,
            createdAt: undefined
          });
        }
      }
    }
    
    // Check Twitter OAuth integration
    const twitterIntegration = integrations.find(i => i.service_name === 'twitter');
    if (twitterIntegration?.access_token) {
      const existing = status.find(s => s.service === 'twitter');
      if (!existing) {
        status.push({
          service: 'twitter',
          connected: true,
          expiresAt: twitterIntegration.token_expires_at,
          createdAt: twitterIntegration.created_at
        });
      }
    }
    
    // Check PayPal OAuth integration
    const paypalIntegration = integrations.find(i => i.service_name === 'paypal');
    if (paypalIntegration?.access_token) {
      const existing = status.find(s => s.service === 'paypal');
      if (!existing) {
        status.push({
          service: 'paypal',
          connected: true,
          expiresAt: paypalIntegration.token_expires_at || undefined,
          createdAt: paypalIntegration.created_at || undefined
        });
      }
    }
    
    return NextResponse.json({ integrations: status });
  } catch (error: any) {
    console.error('Error fetching integration status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch integration status' },
      { status: 500 }
    );
  }
}

