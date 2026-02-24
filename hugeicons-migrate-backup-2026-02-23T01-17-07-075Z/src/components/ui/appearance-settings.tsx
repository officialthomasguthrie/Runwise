"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  Type, 
  Layout, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  Grid3X3,
  Maximize2,
  Minimize2
} from "lucide-react";
import { useTheme } from "next-themes";

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
  animations: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  sidebarCollapsed: boolean;
  showGrid: boolean;
  accentColor: string;
}

export function AppearanceSettings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppearanceSettings>({
    theme: 'dark',
    fontSize: 'medium',
    density: 'comfortable',
    animations: true,
    reducedMotion: false,
    highContrast: false,
    sidebarCollapsed: false,
    showGrid: false,
    accentColor: 'purple'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load appearance settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        // In a real app, this would load from user preferences
        // For now, we'll use current theme and defaults
        setSettings(prev => ({
          ...prev,
          theme: theme as 'light' | 'dark' | 'system'
        }));
      } catch (error) {
        console.error('Error loading appearance settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user, theme]);

  // Handle setting changes
  const handleSettingChange = (field: keyof AppearanceSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Update theme
      setTheme(settings.theme);
      
      // In a real app, this would save to user preferences
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving appearance settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings({
      theme: 'dark',
      fontSize: 'medium',
      density: 'comfortable',
      animations: true,
      reducedMotion: false,
      highContrast: false,
      sidebarCollapsed: false,
      showGrid: false,
      accentColor: 'purple'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading appearance settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Appearance Header */}
      <div>
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Customize the look and feel of your interface
            </p>
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Sun className="h-4 w-4" />
          Theme
        </h3>
        <p className="text-muted-foreground mb-6">
          Choose your preferred color scheme
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            className={`p-4 border rounded-md cursor-pointer transition-colors ${
              settings.theme === 'light' 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                : 'border-border bg-muted/50 hover:bg-muted'
            }`}
            onClick={() => handleSettingChange('theme', 'light')}
          >
            <div className="flex items-center gap-3 mb-2">
              <Sun className="h-5 w-5 text-yellow-600" />
              <span className="font-medium">Light</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Clean and bright interface
            </p>
          </div>
          
          <div 
            className={`p-4 border rounded-md cursor-pointer transition-colors ${
              settings.theme === 'dark' 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                : 'border-border bg-muted/50 hover:bg-muted'
            }`}
            onClick={() => handleSettingChange('theme', 'dark')}
          >
            <div className="flex items-center gap-3 mb-2">
              <Moon className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Dark</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Easy on the eyes in low light
            </p>
          </div>
          
          <div 
            className={`p-4 border rounded-md cursor-pointer transition-colors ${
              settings.theme === 'system' 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                : 'border-border bg-muted/50 hover:bg-muted'
            }`}
            onClick={() => handleSettingChange('theme', 'system')}
          >
            <div className="flex items-center gap-3 mb-2">
              <Monitor className="h-5 w-5 text-gray-600" />
              <span className="font-medium">System</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Follows your system preference
            </p>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Typography */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Type className="h-4 w-4" />
          Typography
        </h3>
        <p className="text-muted-foreground mb-6">
          Adjust text size and readability
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Font Size</Label>
            <div className="grid grid-cols-3 gap-3">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <div
                  key={size}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    settings.fontSize === size 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-border bg-muted/50 hover:bg-muted'
                  }`}
                  onClick={() => handleSettingChange('fontSize', size)}
                >
                  <div className="text-center">
                    <div className={`font-medium ${
                      size === 'small' ? 'text-sm' : 
                      size === 'medium' ? 'text-base' : 'text-lg'
                    }`}>
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </div>
                    <div className={`text-xs text-muted-foreground mt-1 ${
                      size === 'small' ? 'text-xs' : 
                      size === 'medium' ? 'text-sm' : 'text-base'
                    }`}>
                      Sample text
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Layout & Density */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Layout className="h-4 w-4" />
          Layout & Density
        </h3>
        <p className="text-muted-foreground mb-6">
          Control spacing and layout density
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Interface Density</Label>
            <div className="grid grid-cols-3 gap-3">
              {(['compact', 'comfortable', 'spacious'] as const).map((density) => (
                <div
                  key={density}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    settings.density === density 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-border bg-muted/50 hover:bg-muted'
                  }`}
                  onClick={() => handleSettingChange('density', density)}
                >
                  <div className="text-center">
                    <div className="font-medium text-sm">
                      {density.charAt(0).toUpperCase() + density.slice(1)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {density === 'compact' ? 'Tight spacing' :
                       density === 'comfortable' ? 'Balanced spacing' : 'Loose spacing'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Accessibility */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4" />
          Accessibility
        </h3>
        <p className="text-muted-foreground mb-6">
          Improve readability and reduce motion
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Animations</h4>
                <p className="text-sm text-muted-foreground">
                  Enable smooth transitions and animations
                </p>
              </div>
            </div>
            <Switch
              checked={settings.animations}
              onCheckedChange={(checked) => handleSettingChange('animations', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <EyeOff className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Reduce Motion</h4>
                <p className="text-sm text-muted-foreground">
                  Minimize animations for better accessibility
                </p>
              </div>
            </div>
            <Switch
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => handleSettingChange('reducedMotion', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-md">
                <Eye className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium">High Contrast</h4>
                <p className="text-sm text-muted-foreground">
                  Increase contrast for better visibility
                </p>
              </div>
            </div>
            <Switch
              checked={settings.highContrast}
              onCheckedChange={(checked) => handleSettingChange('highContrast', checked)}
            />
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Interface Options */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Grid3X3 className="h-4 w-4" />
          Interface Options
        </h3>
        <p className="text-muted-foreground mb-6">
          Customize interface elements and behavior
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
                <Minimize2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Collapsed Sidebar</h4>
                <p className="text-sm text-muted-foreground">
                  Start with sidebar collapsed by default
                </p>
              </div>
            </div>
            <Switch
              checked={settings.sidebarCollapsed}
              onCheckedChange={(checked) => handleSettingChange('sidebarCollapsed', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-md">
                <Grid3X3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h4 className="font-medium">Show Grid</h4>
                <p className="text-sm text-muted-foreground">
                  Display grid lines in workspace areas
                </p>
              </div>
            </div>
            <Switch
              checked={settings.showGrid}
              onCheckedChange={(checked) => handleSettingChange('showGrid', checked)}
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
              <span className="text-sm">Appearance settings saved successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to save appearance settings. Please try again.</span>
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
                <Palette className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
