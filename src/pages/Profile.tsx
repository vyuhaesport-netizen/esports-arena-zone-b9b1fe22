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
  Edit2, ChevronRight, Shield, LogOut, Trophy, Wallet, Settings, 
  HelpCircle, FileText, Loader2, Info, Phone, Calendar, MapPin, 
  Gamepad2, User, Hash, Crown, UserCheck, Instagram, Youtube, 
  CreditCard, Users, Megaphone, Building2, BarChart3, Bell, 
  MessageCircle, Sparkles, Zap, Medal, Star, Target, TrendingUp,
  Flame
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
    { icon: Trophy, label: 'My Matches', onClick: () => navigate('/my-match'), color: 'text-amber-500' },
    { icon: BarChart3, label: 'Player Stats', onClick: () => navigate('/player-stats'), color: 'text-blue-500' },
    { icon: Wallet, label: 'Wallet', onClick: () => navigate('/wallet'), color: 'text-emerald-500' },
    { icon: Users, label: 'Team', onClick: () => navigate('/team'), color: 'text-purple-500' },
    { icon: MessageCircle, label: 'Chat', onClick: () => navigate('/chat'), color: 'text-pink-500' },
    { icon: Crown, label: 'Leaderboard', onClick: () => navigate('/leaderboard'), color: 'text-yellow-500' },
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
      {/* Enhanced Profile Header with Animations */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative px-4 pt-6 pb-5">
          {/* Avatar Section - Larger with glow effect */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative group">
              {/* Animated ring */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full opacity-75 blur group-hover:opacity-100 transition-opacity animate-pulse" />
              
              <Avatar className="relative h-24 w-24 border-4 border-background shadow-2xl ring-2 ring-primary/30">
                <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-2xl font-bold">
                  {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Level badge */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background">
                <span className="text-[10px] font-bold text-white">LV{Math.min(99, Math.floor(playerStats.totalMatches / 5) + 1)}</span>
              </div>
            </div>

            {/* Username & Name */}
            <div className="text-center mt-3">
              <h1 className="font-bold text-lg text-foreground flex items-center justify-center gap-1.5">
                @{profile?.username || 'username'}
                {(isAdmin || isOrganizer) && <Sparkles className="h-4 w-4 text-primary animate-pulse" />}
              </h1>
              <p className="text-sm text-muted-foreground">{profile?.full_name || 'Gamer'}</p>
              
              {/* Role Badges */}
              <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                {isSuperAdmin && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-2 py-0.5 animate-fade-in">
                    <Crown className="h-3 w-3 mr-1" /> Owner
                  </Badge>
                )}
                {isAdmin && !isSuperAdmin && (
                  <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white text-[10px] px-2 py-0.5">
                    <Shield className="h-3 w-3 mr-1" /> Team
                  </Badge>
                )}
                {isOrganizer && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-2 py-0.5">
                    <UserCheck className="h-3 w-3 mr-1" /> Organizer
                  </Badge>
                )}
                {isCreator && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] px-2 py-0.5">
                    <Gamepad2 className="h-3 w-3 mr-1" /> Creator
                  </Badge>
                )}
              </div>

              {/* In-Game Name */}
              {profile?.in_game_name && (
                <div className="mt-2 inline-flex items-center gap-1 bg-muted/50 px-3 py-1 rounded-full">
                  <Gamepad2 className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">{profile.in_game_name}</span>
                  {profile.preferred_game && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-1">
                      {profile.preferred_game}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 text-center border border-border/50 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                <Target className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg font-bold text-foreground">{playerStats.totalMatches}</p>
              <p className="text-[10px] text-muted-foreground">Matches</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 text-center border border-border/50 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                <Medal className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg font-bold text-foreground">{playerStats.wins}</p>
              <p className="text-[10px] text-muted-foreground">Wins</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 text-center border border-border/50 hover:border-purple-500/30 transition-colors">
              <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
                <Flame className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg font-bold text-foreground">₹{playerStats.totalEarnings}</p>
              <p className="text-[10px] text-muted-foreground">Earned</p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button 
            onClick={() => setEditDialogOpen(true)} 
            className="w-full py-2.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-sm font-semibold rounded-xl transition-all text-white shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </button>
        </div>
      </div>

      <div className="h-2 bg-muted/40" />

      {/* Account Section */}
      <div className="px-4 pt-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Zap className="h-3 w-3 text-primary" />
          Account
        </h3>
        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-border/50">
          
          {/* Admin Panel */}
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')} 
              className="w-full bg-gradient-to-r from-primary/10 to-orange-500/10 hover:from-primary/15 hover:to-orange-500/15 p-4 flex items-center gap-3 transition-all hover:scale-[1.01]"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-foreground">Admin Panel</p>
                  {isSuperAdmin ? (
                    <Badge className="bg-gradient-to-r from-primary to-orange-500 text-white text-[9px] px-1.5 py-0">Super Admin</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Team</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSuperAdmin ? 'Full access to all features' : 'Access your sections'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-primary" />
            </button>
          )}

          {/* Organizer Dashboard */}
          {isOrganizer && (
            <button 
              onClick={() => navigate('/organizer')} 
              className="w-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/15 hover:to-pink-500/15 p-4 flex items-center gap-3 transition-all hover:scale-[1.01]"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm text-foreground">Organizer Dashboard</p>
                <p className="text-xs text-muted-foreground">Manage tournaments & earnings</p>
              </div>
              <ChevronRight className="h-5 w-5 text-purple-500" />
            </button>
          )}

          {/* Creator Dashboard */}
          {isCreator && (
            <button 
              onClick={() => navigate('/creator')} 
              className="w-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/15 hover:to-cyan-500/15 p-4 flex items-center gap-3 transition-all hover:scale-[1.01]"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Gamepad2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm text-foreground">Creator Dashboard</p>
                <p className="text-xs text-muted-foreground">Manage creator tournaments</p>
              </div>
              <ChevronRight className="h-5 w-5 text-blue-500" />
            </button>
          )}

          {/* Local Tournament */}
          <button 
            onClick={() => navigate('/local-tournament')} 
            className="w-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/15 hover:to-emerald-500/15 p-4 flex items-center gap-3 transition-all hover:scale-[1.01]"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
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
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star className="h-3 w-3 text-amber-500" />
          Menu
        </h3>
        <div className="glass-card rounded-2xl divide-y divide-border/50 overflow-hidden">
          {menuItems.map((item, index) => (
            <button 
              key={item.label} 
              onClick={item.onClick} 
              className="w-full flex items-center gap-3.5 p-4 hover:bg-muted/50 transition-all hover:scale-[1.01]"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl bg-muted/70 flex items-center justify-center`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <span className="flex-1 text-left text-sm font-semibold text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Push Notification Card */}
      <div className="px-4 pt-4">
        <PushNotificationSetup variant="card" />
      </div>

      {/* More Section */}
      <div className="px-4 pt-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-blue-500" />
          More
        </h3>
        <div className="glass-card rounded-2xl divide-y divide-border/50 overflow-hidden">
          {moreItems.map((item) => (
            <button 
              key={item.label} 
              onClick={item.onClick} 
              className="w-full flex items-center gap-3.5 p-4 hover:bg-muted/50 transition-all hover:scale-[1.01]"
            >
              <div className="w-10 h-10 rounded-xl bg-muted/70 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="flex-1 text-left text-sm font-semibold text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
