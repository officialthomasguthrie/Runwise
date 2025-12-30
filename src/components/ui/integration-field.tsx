/**
 * Integration-Aware Field Component
 * Renders fields that require integrations (Google Sheets, Slack, GitHub, Notion, Airtable, Trello, etc.)
 */

'use client';

import { useState, useEffect } from 'react';
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
  serviceName: 'google' | 'slack' | 'github' | 'notion' | 'airtable' | 'trello' | 'openai' | 'sendgrid' | 'twilio' | 'stripe' | 'discord' | 'twitter' | 'paypal';
  resourceType?: 'spreadsheet' | 'sheet' | 'column' | 'channel' | 'repository' | 'database' | 'base' | 'table' | 'field' | 'board' | 'list' | 'calendar' | 'folder' | 'label' | 'form' | 'guild';
  parentValue?: any; // For dependent fields (e.g., sheet depends on spreadsheet)
  onParentChange?: (value: any) => void;
  credentialType?: 'oauth' | 'api_token' | 'api_key_and_token'; // How to authenticate
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
  credentialType = 'oauth'
}: IntegrationFieldProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [tokenInput2, setTokenInput2] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);

  // Check integration status
  useEffect(() => {
    checkIntegrationStatus();
    
    // Also check on window focus (in case user returns from OAuth)
    const handleFocus = () => {
      checkIntegrationStatus();
    };
    window.addEventListener('focus', handleFocus);
    
    // Check if URL has integration_connected parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('integration_connected')) {
      // Refresh status after a short delay to allow backend to process
      setTimeout(() => {
        checkIntegrationStatus();
        // Clear the parameter from URL
        urlParams.delete('integration_connected');
        window.history.replaceState({}, '', window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : ''));
      }, 500);
    }
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Fetch resources when connected and needed
  useEffect(() => {
    if (isConnected && resourceType && !resources.length) {
      fetchResources();
    }
  }, [isConnected, resourceType, parentValue]);

  const checkIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status');
      if (!response.ok) throw new Error('Failed to check status');
      
      const data = await response.json();
      const integration = data.integrations?.find((i: any) => i.service === serviceName);
      setIsConnected(!!integration?.connected);
    } catch (error) {
      console.error('Error checking integration status:', error);
      setIsConnected(false);
    }
  };

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save token');
      }
      
      setTokenInput('');
      setApiKeyInput('');
      setTokenInput2('');
      setIsConnected(true);
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
      
      if (serviceName === 'google') {
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
          // If no parent, we'll need to fetch guilds first
          url = '/api/integrations/discord/guilds';
        }
      }

      if (!url) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'NOT_CONNECTED') {
          setIsConnected(false);
          return;
        }
        throw new Error(errorData.error || 'Failed to fetch resources');
      }

      const data = await response.json();
      
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
    // Get current URL to return to after OAuth
    const returnUrl = encodeURIComponent(window.location.href);
    // Pass resourceType so we can request only the necessary scopes
    const resourceTypeParam = resourceType ? `&resourceType=${encodeURIComponent(resourceType)}` : '';
    window.location.href = `/api/auth/connect/${serviceName}?returnUrl=${returnUrl}${resourceTypeParam}`;
  };

  const getServiceDisplayName = () => {
    const names: Record<string, string> = {
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
      return 'Bot token (optional - OAuth preferred)';
    }
    return 'Enter your API token';
  };

  // Not connected - show connect/input based on credential type
  if (isConnected === false) {
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
              className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Connect {getServiceDisplayName()}
            </Button>
          </div>
        </div>
      );
    } else if (credentialType === 'api_key_and_token') {
      // Trello (needs both API key and token)
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
                : `Enter your ${getServiceDisplayName()} API key and token to select resources`}
            </p>
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
            <Button
              type="button"
              onClick={handleSaveCredentials}
              variant="ghost"
              className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
              disabled={isSavingToken}
            >
              {isSavingToken ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Connect'
              )}
            </Button>
          </div>
        </div>
      );
    } else {
      // API token services (Notion, Airtable, GitHub fallback)
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
              Enter your {getServiceDisplayName()} {serviceName === 'openai' ? 'API key' : 'API token'} to {serviceName === 'openai' ? 'connect' : 'select resources'}
            </p>
            <Input
              type="text"
              placeholder={getTokenPlaceholder()}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full text-sm rounded-md border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl px-3 py-2 text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-gray-300 focus-visible:border-gray-300"
            />
            <Button
              type="button"
              onClick={handleSaveCredentials}
              variant="ghost"
              className="w-full justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
              disabled={isSavingToken}
            >
              {isSavingToken ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Connect'
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

  // Helper to get display label for resource type
  const getResourceLabel = () => {
    const labels: Record<string, string> = {
      spreadsheet: 'Spreadsheet',
      sheet: 'Sheet',
      column: 'Column',
      channel: 'Channel',
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

  // Resource picker dropdown
  if (resources.length > 0) {
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

  // Connected but no resources yet
  // For OpenAI (and other services without resource selection), show connected status
  if (serviceName === 'openai' || !resourceType) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Connect
          {fieldSchema?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span>Connected</span>
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
