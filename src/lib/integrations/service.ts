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
  
  // Encrypt tokens
  const encryptedAccess = encrypt(tokens.access_token);
  const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
  
  // Store encrypted tokens in metadata format
  const encryptedData = {
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
    })
  };
  
  const { data, error } = await supabase
    .from('user_integrations')
    .upsert({
      user_id: userId,
      service_name: serviceName,
      access_token: JSON.stringify(encryptedData.access_token),
      refresh_token: encryptedRefresh ? JSON.stringify(encryptedData.refresh_token) : null,
      token_expires_at: tokens.expires_at?.toISOString() || null,
      metadata: metadata || {},
      updated_at: new Date().toISOString()
    } as any, {
      onConflict: 'user_id,service_name'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error storing integration:', error);
    throw new Error(`Failed to store integration: ${error.message}`);
  }
  
  return data as UserIntegration;
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
  
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('service_name', serviceName)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  try {
    // Decrypt tokens
    const integrationData = data as any;
    const accessTokenData = JSON.parse(integrationData.access_token);
    const accessToken = decrypt(
      accessTokenData.encrypted,
      accessTokenData.iv,
      accessTokenData.authTag
    );
    
    let refreshToken: string | undefined;
    if (integrationData.refresh_token) {
      const refreshTokenData = JSON.parse(integrationData.refresh_token);
      refreshToken = decrypt(
        refreshTokenData.encrypted,
        refreshTokenData.iv,
        refreshTokenData.authTag
      );
    }
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: integrationData.token_expires_at ? new Date(integrationData.token_expires_at) : undefined,
      metadata: integrationData.metadata || {}
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
  
  const { data, error } = await supabase
    .from('user_integrations')
    .select('id, user_id, service_name, token_expires_at, metadata, created_at, updated_at')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching integrations:', error);
    return [];
  }
  
  return (data || []) as UserIntegration[];
}

/**
 * Delete user integration
 */
export async function deleteUserIntegration(
  userId: string,
  serviceName: string
): Promise<boolean> {
  const supabase = await createAdminClient();
  
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('service_name', serviceName);
  
  if (error) {
    console.error('Error deleting integration:', error);
    return false;
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

