"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Shield, 
  Lock, 
  Key, 
  Smartphone, 
  Monitor, 
  MapPin, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";

interface SecuritySession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

interface SecurityData {
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  sessions: SecuritySession[];
}

export function SecuritySettings() {
  const { user } = useAuth();
  const [securityData, setSecurityData] = useState<SecurityData>({
    hasPassword: false,
    twoFactorEnabled: false,
    sessions: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const supabase = createClient();

  // Load security data
  useEffect(() => {
    const loadSecurityData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Check if user has password (not just OAuth)
        const hasPassword = user.app_metadata?.provider === 'email' || 
                           (user.app_metadata?.providers && user.app_metadata.providers.includes('email'));
        
        // Get user sessions (mock data for now)
        const mockSessions: SecuritySession[] = [
          {
            id: '1',
            device: 'Chrome on Windows',
            location: 'New York, NY',
            lastActive: new Date().toISOString(),
            current: true
          },
          {
            id: '2',
            device: 'Safari on iPhone',
            location: 'San Francisco, CA',
            lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            current: false
          }
        ];

        setSecurityData({
          hasPassword,
          twoFactorEnabled: false, // This would come from user metadata
          sessions: mockSessions
        });
      } catch (error) {
        console.error('Error loading security data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSecurityData();
  }, [user]);

  // Handle password change
  const handlePasswordChange = async () => {
    if (!user) return;

    // Validate passwords
    const newErrors: Record<string, string> = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      setSaveStatus('success');
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle 2FA toggle
  const handle2FAToggle = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      // This would integrate with actual 2FA service
      setSecurityData(prev => ({ ...prev, twoFactorEnabled: enabled }));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error updating 2FA:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle session termination
  const handleTerminateSession = async (sessionId: string) => {
    try {
      // This would integrate with actual session management
      setSecurityData(prev => ({
        ...prev,
        sessions: prev.sessions.filter(session => session.id !== sessionId)
      }));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error terminating session:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  // Handle input changes
  const handlePasswordInputChange = (field: keyof typeof passwordData, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading security settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Security Header */}
      <div>
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage your password, two-factor authentication, and active sessions
            </p>
          </div>
        </div>
      </div>

      {/* Password Management */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4" />
          Password Management
        </h3>
        <p className="text-muted-foreground mb-6">
          Change your account password to keep your account secure
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                placeholder="Enter your current password"
                className={`bg-muted/50 border-border ${errors.currentPassword ? "border-red-500" : ""}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-red-500">{errors.currentPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                placeholder="Enter your new password"
                className={`bg-muted/50 border-border ${errors.newPassword ? "border-red-500" : ""}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-red-500">{errors.newPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm your new password"
                className={`bg-muted/50 border-border ${errors.confirmPassword ? "border-red-500" : ""}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <Button 
            onClick={handlePasswordChange} 
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating Password...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Update Password
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Two-Factor Authentication */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Smartphone className="h-4 w-4" />
          Two-Factor Authentication
        </h3>
        <p className="text-muted-foreground mb-6">
          Add an extra layer of security to your account with 2FA
        </p>
        
        <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
              <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium">Authenticator App</h4>
              <p className="text-sm text-muted-foreground">
                Use an authenticator app to generate verification codes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant={securityData.twoFactorEnabled ? "default" : "secondary"}
              className={securityData.twoFactorEnabled ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : ""}
            >
              {securityData.twoFactorEnabled ? "Enabled" : "Disabled"}
            </Badge>
            <Switch
              checked={securityData.twoFactorEnabled}
              onCheckedChange={handle2FAToggle}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Active Sessions */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Monitor className="h-4 w-4" />
          Active Sessions
        </h3>
        <p className="text-muted-foreground mb-6">
          Manage devices and locations where you're currently signed in
        </p>
        
        <div className="space-y-3">
          {securityData.sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                  <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{session.device}</h4>
                    {session.current && (
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {session.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(session.lastActive).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              {!session.current && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTerminateSession(session.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Terminate
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security Status */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Security settings updated successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to update security settings. Please try again.</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
