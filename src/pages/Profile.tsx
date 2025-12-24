import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Edit2,
  ChevronRight,
  Shield,
  LogOut,
  Trophy,
  Wallet,
  Settings,
  HelpCircle,
  FileText,
  Loader2,
  Camera,
  RefreshCw,
  Info,
  Phone,
  Calendar,
  MapPin,
  Gamepad2,
  User,
  Hash,
  Crown,
  UserCheck,
  Instagram,
  Youtube,
  CreditCard,
  Users,
  Megaphone,
  Building2,
  Star
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageCropper } from '@/components/ImageCropper';
import { PresetAvatarGallery } from '@/components/PresetAvatarGallery';
import { UnlockableAvatarGallery } from '@/components/UnlockableAvatarGallery';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  date_of_birth: string | null;
  location: string | null;
  preferred_game: string | null;
  in_game_name: string | null;
  game_uid: string | null;
}

interface OrganizerApplication {
  id: string;
  status: string;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [organizerApplication, setOrganizerApplication] = useState<OrganizerApplication | null>(null);
  const [applyForm, setApplyForm] = useState({ 
    name: '', 
    age: '',
    phone: '',
    aadhaar_number: '',
    instagram_link: '',
    youtube_link: '',
    experience: '' 
  });
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    phone: '',
    date_of_birth: '',
    location: '',
    bio: '',
    preferred_game: '',
    in_game_name: '',
    game_uid: '',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const { user, isAdmin, isSuperAdmin, isOrganizer, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchOrganizerApplication();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          username: data.username || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          location: data.location || '',
          bio: data.bio || '',
          preferred_game: data.preferred_game || '',
          in_game_name: data.in_game_name || '',
          game_uid: data.game_uid || '',
        });
        setApplyForm(prev => ({ ...prev, name: data.full_name || '', phone: data.phone || '' }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizerApplication = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('organizer_applications')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle();

      setOrganizerApplication(data);
    } catch (error) {
      console.error('Error fetching application:', error);
    }
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select an image under 10MB', variant: 'destructive' });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Create object URL for the cropper
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setCropperOpen(true);
    
    // Reset file input
    event.target.value = '';
  };

  const handleCroppedImageUpload = useCallback(async (croppedBlob: Blob) => {
    if (!user) return;
    
    setCropperOpen(false);
    setUploadingAvatar(true);

    try {
      const filePath = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add timestamp to bust cache
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithTimestamp })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({ title: 'Avatar Updated', description: 'Your profile picture has been updated.' });
      fetchProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: 'Upload Failed', description: 'Could not upload avatar. Please try again.', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
        setSelectedImageSrc(null);
      }
    }
  }, [user, selectedImageSrc, toast]);

  const handleCropperClose = useCallback(() => {
    setCropperOpen(false);
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
  }, [selectedImageSrc]);

  const handlePresetAvatarSelect = useCallback(async (avatarSrc: string) => {
    if (!user) return;
    
    setUploadingAvatar(true);
    try {
      // Fetch the preset image and convert to blob
      const response = await fetch(avatarSrc);
      const blob = await response.blob();
      
      const filePath = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add timestamp to bust cache
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithTimestamp })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({ title: 'Avatar Updated', description: 'Your profile picture has been updated.' });
      fetchProfile();
    } catch (error) {
      console.error('Error setting preset avatar:', error);
      toast({ title: 'Error', description: 'Could not set avatar. Please try again.', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  }, [user, toast]);

  const handleSave = async () => {
    if (!user) return;

    // Validate required gaming fields
    if (!formData.preferred_game) {
      toast({ title: 'Required Field', description: 'Please select your primary game.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          username: formData.username || null,
          phone: formData.phone || null,
          date_of_birth: formData.date_of_birth || null,
          location: formData.location || null,
          bio: formData.bio || null,
          preferred_game: formData.preferred_game || null,
          in_game_name: formData.in_game_name || null,
          game_uid: formData.game_uid || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Profile Updated', description: 'Your profile has been saved.' });
      setEditDialogOpen(false);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyOrganizer = async () => {
    if (!user || !applyForm.name || !applyForm.phone || !applyForm.age || !applyForm.aadhaar_number) {
      toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }

    // Validate Aadhaar (12 digits)
    if (!/^\d{12}$/.test(applyForm.aadhaar_number.replace(/\s/g, ''))) {
      toast({ title: 'Invalid Aadhaar', description: 'Please enter a valid 12-digit Aadhaar number.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      // Check if user already has an application
      if (organizerApplication) {
        // Update existing application (for rejected users reapplying)
        const { error } = await supabase
          .from('organizer_applications')
          .update({
            name: applyForm.name,
            age: parseInt(applyForm.age),
            phone: applyForm.phone,
            aadhaar_number: applyForm.aadhaar_number.replace(/\s/g, ''),
            instagram_link: applyForm.instagram_link || null,
            youtube_link: applyForm.youtube_link || null,
            experience: applyForm.experience || null,
            status: 'pending',
            rejection_reason: null,
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new application
        const { error } = await supabase
          .from('organizer_applications')
          .insert({
            user_id: user.id,
            name: applyForm.name,
            age: parseInt(applyForm.age),
            phone: applyForm.phone,
            aadhaar_number: applyForm.aadhaar_number.replace(/\s/g, ''),
            instagram_link: applyForm.instagram_link || null,
            youtube_link: applyForm.youtube_link || null,
            experience: applyForm.experience || null,
          });

        if (error) throw error;
      }

      toast({ title: 'Application Submitted', description: 'Your organizer application has been submitted for review.' });
      setApplyDialogOpen(false);
      fetchOrganizerApplication();
    } catch (error: any) {
      if (error?.code === '23505') {
        toast({ title: 'Already Applied', description: 'You have already submitted an application.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to submit application.', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Check if user is a creator
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    const checkCreatorRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'creator')
        .maybeSingle();
      setIsCreator(!!data);
    };
    checkCreatorRole();
  }, [user]);

  const menuItems = [
    { icon: Trophy, label: 'My Matches', onClick: () => navigate('/my-match') },
    { icon: Wallet, label: 'Wallet', onClick: () => navigate('/wallet') },
    { icon: Users, label: 'Team', onClick: () => navigate('/team') },
    { icon: Crown, label: 'Leaderboard', onClick: () => navigate('/leaderboard') },
    { icon: Star, label: 'Achievements', onClick: () => navigate('/achievements') },
  ];

  const moreItems = [
    { icon: Megaphone, label: 'Broadcast Channel', onClick: () => navigate('/broadcast') },
    { icon: HelpCircle, label: 'Help & Support', onClick: () => navigate('/help-support') },
    { icon: FileText, label: 'Terms & Conditions', onClick: () => navigate('/terms') },
    { icon: Info, label: 'About Us', onClick: () => navigate('/about') },
  ];

  if (authLoading || loading) {
    return (
      <AppLayout title="Profile">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Profile Header */}
      <div className="bg-card px-4 pt-6 pb-4">
        {/* Username above avatar - left aligned */}
        <h1 className="font-bold text-xl text-foreground mb-3 pl-1">
          @{profile?.username || 'username'}
        </h1>

        <div className="flex items-center gap-6">
          {/* Avatar on left */}
          <div className="shrink-0">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Details on right */}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold text-base text-foreground">
                {profile?.full_name || 'Gamer'}
              </p>
              {isSuperAdmin && (
                <Badge className="bg-gradient-to-r from-primary to-orange-500 text-primary-foreground text-[10px]">
                  <Crown className="h-2.5 w-2.5 mr-0.5" /> Owner
                </Badge>
              )}
              {isAdmin && !isSuperAdmin && (
                <Badge className="bg-primary/10 text-primary text-[10px]">
                  <Shield className="h-2.5 w-2.5 mr-0.5" /> Team
                </Badge>
              )}
              {isOrganizer && (
                <Badge className="bg-purple-500/10 text-purple-600 text-[10px]">
                  <UserCheck className="h-2.5 w-2.5 mr-0.5" /> Organizer
                </Badge>
              )}
            </div>
            {profile?.in_game_name && (
              <p className="text-sm text-foreground">
                <Gamepad2 className="h-3.5 w-3.5 inline mr-1 text-primary" />
                {profile.in_game_name}
              </p>
            )}
            {profile?.game_uid && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <Hash className="h-3 w-3 inline mr-1" />
                UID: {profile.game_uid}
              </p>
            )}
          </div>
        </div>

        <button 
          onClick={() => setEditDialogOpen(true)}
          className="w-full mt-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-semibold rounded-lg border border-border transition-colors"
        >
          Edit Profile
        </button>
      </div>

      <div className="h-2 bg-muted/50" />

      {/* Account Section */}
      <div className="px-4 pt-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account</h3>
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-border">
          
          {/* Admin Panel - Only for Admins */}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full bg-gradient-to-r from-primary/5 to-orange-500/5 hover:from-primary/10 hover:to-orange-500/10 p-4 flex items-center gap-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">Admin Panel</p>
                  {isSuperAdmin ? (
                    <Badge className="bg-gradient-to-r from-primary to-orange-500 text-white text-[9px] px-1.5 py-0">Super Admin</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Team Member</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isSuperAdmin ? 'Full access to all admin features' : 'Access your assigned admin sections'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-primary" />
            </button>
          )}

          {/* Organizer Dashboard - Only for Organizers */}
          {isOrganizer && (
            <button
              onClick={() => navigate('/organizer')}
              className="w-full bg-gradient-to-r from-purple-500/5 to-pink-500/5 hover:from-purple-500/10 hover:to-pink-500/10 p-4 flex items-center gap-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">Organizer Dashboard</p>
                <p className="text-xs text-muted-foreground">Manage your tournaments & earnings</p>
              </div>
              <ChevronRight className="h-5 w-5 text-purple-500" />
            </button>
          )}

          {/* Creator Dashboard - Only for Creators */}
          {isCreator && (
            <button
              onClick={() => navigate('/creator')}
              className="w-full bg-gradient-to-r from-blue-500/5 to-cyan-500/5 hover:from-blue-500/10 hover:to-cyan-500/10 p-4 flex items-center gap-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Gamepad2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">Creator Dashboard</p>
                <p className="text-xs text-muted-foreground">Manage your creator tournaments</p>
              </div>
              <ChevronRight className="h-5 w-5 text-blue-500" />
            </button>
          )}

          {/* Local Tournament - Available for all users */}
          <button
            onClick={() => navigate('/local-tournament')}
            className="w-full bg-gradient-to-r from-green-500/5 to-emerald-500/5 hover:from-green-500/10 hover:to-emerald-500/10 p-4 flex items-center gap-3 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">Local Tournament</p>
              <p className="text-xs text-muted-foreground">Organize in Schools & Colleges</p>
            </div>
            <ChevronRight className="h-5 w-5 text-green-500" />
          </button>

        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 pt-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Menu</h3>
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* More Section */}
      <div className="px-4 pt-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">More</h3>
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {moreItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-4 pt-4">
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Footer with Logo */}
      <div className="px-4 pt-6 pb-8">
        <div className="flex flex-col items-center">
          <img 
            src={vyuhaLogo} 
            alt="Vyuha Esport" 
            className="h-12 w-12 rounded-full mb-4 opacity-80"
          />
          <p className="text-[10px] text-muted-foreground/60">
            © 2024 Vyuha Esport. All rights reserved.
          </p>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
            <DialogDescription>Update your profile and gaming details</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {/* Avatar Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" onClick={() => editFileInputRef.current?.click()} disabled={uploadingAvatar}>
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                  Upload Photo
                </Button>
                <input ref={editFileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
              </div>
              
              {/* Preset Avatar Gallery */}
              <PresetAvatarGallery
                currentAvatarUrl={profile?.avatar_url}
                onSelect={handlePresetAvatarSelect}
                disabled={uploadingAvatar}
              />
              
              {/* Unlockable Achievement Avatars */}
              <div className="border-t border-border pt-4">
                <UnlockableAvatarGallery
                  currentAvatarUrl={profile?.avatar_url}
                  onSelect={handlePresetAvatarSelect}
                  disabled={uploadingAvatar}
                />
              </div>
            </div>

            {/* Gaming Details Section */}
            <div className="bg-primary/5 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-primary" />
                Gaming Details *
              </h4>
              
              <div className="space-y-2">
                <Label>Primary Game *</Label>
                <Select value={formData.preferred_game} onValueChange={(value) => setFormData({ ...formData, preferred_game: value })}>
                  <SelectTrigger><SelectValue placeholder="Select your game" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Free Fire">Free Fire</SelectItem>
                    <SelectItem value="BGMI">BGMI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>In-Game Name (IGN) *</Label>
                <Input value={formData.in_game_name} onChange={(e) => setFormData({ ...formData, in_game_name: e.target.value })} placeholder="Your in-game name" />
              </div>

              <div className="space-y-2">
                <Label>UID / Character ID *</Label>
                <Input value={formData.game_uid} onChange={(e) => setFormData({ ...formData, game_uid: e.target.value })} placeholder="Your game UID" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Enter your full name" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="Enter username" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Enter phone number" />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself" rows={3} />
              </div>
            </div>

            <Button variant="gaming" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Organizer Dialog - Updated with KYC Fields */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply to Become Organizer</DialogTitle>
            <DialogDescription>Complete your verification to host tournaments</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={applyForm.name} onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Age *</Label>
                <Input type="number" value={applyForm.age} onChange={(e) => setApplyForm({ ...applyForm, age: e.target.value })} placeholder="Age" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input value={applyForm.phone} onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Aadhaar Number *
              </Label>
              <Input 
                value={applyForm.aadhaar_number} 
                onChange={(e) => setApplyForm({ ...applyForm, aadhaar_number: e.target.value })} 
                placeholder="XXXX XXXX XXXX" 
                maxLength={14}
              />
              <p className="text-xs text-muted-foreground">Your Aadhaar is kept confidential</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram Profile
              </Label>
              <Input value={applyForm.instagram_link} onChange={(e) => setApplyForm({ ...applyForm, instagram_link: e.target.value })} placeholder="https://instagram.com/..." />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                YouTube Channel
              </Label>
              <Input value={applyForm.youtube_link} onChange={(e) => setApplyForm({ ...applyForm, youtube_link: e.target.value })} placeholder="https://youtube.com/..." />
            </div>

            <div className="space-y-2">
              <Label>Experience</Label>
              <Textarea value={applyForm.experience} onChange={(e) => setApplyForm({ ...applyForm, experience: e.target.value })} placeholder="Tell us about your experience hosting events..." rows={3} />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Benefits of being an Organizer:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Create and manage your own tournaments</li>
                <li>Earn 10% commission on entry fees</li>
                <li>Build your community of players</li>
              </ul>
            </div>

            <Button variant="gaming" className="w-full" onClick={handleApplyOrganizer} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Application'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Modal */}
      {selectedImageSrc && (
        <ImageCropper
          open={cropperOpen}
          onClose={handleCropperClose}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCroppedImageUpload}
          aspectRatio={1}
          circularCrop={true}
        />
      )}
    </AppLayout>
  );
};

export default ProfilePage;
