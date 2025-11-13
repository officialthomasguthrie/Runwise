"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Database, 
  Link, 
  Key, 
  Webhook, 
  Plus, 
  Trash2, 
  Edit, 
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  Github,
  Slack,
  Chrome,
  Mail,
  Figma,
  FileText,
  Calendar,
  Bug,
  MessageCircle,
  Twitter,
  Settings,
  Eye,
  EyeOff,
  ExternalLink
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  permissions: string[];
  category: 'productivity' | 'development' | 'communication' | 'design' | 'other';
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed?: string;
  createdAt: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'error';
  lastTriggered?: string;
}

export function IntegrationsSettings() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'github',
      name: 'GitHub',
      description: 'Connect your GitHub repositories',
      icon: Github,
      status: 'connected',
      lastSync: new Date().toISOString(),
      permissions: ['read:repos', 'read:user'],
      category: 'development'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send notifications to Slack channels',
      icon: Slack,
      status: 'disconnected',
      permissions: ['chat:write'],
      category: 'communication'
    },
    {
      id: 'google',
      name: 'Google Workspace',
      description: 'Access Google Drive and Calendar',
      icon: Chrome,
      status: 'connected',
      lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      permissions: ['drive:read', 'calendar:read'],
      category: 'productivity'
    },
    {
      id: 'figma',
      name: 'Figma',
      description: 'Import designs from Figma',
      icon: Figma,
      status: 'disconnected',
      permissions: ['files:read'],
      category: 'design'
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Sync with Notion databases',
      icon: FileText,
      status: 'error',
      permissions: ['read', 'write'],
      category: 'productivity'
    }
  ]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: 'key_1',
      name: 'Production API Key',
      key: 'sk_live_1234567890abcdef',
      permissions: ['read', 'write'],
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'key_2',
      name: 'Development API Key',
      key: 'sk_test_abcdef1234567890',
      permissions: ['read'],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([
    {
      id: 'webhook_1',
      name: 'Workflow Updates',
      url: 'https://api.example.com/webhooks/workflow',
      events: ['workflow.created', 'workflow.updated'],
      status: 'active',
      lastTriggered: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'webhook_2',
      name: 'User Events',
      url: 'https://api.example.com/webhooks/user',
      events: ['user.created', 'user.updated'],
      status: 'inactive',
      lastTriggered: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  // Load integrations data
  useEffect(() => {
    const loadIntegrationsData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        // In a real app, this would load from integrations API
        // For now, we'll use mock data
      } catch (error) {
        console.error('Error loading integrations data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadIntegrationsData();
  }, [user]);

  // Handle integration connection
  const handleConnectIntegration = async (integrationId: string) => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // In a real app, this would initiate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, status: 'connected' as const, lastSync: new Date().toISOString() }
            : integration
        )
      );
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error connecting integration:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle integration disconnection
  const handleDisconnectIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return;
    }

    setIsSaving(true);
    try {
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, status: 'disconnected' as const, lastSync: undefined }
            : integration
        )
      );
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle API key operations
  const handleCreateAPIKey = async () => {
    setIsSaving(true);
    try {
      const newKey: APIKey = {
        id: `key_${Date.now()}`,
        name: 'New API Key',
        key: `sk_${Math.random().toString(36).substring(2, 15)}`,
        permissions: ['read'],
        createdAt: new Date().toISOString()
      };
      
      setApiKeys(prev => [...prev, newKey]);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error creating API key:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAPIKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    setIsSaving(true);
    try {
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error deleting API key:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyAPIKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error copying API key:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  // Handle webhook operations
  const handleCreateWebhook = async () => {
    setIsSaving(true);
    try {
      const newWebhook: Webhook = {
        id: `webhook_${Date.now()}`,
        name: 'New Webhook',
        url: 'https://api.example.com/webhooks/new',
        events: ['workflow.created'],
        status: 'active'
      };
      
      setWebhooks(prev => [...prev, newWebhook]);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error creating webhook:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    setIsSaving(true);
    try {
      setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error deleting webhook:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAPIKeyVisibility = (keyId: string) => {
    setShowApiKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'disconnected':
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading integrations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Integrations Header */}
      <div>
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Integrations & API
            </h2>
            <p className="text-muted-foreground mt-1">
              Connect third-party services and manage API access
            </p>
          </div>
        </div>
      </div>

      {/* Third-Party Integrations */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Link className="h-4 w-4" />
          Third-Party Integrations
        </h3>
        <p className="text-muted-foreground mb-6">
          Connect your favorite tools and services
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => {
            const IconComponent = integration.icon;
            return (
              <div key={integration.id} className="p-4 bg-muted/50 border border-border rounded-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-background border border-border rounded-md">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{integration.name}</h4>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </div>
                  <Badge className={getStatusColor(integration.status)}>
                    {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                  </Badge>
                </div>
                
                {integration.lastSync && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Last sync: {new Date(integration.lastSync).toLocaleDateString()}
                  </p>
                )}
                
                <div className="flex items-center gap-2">
                  {integration.status === 'connected' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnectIntegration(integration.id)}
                      disabled={isSaving}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleConnectIntegration(integration.id)}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      size="sm"
                    >
                      Connect
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={integration.status !== 'connected'}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Separator className="my-8" />

      {/* API Keys */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Key className="h-4 w-4" />
          API Keys
        </h3>
        <p className="text-muted-foreground mb-6">
          Manage your API keys for programmatic access
        </p>
        
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="p-4 bg-muted/50 border border-border rounded-md">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{apiKey.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(apiKey.createdAt).toLocaleDateString()}
                    {apiKey.lastUsed && (
                      <span> • Last used {new Date(apiKey.lastUsed).toLocaleDateString()}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAPIKey(apiKey.id)}
                    disabled={isSaving}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={showApiKeys[apiKey.id] ? apiKey.key : '••••••••••••••••'}
                    readOnly
                    className="bg-background font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => toggleAPIKeyVisibility(apiKey.id)}
                  >
                    {showApiKeys[apiKey.id] ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyAPIKey(apiKey.key)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-2 flex items-center gap-2">
                {apiKey.permissions.map((permission) => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          
          <Button
            onClick={handleCreateAPIKey}
            disabled={isSaving}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New API Key
          </Button>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Webhooks */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Webhook className="h-4 w-4" />
          Webhooks
        </h3>
        <p className="text-muted-foreground mb-6">
          Configure webhooks to receive real-time notifications
        </p>
        
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="p-4 bg-muted/50 border border-border rounded-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                    <Webhook className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium">{webhook.name}</h4>
                    <p className="text-sm text-muted-foreground">{webhook.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(webhook.status)}>
                    {webhook.status.charAt(0).toUpperCase() + webhook.status.slice(1)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    disabled={isSaving}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Events</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="secondary" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {webhook.lastTriggered && (
                  <p className="text-xs text-muted-foreground">
                    Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          <Button
            onClick={handleCreateWebhook}
            disabled={isSaving}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Webhook
          </Button>
        </div>
      </div>

      <Separator className="my-8" />

      {/* API Documentation */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <ExternalLink className="h-4 w-4" />
          API Documentation
        </h3>
        <p className="text-muted-foreground mb-6">
          Learn how to integrate with our API
        </p>
        
        <div className="p-4 bg-muted/50 border border-border rounded-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
              <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium">API Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Complete guide to our REST API and webhooks
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Documentation
            </Button>
            <Button
              variant="outline"
              size="sm"
            >
              <Github className="h-4 w-4 mr-2" />
              SDK Examples
            </Button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Integration settings updated successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to update integration settings. Please try again.</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
