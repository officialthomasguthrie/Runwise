"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase-client";
import { Mail, Monitor, Smartphone, Save, Loader2, Check, AlertCircle } from "lucide-react";
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
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

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
        isInitialLoad.current = false;
      }
    };

    loadSettings();
  }, [user]);

  // Auto-save when settings change
  useEffect(() => {
    // Don't auto-save during initial load
    if (isInitialLoad.current || !user || loading) {
      return;
    }

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Debounce save by 500ms
    saveTimerRef.current = setTimeout(() => {
      handleSave();
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

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
      <div className="space-y-6">
        {/* Email Notifications Section Skeleton */}
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

          <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                  <div className="h-3 w-56 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                </div>
                <div className="h-6 w-11 rounded-full bg-gray-300 dark:bg-[#303030] animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Notifications Section Skeleton */}
        <div className="space-y-4 pt-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Desktop Notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              Enable desktop browser notifications
            </p>
          </div>

          <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                <div className="h-3 w-52 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
              </div>
              <div className="h-6 w-11 rounded-full bg-gray-300 dark:bg-[#303030] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Mobile Push Notifications Section Skeleton */}
        <div className="space-y-4 pt-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile Push Notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              Enable push notifications on your mobile device
            </p>
          </div>

          <div className="rounded-lg backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-56 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                <div className="h-3 w-60 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
              </div>
              <div className="h-6 w-11 rounded-full bg-gray-300 dark:bg-[#303030] animate-pulse" />
            </div>
          </div>
        </div>

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

        <div className="rounded-lg bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-6 space-y-4">
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
      <div className="space-y-4 pt-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Desktop Notifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Enable desktop browser notifications
          </p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-6">
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
      <div className="space-y-4 pt-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Push Notifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Enable push notifications on your mobile device
          </p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-6">
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

      {/* Auto-save status messages */}
      <div className="flex items-center gap-2 pt-4">
        {saveStatus === 'success' && !isSaving && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            <span>Settings saved</span>
          </div>
        )}
        {saveStatus === 'error' && !isSaving && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to save settings</span>
          </div>
        )}
      </div>
    </div>
  );
}

