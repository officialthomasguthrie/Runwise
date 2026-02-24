/**
 * Integration-Aware Field Component
 * Renders fields that require integrations (Google Sheets, Slack, GitHub, Notion, Airtable, Trello, etc.)
 */

'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ExternalLink } from 'lucide-react';

interface IntegrationFieldProps {
  fieldKey: string;
  fieldSchema: any;
  value: any;
  onChange: (value: any) => void;
  nodeId: string;
  serviceName: 'google' | 'google-sheets' | 'google-gmail' | 'google-calendar' | 'google-drive' | 'google-forms' | 'slack' | 'github' | 'notion' | 'airtable' | 'trello' | 'openai' | 'sendgrid' | 'twilio' | 'stripe' | 'discord' | 'twitter' | 'paypal' | 'shopify' | 'hubspot' | 'asana' | 'jira';
  resourceType?: 'spreadsheet' | 'sheet' | 'column' | 'channel' | 'repository' | 'database' | 'base' | 'table' | 'field' | 'board' | 'list' | 'calendar' | 'folder' | 'label' | 'form' | 'guild';
  parentValue?: any; // For dependent fields (e.g., sheet depends on spreadsheet)
  onParentChange?: (value: any) => void;
  credentialType?: 'oauth' | 'api_token' | 'api_key_and_token'; // How to authenticate
  onConnected?: () => void; // Optional callback when connection is successfully established
}

