import { useState, useEffect, useCallback } from 'react';
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
  ChevronRight, Shield, LogOut, Trophy, Settings, 
  HelpCircle, FileText, Loader2, Info,
  Gamepad2, Crown, UserCheck, Instagram, Youtube, 
  CreditCard, Users, Megaphone, Building2, BarChart3,
  MessageCircle, Sparkles, Zap, Star, TrendingUp
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarGallery } from '@/components/AvatarGallery';
import PushNotificationSetup from '@/components/PushNotificationSetup';

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
  wallet_balance: number | null;
}

interface OrganizerApplication {
  id: string;
  status: string;
}

interface PlayerStats {
  totalMatches: number;
  wins: number;
  totalEarnings: number;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [organizerApplication, setOrganizerApplication] = useState<OrganizerApplication | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({ totalMatches: 0, wins: 0, totalEarnings: 0 });
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
    game_uid: ''
  });

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
      fetchPlayerStats();
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
          game_uid: data.game_uid || ''
        });
        setApplyForm(prev => ({
          ...prev,
          name: data.full_name || '',
          phone: data.phone || ''
        }));
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

  const fetchPlayerStats = async () => {
    if (!user) return;
    try {
      // Fetch dhana earnings for total earnings
      const { data: earnings } = await supabase
        .from('dhana_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'prize')
        .eq('status', 'completed');

      const totalEarnings = earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      
      // Get match count from dhana transactions (each prize = 1 match win approximately)
      const matchCount = earnings?.length || 0;
      
      setPlayerStats({
        totalMatches: matchCount * 3, // Approximate total matches
        wins: matchCount,
        totalEarnings
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePresetAvatarSelect = useCallback(async (avatarSrc: string) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const response = await fetch(avatarSrc);
      const blob = await response.blob();
      const filePath = `${user.id}/avatar.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
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
          game_uid: formData.game_uid || null
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
    if (!/^\d{12}$/.test(applyForm.aadhaar_number.replace(/\s/g, ''))) {
      toast({ title: 'Invalid Aadhaar', description: 'Please enter a valid 12-digit Aadhaar number.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (organizerApplication) {
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
            rejection_reason: null
          })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
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
            experience: applyForm.experience || null
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
    { icon: BarChart3, label: 'Player Stats', onClick: () => navigate('/player-stats') },
    { icon: Users, label: 'Team', onClick: () => navigate('/team') },
    { icon: MessageCircle, label: 'Chat', onClick: () => navigate('/chat') },
    { icon: Crown, label: 'Leaderboard', onClick: () => navigate('/leaderboard') },
  ];

  const moreItems = [
    { icon: Megaphone, label: 'Broadcast Channel', onClick: () => navigate('/broadcast') },
    { icon: FileText, label: 'Documentation', onClick: () => navigate('/docs') },
    { icon: HelpCircle, label: 'Help & Support', onClick: () => navigate('/help-support') },
    { icon: Settings, label: 'Terms & Conditions', onClick: () => navigate('/terms') },
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
      <div className="relative overflow-hidden">
        <div className="relative px-4 pt-5 pb-4">
          {/* Top Row: Avatar + Username/Name */}
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary via-purple-500 to-pink-500 rounded-full opacity-70 blur-sm" />
              <Avatar className="relative h-20 w-20 border-3 border-background shadow-xl">
                <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h1 className="font-bold text-base text-foreground truncate">
                  {profile?.username || 'username'}
                </h1>
                {(isAdmin || isOrganizer) && <Sparkles className="h-4 w-4 text-primary shrink-0" />}
              </div>
              <p className="text-sm text-muted-foreground truncate">{profile?.full_name || 'Gamer'}</p>
              
              {/* Role Badges */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {isSuperAdmin && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    <Crown className="h-3 w-3 mr-1" /> Owner
                  </Badge>
                )}
                {isAdmin && !isSuperAdmin && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    <Shield className="h-3 w-3 mr-1" /> Team
                  </Badge>
                )}
                {isOrganizer && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    <UserCheck className="h-3 w-3 mr-1" /> Organizer
                  </Badge>
                )}
                {isCreator && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    <Gamepad2 className="h-3 w-3 mr-1" /> Creator
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Bio / In-Game Name Section */}
          {(profile?.bio || profile?.in_game_name) && (
            <div className="mb-4">
              {profile?.in_game_name && (
                <div className="inline-flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full mb-2">
                  <Gamepad2 className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">{profile.in_game_name}</span>
                  {profile.preferred_game && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-0.5">
                      {profile.preferred_game}
                    </Badge>
                  )}
                </div>
              )}
              {profile?.bio && (
                <p className="text-xs text-muted-foreground leading-relaxed">{profile.bio}</p>
              )}
            </div>
          )}

          {/* Edit Profile Button */}
          <Button 
            variant="outline" 
            className="w-full h-9 text-sm font-semibold border-border/50 hover:bg-muted/50" 
            onClick={() => setEditDialogOpen(true)}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="h-2 bg-muted/40" />

      {/* Account Section */}
      <div className="px-4 pt-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
          <Zap className="h-3 w-3 text-primary" />
          Account
        </h3>
        <div className="glass-card rounded-xl overflow-hidden divide-y divide-border/50">
          
          {/* Admin Panel */}
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')} 
              className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 border-2 border-borderStrong flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-xs text-foreground">Admin Panel</p>
                  {isSuperAdmin ? (
                    <Badge variant="secondary" className="text-[9px] px-2 py-0.5">Super Admin</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] px-2 py-0.5">Team</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isSuperAdmin ? 'Full access to all features' : 'Access your sections'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* Organizer Dashboard */}
          {isOrganizer && (
            <button 
              onClick={() => navigate('/organizer')} 
              className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 border-2 border-borderStrong flex items-center justify-center">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-xs text-foreground">Organizer Dashboard</p>
                <p className="text-xs text-muted-foreground">Manage tournaments & earnings</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* Creator Dashboard */}
          {isCreator && (
            <button 
              onClick={() => navigate('/creator')} 
              className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 border-2 border-borderStrong flex items-center justify-center">
                <Gamepad2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-xs text-foreground">Creator Dashboard</p>
                <p className="text-xs text-muted-foreground">Manage creator tournaments</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* Local Tournament */}
          <button 
            onClick={() => navigate('/local-tournament')} 
            className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-secondary/40 border-2 border-borderStrong flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-xs">Local Tournament</p>
              <p className="text-xs text-muted-foreground">Organize in Schools & Colleges</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 pt-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
          <Star className="h-3 w-3 text-primary" />
          Menu
        </h3>
        <div className="glass-card rounded-xl divide-y divide-border/50 overflow-hidden">
          {menuItems.map((item, index) => (
            <button 
              key={item.label} 
              onClick={item.onClick} 
              className="w-full flex items-center gap-2.5 p-3 hover:bg-muted/50 transition-all"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 border-2 border-borderStrong flex items-center justify-center">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="flex-1 text-left text-xs font-medium text-foreground">{item.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Push Notification Card */}
      <div className="px-4 pt-3">
        <PushNotificationSetup variant="card" />
      </div>

      {/* More Section */}
      <div className="px-4 pt-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-primary" />
          More
        </h3>
        <div className="glass-card rounded-xl divide-y divide-border/50 overflow-hidden">
          {moreItems.map((item) => (
            <button 
              key={item.label} 
              onClick={item.onClick} 
              className="w-full flex items-center gap-2.5 p-3 hover:bg-muted/50 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-muted/70 flex items-center justify-center">
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="flex-1 text-left text-xs font-medium text-foreground">{item.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-4 pt-5">
        <Button 
          variant="outline" 
          className="w-full h-12 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive font-semibold rounded-xl transition-all hover:scale-[1.01]" 
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Footer */}
      <div className="px-4 pt-8 pb-28">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <img src={vyuhaLogo} alt="Vyuha Esport" className="relative h-16 w-16 rounded-full shadow-xl" />
          </div>
          <p className="text-xs text-muted-foreground/60 mt-4">
            © 2024 Vyuha Esport. All rights reserved.
          </p>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
            <DialogDescription>Update your profile and gaming details</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pt-2 pb-4">
            {/* Avatar Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/30 shadow-lg">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">Your Avatar</p>
                  <p className="text-xs text-muted-foreground">Select from gallery below</p>
                </div>
              </div>
              
              <AvatarGallery 
                currentAvatarUrl={profile?.avatar_url} 
                onSelect={handlePresetAvatarSelect} 
                disabled={uploadingAvatar}
                onViewAll={() => {
                  setEditDialogOpen(false);
                  navigate('/avatar-selection');
                }}
              />
            </div>

            {/* Gaming Details */}
            <div className="bg-primary/5 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-primary" />
                Gaming Details *
              </h4>
              
              <div className="space-y-2">
                <Label>Primary Game *</Label>
                <Select value={formData.preferred_game} onValueChange={value => setFormData({ ...formData, preferred_game: value })}>
                  <SelectTrigger><SelectValue placeholder="Select your game" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Free Fire">Free Fire</SelectItem>
                    <SelectItem value="BGMI">BGMI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>In-Game Name (IGN) *</Label>
                <Input value={formData.in_game_name} onChange={e => setFormData({ ...formData, in_game_name: e.target.value })} placeholder="Your in-game name" />
              </div>

              <div className="space-y-2">
                <Label>UID / Character ID *</Label>
                <Input value={formData.game_uid} onChange={e => setFormData({ ...formData, game_uid: e.target.value })} placeholder="Your game UID" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Enter your full name" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="Enter username" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Enter phone number" />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself" rows={3} />
              </div>
            </div>
          </div>
          
          <div className="shrink-0 pt-4 border-t">
            <Button variant="gaming" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Organizer Dialog */}
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
                <Input value={applyForm.name} onChange={e => setApplyForm({ ...applyForm, name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Age *</Label>
                <Input type="number" value={applyForm.age} onChange={e => setApplyForm({ ...applyForm, age: e.target.value })} placeholder="Age" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input value={applyForm.phone} onChange={e => setApplyForm({ ...applyForm, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Aadhaar Number *
              </Label>
              <Input value={applyForm.aadhaar_number} onChange={e => setApplyForm({ ...applyForm, aadhaar_number: e.target.value })} placeholder="XXXX XXXX XXXX" maxLength={14} />
              <p className="text-xs text-muted-foreground">Your Aadhaar is kept confidential</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram Profile
              </Label>
              <Input value={applyForm.instagram_link} onChange={e => setApplyForm({ ...applyForm, instagram_link: e.target.value })} placeholder="https://instagram.com/..." />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                YouTube Channel
              </Label>
              <Input value={applyForm.youtube_link} onChange={e => setApplyForm({ ...applyForm, youtube_link: e.target.value })} placeholder="https://youtube.com/..." />
            </div>

            <div className="space-y-2">
              <Label>Experience</Label>
              <Textarea value={applyForm.experience} onChange={e => setApplyForm({ ...applyForm, experience: e.target.value })} placeholder="Tell us about your experience hosting events..." rows={3} />
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
    </AppLayout>
  );
};

export default ProfilePage;
