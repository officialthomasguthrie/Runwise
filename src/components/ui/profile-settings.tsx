"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Calendar01Icon, Call02Icon, Camera01Icon, CheckmarkCircle01Icon, FloppyDiskIcon, Loading02Icon, Location01Icon, Mail01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);
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

  // Auto-save when profile data changes
  useEffect(() => {
    // Don't auto-save during initial load
    if (isInitialLoad.current || !user || isLoading) {
      isInitialLoad.current = false;
      return;
    }

    // Don't auto-save if required fields are empty (initial state)
    if (!profileData.firstName.trim() && !profileData.lastName.trim() && !profileData.email.trim()) {
      return;
    }

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Debounce save by 1000ms
    saveTimerRef.current = setTimeout(() => {
      if (validateForm()) {
        handleSave();
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData.firstName, profileData.lastName, profileData.email, profileData.phone, profileData.location, profileData.bio, profileData.avatarUrl]);

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

  // Save profile data (now called automatically)
  const handleSave = async () => {
    if (!user || !validateForm()) return;

    setIsSaving(true);

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
      <div className="max-w-[800px] space-y-10 pb-16">
        {/* Avatar Section Skeleton */}
        <div className="flex gap-6">
          <div className="h-20 w-20 rounded-full bg-gray-300 dark:bg-[#303030] animate-pulse" />
          <div className="space-y-3">
            <div className="h-6 w-48 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
          </div>
        </div>

        {/* Identity Section Skeleton */}
        <div className="space-y-6">
          <div>
            <div className="h-5 w-20 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                <div className="h-10 w-full bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                <div className="h-10 w-full bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section Skeleton */}
        <div className="space-y-6">
          <div>
            <div className="h-5 w-20 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse mb-4" />
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                <div className="h-10 w-full bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                <div className="h-10 w-full bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-[#303030] rounded-md animate-pulse" />
                <div className="h-10 w-full bg-gray-300 dark:bg-[#303030] rounded-md animate-pulse" />
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="max-w-[800px] space-y-10 pb-16">
      {/* Avatar Section */}
      <div className="flex gap-6">
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
              className={`bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-opacity duration-200 ${
                (profileData.avatarUrl || user?.user_metadata?.avatar_url) && avatarLoaded 
                  ? 'opacity-0' 
                  : 'opacity-100'
              }`}
            >
              <HugeiconsIcon icon={UserIcon} className="h-8 w-8" />
            </AvatarFallback>
            </Avatar>
          {/* Loading overlay for avatar upload */}
          {isUploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 dark:bg-black/60 rounded-full backdrop-blur-sm">
              <HugeiconsIcon icon={Loading02Icon} className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <label className="absolute bottom-0 right-0 bg-background border border-neutral-300 dark:border-neutral-700 rounded-full p-1.5 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors z-10">
              <HugeiconsIcon icon={Camera01Icon} className="h-3 w-3" />
              <input
                type="file"
                accept="image/*"
              onChange={handleFileSelect}
                className="hidden"
              disabled={isUploadingAvatar}
              />
            </label>
          </div>
        <div>
          <h3 className="font-semibold text-lg mb-1">
              {profileData.firstName} {profileData.lastName}
            </h3>
          <p className="text-muted-foreground text-sm">{profileData.email}</p>
            {errors.avatar && (
              <p className="text-sm text-red-500 mt-1">{errors.avatar}</p>
            )}
          </div>
        </div>

      {/* Identity Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold mb-4">Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={profileData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="Enter your first name"
                className={`bg-background border border-neutral-300 dark:border-neutral-700 rounded-md focus-visible:ring-0 focus-visible:border-neutral-500 dark:focus-visible:border-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors ${errors.firstName ? "border-red-500 dark:border-red-500" : ""}`}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={profileData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Enter your last name"
                className={`bg-background border border-neutral-300 dark:border-neutral-700 rounded-md focus-visible:ring-0 focus-visible:border-neutral-500 dark:focus-visible:border-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors ${errors.lastName ? "border-red-500 dark:border-red-500" : ""}`}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName}</p>
            )}
            </div>
          </div>
          </div>
        </div>

      {/* Contact Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold mb-4">Contact</h2>
          <div className="space-y-6">
            <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={profileData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email address"
                className={`bg-background border border-neutral-300 dark:border-neutral-700 rounded-md focus-visible:ring-0 focus-visible:border-neutral-500 dark:focus-visible:border-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors ${errors.email ? "border-red-500 dark:border-red-500" : ""}`}
            />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

            <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter your phone number"
                className={`bg-background border border-neutral-300 dark:border-neutral-700 rounded-md focus-visible:ring-0 focus-visible:border-neutral-500 dark:focus-visible:border-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors ${errors.phone ? "border-red-500 dark:border-red-500" : ""}`}
            />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

            <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={profileData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter your location"
                className="bg-background border border-neutral-300 dark:border-neutral-700 rounded-md focus-visible:ring-0 focus-visible:border-neutral-500 dark:focus-visible:border-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
            />
            </div>
          </div>
        </div>
      </div>

      {/* Auto-save status messages */}
      <div className="flex gap-2 pt-2">
          {saveStatus === 'success' && (
          <div className="flex gap-2 text-green-600">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4" />
              <span className="text-sm">Profile saved successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
          <div className="flex gap-2 text-red-600">
              <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4" />
              <span className="text-sm">Failed to save profile. Please try again.</span>
            </div>
          )}
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
