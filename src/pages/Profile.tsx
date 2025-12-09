import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Bell,
  Loader2,
  Camera,
  RefreshCw,
  Info,
  Phone,
  Calendar,
  MapPin,
  Gamepad2,
  User,
  Hash
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

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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

  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
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
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 2MB',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture has been updated.',
      });

      fetchProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload Failed',
        description: 'Could not upload avatar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

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

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved.',
      });
      
      setEditDialogOpen(false);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { icon: Trophy, label: 'My Matches', onClick: () => navigate('/my-match') },
    { icon: Wallet, label: 'Wallet', onClick: () => navigate('/wallet') },
    { icon: Bell, label: 'Notifications', onClick: () => {} },
    { icon: Settings, label: 'Settings', onClick: () => {} },
    { icon: HelpCircle, label: 'Help & Support', onClick: () => {} },
    { icon: FileText, label: 'Terms & Conditions', onClick: () => navigate('/terms') },
    { icon: RefreshCw, label: 'Refund Policy', onClick: () => navigate('/refund-policy') },
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
      {/* Instagram-style Profile Header */}
      <div className="bg-card px-4 pt-6 pb-4">
        {/* Top Row - Avatar & Stats */}
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-card"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5 text-primary-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* Stats Row */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="font-bold text-lg text-foreground">0</p>
              <p className="text-xs text-muted-foreground">Matches</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg text-foreground">0</p>
              <p className="text-xs text-muted-foreground">Wins</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg text-foreground">₹0</p>
              <p className="text-xs text-muted-foreground">Earnings</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base text-foreground">
              {profile?.full_name || profile?.username || 'Gamer'}
            </h1>
            {isAdmin && (
              <Badge className="bg-primary/10 text-primary text-[10px]">
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                Admin
              </Badge>
            )}
          </div>
          {profile?.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
          {profile?.bio && (
            <p className="text-sm text-foreground mt-1">{profile.bio}</p>
          )}
        </div>

        {/* Edit Profile Button */}
        <button 
          onClick={() => setEditDialogOpen(true)}
          className="w-full mt-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-semibold rounded-lg border border-border transition-colors"
        >
          Edit Profile
        </button>
      </div>

      {/* Divider */}
      <div className="h-2 bg-muted/50" />

      {/* Admin Panel Access */}
      {isAdmin && (
        <div className="p-4 pt-4">
          <button
            onClick={() => navigate('/admin')}
            className="w-full bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">Admin Panel</p>
              <p className="text-xs text-muted-foreground">Manage tournaments & users</p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary" />
          </button>
        </div>
      )}

      {/* Menu Items */}
      <div className="p-4 pt-4">
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

      {/* Logout */}
      <div className="px-4 pb-6">
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile details and avatar
            </DialogDescription>
          </DialogHeader>
          
          {/* Warning Message */}
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            Username, Game Name, and Level can be edited in 3 days
          </p>

          <div className="space-y-6 pt-2">
            {/* Profile Photo Section */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-border">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button 
                variant="outline" 
                className="text-primary border-primary hover:bg-primary/10"
                onClick={() => editFileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                Change Photo
              </Button>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Username
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">Username must be unique</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date of Birth
                </Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter your location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
            </div>

            {/* Gaming Details Section */}
            <div className="border-2 border-primary/30 rounded-xl overflow-hidden">
              <div className="bg-primary/10 px-4 py-3 border-b border-primary/30">
                <h3 className="font-semibold text-primary flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  Gaming Details
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_game">Preferred Game</Label>
                  <Select
                    value={formData.preferred_game}
                    onValueChange={(value) => setFormData({ ...formData, preferred_game: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your preferred game" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BGMI">BGMI</SelectItem>
                      <SelectItem value="Free Fire">Free Fire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="in_game_name" className="flex items-center gap-1">
                    In-Game Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="in_game_name"
                    value={formData.in_game_name}
                    onChange={(e) => setFormData({ ...formData, in_game_name: e.target.value })}
                    placeholder="Enter your in-game name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game_uid" className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    UID / ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="game_uid"
                    value={formData.game_uid}
                    onChange={(e) => setFormData({ ...formData, game_uid: e.target.value })}
                    placeholder="Enter your game UID"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ProfilePage;
