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
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    avatarUrl: "",
    createdAt: "",
    lastLogin: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  // Load user profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Get user metadata
        const firstName = user.user_metadata?.first_name || "";
        const lastName = user.user_metadata?.last_name || "";
        const avatarUrl = user.user_metadata?.avatar_url || "";
        
        // Get additional profile data from a profiles table (if it exists)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // Handle profile data safely
        const profileData = profile as any || {};

        setProfileData({
          firstName,
          lastName,
          email: user.email || "",
          phone: profileData?.phone || "",
          location: profileData?.location || "",
          bio: profileData?.bio || "",
          avatarUrl,
          createdAt: user.created_at || "",
          lastLogin: user.last_sign_in_at || ""
        });
      } catch (error) {
        console.error('Error loading profile:', error);
        // Fallback to basic user data
        setProfileData(prev => ({
          ...prev,
          firstName: user.user_metadata?.first_name || "",
          lastName: user.user_metadata?.last_name || "",
          email: user.email || "",
          createdAt: user.created_at || "",
          lastLogin: user.last_sign_in_at || ""
        }));
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [user, supabase]);

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

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      setIsSaving(true);
      
      // Upload to Supabase Storage (if available)
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfileData(prev => ({ ...prev, avatarUrl: publicUrl }));
      
      // Update user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setErrors(prev => ({ ...prev, avatar: "Failed to upload avatar" }));
    } finally {
      setIsSaving(false);
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
      {/* Profile Header */}
      <div>
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </h2>
            <p className="text-muted-foreground mt-1">
              Update your personal information and profile details
            </p>
          </div>
        </div>
        
        {/* Avatar Section */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileData.avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl">
                {profileData.firstName[0]}{profileData.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 bg-background border border-border rounded-full p-1.5 cursor-pointer hover:bg-muted transition-colors">
              <Camera className="h-3 w-3" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
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

        <Separator className="mb-8" />

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={profileData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="Enter your first name"
              className={`bg-muted/50 border-border ${errors.firstName ? "border-red-500" : ""}`}
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
              className={`bg-muted/50 border-border ${errors.lastName ? "border-red-500" : ""}`}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 mt-6">
          <Label htmlFor="email">Email Address *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={profileData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email address"
              className={`pl-10 bg-muted/50 border-border ${errors.email ? "border-red-500" : ""}`}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2 mt-6">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter your phone number"
              className={`pl-10 bg-muted/50 border-border ${errors.phone ? "border-red-500" : ""}`}
            />
          </div>
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2 mt-6">
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              value={profileData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter your location"
              className="pl-10 bg-muted/50 border-border"
            />
          </div>
        </div>

        <div className="space-y-2 mt-6">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={profileData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Tell us about yourself..."
            className="w-full min-h-[100px] px-3 py-2 border border-border bg-muted/50 rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {profileData.bio.length}/500 characters
          </p>
        </div>
      </div>

      {/* Account Information */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5" />
          Account Information
        </h2>
        <p className="text-muted-foreground mb-6">
          Your account details and activity information
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
            <div className="p-3 bg-muted/50 border border-border rounded-md">
              <p className="text-sm">
                {profileData.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Last Login</Label>
            <div className="p-3 bg-muted/50 border border-border rounded-md">
              <p className="text-sm">
                {profileData.lastLogin ? new Date(profileData.lastLogin).toLocaleDateString() : "N/A"}
              </p>
            </div>
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
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
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
    </div>
  );
}
