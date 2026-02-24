"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, BarChartIcon, CheckmarkCircle01Icon, ComputerIcon, DatabaseIcon, Delete02Icon, Download01Icon, FileAttachmentIcon, GlobeIcon, Loading02Icon, LockIcon, Mail01Icon, Settings01Icon, Shield01Icon, SmartPhone01Icon, SquareUnlock01Icon, UserGroupIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface PrivacySettings {
  profileVisibility: {
    public: boolean;
    showEmail: boolean;
    showLocation: boolean;
    showActivity: boolean;
  };
  dataSharing: {
    analytics: boolean;
    marketing: boolean;
    thirdParty: boolean;
    research: boolean;
  };
  dataRetention: {
    autoDelete: boolean;
    retentionPeriod: '30' | '90' | '365' | 'never';
    deleteInactive: boolean;
  };
  privacyControls: {
    searchable: boolean;
    indexed: boolean;
    trackLocation: boolean;
    cookies: boolean;
  };
}

export function PrivacySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: {
      public: false,
      showEmail: false,
      showLocation: false,
      showActivity: false
    },
    dataSharing: {
      analytics: true,
      marketing: false,
      thirdParty: false,
      research: false
    },
    dataRetention: {
      autoDelete: false,
      retentionPeriod: '365',
      deleteInactive: false
    },
    privacyControls: {
      searchable: true,
      indexed: true,
      trackLocation: false,
      cookies: true
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load privacy settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        // In a real app, this would load from user preferences
        // For now, we'll use default settings
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Handle setting changes
  const handleSettingChange = (category: keyof PrivacySettings, field: string, value: boolean | string) => {
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
      console.error('Error saving privacy settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Export data
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // In a real app, this would generate and download user data
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate export
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      // In a real app, this would delete the user account
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate deletion
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error deleting account:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings({
      profileVisibility: {
        public: false,
        showEmail: false,
        showLocation: false,
        showActivity: false
      },
      dataSharing: {
        analytics: true,
        marketing: false,
        thirdParty: false,
        research: false
      },
      dataRetention: {
        autoDelete: false,
        retentionPeriod: '365',
        deleteInactive: false
      },
      privacyControls: {
        searchable: true,
        indexed: true,
        trackLocation: false,
        cookies: true
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <HugeiconsIcon icon={Loading02Icon} className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading privacy settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Privacy Header */}
      <div>
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <HugeiconsIcon icon={GlobeIcon} className="h-5 w-5" />
              Privacy Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Control your privacy preferences and data sharing settings
            </p>
          </div>
        </div>
      </div>

      {/* Profile Visibility */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={ViewIcon} className="h-4 w-4" />
          Profile Visibility
        </h3>
        <p className="text-muted-foreground mb-6">
          Control what information is visible to other users
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <HugeiconsIcon icon={GlobeIcon} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Public Profile</h4>
                <p className="text-sm text-muted-foreground">
                  Make your profile visible to other users
                </p>
              </div>
            </div>
            <Switch
              checked={settings.profileVisibility.public}
              onCheckedChange={(checked) => handleSettingChange('profileVisibility', 'public', checked)}
            />
          </div>

          {settings.profileVisibility.public && (
            <div className="ml-8 space-y-3">
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Mail01Icon} className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Show Email Address</span>
                </div>
                <Switch
                  checked={settings.profileVisibility.showEmail}
                  onCheckedChange={(checked) => handleSettingChange('profileVisibility', 'showEmail', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={ComputerIcon} className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Show Location</span>
                </div>
                <Switch
                  checked={settings.profileVisibility.showLocation}
                  onCheckedChange={(checked) => handleSettingChange('profileVisibility', 'showLocation', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={BarChartIcon} className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Show Activity Status</span>
                </div>
                <Switch
                  checked={settings.profileVisibility.showActivity}
                  onCheckedChange={(checked) => handleSettingChange('profileVisibility', 'showActivity', checked)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Data Sharing */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={DatabaseIcon} className="h-4 w-4" />
          Data Sharing
        </h3>
        <p className="text-muted-foreground mb-6">
          Control how your data is shared with third parties
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                <HugeiconsIcon icon={BarChartIcon} className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Analytics & Usage Data</h4>
                <p className="text-sm text-muted-foreground">
                  Help improve our service with anonymous usage data
                </p>
              </div>
            </div>
            <Switch
              checked={settings.dataSharing.analytics}
              onCheckedChange={(checked) => handleSettingChange('dataSharing', 'analytics', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
                <HugeiconsIcon icon={Mail01Icon} className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Marketing Communications</h4>
                <p className="text-sm text-muted-foreground">
                  Receive promotional emails and product updates
                </p>
              </div>
            </div>
            <Switch
              checked={settings.dataSharing.marketing}
              onCheckedChange={(checked) => handleSettingChange('dataSharing', 'marketing', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-md">
                <HugeiconsIcon icon={UserGroupIcon} className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium">Third-Party Integrations</h4>
                <p className="text-sm text-muted-foreground">
                  Share data with connected third-party services
                </p>
              </div>
            </div>
            <Switch
              checked={settings.dataSharing.thirdParty}
              onCheckedChange={(checked) => handleSettingChange('dataSharing', 'thirdParty', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <HugeiconsIcon icon={FileAttachmentIcon} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Research & Development</h4>
                <p className="text-sm text-muted-foreground">
                  Contribute to product research and development
                </p>
              </div>
            </div>
            <Switch
              checked={settings.dataSharing.research}
              onCheckedChange={(checked) => handleSettingChange('dataSharing', 'research', checked)}
            />
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Data Retention */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
          Data Retention
        </h3>
        <p className="text-muted-foreground mb-6">
          Control how long your data is stored
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-md">
                <HugeiconsIcon icon={Delete02Icon} className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="font-medium">Automatic Data Deletion</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically delete old data after a specified period
                </p>
              </div>
            </div>
            <Switch
              checked={settings.dataRetention.autoDelete}
              onCheckedChange={(checked) => handleSettingChange('dataRetention', 'autoDelete', checked)}
            />
          </div>

          {settings.dataRetention.autoDelete && (
            <div className="ml-8 space-y-3">
              <div className="space-y-2">
                <Label>Retention Period</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['30', '90', '365', 'never'] as const).map((period) => (
                    <div
                      key={period}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        settings.dataRetention.retentionPeriod === period 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                          : 'border-border bg-muted/50 hover:bg-muted'
                      }`}
                      onClick={() => handleSettingChange('dataRetention', 'retentionPeriod', period)}
                    >
                      <div className="text-center">
                        <div className="font-medium text-sm">
                          {period === 'never' ? 'Never' : `${period} days`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-md">
                <HugeiconsIcon icon={Settings01Icon} className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h4 className="font-medium">Delete Inactive Accounts</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically delete accounts that haven't been used for 2+ years
                </p>
              </div>
            </div>
            <Switch
              checked={settings.dataRetention.deleteInactive}
              onCheckedChange={(checked) => handleSettingChange('dataRetention', 'deleteInactive', checked)}
            />
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Privacy Controls */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={Shield01Icon} className="h-4 w-4" />
          Privacy Controls
        </h3>
        <p className="text-muted-foreground mb-6">
          Additional privacy and security settings
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                <HugeiconsIcon icon={ViewIcon} className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Searchable Profile</h4>
                <p className="text-sm text-muted-foreground">
                  Allow your profile to be found in search results
                </p>
              </div>
            </div>
            <Switch
              checked={settings.privacyControls.searchable}
              onCheckedChange={(checked) => handleSettingChange('privacyControls', 'searchable', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <HugeiconsIcon icon={DatabaseIcon} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Search Engine Indexing</h4>
                <p className="text-sm text-muted-foreground">
                  Allow search engines to index your public content
                </p>
              </div>
            </div>
            <Switch
              checked={settings.privacyControls.indexed}
              onCheckedChange={(checked) => handleSettingChange('privacyControls', 'indexed', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
                <HugeiconsIcon icon={SmartPhone01Icon} className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Location Tracking</h4>
                <p className="text-sm text-muted-foreground">
                  Allow location-based features and services
                </p>
              </div>
            </div>
            <Switch
              checked={settings.privacyControls.trackLocation}
              onCheckedChange={(checked) => handleSettingChange('privacyControls', 'trackLocation', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-md">
                <HugeiconsIcon icon={LockIcon} className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium">Essential Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Allow essential cookies for site functionality
                </p>
              </div>
            </div>
            <Switch
              checked={settings.privacyControls.cookies}
              onCheckedChange={(checked) => handleSettingChange('privacyControls', 'cookies', checked)}
            />
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Data Management */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={Download01Icon} className="h-4 w-4" />
          Data Management
        </h3>
        <p className="text-muted-foreground mb-6">
          Export or delete your personal data
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                <HugeiconsIcon icon={Download01Icon} className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Export Data</h4>
                <p className="text-sm text-muted-foreground">
                  Download a copy of your personal data
                </p>
              </div>
            </div>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              variant="outline"
              className="w-full"
            >
              {isExporting ? (
                <>
                  <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Download01Icon} className="h-4 w-4 mr-2" />
                  Export My Data
                </>
              )}
            </Button>
          </div>

          <div className="p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-md">
                <HugeiconsIcon icon={Delete02Icon} className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="font-medium">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
            </div>
            <Button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {isDeleting ? (
                <>
                  <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" />
                  Delete Account
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4" />
              <span className="text-sm">Privacy settings saved successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4" />
              <span className="text-sm">Failed to save privacy settings. Please try again.</span>
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
                <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={GlobeIcon} className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
