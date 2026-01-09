/**
 * Integration Service
 * Manages user integrations (OAuth tokens, API keys, etc.)
 */

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import crypto from 'crypto';

// Encryption key from environment (should be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive data before storing in database
 */
function encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'); // Use first 32 bytes
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt data from database
 */
function decrypt(encrypted: string, iv: string, authTag: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export interface UserIntegration {
  id: string;
  user_id: string;
  service_name: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationCredentials {
  id: string;
  user_id: string;
  service_name: string;
  credential_type: string;
  credential_value: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Store or update user integration (OAuth tokens)
 */
export async function storeUserIntegration(
  userId: string,
  serviceName: string,
  tokens: {
    access_token: string;
    refresh_token?: string;
    expires_at?: Date;
  },
  metadata?: Record<string, any>
): Promise<UserIntegration> {
  const supabase = await createAdminClient();
  
  // Map service_name to integration name in the integrations table
  const integrationNameMap: Record<string, string> = {
    'google-sheets': 'google-sheets',
    'google-gmail': 'google-sheets', // Gmail uses same integration record
    'google-calendar': 'google-sheets', // Calendar uses same integration record
    'google-drive': 'google-sheets', // Drive uses same integration record
    'google-forms': 'google-sheets', // Forms use same integration record
    'google': 'google-sheets', // Legacy fallback
    'slack': 'slack',
    'github': 'webhook', // GitHub might use webhook, or we need to add it
    'notion': 'notion',
    'airtable': 'airtable',
    'trello': 'trello',
    'shopify': 'shopify',
    'hubspot': 'hubspot',
    'asana': 'asana',
    'jira': 'jira',
    'discord': 'discord',
    'twitter': 'webhook', // Twitter might use webhook, or we need to add it
    'paypal': 'webhook', // PayPal might use webhook, or we need to add it
  };
  
  // Handle Shopify shop-specific service names (shopify-{shop})
  // For shopify-{shop}, use 'shopify' as the integration name
  let mappedServiceName = serviceName;
  if (serviceName.startsWith('shopify-')) {
    mappedServiceName = 'shopify';
  }
  
  const integrationName = integrationNameMap[mappedServiceName] || mappedServiceName;
  
  // Get or create the integration record
  let { data: integration, error: integrationError } = await supabase
    .from('integrations')
    .select('id')
    .eq('name', integrationName)
    .single();
  
  if (integrationError || !integration) {
    // If integration doesn't exist, create it
    const { data: newIntegration, error: createError } = await supabase
      .from('integrations')
      .insert({
        name: integrationName,
        display_name: serviceName.charAt(0).toUpperCase() + serviceName.slice(1),
        description: null,
        category: 'api',
        is_active: true
      } as any)
      .select()
      .single();
    
    if (createError || !newIntegration) {
      console.error('Error creating integration:', createError);
      throw new Error(`Failed to create integration record: ${createError?.message || 'Unknown error'}`);
    }
    
    integration = newIntegration;
  }
  
  // Ensure integration exists and has id (type assertion to help TypeScript)
  const integrationWithId = integration as { id: string } | null;
  if (!integrationWithId || !integrationWithId.id) {
    throw new Error('Integration record is missing or invalid');
  }
  
  const integrationId = integrationWithId.id;
  
  // Encrypt tokens
  const encryptedAccess = encrypt(tokens.access_token);
  const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
  
  // Store encrypted tokens in config JSONB field
  const config = {
    access_token: {
      encrypted: encryptedAccess.encrypted,
      iv: encryptedAccess.iv,
      authTag: encryptedAccess.authTag
    },
    ...(encryptedRefresh && {
      refresh_token: {
        encrypted: encryptedRefresh.encrypted,
        iv: encryptedRefresh.iv,
        authTag: encryptedRefresh.authTag
      }
    }),
    token_expires_at: tokens.expires_at?.toISOString() || null,
    service_name: serviceName, // Store service_name in config for backward compatibility
    ...(metadata && { metadata })
  };
  
  // Use the schema with integration_id (required by database)
  const { data, error } = await supabase
    .from('user_integrations')
    .upsert({
      user_id: userId,
      integration_id: integrationId,
      name: serviceName, // Use service_name as the name
      config: config,
      is_active: true,
      updated_at: new Date().toISOString()
    } as any, {
      onConflict: 'user_id,integration_id,name'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error storing integration:', error);
    throw new Error(`Failed to store integration: ${error.message}`);
  }
  
  // Transform the response to match UserIntegration interface
  // Extract tokens from config for backward compatibility
  const configData = (data as any).config || {};
  return {
    id: data.id,
    user_id: data.user_id,
    service_name: configData.service_name || serviceName,
    access_token: configData.access_token ? JSON.stringify(configData.access_token) : undefined,
    refresh_token: configData.refresh_token ? JSON.stringify(configData.refresh_token) : undefined,
    token_expires_at: configData.token_expires_at || undefined,
    metadata: configData.metadata || metadata,
    created_at: data.created_at,
    updated_at: data.updated_at
  } as UserIntegration;
}

/**
 * Get user integration with decrypted tokens
 */
export async function getUserIntegration(
  userId: string,
  serviceName: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_at?: Date;
  metadata?: Record<string, any>;
} | null> {
  const supabase = await createAdminClient();
  
  // Try old schema first (with service_name column)
  let { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('service_name', serviceName)
    .single();
  
  if (error || !data) {
    // Try new schema (with integration_id and config)
    // First get the integration_id
    const integrationNameMap: Record<string, string> = {
      'google-sheets': 'google-sheets',
      'google-gmail': 'google-sheets',
      'google-calendar': 'google-sheets',
      'google-drive': 'google-sheets',
      'google-forms': 'google-sheets',
      'google': 'google-sheets', // Legacy fallback
      'slack': 'slack',
      'github': 'webhook',
      'shopify': 'shopify',
      'hubspot': 'hubspot',
      'asana': 'asana',
      'jira': 'jira',
      'notion': 'notion',
      'airtable': 'airtable',
      'trello': 'trello',
      'discord': 'discord',
      'twitter': 'webhook',
      'paypal': 'webhook',
    };
    const integrationName = integrationNameMap[serviceName] || serviceName;
    
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('name', integrationName)
      .single();
    
    if (!integration) {
      return null;
    }
    
    // Get user_integration by integration_id and check config for service_name
    const { data: newData, error: newError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('integration_id', integration.id)
      .eq('is_active', true);
    
    if (newError || !newData || newData.length === 0) {
      return null;
    }
    
    // Find the one that matches service_name in config
    const matching = newData.find((item: any) => {
      const config = item.config || {};
      return config.service_name === serviceName || item.name === serviceName;
    });
    
    if (!matching) {
      return null;
    }
    
    data = matching;
  }
  
  if (!data) {
    return null;
  }
  
  try {
    // Decrypt tokens - handle both schemas
    const integrationData = data as any;
    let accessTokenData, refreshTokenData, tokenExpiresAt, metadata;
    
    if (integrationData.config) {
      // New schema: tokens in config
      const config = integrationData.config;
      accessTokenData = config.access_token;
      refreshTokenData = config.refresh_token;
      tokenExpiresAt = config.token_expires_at;
      metadata = config.metadata || {};
    } else {
      // Old schema: tokens in separate columns
      accessTokenData = JSON.parse(integrationData.access_token);
      refreshTokenData = integrationData.refresh_token ? JSON.parse(integrationData.refresh_token) : null;
      tokenExpiresAt = integrationData.token_expires_at;
      metadata = integrationData.metadata || {};
    }
    
    const accessToken = decrypt(
      accessTokenData.encrypted,
      accessTokenData.iv,
      accessTokenData.authTag
    );
    
    let refreshToken: string | undefined;
    if (refreshTokenData) {
      refreshToken = decrypt(
        refreshTokenData.encrypted,
        refreshTokenData.iv,
        refreshTokenData.authTag
      );
    }
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: tokenExpiresAt ? new Date(tokenExpiresAt) : undefined,
      metadata: metadata
    };
  } catch (error) {
    console.error('Error decrypting tokens:', error);
    return null;
  }
}

/**
 * Check if user has integration connected
 */
export async function hasIntegration(userId: string, serviceName: string): Promise<boolean> {
  const supabase = await createAdminClient();
  
  const { data, error } = await supabase
    .from('user_integrations')
    .select('id')
    .eq('user_id', userId)
    .eq('service_name', serviceName)
    .single();
  
  return !error && !!data;
}

/**
 * Get all integrations for a user
 */
export async function getUserIntegrations(userId: string): Promise<UserIntegration[]> {
  const supabase = await createAdminClient();
  
  // Query the new schema (with integration_id and config)
  // First try to get all user_integrations with their config
  // Only get active integrations
  const { data, error } = await supabase
    .from('user_integrations')
    .select('id, user_id, integration_id, name, config, created_at, updated_at, is_active')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  console.log('[getUserIntegrations] Query result:', { 
    count: data?.length || 0, 
    error: error?.message,
    data: data?.map((item: any) => ({
      id: item.id,
      name: item.name,
      config_service_name: item.config?.service_name,
      is_active: item.is_active
    }))
  });
  
  if (error) {
    console.error('[getUserIntegrations] Error fetching integrations:', error);
    // Fallback: try old schema if new schema fails
    const { data: oldData, error: oldError } = await supabase
      .from('user_integrations')
      .select('id, user_id, service_name, token_expires_at, metadata, created_at, updated_at')
      .eq('user_id', userId);
    
    if (oldError) {
      console.error('[getUserIntegrations] Error with old schema too:', oldError);
      return [];
    }
    
    return (oldData || []) as UserIntegration[];
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // Transform new schema to UserIntegration format
  const transformed = data.map((item: any) => {
    const config = item.config || {};
    // Extract service_name from config (we stored it there)
    const serviceName = config.service_name || item.name;
    
    return {
      id: item.id,
      user_id: item.user_id,
      service_name: serviceName,
      token_expires_at: config.token_expires_at || null,
      metadata: config.metadata || {},
      created_at: item.created_at,
      updated_at: item.updated_at
    } as UserIntegration;
  });
  
  console.log('[getUserIntegrations] Found integrations:', transformed.map(i => i.service_name));
  return transformed;
}

/**
 * Delete user integration
 */
export async function deleteUserIntegration(
  userId: string,
  serviceName: string
): Promise<boolean> {
  const supabase = await createAdminClient();
  
  console.log('[deleteUserIntegration] Deleting integration:', { userId, serviceName });
  
  // Always try new schema first (with integration_id and config) since that's what we're using
  // Get all user_integrations for this user first
  
  // Get all user_integrations for this user
  const { data: userIntegrations, error: fetchError } = await supabase
    .from('user_integrations')
    .select('id, integration_id, config, name')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (fetchError) {
    console.error('[deleteUserIntegration] Error fetching integrations:', fetchError);
    return false;
  }
  
  if (!userIntegrations || userIntegrations.length === 0) {
    console.log('[deleteUserIntegration] No integrations found for user');
    return false;
  }
  
  // Find the integration(s) that match the service_name
  const matchingIntegrations = userIntegrations.filter((item: any) => {
    const config = item.config || {};
    const matches = config.service_name === serviceName || item.name === serviceName;
    if (matches) {
      console.log('[deleteUserIntegration] Found matching integration:', {
        id: item.id,
        name: item.name,
        config_service_name: config.service_name,
        integration_id: item.integration_id
      });
    }
    return matches;
  });
  
  if (matchingIntegrations.length === 0) {
    console.log('[deleteUserIntegration] No matching integration found. Available integrations:', 
      userIntegrations.map((item: any) => ({
        id: item.id,
        name: item.name,
        config_service_name: item.config?.service_name
      }))
    );
    return false;
  }
  
  // Delete all matching integrations by setting is_active to false OR actually deleting
  // We'll actually delete them to ensure they're gone
  const idsToDelete = matchingIntegrations.map((item: any) => item.id);
  console.log('[deleteUserIntegration] Deleting integration IDs:', idsToDelete);
  
  // First try to actually delete them
  const { data: deletedData, error: deleteError } = await supabase
    .from('user_integrations')
    .delete()
    .in('id', idsToDelete)
    .select();
  
  if (deleteError) {
    console.error('[deleteUserIntegration] Error deleting integrations, trying to deactivate:', deleteError);
    // If delete fails, try to deactivate them instead
    const { error: updateError } = await supabase
      .from('user_integrations')
      .update({ is_active: false })
      .in('id', idsToDelete);
    
    if (updateError) {
      console.error('[deleteUserIntegration] Error deactivating integrations:', updateError);
      return false;
    }
    console.log('[deleteUserIntegration] Successfully deactivated integration(s)');
    return true;
  }
  
  console.log('[deleteUserIntegration] Successfully deleted integration(s):', deletedData?.length || 0, 'records');
  
  // Also try old schema delete as a fallback (in case there are records in old format)
  const { error: oldSchemaError } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('service_name', serviceName);
  
  if (!oldSchemaError) {
    console.log('[deleteUserIntegration] Also deleted from old schema format');
  }
  
  return true;
}

/**
 * Store user-provided API key or credential
 */
export async function storeIntegrationCredential(
  userId: string,
  serviceName: string,
  credentialType: string,
  credentialValue: string,
  metadata?: Record<string, any>
): Promise<IntegrationCredentials> {
  const supabase = await createAdminClient();
  
  // Encrypt credential
  const encrypted = encrypt(credentialValue);
  const encryptedData = {
    encrypted: encrypted.encrypted,
    iv: encrypted.iv,
    authTag: encrypted.authTag
  };
  
  const { data, error } = await supabase
    .from('integration_credentials')
    .upsert({
      user_id: userId,
      service_name: serviceName,
      credential_type: credentialType,
      credential_value: JSON.stringify(encryptedData),
      metadata: metadata || {},
      updated_at: new Date().toISOString()
    } as any, {
      onConflict: 'user_id,service_name,credential_type'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error storing credential:', error);
    throw new Error(`Failed to store credential: ${error.message}`);
  }
  
  return data as IntegrationCredentials;
}

/**
 * Get user-provided credential (decrypted)
 */
export async function getIntegrationCredential(
  userId: string,
  serviceName: string,
  credentialType: string
): Promise<string | null> {
  const supabase = await createAdminClient();
  
  const { data, error } = await supabase
    .from('integration_credentials')
    .select('credential_value')
    .eq('user_id', userId)
    .eq('service_name', serviceName)
    .eq('credential_type', credentialType)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  try {
    const credentialData = data as any;
    const encryptedData = JSON.parse(credentialData.credential_value);
    return decrypt(encryptedData.encrypted, encryptedData.iv, encryptedData.authTag);
  } catch (error) {
    console.error('Error decrypting credential:', error);
    return null;
  }
}

