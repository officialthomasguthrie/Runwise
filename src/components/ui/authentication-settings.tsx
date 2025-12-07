"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { Mail, Lock, Check, X, Plus, Trash2, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuthMethod {
  id: string;
  provider: string;
  email?: string;
  isPrimary: boolean;
  connectedAt?: string;
}

export function AuthenticationSettings() {
  const { user, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const [authMethods, setAuthMethods] = useState<AuthMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [methodToUnlink, setMethodToUnlink] = useState<AuthMethod | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  
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
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const loadAuthMethods = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          setLoading(false);
          return;
        }

        // Get user identities from Supabase
        const identities = currentUser.identities || [];
        const methods: AuthMethod[] = [];

        // Check for email/password
        const emailIdentity = identities.find(id => id.provider === 'email');
        if (emailIdentity || currentUser.email) {
          methods.push({
            id: emailIdentity?.id || 'email',
            provider: 'email',
            email: currentUser.email,
            isPrimary: true,
            connectedAt: currentUser.created_at
          });
        }

        // Check for OAuth providers
        identities.forEach(identity => {
          if (identity.provider !== 'email') {
            methods.push({
              id: identity.id,
              provider: identity.provider,
              email: (identity as any).email || currentUser.email || '',
              isPrimary: false,
              connectedAt: identity.created_at
            });
          }
        });

        setAuthMethods(methods);
      } catch (error) {
        console.error('Error loading auth methods:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuthMethods();
  }, [user]);

  const handleLinkProvider = async (provider: 'google' | 'microsoft') => {
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'microsoft') {
        await signInWithMicrosoft();
      }
      // OAuth will redirect, so we don't need to update state here
    } catch (error) {
      console.error(`Error linking ${provider}:`, error);
    }
  };

  const handleUnlinkClick = (method: AuthMethod) => {
    // Don't allow unlinking email if it's the only method
    if (method.provider === 'email' && authMethods.length === 1) {
      return;
    }
    setMethodToUnlink(method);
    setUnlinkDialogOpen(true);
  };

  const handleUnlink = async () => {
    if (!methodToUnlink) return;

    setIsUnlinking(true);
    try {
      const supabase = createClient();
      
      // For OAuth providers, we need to unlink the identity
      // Note: Supabase doesn't have a direct API to unlink, so we'll need to handle this
      // For now, we'll show a message that this requires contacting support
      // In a real implementation, you'd need a server-side endpoint to handle this
      
      console.log('Unlinking method:', methodToUnlink);
      // TODO: Implement actual unlinking via API endpoint
      
      setUnlinkDialogOpen(false);
      setMethodToUnlink(null);
      
      // Reload auth methods
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const identities = currentUser.identities || [];
        const methods: AuthMethod[] = [];
        
        const emailIdentity = identities.find(id => id.provider === 'email');
        if (emailIdentity || currentUser.email) {
          methods.push({
            id: emailIdentity?.id || 'email',
            provider: 'email',
            email: currentUser.email,
            isPrimary: true,
            connectedAt: currentUser.created_at
          });
        }

        identities.forEach(identity => {
          if (identity.provider !== 'email') {
            methods.push({
              id: identity.id,
              provider: identity.provider,
              email: (identity as any).email || currentUser.email || '',
              isPrimary: false,
              connectedAt: identity.created_at
            });
          }
        });

        setAuthMethods(methods);
      }
    } catch (error) {
      console.error('Error unlinking method:', error);
    } finally {
      setIsUnlinking(false);
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'email':
        return 'Email & Password';
      case 'google':
        return 'Google';
      case 'azure':
        return 'Microsoft';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'google':
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'azure':
        return (
          <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none">
            <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#F25022"/>
            <path d="M23 11.4H11.6V0H23v11.4z" fill="#7FBA00"/>
            <path d="M11.4 23H0V11.6h11.4V23z" fill="#00A4EF"/>
            <path d="M23 23H11.6V11.6H23V23z" fill="#FFB900"/>
          </svg>
        );
      default:
        return <Lock className="h-5 w-5" />;
    }
  };

  const hasProvider = (provider: string) => {
    return authMethods.some(method => method.provider === provider);
  };

  const hasEmailPassword = () => {
    return authMethods.some(method => method.provider === 'email');
  };

  const handlePasswordChange = async () => {
    if (!user || !hasEmailPassword()) return;

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

    setPasswordErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsChangingPassword(true);
    setPasswordChangeStatus('idle');

    try {
      const supabase = createClient();
      
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: passwordData.currentPassword
      });

      if (signInError) {
        setPasswordErrors({ currentPassword: "Current password is incorrect" });
        setPasswordChangeStatus('error');
        setTimeout(() => setPasswordChangeStatus('idle'), 5000);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      setPasswordChangeStatus('success');
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({});
      setTimeout(() => setPasswordChangeStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordChangeStatus('error');
      setPasswordErrors({ newPassword: error.message || "Failed to change password" });
      setTimeout(() => setPasswordChangeStatus('idle'), 5000);
    } finally {
      setIsChangingPassword(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading authentication methods...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Login Methods
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage how you sign in to your account
          </p>
        </div>

        {/* Connected Methods */}
        <div className="space-y-3">
          {authMethods.map((method) => (
            <div
              key={method.id}
              className="rounded-lg border border-stone-200 dark:border-white/20 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-background/50 border border-border">
                    {getProviderIcon(method.provider)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {getProviderName(method.provider)}
                      </h3>
                      {method.isPrimary && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          Primary
                        </span>
                      )}
                    </div>
                    {method.email && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {method.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    <span>Connected</span>
                  </div>
                  {!method.isPrimary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkClick(method)}
                      className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Unlink
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Available Methods to Link */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Add Login Method
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!hasProvider('google') && (
              <button
                onClick={() => handleLinkProvider('google')}
                className="rounded-lg border border-stone-200 dark:border-white/20 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-4 hover:bg-stone-200/80 dark:hover:bg-zinc-900/80 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-background/50 border border-border">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">Google</h4>
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sign in with your Google account
                    </p>
                  </div>
                </div>
              </button>
            )}

            {!hasProvider('azure') && (
              <button
                onClick={() => handleLinkProvider('microsoft')}
                className="rounded-lg border border-stone-200 dark:border-white/20 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-4 hover:bg-stone-200/80 dark:hover:bg-zinc-900/80 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-background/50 border border-border">
                    <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none">
                      <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#F25022"/>
                      <path d="M23 11.4H11.6V0H23v11.4z" fill="#7FBA00"/>
                      <path d="M11.4 23H0V11.6h11.4V23z" fill="#00A4EF"/>
                      <path d="M23 23H11.6V11.6H23V23z" fill="#FFB900"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">Microsoft</h4>
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sign in with your Microsoft account
                    </p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Password Change Section */}
        {hasEmailPassword() && (
          <div className="space-y-4 pt-6 border-t border-stone-200 dark:border-white/20">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Change Password
              </h2>
              <p className="text-sm text-muted-foreground">
                Update your account password
              </p>
            </div>

            <div className="rounded-lg border border-stone-200 dark:border-white/20 bg-gradient-to-br from-stone-100 to-stone-200/60 dark:from-zinc-900/90 dark:to-zinc-900/60 backdrop-blur-xl p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="pl-10 pr-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/60 hover:text-foreground"
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.currentPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password (min. 8 characters)"
                    className="pl-10 pr-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/60 hover:text-foreground"
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.newPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/60 hover:text-foreground"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex items-center justify-end pt-2">
                <Button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword}
                  variant="ghost"
                  className="bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : passwordChangeStatus === 'success' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Password Changed
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Unlink Confirmation Dialog */}
      <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unlink Login Method</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to unlink {methodToUnlink && getProviderName(methodToUnlink.provider)}? 
              You will no longer be able to sign in using this method.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUnlinkDialogOpen(false);
                setMethodToUnlink(null);
              }}
              disabled={isUnlinking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlink}
              disabled={isUnlinking}
            >
              {isUnlinking ? 'Unlinking...' : 'Unlink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

