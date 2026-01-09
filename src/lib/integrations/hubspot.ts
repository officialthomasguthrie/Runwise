/**
 * HubSpot Integration API Client
 * Note: HubSpot tokens expire and need to be refreshed
 */

import { getUserIntegration } from './service';
import { getHubSpotOAuthConfig } from './oauth';

export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    [key: string]: any;
  };
}

export interface HubSpotTicket {
  id: string;
  properties: {
    subject?: string;
    content?: string;
    hs_pipeline?: string;
    hs_pipeline_stage?: string;
    [key: string]: any;
  };
}

/**
 * Get authenticated HubSpot access token
 * Handles token refresh if needed
 */
async function getHubSpotToken(userId: string): Promise<string> {
  const integration = await getUserIntegration(userId, 'hubspot');
  
  if (!integration?.access_token) {
    throw new Error('HubSpot integration not connected. Please connect your HubSpot account via OAuth.');
  }
  
  // Check if token is expired (if expires_at is provided)
  if (integration.expires_at) {
    const expiresAt = new Date(integration.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // If token expires in less than 5 minutes, refresh it
    if (timeUntilExpiry < 5 * 60 * 1000) {
      if (integration.refresh_token) {
        try {
          await refreshHubSpotToken(userId, integration.refresh_token);
          // Get the refreshed token
          const refreshedIntegration = await getUserIntegration(userId, 'hubspot');
          if (refreshedIntegration?.access_token) {
            return refreshedIntegration.access_token;
          }
        } catch (refreshError) {
          console.error('Error refreshing HubSpot token:', refreshError);
          throw new Error('HubSpot token expired and refresh failed. Please reconnect your HubSpot account.');
        }
      } else {
        throw new Error('HubSpot token expired and no refresh token available. Please reconnect your HubSpot account.');
      }
    }
  }
  
  return integration.access_token;
}

/**
 * Refresh HubSpot access token
 */
async function refreshHubSpotToken(userId: string, refreshToken: string): Promise<void> {
  const config = getHubSpotOAuthConfig();
  
  const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken
    })
  });
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to refresh HubSpot token: ${error}`);
  }
  
  const tokens = await tokenResponse.json();
  
  // Update stored integration with new tokens
  const { storeUserIntegration } = await import('./service');
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : undefined;
  
  await storeUserIntegration(
    userId,
    'hubspot',
    {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken, // Use new refresh token if provided
      expires_at: expiresAt
    },
    {
      scope: tokens.scope,
      token_type: tokens.token_type || 'Bearer'
    }
  );
}

/**
 * Fetch contacts from HubSpot
 */
export async function getHubSpotContacts(
  userId: string,
  limit: number = 100
): Promise<HubSpotContact[]> {
  const token = await getHubSpotToken(userId);
  
  const response = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch HubSpot contacts: ${error}`);
  }
  
  const data = await response.json();
  return data.results || [];
}

/**
 * Create a contact in HubSpot
 */
export async function createHubSpotContact(
  userId: string,
  contact: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    [key: string]: any;
  }
): Promise<HubSpotContact> {
  const token = await getHubSpotToken(userId);
  
  // Map contact properties to HubSpot format
  const properties: Record<string, string> = {};
  if (contact.email) properties.email = contact.email;
  if (contact.firstname) properties.firstname = contact.firstname;
  if (contact.lastname) properties.lastname = contact.lastname;
  if (contact.phone) properties.phone = contact.phone;
  if (contact.company) properties.company = contact.company;
  
  // Add any additional properties
  Object.keys(contact).forEach(key => {
    if (!['email', 'firstname', 'lastname', 'phone', 'company'].includes(key)) {
      properties[key] = String(contact[key]);
    }
  });
  
  const response = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: properties
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create HubSpot contact: ${error}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Fetch tickets from HubSpot
 */
export async function getHubSpotTickets(
  userId: string,
  limit: number = 100
): Promise<HubSpotTicket[]> {
  const token = await getHubSpotToken(userId);
  
  const response = await fetch(
    `https://api.hubapi.com/crm/v3/objects/tickets?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch HubSpot tickets: ${error}`);
  }
  
  const data = await response.json();
  return data.results || [];
}

/**
 * Create a ticket in HubSpot
 */
export async function createHubSpotTicket(
  userId: string,
  ticket: {
    subject?: string;
    content?: string;
    hs_pipeline?: string;
    hs_pipeline_stage?: string;
    [key: string]: any;
  }
): Promise<HubSpotTicket> {
  const token = await getHubSpotToken(userId);
  
  // Map ticket properties to HubSpot format
  const properties: Record<string, string> = {};
  if (ticket.subject) properties.subject = ticket.subject;
  if (ticket.content) properties.content = ticket.content;
  if (ticket.hs_pipeline) properties.hs_pipeline = ticket.hs_pipeline;
  if (ticket.hs_pipeline_stage) properties.hs_pipeline_stage = ticket.hs_pipeline_stage;
  
  // Add any additional properties
  Object.keys(ticket).forEach(key => {
    if (!['subject', 'content', 'hs_pipeline', 'hs_pipeline_stage'].includes(key)) {
      properties[key] = String(ticket[key]);
    }
  });
  
  const response = await fetch(
    'https://api.hubapi.com/crm/v3/objects/tickets',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: properties
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create HubSpot ticket: ${error}`);
  }
  
  const data = await response.json();
  return data;
}

