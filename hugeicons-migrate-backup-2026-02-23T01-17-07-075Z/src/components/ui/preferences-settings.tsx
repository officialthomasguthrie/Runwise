"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Zap, 
  Clock, 
  Globe, 
  Keyboard, 
  Mouse, 
  Monitor, 
  Volume2, 
  VolumeX,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Palette,
  Bell,
  Shield,
  Database,
  FileText,
  Languages,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone
} from "lucide-react";

interface UserPreferences {
  general: {
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  workspace: {
    defaultView: 'grid' | 'list' | 'kanban';
    autoSave: boolean;
    showTutorials: boolean;
    compactMode: boolean;
  };
  keyboard: {
    shortcuts: boolean;
    vimMode: boolean;
    quickActions: boolean;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
  };
  advanced: {
    debugMode: boolean;
    analytics: boolean;
    crashReporting: boolean;
    betaFeatures: boolean;
  };
}

export function PreferencesSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    general: {
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD'
    },
    workspace: {
      defaultView: 'grid',
      autoSave: true,
      showTutorials: true,
      compactMode: false
    },
    keyboard: {
      shortcuts: true,
      vimMode: false,
      quickActions: true
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      screenReader: false
    },
    advanced: {
      debugMode: false,
      analytics: true,
      crashReporting: true,
      betaFeatures: false
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        // In a real app, this would load from user preferences
        // For now, we'll use default settings
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Handle preference changes
  const handlePreferenceChange = (category: keyof UserPreferences, field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  // Save preferences
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // In a real app, this would save to user preferences
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setPreferences({
      general: {
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD'
      },
      workspace: {
        defaultView: 'grid',
        autoSave: true,
        showTutorials: true,
        compactMode: false
      },
      keyboard: {
        shortcuts: true,
        vimMode: false,
        quickActions: true
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false
      },
      advanced: {
        debugMode: false,
        analytics: true,
        crashReporting: true,
        betaFeatures: false
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Preferences Header */}
      <div>
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Preferences
            </h2>
            <p className="text-muted-foreground mt-1">
              Customize your application experience and behavior
            </p>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4" />
          General
        </h3>
        <p className="text-muted-foreground mb-6">
          Basic application settings and localization
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              value={preferences.general.language}
              onChange={(e) => handlePreferenceChange('general', 'language', e.target.value)}
              className="w-full px-3 py-2 border border-border bg-muted/50 rounded-md text-sm"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={preferences.general.timezone}
              onChange={(e) => handlePreferenceChange('general', 'timezone', e.target.value)}
              className="w-full px-3 py-2 border border-border bg-muted/50 rounded-md text-sm"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">Date Format</Label>
            <select
              id="dateFormat"
              value={preferences.general.dateFormat}
              onChange={(e) => handlePreferenceChange('general', 'dateFormat', e.target.value)}
              className="w-full px-3 py-2 border border-border bg-muted/50 rounded-md text-sm"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD MMM YYYY">DD MMM YYYY</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              value={preferences.general.currency}
              onChange={(e) => handlePreferenceChange('general', 'currency', e.target.value)}
              className="w-full px-3 py-2 border border-border bg-muted/50 rounded-md text-sm"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="CAD">CAD (C$)</option>
            </select>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Workspace Settings */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Monitor className="h-4 w-4" />
          Workspace
        </h3>
        <p className="text-muted-foreground mb-6">
          Customize your workspace layout and behavior
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Default View</Label>
            <div className="grid grid-cols-3 gap-3">
              {(['grid', 'list', 'kanban'] as const).map((view) => (
                <div
                  key={view}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    preferences.workspace.defaultView === view 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-border bg-muted/50 hover:bg-muted'
                  }`}
                  onClick={() => handlePreferenceChange('workspace', 'defaultView', view)}
                >
                  <div className="text-center">
                    <div className="font-medium text-sm">
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Auto Save</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically save changes as you work
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.workspace.autoSave}
              onCheckedChange={(checked) => handlePreferenceChange('workspace', 'autoSave', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Show Tutorials</h4>
                <p className="text-sm text-muted-foreground">
                  Display helpful tips and tutorials
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.workspace.showTutorials}
              onCheckedChange={(checked) => handlePreferenceChange('workspace', 'showTutorials', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
                <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Compact Mode</h4>
                <p className="text-sm text-muted-foreground">
                  Use more compact spacing and smaller elements
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.workspace.compactMode}
              onCheckedChange={(checked) => handlePreferenceChange('workspace', 'compactMode', checked)}
            />
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Keyboard Settings */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Keyboard className="h-4 w-4" />
          Keyboard & Shortcuts
        </h3>
        <p className="text-muted-foreground mb-6">
          Configure keyboard shortcuts and input behavior
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-md">
                <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium">Keyboard Shortcuts</h4>
                <p className="text-sm text-muted-foreground">
                  Enable keyboard shortcuts for faster navigation
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.keyboard.shortcuts}
              onCheckedChange={(checked) => handlePreferenceChange('keyboard', 'shortcuts', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-md">
                <Keyboard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h4 className="font-medium">Vim Mode</h4>
                <p className="text-sm text-muted-foreground">
                  Enable Vim-style keyboard navigation
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.keyboard.vimMode}
              onCheckedChange={(checked) => handlePreferenceChange('keyboard', 'vimMode', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <Mouse className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Quick Actions</h4>
                <p className="text-sm text-muted-foreground">
                  Enable quick action shortcuts and gestures
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.keyboard.quickActions}
              onCheckedChange={(checked) => handlePreferenceChange('keyboard', 'quickActions', checked)}
            />
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Accessibility Settings */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4" />
          Accessibility
        </h3>
        <p className="text-muted-foreground mb-6">
          Improve accessibility and usability
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-md">
                <Palette className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium">High Contrast</h4>
                <p className="text-sm text-muted-foreground">
                  Increase contrast for better visibility
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.accessibility.highContrast}
              onCheckedChange={(checked) => handlePreferenceChange('accessibility', 'highContrast', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Large Text</h4>
                <p className="text-sm text-muted-foreground">
                  Use larger text sizes throughout the interface
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.accessibility.largeText}
              onCheckedChange={(checked) => handlePreferenceChange('accessibility', 'largeText', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Reduced Motion</h4>
                <p className="text-sm text-muted-foreground">
                  Minimize animations and transitions
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.accessibility.reducedMotion}
              onCheckedChange={(checked) => handlePreferenceChange('accessibility', 'reducedMotion', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
                <Volume2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Screen Reader Support</h4>
                <p className="text-sm text-muted-foreground">
                  Optimize interface for screen readers
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.accessibility.screenReader}
              onCheckedChange={(checked) => handlePreferenceChange('accessibility', 'screenReader', checked)}
            />
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Advanced Settings */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4" />
          Advanced
        </h3>
        <p className="text-muted-foreground mb-6">
          Advanced settings for power users
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-md">
                <Settings className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="font-medium">Debug Mode</h4>
                <p className="text-sm text-muted-foreground">
                  Enable debug information and logging
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.advanced.debugMode}
              onCheckedChange={(checked) => handlePreferenceChange('advanced', 'debugMode', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  Help improve the product with usage analytics
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.advanced.analytics}
              onCheckedChange={(checked) => handlePreferenceChange('advanced', 'analytics', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Crash Reporting</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically report crashes and errors
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.advanced.crashReporting}
              onCheckedChange={(checked) => handlePreferenceChange('advanced', 'crashReporting', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Beta Features</h4>
                <p className="text-sm text-muted-foreground">
                  Enable experimental features and early access
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.advanced.betaFeatures}
              onCheckedChange={(checked) => handlePreferenceChange('advanced', 'betaFeatures', checked)}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Preferences saved successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to save preferences. Please try again.</span>
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
                <Zap className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
