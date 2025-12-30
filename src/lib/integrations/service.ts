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
  
  // Check if table uses integration_id (old schema) or service_name (new schema)
  // Try to detect schema by attempting a query with service_name
  let existing: any = null;
  let checkError: any = null;
  let usesIntegrationId = false;
  
  try {
    // Explicitly test for each column to detect schema
    console.log('🔍 Testing schema - checking for service_name column...');
    const serviceNameTest = await supabase
      .from('user_integrations')
      .select('service_name')
      .limit(1);
    
    if (serviceNameTest.error && serviceNameTest.error.message?.includes('column "service_name" does not exist')) {
      console.log('✅ Detected OLD schema (service_name column does not exist)');
      usesIntegrationId = true;
    } else {
      // service_name exists, check if integration_id also exists (could be both)
      console.log('🔍 service_name exists, checking for integration_id...');
      const integrationIdTest = await supabase
        .from('user_integrations')
        .select('integration_id')
        .limit(1);
      
      if (integrationIdTest.error && integrationIdTest.error.message?.includes('column "integration_id" does not exist')) {
        console.log('✅ Detected NEW schema (integration_id column does not exist)');
        usesIntegrationId = false;
      } else {
        // Both columns might exist, but if integration_id is NOT NULL, we should use it
        // Check the actual table structure by trying to insert without integration_id
        console.log('⚠️ Both columns might exist - checking constraints...');
        // Default to old schema if integration_id exists (safer)
        usesIntegrationId = true;
        console.log('✅ Defaulting to OLD schema (integration_id exists)');
      }
    }
    
    console.log('🔍 Final schema detection result:', { usesIntegrationId });
    
    // Try to find existing record
    if (usesIntegrationId) {
      console.log('📋 Using OLD schema - finding/creating integration record for:', serviceName);
      // Old schema: need to find via integration_id
      // First, find or create the integration record
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('id')
        .eq('name', serviceName)
        .maybeSingle();
      
      if (integrationError && integrationError.code !== 'PGRST116') {
        console.error('❌ Error finding integration:', integrationError);
      }
      
      let integrationId = (integration as any)?.id;
      console.log('🔍 Integration lookup result:', { integrationId, found: !!integration });
      
      // If integration doesn't exist, create it
      if (!integrationId) {
        console.log('📝 Creating new integration record for:', serviceName);
        const serviceDisplayNames: Record<string, string> = {
          google: 'Google',
          slack: 'Slack',
          github: 'GitHub',
          notion: 'Notion',
          airtable: 'Airtable',
          trello: 'Trello',
          openai: 'OpenAI',
          sendgrid: 'SendGrid',
          twilio: 'Twilio',
          stripe: 'Stripe',
          discord: 'Discord',
          twitter: 'Twitter/X',
          paypal: 'PayPal'
        };
        
        const { data: newIntegration, error: createError } = await supabase
          .from('integrations')
          .insert({
            name: serviceName,
            display_name: serviceDisplayNames[serviceName] || serviceName,
            category: 'api',
            is_active: true
          } as any)
          .select('id')
          .single();
        
        if (createError) {
          console.error('❌ Error creating integration:', createError);
          throw new Error(`Failed to create integration record: ${createError.message}`);
        }
        
        integrationId = (newIntegration as any)?.id;
        console.log('✅ Created integration record with ID:', integrationId);
      }
      
      if (!integrationId) {
        throw new Error('Failed to get or create integration ID');
      }
      
      // Now find existing user_integration using integration_id
      const { data: userIntegration, error: userIntError } = await supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('integration_id', integrationId)
        .maybeSingle();
      
      existing = userIntegration;
      checkError = userIntError;
      console.log('🔍 Existing user_integration lookup:', { existing: !!existing, error: checkError?.message });
    } else {
      console.log('📋 Using NEW schema - finding via service_name:', serviceName);
      // New schema: use service_name
      const result = await supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('service_name', serviceName)
        .maybeSingle();
      
      existing = result.data;
      checkError = result.error;
      console.log('🔍 Existing user_integration lookup (new schema):', { existing: !!existing, error: checkError?.message });
    }
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned, which is fine
      console.error('⚠️ Error checking existing integration:', checkError);
      console.error('Check error details:', {
        code: checkError.code,
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint
      });
      // Continue anyway for other errors - will try to insert
    }
  } catch (err: any) {
    console.error('❌ Exception checking existing integration:', err);
    // If it's a critical error, re-throw it
    if (err.message?.includes('Failed to create integration record') || err.message?.includes('Failed to get or create integration ID')) {
      throw err;
    }
    // Continue anyway for other errors - will try to insert
  }
  
  // Prepare integration data based on schema
  let integrationData: any;
  let integrationIdForOldSchema: string | null = null;
  
  if (usesIntegrationId) {
    console.log('📦 Preparing data for OLD schema');
    // Old schema: need integration_id and name
    // Get integration ID (should already be found/created above, but get it again to be sure)
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id')
      .eq('name', serviceName)
      .maybeSingle();
    
    if (integrationError && integrationError.code !== 'PGRST116') {
      console.error('❌ Error finding integration:', integrationError);
      throw new Error(`Failed to find integration record: ${integrationError.message}`);
    }
    
    integrationIdForOldSchema = (integration as any)?.id || null;
    
    if (!integrationIdForOldSchema) {
      // Try to create it if it doesn't exist
      console.log('📝 Integration not found, creating it...');
      const serviceDisplayNames: Record<string, string> = {
        google: 'Google',
        slack: 'Slack',
        github: 'GitHub',
        notion: 'Notion',
        airtable: 'Airtable',
        trello: 'Trello',
        openai: 'OpenAI',
        sendgrid: 'SendGrid',
        twilio: 'Twilio',
        stripe: 'Stripe',
        discord: 'Discord',
        twitter: 'Twitter/X',
        paypal: 'PayPal'
      };
      
      const { data: newIntegration, error: createError } = await supabase
        .from('integrations')
        .insert({
          name: serviceName,
          display_name: serviceDisplayNames[serviceName] || serviceName,
          category: 'api',
          is_active: true
        } as any)
        .select('id')
        .single();
      
      if (createError || !(newIntegration as any)?.id) {
        console.error('❌ Error creating integration:', createError);
        throw new Error(`Failed to create integration record: ${createError?.message || 'No ID returned'}`);
      }
      
      integrationIdForOldSchema = (newIntegration as any).id;
      console.log('✅ Created integration with ID:', integrationIdForOldSchema);
    }
    
    if (!integrationIdForOldSchema) {
      throw new Error('CRITICAL: integration_id is null/undefined - cannot proceed with old schema');
    }
    
    console.log('📦 Using integration_id:', integrationIdForOldSchema);
    integrationData = {
      user_id: userId,
      integration_id: integrationIdForOldSchema,
      name: serviceName, // User's custom name (using service name as default)
      config: {
        access_token: JSON.stringify(encryptedData.access_token),
        refresh_token: encryptedRefresh ? JSON.stringify(encryptedData.refresh_token) : null,
        token_expires_at: tokens.expires_at?.toISOString() || null,
        metadata: metadata || {}
      },
      updated_at: new Date().toISOString()
    };
    console.log('📦 Integration data prepared (old schema):', { 
      user_id: integrationData.user_id, 
      integration_id: integrationData.integration_id,
      name: integrationData.name,
      hasConfig: !!integrationData.config,
      integrationIdType: typeof integrationData.integration_id
    });
    
    // Final validation before proceeding
    if (!integrationData.integration_id) {
      throw new Error('CRITICAL: integration_id is missing from integrationData');
    }
  } else {
    console.log('📦 Preparing data for NEW schema');
    // New schema: use service_name directly
    integrationData = {
      user_id: userId,
      service_name: serviceName,
      access_token: JSON.stringify(encryptedData.access_token),
      refresh_token: encryptedRefresh ? JSON.stringify(encryptedData.refresh_token) : null,
      token_expires_at: tokens.expires_at?.toISOString() || null,
      metadata: metadata || {},
      updated_at: new Date().toISOString()
    };
    console.log('📦 Integration data prepared (new schema):', { 
      user_id: integrationData.user_id, 
      service_name: integrationData.service_name,
      hasAccessToken: !!integrationData.access_token
    });
  }
  
  let data: any;
  let error: any;
  
  if (existing?.id) {
    console.log('🔄 Updating existing integration with ID:', existing.id);
    // Update existing
    const { data: updateData, error: updateError } = await supabase
      .from('user_integrations')
      .update(integrationData)
      .eq('id', existing.id)
      .select()
      .single();
    data = updateData;
    error = updateError;
    console.log('🔄 Update result:', { success: !error, error: error?.message });
  } else {
    console.log('➕ Inserting new integration');
    console.log('➕ Insert data:', JSON.stringify(integrationData, null, 2));
    // Insert new
    const insertData = {
      ...integrationData,
      created_at: new Date().toISOString()
    };
    
    const { data: insertDataResult, error: insertError } = await supabase
      .from('user_integrations')
      .insert(insertData)
      .select()
      .single();
    data = insertDataResult;
    error = insertError;
    console.log('➕ Insert result:', { success: !error, error: error?.message, dataId: data?.id });
  }
  
  if (error) {
    console.error('Error storing integration:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    console.error('Integration data attempted:', { userId, serviceName, hasAccessToken: !!tokens.access_token, usesIntegrationId });
    
    // Check for schema errors
    if (error.message?.includes('column') && error.message?.includes('does not exist')) {
      throw new Error(`Database schema error: ${error.message}. Please run the migration SQL from INTEGRATIONS_COMPLETE_GUIDE.md to add the required columns (service_name, access_token, refresh_token, token_expires_at, metadata) to the user_integrations table.`);
    }
    
    throw new Error(`Failed to store integration: ${error.message || JSON.stringify(error)}`);
  }
  
  if (!data) {
    console.error('No data returned from integration store operation');
    throw new Error('Failed to store integration: No data returned');
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
  
  // Try new schema first (service_name)
  let data: any = null;
  let error: any = null;
  
  const newSchemaResult = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('service_name', serviceName)
    .maybeSingle();
  
  if (newSchemaResult.error && newSchemaResult.error.message?.includes('column "service_name" does not exist')) {
    // Old schema: need to find via integration_id
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('name', serviceName)
      .maybeSingle();
    
    if (!integration?.id) {
      return null;
    }
    
    const oldSchemaResult = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('integration_id', integration.id)
      .maybeSingle();
    
    data = oldSchemaResult.data;
    error = oldSchemaResult.error;
  } else {
    data = newSchemaResult.data;
    error = newSchemaResult.error;
  }
  
  if (error || !data) {
    return null;
  }
  
  try {
    // Decrypt tokens
    const accessTokenData = JSON.parse(data.access_token);
    const accessToken = decrypt(
      accessTokenData.encrypted,
      accessTokenData.iv,
      accessTokenData.authTag
    );
    
    let refreshToken: string | undefined;
    if (data.refresh_token) {
      const refreshTokenData = JSON.parse(data.refresh_token);
      refreshToken = decrypt(
        refreshTokenData.encrypted,
        refreshTokenData.iv,
        refreshTokenData.authTag
      );
    }
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: data.token_expires_at ? new Date(data.token_expires_at) : undefined,
      metadata: data.metadata || {}
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
  
  // Try new schema first
  const newSchemaResult = await supabase
    .from('user_integrations')
    .select('id')
    .eq('user_id', userId)
    .eq('service_name', serviceName)
    .maybeSingle();
  
  if (newSchemaResult.error && newSchemaResult.error.message?.includes('column "service_name" does not exist')) {
    // Old schema: find via integration_id
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('name', serviceName)
      .maybeSingle();
    
    if (!integration?.id) {
      return false;
    }
    
    const oldSchemaResult = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', integration.id)
      .maybeSingle();
    
    return !oldSchemaResult.error && !!oldSchemaResult.data;
  }
  
  return !newSchemaResult.error && !!newSchemaResult.data;
}

/**
 * Get all integrations for a user
 */
export async function getUserIntegrations(userId: string): Promise<UserIntegration[]> {
  const supabase = await createAdminClient();
  
  // Try new schema first
  const newSchemaResult = await supabase
    .from('user_integrations')
    .select('id, user_id, service_name, token_expires_at, metadata, created_at, updated_at, integration_id, config')
    .eq('user_id', userId);
  
  console.log('📋 getUserIntegrations - raw result:', {
    error: newSchemaResult.error?.message,
    count: newSchemaResult.data?.length || 0,
    sample: newSchemaResult.data?.[0] ? {
      id: newSchemaResult.data[0].id,
      hasServiceName: !!newSchemaResult.data[0].service_name,
      hasIntegrationId: !!newSchemaResult.data[0].integration_id,
      serviceName: newSchemaResult.data[0].service_name,
      integrationId: newSchemaResult.data[0].integration_id
    } : null
  });
  
  // Check if we need to use old schema (either column doesn't exist, or service_name is null but integration_id exists)
  const needsOldSchema = newSchemaResult.error && newSchemaResult.error.message?.includes('column "service_name" does not exist') ||
    (newSchemaResult.data && newSchemaResult.data.length > 0 && 
     newSchemaResult.data.some((item: any) => !item.service_name && item.integration_id));
  
  console.log('📋 Schema detection for getUserIntegrations:', { needsOldSchema });
  
  if (needsOldSchema) {
    // Old schema: need to join with integrations table
    console.log('📋 Using OLD schema for getUserIntegrations - joining with integrations table');
    
    // First, get all user_integrations
    const { data: userIntegrations, error: userIntError } = await supabase
      .from('user_integrations')
      .select('id, user_id, integration_id, created_at, updated_at, config')
      .eq('user_id', userId);
    
    if (userIntError) {
      console.error('❌ Error fetching user_integrations:', userIntError);
      return [];
    }
    
    if (!userIntegrations || userIntegrations.length === 0) {
      return [];
    }
    
    // Get all unique integration IDs
    const integrationIds = [...new Set(userIntegrations.map((ui: any) => ui.integration_id).filter(Boolean))];
    
    // Fetch all integrations
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations')
      .select('id, name')
      .in('id', integrationIds);
    
    if (integrationsError) {
      console.error('❌ Error fetching integrations:', integrationsError);
      return [];
    }
    
    // Create a map of integration_id -> name
    const integrationMap = new Map((integrations || []).map((int: any) => [int.id, int.name]));
    
    console.log('📋 Integration map:', Array.from(integrationMap.entries()));
    
    // Map old schema to new schema format
    return (userIntegrations || [])
      .map((item: any) => {
        const serviceName = integrationMap.get(item.integration_id);
        
        // Only include if we have a valid service name
        if (!serviceName) {
          console.warn('⚠️ User integration missing service name from integrations table:', { 
            userIntegrationId: item.id, 
            integrationId: item.integration_id 
          });
          return null;
        }
        
        const config = item.config || {};
        
        return {
          id: item.id,
          user_id: item.user_id,
          service_name: serviceName,
          token_expires_at: config.token_expires_at || null,
          metadata: config.metadata || {},
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      })
      .filter((item: any) => item !== null) as UserIntegration[];
  }
  
  if (newSchemaResult.error) {
    console.error('Error fetching integrations:', newSchemaResult.error);
    return [];
  }
  
  // Filter out any items with null service_name (they should have been handled by old schema path)
  const validIntegrations = (newSchemaResult.data || []).filter((item: any) => item.service_name);
  
  // If we have items with integration_id but no service_name, we need to look them up
  const itemsNeedingLookup = (newSchemaResult.data || []).filter((item: any) => !item.service_name && item.integration_id);
  
  if (itemsNeedingLookup.length > 0) {
    console.log('📋 Found items with integration_id but no service_name, looking up...', itemsNeedingLookup.length);
    
    const integrationIds = [...new Set(itemsNeedingLookup.map((item: any) => item.integration_id).filter(Boolean))];
    
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations')
      .select('id, name')
      .in('id', integrationIds);
    
    if (!integrationsError && integrations) {
      const integrationMap = new Map(integrations.map((int: any) => [int.id, int.name]));
      
      const mappedItems = itemsNeedingLookup
        .map((item: any) => {
          const serviceName = integrationMap.get(item.integration_id);
          if (!serviceName) {
            console.warn('⚠️ Could not find service name for integration_id:', item.integration_id);
            return null;
          }
          
          const config = typeof item.config === 'string' ? JSON.parse(item.config) : (item.config || {});
          
          return {
            id: item.id,
            user_id: item.user_id,
            service_name: serviceName,
            token_expires_at: config.token_expires_at || item.token_expires_at || null,
            metadata: config.metadata || item.metadata || {},
            created_at: item.created_at,
            updated_at: item.updated_at
          };
        })
        .filter((item: any) => item !== null);
      
      return [...validIntegrations, ...mappedItems] as UserIntegration[];
    }
  }
  
  return validIntegrations as UserIntegration[];
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
    }, {
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
    const encryptedData = JSON.parse(data.credential_value);
    return decrypt(encryptedData.encrypted, encryptedData.iv, encryptedData.authTag);
  } catch (error) {
    console.error('Error decrypting credential:', error);
    return null;
  }
}

