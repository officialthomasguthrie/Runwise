"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Phone, 
  Camera, 
  Save, 
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { AvatarCropModal } from "@/components/ui/avatar-crop-modal";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  avatarUrl?: string;
  createdAt: string;
  lastLogin: string;
}

export function ProfileSettings() {
  const { user, signOut, refreshUser } = useAuth();
  
  // Initialize profile data immediately from user context to prevent flash
  const [profileData, setProfileData] = useState<ProfileData>(() => {
    if (user) {
      return {
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        email: user.email || "",
        phone: "",
        location: "",
        bio: "",
        avatarUrl: user.user_metadata?.avatar_url || "",
        createdAt: user.created_at || "",
        lastLogin: user.last_sign_in_at || ""
      };
    }
    return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    avatarUrl: "",
    createdAt: "",
    lastLogin: ""
    };
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  // Initialize avatarLoaded - check if image is already cached from user context
  const [avatarLoaded, setAvatarLoaded] = useState(() => {
    const initialAvatarUrl = user?.user_metadata?.avatar_url;
    if (initialAvatarUrl) {
      try {
        const img = new Image();
        img.src = initialAvatarUrl;
        // If image is already loaded/cached, it will be complete
        return img.complete || img.naturalWidth > 0;
      } catch {
        return false;
      }
    }
    return false;
  });

  const supabase = createClient();

  // Preload avatar image immediately to prevent flash
  useEffect(() => {
    const avatarUrl = profileData.avatarUrl || user?.user_metadata?.avatar_url;
    if (avatarUrl) {
      const img = new Image();
      // Check if already cached first
      img.src = avatarUrl;
      if (img.complete || img.naturalWidth > 0) {
        setAvatarLoaded(true);
      } else {
        // Otherwise wait for load
        img.onload = () => {
          setAvatarLoaded(true);
        };
        img.onerror = () => {
          setAvatarLoaded(false);
        };
      }
    } else {
      setAvatarLoaded(false);
    }
  }, [profileData.avatarUrl, user?.user_metadata?.avatar_url]);

  // Load user profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Get fresh user data
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        const currentUser = freshUser || user;
        
        // Get user metadata
        const firstName = currentUser.user_metadata?.first_name || "";
        const lastName = currentUser.user_metadata?.last_name || "";
        const avatarUrl = currentUser.user_metadata?.avatar_url || "";
        
        // Get additional profile data from a profiles table (if it exists)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        // Handle profile data safely
        const profileData = profile as any || {};

        setProfileData(prev => ({
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          email: currentUser.email || prev.email,
          phone: profileData?.phone || prev.phone,
          location: profileData?.location || prev.location,
          bio: profileData?.bio || prev.bio,
          // Only update avatarUrl if it's different to avoid unnecessary re-renders
          avatarUrl: avatarUrl || prev.avatarUrl,
          createdAt: currentUser.created_at || prev.createdAt,
          lastLogin: currentUser.last_sign_in_at || prev.lastLogin
        }));
      } catch (error) {
        console.error('Error loading profile:', error);
        // Keep existing data, just update what we can
        setProfileData(prev => ({
          ...prev,
          firstName: user.user_metadata?.first_name || prev.firstName,
          lastName: user.user_metadata?.last_name || prev.lastName,
          email: user.email || prev.email,
          createdAt: user.created_at || prev.createdAt,
          lastLogin: user.last_sign_in_at || prev.lastLogin
        }));
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [user, supabase, refreshTrigger]);

  // Handle input changes
  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profileData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!profileData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!profileData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (profileData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(profileData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save profile data
  const handleSave = async () => {
    if (!user || !validateForm()) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          avatar_url: profileData.avatarUrl
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Try to update profiles table (create if doesn't exist)
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .upsert({
          id: user.id,
          phone: profileData.phone,
          location: profileData.location,
          bio: profileData.bio,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.warn('Could not update profiles table:', profileError);
        // Continue anyway as this might not exist yet
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle file selection - open crop modal
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Simple file validation
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, avatar: "Please select an image file" }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors(prev => ({ ...prev, avatar: "File size must be less than 5MB" }));
      return;
    }

    // Create object URL for the image
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setCropModalOpen(true);
    
    // Clear the file input so the same file can be selected again if needed
    event.target.value = '';
  };

  // Handle avatar upload after cropping
  const handleAvatarUpload = async (croppedImageBlob: Blob) => {
    if (!user) return;

    try {
      setIsSaving(true);
      setIsUploadingAvatar(true);
      setErrors(prev => ({ ...prev, avatar: "" }));
      
      // Upload via API endpoint which handles bucket creation
      const formData = new FormData();
      formData.append('file', croppedImageBlob, 'avatar.jpg');
      
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload avatar');
      }

      // Add cache-busting parameter to force image refresh
      const avatarUrlWithCache = `${result.url}?t=${Date.now()}`;

      // Update local state with new avatar URL immediately
      setProfileData(prev => ({ ...prev, avatarUrl: avatarUrlWithCache }));
      
      // Immediately refresh the auth context user so sidebar updates
      await refreshUser();

      // Trigger a refresh of profile data after a short delay to ensure metadata is updated
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 500);

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setErrors(prev => ({ ...prev, avatar: error.message || "Failed to upload avatar. Please try again." }));
    } finally {
      setIsSaving(false);
      setIsUploadingAvatar(false);
    }
  };

  // Handle crop modal close
  const handleCropModalClose = () => {
    setCropModalOpen(false);
    // Clean up object URL
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Avatar Section with Save Button */}
      <div className="flex items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-6 flex-1">
          <div className="relative">
            <Avatar className="h-20 w-20">
            {(profileData.avatarUrl || user?.user_metadata?.avatar_url) && (
              <AvatarImage 
                src={profileData.avatarUrl || user?.user_metadata?.avatar_url} 
                key={profileData.avatarUrl || user?.user_metadata?.avatar_url}
                className={avatarLoaded ? "opacity-100" : "opacity-0"}
                style={{ transition: 'opacity 0.2s ease-in-out' }}
                onLoad={() => setAvatarLoaded(true)}
                onError={(e) => {
                  setAvatarLoaded(false);
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <AvatarFallback 
              className={`bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl transition-opacity duration-200 ${
                (profileData.avatarUrl || user?.user_metadata?.avatar_url) && avatarLoaded 
                  ? 'opacity-0' 
                  : 'opacity-100'
              }`}
            >
              {profileData.firstName[0] || user?.user_metadata?.first_name?.[0] || ""}
              {profileData.lastName[0] || user?.user_metadata?.last_name?.[0] || ""}
              </AvatarFallback>
            </Avatar>
          {/* Loading overlay for avatar upload */}
          {isUploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 dark:bg-black/60 rounded-full backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <label className="absolute bottom-0 right-0 bg-background border border-border rounded-full p-1.5 cursor-pointer hover:bg-muted transition-colors z-10">
              <Camera className="h-3 w-3" />
              <input
                type="file"
                accept="image/*"
              onChange={handleFileSelect}
                className="hidden"
              disabled={isUploadingAvatar}
              />
            </label>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {profileData.firstName} {profileData.lastName}
            </h3>
            <p className="text-muted-foreground">{profileData.email}</p>
            {errors.avatar && (
              <p className="text-sm text-red-500 mt-1">{errors.avatar}</p>
            )}
          </div>
        </div>

        {/* Top Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          variant="ghost"
          className="bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
            <Input
              id="firstName"
              value={profileData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="Enter your first name"
                className={`pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70 ${errors.firstName ? "border-red-500 dark:border-red-500" : ""}`}
            />
            </div>
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
            <Input
              id="lastName"
              value={profileData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Enter your last name"
                className={`pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70 ${errors.lastName ? "border-red-500 dark:border-red-500" : ""}`}
            />
            </div>
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 mt-6">
          <Label htmlFor="email">Email Address *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
            <Input
              id="email"
              type="email"
              value={profileData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email address"
              className={`pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70 ${errors.email ? "border-red-500 dark:border-red-500" : ""}`}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2 mt-6">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
            <Input
              id="phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter your phone number"
              className={`pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70 ${errors.phone ? "border-red-500 dark:border-red-500" : ""}`}
            />
          </div>
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2 mt-6">
          <Label htmlFor="location">Location</Label>
          <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
            <Input
              id="location"
              value={profileData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter your location"
            className="pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      {/* Account Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
          <Label htmlFor="memberSince">Member Since</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
            <Input
              id="memberSince"
              value={profileData.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : "N/A"}
              readOnly
              className="pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70 cursor-default"
            />
            </div>
          </div>
          <div className="space-y-2">
          <Label htmlFor="lastLogin">Last Login</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/60 dark:text-foreground/60 z-10 pointer-events-none" />
            <Input
              id="lastLogin"
              value={profileData.lastLogin ? new Date(profileData.lastLogin).toLocaleDateString() : "N/A"}
              readOnly
              className="pl-10 backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70 cursor-default"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Profile saved successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to save profile. Please try again.</span>
            </div>
          )}
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          variant="ghost"
          className="bg-white/80 dark:bg-white/5 border border-gray-300 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Avatar Crop Modal */}
      {imageToCrop && (
        <AvatarCropModal
          open={cropModalOpen}
          imageSrc={imageToCrop}
          onClose={handleCropModalClose}
          onSave={handleAvatarUpload}
        />
      )}
    </div>
  );
}