export function IntegrationField({
  fieldKey,
  fieldSchema,
  value,
  onChange,
  nodeId,
  serviceName,
  resourceType,
  parentValue,
  onParentChange,
  credentialType = 'oauth',
  onConnected,
}: IntegrationFieldProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [tokenInput2, setTokenInput2] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Handle theme mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check integration status
  useEffect(() => {
    checkIntegrationStatus();
  }, []);

  // Fetch resources when connected and needed
  // For dependent fields (with parentValue), also fetch when parent is selected
  useEffect(() => {
    if (isConnected === true && resourceType && !resources.length && !isLoading) {
      // For dependent fields, only fetch if parentValue is provided
      if (parentValue || !parentValue) {
      fetchResources();
      }
    }
  }, [isConnected, resourceType, parentValue]);

  // Helper function to safely parse JSON from response
  const safeParseJSON = async (response: Response): Promise<any> => {
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    // If response is empty, return error
    if (!text || text.trim().length === 0) {
      return { error: 'Empty response from server' };
    }
    
    // If response is not JSON, return error object with text
    if (!contentType || !contentType.includes('application/json')) {
      return { error: text || 'Invalid response format' };
    }
    
    // Try to parse as JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      // If parsing fails, return the text as error
      return { error: text || 'Failed to parse response' };
    }
  };

  // Helper to get display label for resource type
  const getResourceLabel = () => {
    const labels: Record<string, string> = {
      spreadsheet: 'Spreadsheet',
      sheet: 'Sheet',
      column: 'Column',
      channel: 'Channel',
      guild: 'Server',
      repository: 'Repository',
      database: 'Database',
      base: 'Base',
      table: 'Table',
      field: 'Field',
      board: 'Board',
      list: 'List',
      calendar: 'Calendar',
      folder: 'Folder',
      label: 'Label',
      form: 'Form',
    };
    return labels[resourceType || ''] || resourceType || 'Resource';
  };

  const checkIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status');
      if (!response.ok) throw new Error('Failed to check status');
      
      const data = await safeParseJSON(response);
      if (data.error) {
        throw new Error(data.error);
      }
      
      // For Google services, check the specific service
      if (serviceName.startsWith('google-')) {
        const integration = data.integrations?.find((i: any) => i.service === serviceName);
        setIsConnected(!!integration?.connected);
      } else if (serviceName === 'google') {
        // Fallback: check if any Google service is connected
      const googleServices = ['google', 'google-sheets', 'google-gmail', 'google-calendar', 'google-drive', 'google-forms'];
        const hasGoogleConnection = data.integrations?.some((i: any) => 
          googleServices.includes(i.service) && i.connected
        );
        setIsConnected(hasGoogleConnection);
      } else {
      const integration = data.integrations?.find((i: any) => i.service === serviceName);
      setIsConnected(!!integration?.connected);
      }
    } catch (error) {
      console.error('Error checking integration status:', error);
      setIsConnected(false);
    }
  };

  // Check for OAuth success after redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success || error) {
      // Remove query parameters from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Refresh integration status
      checkIntegrationStatus();
      
      // If connected and we have a resource type, fetch resources
      if (success && resourceType) {
        setTimeout(() => {
          fetchResources();
        }, 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const saveToken = async (token: string, type: string = 'api_token') => {
    setIsSavingToken(true);
    setError(null);
    
    try {
      const response = await fetch('/api/integrations/store-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName,
          credentialType: type,
          credentialValue: token
        })
      });
      
      if (!response.ok) {
        const errorData = await safeParseJSON(response);
        throw new Error(errorData.error || errorData.message || 'Failed to save token');
      }
      
      setTokenInput('');
      setApiKeyInput('');
      setTokenInput2('');
      setIsConnected(true);
      // Notify parent (e.g., workflow node) so it can refresh its own integration status
      if (onConnected) {
        try {
          await onConnected();
        } catch (e) {
          console.error('Error in onConnected callback:', e);
        }
      }
      // Fetch resources immediately after saving
      if (resourceType) {
        await fetchResources();
      }
    } catch (error: any) {
      console.error('Error saving token:', error);
      setError(error.message || 'Failed to save token');
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (credentialType === 'api_key_and_token') {
      if (!apiKeyInput.trim() || !tokenInput2.trim()) {
        setError('Both API key and token are required');
        return;
      }
      // Save both - for Twilio, use account_sid and auth_token
      if (serviceName === 'twilio') {
        await saveToken(apiKeyInput.trim(), 'account_sid');
        await saveToken(tokenInput2.trim(), 'auth_token');
      } else {
        // For Trello and others
      await saveToken(apiKeyInput.trim(), 'api_key');
      await saveToken(tokenInput2.trim(), 'token');
      }
    } else {
      if (!tokenInput.trim()) {
        setError('API key is required');
        return;
      }
      // For OpenAI, save as 'api_key', for Stripe save as 'secret_key', for others save as 'api_token'
      let credentialTypeToSave = 'api_token';
      if (serviceName === 'openai') {
        credentialTypeToSave = 'api_key';
      } else if (serviceName === 'stripe') {
        credentialTypeToSave = 'secret_key';
      } else if (serviceName === 'sendgrid') {
        credentialTypeToSave = 'api_key';
      } else if (serviceName === 'discord') {
        credentialTypeToSave = 'bot_token';
      }
      await saveToken(tokenInput.trim(), credentialTypeToSave);
    }
  };

  const fetchResources = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = '';
      
      // For Google services, use the specific service name
      if (serviceName === 'google' || serviceName.startsWith('google-')) {
        // Determine which Google service based on serviceName or resourceType
        const googleService = serviceName.startsWith('google-') ? serviceName : 
          resourceType === 'calendar' ? 'google-calendar' :
          resourceType === 'folder' ? 'google-drive' :
          resourceType === 'label' ? 'google-gmail' :
          resourceType === 'form' ? 'google-forms' :
          'google-sheets'; // Default to sheets
        
        if (resourceType === 'spreadsheet') {
          url = '/api/integrations/google/spreadsheets';
        } else if (resourceType === 'sheet' && parentValue) {
          url = `/api/integrations/google/sheets/${parentValue}`;
        } else if (resourceType === 'column' && parentValue) {
          const { spreadsheetId, sheetName } = parentValue;
          url = `/api/integrations/google/columns/${spreadsheetId}/${encodeURIComponent(sheetName)}`;
        } else if (resourceType === 'calendar') {
          url = '/api/integrations/google/calendars';
        } else if (resourceType === 'folder') {
          const parentFolderId = parentValue ? `?parentFolderId=${parentValue}` : '';
          url = `/api/integrations/google/drive/folders${parentFolderId}`;
        } else if (resourceType === 'label') {
          url = '/api/integrations/google/gmail/labels';
        } else if (resourceType === 'form') {
          url = '/api/integrations/google/forms';
        }
      } else if (serviceName === 'slack') {
        if (resourceType === 'channel') {
          url = '/api/integrations/slack/channels';
        }
      } else if (serviceName === 'github') {
        if (resourceType === 'repository') {
          url = '/api/integrations/github/repositories';
        }
      } else if (serviceName === 'notion') {
        if (resourceType === 'database') {
          url = '/api/integrations/notion/databases';
        }
      } else if (serviceName === 'airtable') {
        if (resourceType === 'base') {
          url = '/api/integrations/airtable/bases';
        } else if (resourceType === 'table' && parentValue) {
          url = `/api/integrations/airtable/tables/${parentValue}`;
        } else if (resourceType === 'field' && parentValue) {
          const { baseId, tableId } = parentValue;
          url = `/api/integrations/airtable/fields/${baseId}/${tableId}`;
        }
      } else if (serviceName === 'trello') {
        if (resourceType === 'board') {
          url = '/api/integrations/trello/boards';
        } else if (resourceType === 'list' && parentValue) {
          url = `/api/integrations/trello/lists/${parentValue}`;
        }
      } else if (serviceName === 'discord') {
        if (resourceType === 'guild') {
          url = '/api/integrations/discord/guilds';
        } else if (resourceType === 'channel' && parentValue) {
          url = `/api/integrations/discord/channels?guildId=${parentValue}`;
        } else if (resourceType === 'channel') {
          // Fetch all channels from all guilds
          url = '/api/integrations/discord/channels/all';
        }
      }

      if (!url) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await safeParseJSON(response);
        if (errorData.code === 'NOT_CONNECTED') {
          setIsConnected(false);
          return;
        }
        throw new Error(errorData.error || errorData.message || 'Failed to fetch resources');
      }

      const data = await safeParseJSON(response);
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (resourceType === 'spreadsheet') {
        setResources(data.spreadsheets || []);
      } else if (resourceType === 'sheet') {
        setResources(data.sheets || []);
      } else if (resourceType === 'column') {
        setResources(data.columns || []);
      } else if (resourceType === 'channel') {
        setResources(data.channels || []);
      } else if (resourceType === 'repository') {
        setResources(data.repositories || []);
      } else if (resourceType === 'database') {
        setResources(data.databases || []);
      } else if (resourceType === 'base') {
        setResources(data.bases || []);
      } else if (resourceType === 'table') {
        setResources(data.tables || []);
      } else if (resourceType === 'field') {
        setResources(data.fields || []);
      } else if (resourceType === 'board') {
        setResources(data.boards || []);
      } else if (resourceType === 'list') {
        setResources(data.lists || []);
      } else if (resourceType === 'calendar') {
        setResources(data.calendars || []);
      } else if (resourceType === 'folder') {
        setResources(data.folders || []);
      } else if (resourceType === 'label') {
        setResources(data.labels || []);
      } else if (resourceType === 'form') {
        setResources(data.forms || []);
      } else if (resourceType === 'guild') {
        setResources(data.guilds || []);
      }
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      const errorMessage = error.message || 'Failed to load resources';
      setError(errorMessage);
      
      // If error suggests invalid credentials (for API key/token integrations), reset connection state
      // so user can re-enter credentials
      if (credentialType !== 'oauth' && (
        errorMessage.toLowerCase().includes('invalid') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('authentication') ||
        errorMessage.toLowerCase().includes('forbidden')
      )) {
        setIsConnected(false);
        // Clear stored inputs so user can retry
        setTokenInput('');
        setApiKeyInput('');
        setTokenInput2('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    // Determine the base service name and specific service for Google
    let baseService = serviceName;
    let specificService = serviceName;
    
    // For Google services, use 'google' as base service and pass specific service as query param
    if (serviceName.startsWith('google-')) {
      baseService = 'google';
      specificService = serviceName;
    }
    
    // Shopify requires shop parameter - prompt user for shop domain
    if (serviceName === 'shopify') {
      const shop = prompt('Enter your Shopify shop domain (e.g., "mystore" or "mystore.myshopify.com"):');
      if (!shop || !shop.trim()) {
        return; // User cancelled or didn't enter shop
      }
      
      // Get current workspace URL if we're in a workspace
      const currentPath = window.location.pathname;
      const isWorkspace = currentPath.startsWith('/workspace/');
      const returnUrl = isWorkspace ? currentPath : undefined;
      
      // Build OAuth connect URL with shop parameter
      let connectUrl = `/api/auth/connect/${baseService}?shop=${encodeURIComponent(shop.trim())}`;
      if (returnUrl) {
        connectUrl += `&returnUrl=${encodeURIComponent(returnUrl)}`;
      }
      
      window.location.href = connectUrl;
      return;
    }
    
    // Get current workspace URL if we're in a workspace
    const currentPath = window.location.pathname;
    const isWorkspace = currentPath.startsWith('/workspace/');
    const returnUrl = isWorkspace ? currentPath : undefined;
    
    // Build OAuth connect URL
    let connectUrl = `/api/auth/connect/${baseService}`;
    const params = new URLSearchParams();
    
    // For Google services, pass the specific service name
    if (baseService === 'google') {
      params.set('service', specificService);
    }
    
    // Pass return URL if we're in a workspace
    if (returnUrl) {
      params.set('returnUrl', returnUrl);
    }
    
    if (params.toString()) {
      connectUrl += `?${params.toString()}`;
    }
    
    window.location.href = connectUrl;
  };

  const handleDisconnect = async () => {
    if (!serviceName) return;
    
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceName: serviceName }),
      });

      if (!response.ok) {
        const errorData = await safeParseJSON(response);
        throw new Error(errorData.error || errorData.message || 'Failed to disconnect');
      }

      // Wait a bit for the API to process, then re-check status
      setTimeout(async () => {
        await checkIntegrationStatus();
        setResources([]);
        setError(null);
        setIsDisconnecting(false);
      }, 500);
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      setError(error.message || 'Failed to disconnect');
      setIsDisconnecting(false);
    }
  };

  // Map serviceName to slug for logo lookup
  const getServiceSlug = (): string | null => {
    const serviceSlugMap: Record<string, string> = {
      'google-sheets': 'googlesheets',
      'google-gmail': 'gmail',
      'google-calendar': 'googlecalendar',
      'google-drive': 'googledrive',
      'google-forms': 'googleforms',
      'slack': 'slack',
      'github': 'github',
      'notion': 'notion',
      'airtable': 'airtable',
      'trello': 'trello',
      'shopify': 'shopify',
      'hubspot': 'hubspot',
      'asana': 'asana',
      'jira': 'jira',
      'discord': 'discord',
      'twitter': 'x',
      'paypal': 'paypal',
      'openai': 'openai',
      'sendgrid': 'sendgrid',
      'twilio': 'twilio',
      'stripe': 'stripe'
    };
    return serviceSlugMap[serviceName] || null;
  };

  // Get logo URL (same logic as integrations-settings.tsx)
  const getLogoUrl = (slug: string): string | null => {
    if (!mounted || !theme) return null;
    const isDark = theme === 'dark';
    const clientId = '1dxbfHSJFAPEGdCLU4o5B';
    
    const brandfetchLogos: Record<string, { light?: string; dark?: string }> = {
      'googlesheets': { dark: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idKa2XnbFY.svg?c=${clientId}` },
      'slack': { dark: `https://cdn.brandfetch.io/idJ_HhtG0Z/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
      'gmail': { dark: `https://cdn.brandfetch.io/id5o3EIREg/theme/dark/symbol.svg?c=${clientId}` },
      'googlecalendar': { dark: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idMX2_OMSc.svg?c=${clientId}` },
      'googledrive': { dark: `https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/idncaAgFGT.svg?c=${clientId}` },
      'github': {
        light: `https://cdn.brandfetch.io/idZAyF9rlg/theme/light/symbol.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idZAyF9rlg/w/800/h/784/theme/light/symbol.png?c=${clientId}`
      },
      'trello': { dark: `https://cdn.brandfetch.io/idToc8bDY1/theme/dark/symbol.svg?c=${clientId}` },
      'notion': { dark: `https://cdn.brandfetch.io/idPYUoikV7/theme/dark/symbol.svg?c=${clientId}` },
      'shopify': { dark: `https://cdn.brandfetch.io/idAgPm7IvG/theme/dark/symbol.svg?c=${clientId}` },
      'hubspot': { dark: `https://cdn.brandfetch.io/idRt0LuzRf/theme/dark/symbol.svg?c=${clientId}` },
      'discord': { dark: `https://cdn.brandfetch.io/idM8Hlme1a/theme/dark/symbol.svg?c=${clientId}` },
      'airtable': { dark: `https://cdn.brandfetch.io/iddsnRzkxS/theme/dark/symbol.svg?c=${clientId}` },
      'x': {
        light: `https://cdn.brandfetch.io/idS5WhqBbM/theme/dark/logo.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idS5WhqBbM/theme/light/logo.svg?c=${clientId}`
      },
      'asana': { dark: `https://cdn.brandfetch.io/idxPi2Evsk/w/400/h/400/theme/dark/icon.jpeg?c=${clientId}` },
      'jira': { dark: `https://cdn.brandfetch.io/idchmboHEZ/theme/dark/symbol.svg?c=${clientId}` },
      'paypal': { dark: `https://cdn.brandfetch.io/id-Wd4a4TS/theme/dark/symbol.svg?c=${clientId}` },
      'openai': {
        light: `https://cdn.brandfetch.io/idR3duQxYl/theme/dark/symbol.svg?c=${clientId}`,
        dark: `https://cdn.brandfetch.io/idR3duQxYl/w/800/h/800/theme/light/symbol.png?c=${clientId}`
      },
      'sendgrid': { dark: `https://cdn.brandfetch.io/idHHcfw5Qu/theme/dark/symbol.svg?c=${clientId}` },
      'twilio': { dark: `https://cdn.brandfetch.io/idT7wVo_zL/theme/dark/symbol.svg?c=${clientId}` },
      'stripe': { dark: `https://cdn.brandfetch.io/idxAg10C0L/w/480/h/480/theme/dark/icon.jpeg?c=${clientId}` },
      // Google Forms uses a custom logo URL provided by user
      'googleforms': { dark: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Google_Forms_logo_%282014-2020%29.svg/1489px-Google_Forms_logo_%282014-2020%29.svg.png' }
    };

    const logoConfig = brandfetchLogos[slug];
    if (logoConfig) {
      if (isDark && logoConfig.dark) {
        return logoConfig.dark;
      } else if (!isDark && logoConfig.light) {
        return logoConfig.light;
      } else if (logoConfig.dark) {
        return logoConfig.dark;
      }
    }
    
    return null;
  };

  const getServiceDisplayName = () => {
    const names: Record<string, string> = {
      google: 'Google',
      'google-sheets': 'Google Sheets',
      'google-gmail': 'Gmail',
      'google-calendar': 'Google Calendar',
      'google-drive': 'Google Drive',
      'google-forms': 'Google Forms',
      slack: 'Slack',
      github: 'GitHub',
      notion: 'Notion',
      airtable: 'Airtable',
      trello: 'Trello',
      shopify: 'Shopify',
      hubspot: 'HubSpot',
      asana: 'Asana',
      jira: 'Jira',
      openai: 'OpenAI',
      sendgrid: 'SendGrid',
      twilio: 'Twilio',
      stripe: 'Stripe',
      discord: 'Discord',
      twitter: 'Twitter/X'
    };
    return names[serviceName] || serviceName;
  };

  const getTokenPlaceholder = () => {
    if (serviceName === 'notion') {
      return 'secret_... or ntn_...';
    } else if (serviceName === 'airtable') {
      return 'pat...';
    } else if (serviceName === 'github') {
      return 'ghp_... (Personal Access Token)';
    } else if (serviceName === 'openai') {
      return 'sk-...';
    } else if (serviceName === 'sendgrid') {
      return 'SG....';
    } else if (serviceName === 'twilio') {
      return 'Account SID';
    } else if (serviceName === 'stripe') {
      return 'sk_live_... or sk_test_...';
    } else if (serviceName === 'discord') {
      return 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTA.Xxxxxx...';
    }
    return 'Enter your API token';
  };

  // Not connected - show connect/input based on credential type
  // BUT: Don't show connect button for dependent fields (fields with parentValue)
  // Dependent fields should only be rendered when parent is selected AND integration is connected
  // If we're here with a dependent field and not connected, it means connection check is still loading
  if (isConnected === false) {
    // For dependent fields, show loading state instead of connect button
    // This handles the case where connection check hasn't completed yet
    if (parentValue) {
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {fieldSchema?.label || getResourceLabel()}
            {fieldSchema?.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking connection...</span>
          </div>
        </div>
      );
    }
    
    if (credentialType === 'oauth') {
      // OAuth services (Google, Slack, GitHub)
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Connect
            {fieldSchema?.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {fieldSchema.description || 'Connect your account to select resources'}
            </p>
            <Button
              type="button"
              onClick={handleConnect}
              variant="ghost"
              className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-none dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
            >
              {(() => {
                const slug = getServiceSlug();
                const logoUrl = slug ? getLogoUrl(slug) : null;
                const isOpenAI = slug === 'openai';
                return logoUrl ? (
                  <>
                    <img 
                      src={logoUrl} 
                      alt={getServiceDisplayName()} 
                      className={isOpenAI ? "h-5 w-5 mr-2 object-contain" : "h-4 w-4 mr-2 object-contain"}
                    />
                    Connect
                  </>
                ) : (
                  <>
              <ExternalLink className="h-3 w-3 mr-2" />
                    Connect
                  </>
                );
              })()}
            </Button>
          </div>
        </div>
      );
    } else if (credentialType === 'api_key_and_token' || credentialType === 'api_token') {
      // API key/token services - show Connect button that opens modal
      // Only show modal for services that have schemas defined
      const supportedServices = ['openai', 'sendgrid', 'twilio', 'discord', 'stripe', 'twitter'];
      
      if (supportedServices.includes(serviceName)) {
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Connect
            {fieldSchema?.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
                {fieldSchema?.description || `Connect your ${getServiceDisplayName()} account`}
              </p>
            <Button
              type="button"
                onClick={() => {
                  // Open connection window popup
                  const width = 600;
                  const height = 700;
                  const left = (window.screen.width - width) / 2;
                  const top = (window.screen.height - height) / 2;
                  
                  const popup = window.open(
                    `/integrations/connect?service=${encodeURIComponent(serviceName)}`,
                    'ConnectIntegration',
                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
                  );
                  
                  // Listen for connection success
                  const handleMessage = (event: MessageEvent) => {
                    if (event.origin !== window.location.origin) return;
                    
                    if (event.data.type === 'integration-connected' && event.data.service === serviceName) {
                      // Refresh connection status
                      checkIntegrationStatus();
                      if (onConnected) {
                        onConnected();
                      }
                      window.removeEventListener('message', handleMessage);
                    } else if (event.data.type === 'integration-connection-cancelled') {
                      window.removeEventListener('message', handleMessage);
                    }
                  };
                  
                  window.addEventListener('message', handleMessage);
                }}
              variant="ghost"
              className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-none dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
              >
                  {(() => {
                    const slug = getServiceSlug();
                    const logoUrl = slug ? getLogoUrl(slug) : null;
                  const isOpenAI = slug === 'openai';
                    return logoUrl ? (
                      <>
                        <img 
                          src={logoUrl} 
                          alt={getServiceDisplayName()} 
                        className={isOpenAI ? "h-5 w-5 mr-2 object-contain" : "h-4 w-4 mr-2 object-contain"}
                        />
                      Connect
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3 w-3 mr-2" />
                      Connect
                      </>
                    );
                  })()}
            </Button>
          </div>
        </div>
      );
      }
      
      // Fallback for unsupported services - show inline form
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Connect
            {fieldSchema?.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="space-y-2">
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {serviceName === 'twilio' 
                ? 'Enter your Twilio Account SID and Auth Token to use Twilio services'
                : `Enter your ${getServiceDisplayName()} ${credentialType === 'api_key_and_token' ? 'API key and token' : 'API token'} to ${serviceName === 'openai' ? 'connect' : 'select resources'}`}
            </p>
            {credentialType === 'api_key_and_token' ? (
              <>
                <Input
                  type="text"
                  placeholder="API Key"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
                />
                <Input
                  type="text"
                  placeholder="Token"
                  value={tokenInput2}
                  onChange={(e) => setTokenInput2(e.target.value)}
                  className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
                />
              </>
            ) : (
            <Input
              type="text"
              placeholder={getTokenPlaceholder()}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
            />
            )}
            <Button
              type="button"
              onClick={handleSaveCredentials}
              variant="ghost"
              className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-none dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
              disabled={isSavingToken}
            >
              {isSavingToken ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {(() => {
                    const slug = getServiceSlug();
                    const logoUrl = slug ? getLogoUrl(slug) : null;
                    const isOpenAI = slug === 'openai';
                    return logoUrl ? (
                      <>
                        <img 
                          src={logoUrl} 
                          alt={getServiceDisplayName()} 
                          className={isOpenAI ? "h-5 w-5 mr-2 object-contain" : "h-4 w-4 mr-2 object-contain"}
                        />
                        Save & Connect
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Save & Connect
                      </>
                    );
                  })()}
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }
  }

  // Loading resources
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading resources...</span>
      </div>
    );
  }

  // Error state - only show standalone error if connected via OAuth (since they can't retry here)
  // For API key/token integrations with errors, connection form should already be shown above
  if (error && isConnected === true && credentialType === 'oauth') {
    return (
      <div className="text-xs text-red-500">
        {error}
      </div>
    );
  }

  // Resource picker dropdown - only show when connected and resources are loaded
  // For Discord channels, only show after channels have been fetched
  if (isConnected === true && resources.length > 0) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {getResourceLabel()}
          {fieldSchema?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <Select
          value={value || ''}
          onValueChange={onChange}
        >
          <SelectTrigger className="nodrag w-full text-sm rounded-md border border-gray-300 dark:border-white/10 !bg-white/70 dark:!bg-white/5 backdrop-blur-xl px-3 py-2 h-auto text-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300">
            <SelectValue placeholder={`Select ${getResourceLabel().toLowerCase()}...`} />
          </SelectTrigger>
        <SelectContent className="backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-lg max-h-[300px]">
          {resources.map((resource) => (
            <SelectItem key={resource.id || resource.name} value={resource.id || resource.name}>
              {resource.name || resource.title || resource.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      </div>
    );
  }

  // Still loading or checking connection
  if (isConnected === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking connection...</span>
      </div>
    );
  }

  // Connected but no resources yet or still loading
  // For Discord channels specifically, show loading state until channels are fetched
  if (isConnected === true && serviceName === 'discord' && resourceType === 'channel') {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading channels...</span>
        </div>
      );
    }
    
    if (resources.length === 0 && !error) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading channels...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-xs text-red-500">
          {error}
        </div>
      );
    }
  }

  // For API token fields when service is already connected (e.g., bot token for Discord)
  // Show input field to add additional credentials
  if (isConnected === true && credentialType === 'api_token' && !resourceType) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {fieldSchema?.label || 'Bot Token'}
          {fieldSchema?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="space-y-2">
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {fieldSchema?.description || `Enter your ${getServiceDisplayName()} ${serviceName === 'discord' ? 'bot token' : 'token'} to ${serviceName === 'discord' ? 'access channels and send messages' : 'use this service'}`}
          </p>
          <Input
            type="password"
            placeholder={getTokenPlaceholder()}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
          />
          <Button
            type="button"
            onClick={handleSaveCredentials}
            variant="ghost"
            className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-none dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
            disabled={isSavingToken || !tokenInput.trim()}
          >
            {isSavingToken ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {(() => {
                  const slug = getServiceSlug();
                  const logoUrl = slug ? getLogoUrl(slug) : null;
                  return logoUrl ? (
                    <>
                      <img 
                        src={logoUrl} 
                        alt={getServiceDisplayName()} 
                        className="h-4 w-4 mr-2 object-contain"
                      />
                      Connect
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Connect
                    </>
                  );
                })()}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // For OAuth integrations without resource selection, show disconnect button
  if (isConnected === true && credentialType === 'oauth' && (serviceName === 'openai' || !resourceType)) {
    const slug = getServiceSlug();
    const logoUrl = slug ? getLogoUrl(slug) : null;
    
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Connect
          {fieldSchema?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="space-y-2">
          <Button
            type="button"
            onClick={handleDisconnect}
            variant="ghost"
            disabled={isDisconnecting}
            className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 shadow-none dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={getServiceDisplayName()} 
                    className="h-4 w-4 mr-2 object-contain"
                  />
                ) : (
                  <ExternalLink className="h-3 w-3 mr-2" />
                )}
                Disconnect
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }
  
  // For other services, show no resources message
  return (
    <div className="text-xs text-muted-foreground">
      No {resourceType}s available
    </div>
  );
}
