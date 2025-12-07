"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { Mail, Monitor, Smartphone, Save, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface NotificationSettings {
  email: {
    workflowFailures: boolean;
    workflowSuccesses: boolean;
    apiIssues: boolean;
    billing: boolean;
  };
  desktop: boolean;
  mobile: boolean;
}

export function NotificationsSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    email: {
      workflowFailures: true,
      workflowSuccesses: false,
      apiIssues: true,
      billing: true,
    },
    desktop: true,
    mobile: false,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser?.user_metadata?.notification_settings) {
          setSettings(currentUser.user_metadata.notification_settings);
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleEmailToggle = (key: keyof NotificationSettings['email']) => {
    setSettings(prev => ({
      ...prev,
      email: {
        ...prev.email,
        [key]: !prev.email[key]
      }
    }));
  };

  const handleDesktopToggle = () => {
    setSettings(prev => ({
      ...prev,
      desktop: !prev.desktop
    }));
  };

  const handleMobileToggle = () => {
    setSettings(prev => ({
      ...prev,
      mobile: !prev.mobile
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          notification_settings: settings
        }
      });

      if (error) {
        throw error;
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading notification settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose which email notifications you want to receive
          </p>
        </div>

        <div className="rounded-lg border border-stone-200 dark:border-white/20 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-6 space-y-4">
          {/* Workflow Failures */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="workflowFailures" className="text-sm font-medium text-foreground cursor-pointer">
                Workflow Failures
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get notified when a workflow execution fails
              </p>
            </div>
            <button
              type="button"
              id="workflowFailures"
              onClick={() => handleEmailToggle('workflowFailures')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                settings.email.workflowFailures
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email.workflowFailures ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Workflow Successes */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="workflowSuccesses" className="text-sm font-medium text-foreground cursor-pointer">
                Workflow Successes
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get notified when a workflow execution succeeds
              </p>
            </div>
            <button
              type="button"
              id="workflowSuccesses"
              onClick={() => handleEmailToggle('workflowSuccesses')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                settings.email.workflowSuccesses
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email.workflowSuccesses ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* API Issues */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="apiIssues" className="text-sm font-medium text-foreground cursor-pointer">
                API Issues
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get notified about API errors and issues
              </p>
            </div>
            <button
              type="button"
              id="apiIssues"
              onClick={() => handleEmailToggle('apiIssues')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                settings.email.apiIssues
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email.apiIssues ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Billing Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="billing" className="text-sm font-medium text-foreground cursor-pointer">
                Billing Notifications
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get notified about billing updates and payment issues
              </p>
            </div>
            <button
              type="button"
              id="billing"
              onClick={() => handleEmailToggle('billing')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                settings.email.billing
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.email.billing ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Notifications Section */}
      <div className="space-y-4 pt-6 border-t border-stone-200 dark:border-white/20">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Desktop Notifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Enable desktop browser notifications
          </p>
        </div>

        <div className="rounded-lg border border-stone-200 dark:border-white/20 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="desktop" className="text-sm font-medium text-foreground cursor-pointer">
                Enable Desktop Notifications
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive browser notifications on your desktop
              </p>
            </div>
            <button
              type="button"
              id="desktop"
              onClick={handleDesktopToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                settings.desktop
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.desktop ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Push Notifications Section */}
      <div className="space-y-4 pt-6 border-t border-stone-200 dark:border-white/20">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Push Notifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Enable push notifications on your mobile device
          </p>
        </div>

        <div className="rounded-lg border border-stone-200 dark:border-white/20 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="mobile" className="text-sm font-medium text-foreground cursor-pointer">
                Enable Mobile Push Notifications
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive push notifications on your mobile device
              </p>
            </div>
            <button
              type="button"
              id="mobile"
              onClick={handleMobileToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                settings.mobile
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.mobile ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="ghost"
          className="bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveStatus === 'success' ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

