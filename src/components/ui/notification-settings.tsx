"use client";

import { AlertCircle, Bell, Calendar, CheckCircle2, Loader2, Mail, MessageSquare, Monitor, Shield, Smartphone, Volume2, VolumeX, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";


interface NotificationSettings {
  email: {
    enabled: boolean;
    workflows: boolean;
    security: boolean;
    updates: boolean;
    marketing: boolean;
  };
  push: {
    enabled: boolean;
    workflows: boolean;
    security: boolean;
    updates: boolean;
  };
  inApp: {
    enabled: boolean;
    workflows: boolean;
    security: boolean;
    updates: boolean;
  };
  frequency: {
    immediate: boolean;
    daily: boolean;
    weekly: boolean;
  };
}

export function NotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    email: {
      enabled: true,
      workflows: true,
      security: true,
      updates: false,
      marketing: false
    },
    push: {
      enabled: true,
      workflows: true,
      security: true,
      updates: false
    },
    inApp: {
      enabled: true,
      workflows: true,
      security: true,
      updates: true
    },
    frequency: {
      immediate: true,
      daily: false,
      weekly: false
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        // In a real app, this would load from user preferences
        // For now, we'll use default settings
      } catch (error) {
        console.error('Error loading notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Handle setting changes
  const handleSettingChange = (category: keyof NotificationSettings, field: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // In a real app, this would save to user preferences
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings({
      email: {
        enabled: true,
        workflows: true,
        security: true,
        updates: false,
        marketing: false
      },
      push: {
        enabled: true,
        workflows: true,
        security: true,
        updates: false
      },
      inApp: {
        enabled: true,
        workflows: true,
        security: true,
        updates: true
      },
      frequency: {
        immediate: true,
        daily: false,
        weekly: false
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading notification settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Notification Header */}
      <div>
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Control how and when you receive notifications across different channels
            </p>
          </div>
        </div>
      </div>

      {/* Email Notifications */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4" />
          Email Notifications
        </h3>
        <p className="text-muted-foreground mb-6">
          Manage email notifications sent to {user?.email}
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Email Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              checked={settings.email.enabled}
              onCheckedChange={(checked) => handleSettingChange('email', 'enabled', checked)}
            />
          </div>

          {settings.email.enabled && (
            <div className="ml-8 space-y-3">
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Workflow Updates</span>
                </div>
                <Switch
                  checked={settings.email.workflows}
                  onCheckedChange={(checked) => handleSettingChange('email', 'workflows', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Security Alerts</span>
                </div>
                <Switch
                  checked={settings.email.security}
                  onCheckedChange={(checked) => handleSettingChange('email', 'security', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Product Updates</span>
                </div>
                <Switch
                  checked={settings.email.updates}
                  onCheckedChange={(checked) => handleSettingChange('email', 'updates', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">Marketing & Tips</span>
                </div>
                <Switch
                  checked={settings.email.marketing}
                  onCheckedChange={(checked) => handleSettingChange('email', 'marketing', checked)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Push Notifications */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Smartphone className="h-4 w-4" />
          Push Notifications
        </h3>
        <p className="text-muted-foreground mb-6">
          Receive instant notifications on your mobile devices
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Push Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Get instant notifications on your devices
                </p>
              </div>
            </div>
            <Switch
              checked={settings.push.enabled}
              onCheckedChange={(checked) => handleSettingChange('push', 'enabled', checked)}
            />
          </div>

          {settings.push.enabled && (
            <div className="ml-8 space-y-3">
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Workflow Updates</span>
                </div>
                <Switch
                  checked={settings.push.workflows}
                  onCheckedChange={(checked) => handleSettingChange('push', 'workflows', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Security Alerts</span>
                </div>
                <Switch
                  checked={settings.push.security}
                  onCheckedChange={(checked) => handleSettingChange('push', 'security', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Product Updates</span>
                </div>
                <Switch
                  checked={settings.push.updates}
                  onCheckedChange={(checked) => handleSettingChange('push', 'updates', checked)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* In-App Notifications */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Monitor className="h-4 w-4" />
          In-App Notifications
        </h3>
        <p className="text-muted-foreground mb-6">
          Control notifications shown within the application
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
                <Monitor className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">In-App Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Show notifications within the application
                </p>
              </div>
            </div>
            <Switch
              checked={settings.inApp.enabled}
              onCheckedChange={(checked) => handleSettingChange('inApp', 'enabled', checked)}
            />
          </div>

          {settings.inApp.enabled && (
            <div className="ml-8 space-y-3">
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Workflow Updates</span>
                </div>
                <Switch
                  checked={settings.inApp.workflows}
                  onCheckedChange={(checked) => handleSettingChange('inApp', 'workflows', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Security Alerts</span>
                </div>
                <Switch
                  checked={settings.inApp.security}
                  onCheckedChange={(checked) => handleSettingChange('inApp', 'security', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Product Updates</span>
                </div>
                <Switch
                  checked={settings.inApp.updates}
                  onCheckedChange={(checked) => handleSettingChange('inApp', 'updates', checked)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Notification Frequency */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Volume2 className="h-4 w-4" />
          Notification Frequency
        </h3>
        <p className="text-muted-foreground mb-6">
          Choose how often you want to receive notifications
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">Immediate</span>
              <span className="text-xs text-muted-foreground">(Real-time)</span>
            </div>
            <Switch
              checked={settings.frequency.immediate}
              onCheckedChange={(checked) => handleSettingChange('frequency', 'immediate', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Daily Digest</span>
              <span className="text-xs text-muted-foreground">(Once per day)</span>
            </div>
            <Switch
              checked={settings.frequency.daily}
              onCheckedChange={(checked) => handleSettingChange('frequency', 'daily', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm">Weekly Summary</span>
              <span className="text-xs text-muted-foreground">(Once per week)</span>
            </div>
            <Switch
              checked={settings.frequency.weekly}
              onCheckedChange={(checked) => handleSettingChange('frequency', 'weekly', checked)}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Notification settings saved successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to save notification settings. Please try again.</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset to Defaults
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
