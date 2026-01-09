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
    console.log('[API /integrations/status] Raw integrations from getUserIntegrations:', integrations);
    
    // Return simplified status (without sensitive data)
    const status: Array<{
      service: string;
      connected: boolean;
      expiresAt: string | null | undefined;
      createdAt: string | null | undefined;
    }> = integrations
      .filter(integration => {
        const hasServiceName = !!integration.service_name;
        if (!hasServiceName) {
          console.log('[API /integrations/status] Filtering out integration without service_name:', integration);
        }
        return hasServiceName;
      })
      .map(integration => {
        console.log('[API /integrations/status] Mapping integration:', {
          service_name: integration.service_name,
          token_expires_at: integration.token_expires_at,
          created_at: integration.created_at
        });
        return {
          service: integration.service_name!,
      connected: true,
      expiresAt: integration.token_expires_at,
      createdAt: integration.created_at
        };
      });
    
    console.log('[API /integrations/status] Final status array:', status);
    
    // Check credential-based integrations (OpenAI, SendGrid, Twilio, Stripe, Discord, Twitter)
    // Note: Notion, Airtable, and Trello now use OAuth, so they're checked above
    const credentialServices = ['openai', 'sendgrid', 'twilio', 'stripe', 'discord', 'twitter'];
    for (const service of credentialServices) {
      let hasCredential = false;
      
      if (service === 'openai') {
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
        // Check for bot token only
        const botToken = await getIntegrationCredential(user.id, service, 'bot_token');
        hasCredential = !!botToken;
      } else if (service === 'twitter') {
        // Check for Bearer Token
        const bearerToken = await getIntegrationCredential(user.id, service, 'bearer_token');
        hasCredential = !!bearerToken;
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
    
    // Twitter is now checked above in credentialServices
    
    // Check PayPal OAuth integration
    const paypalIntegration = integrations.find(i => i.service_name === 'paypal');
    if (paypalIntegration?.access_token) {
      const existing = status.find(s => s.service === 'paypal');
      if (!existing) {
        status.push({
          service: 'paypal',
          connected: true,
          expiresAt: paypalIntegration.token_expires_at,
          createdAt: paypalIntegration.created_at
        });
      }
    }
    
    // Check Notion OAuth integration
    const notionIntegration = integrations.find(i => i.service_name === 'notion');
    if (notionIntegration?.access_token) {
      const existing = status.find(s => s.service === 'notion');
      if (!existing) {
        status.push({
          service: 'notion',
          connected: true,
          expiresAt: notionIntegration.token_expires_at,
          createdAt: notionIntegration.created_at
        });
      }
    }
    
    // Check Airtable OAuth integration
    const airtableIntegration = integrations.find(i => i.service_name === 'airtable');
    if (airtableIntegration?.access_token) {
      const existing = status.find(s => s.service === 'airtable');
      if (!existing) {
        status.push({
          service: 'airtable',
          connected: true,
          expiresAt: airtableIntegration.token_expires_at,
          createdAt: airtableIntegration.created_at
        });
      }
    }
    
    // Check Trello OAuth integration
    const trelloIntegration = integrations.find(i => i.service_name === 'trello');
    if (trelloIntegration?.access_token) {
      const existing = status.find(s => s.service === 'trello');
      if (!existing) {
        status.push({
          service: 'trello',
          connected: true,
          expiresAt: trelloIntegration.token_expires_at,
          createdAt: trelloIntegration.created_at
        });
      }
    }
    
    // Check Shopify OAuth integrations (can have multiple shops: shopify-{shop})
    const shopifyIntegrations = integrations.filter(i => i.service_name?.startsWith('shopify-'));
    for (const shopifyIntegration of shopifyIntegrations) {
      if (shopifyIntegration?.access_token) {
        // Extract shop name from service_name (e.g., 'shopify-mystore' -> 'shopify')
        // For status, we'll use 'shopify' as the service name
        const existing = status.find(s => s.service === 'shopify');
        if (!existing) {
          status.push({
            service: 'shopify',
            connected: true,
            expiresAt: shopifyIntegration.token_expires_at,
            createdAt: shopifyIntegration.created_at
          });
        }
      }
    }
    
    // Check HubSpot OAuth integration
    const hubspotIntegration = integrations.find(i => i.service_name === 'hubspot');
    if (hubspotIntegration?.access_token) {
      const existing = status.find(s => s.service === 'hubspot');
      if (!existing) {
        status.push({
          service: 'hubspot',
          connected: true,
          expiresAt: hubspotIntegration.token_expires_at,
          createdAt: hubspotIntegration.created_at
        });
      }
    }
    
    // Check Asana OAuth integration
    const asanaIntegration = integrations.find(i => i.service_name === 'asana');
    if (asanaIntegration?.access_token) {
      const existing = status.find(s => s.service === 'asana');
      if (!existing) {
        status.push({
          service: 'asana',
          connected: true,
          expiresAt: asanaIntegration.token_expires_at,
          createdAt: asanaIntegration.created_at
        });
      }
    }
    
    // Check Jira OAuth integration
    const jiraIntegration = integrations.find(i => i.service_name === 'jira');
    if (jiraIntegration?.access_token) {
      const existing = status.find(s => s.service === 'jira');
      if (!existing) {
        status.push({
          service: 'jira',
          connected: true,
          expiresAt: jiraIntegration.token_expires_at,
          createdAt: jiraIntegration.created_at
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

