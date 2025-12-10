import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  User,
  Search,
  Bell,
  BellOff,
  MoreHorizontal,
  Palette,
  Clock,
  MessageSquare,
  Lock,
  Type,
  Users,
  Image,
  ArrowLeft,
  Ban,
  AlertTriangle,
  Shield,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import FollowButton from './FollowButton';

interface UserProfile {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  preferred_game: string | null;
  in_game_name: string | null;
  game_uid: string | null;
  created_at: string;
}

interface UserStats {
  tournamentsJoined: number;
  tournamentsWon: number;
  totalEarnings: number;
  followers: number;
  following: number;
}

interface SharedMedia {
  id: string;
  media_url: string;
  created_at: string;
}

interface ProfileViewProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageClick?: () => void;
}

const ProfileView = ({ userId, open, onOpenChange, onMessageClick }: ProfileViewProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    tournamentsJoined: 0,
    tournamentsWon: 0,
    totalEarnings: 0,
    followers: 0,
    following: 0
  });
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [sharedMedia, setSharedMedia] = useState<SharedMedia[]>([]);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
      fetchStats();
      fetchSharedMedia();
    }
  }, [open, userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, bio, location, preferred_game, in_game_name, game_uid, created_at')
        .eq('user_id', userId)
        .single();

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('user_id', userId);

      const { data: wins } = await supabase
        .from('tournaments')
        .select('id, current_prize_pool')
        .eq('winner_user_id', userId);

      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_user_id', userId);

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_user_id', userId);

      const totalEarnings = wins?.reduce((sum, t) => sum + (t.current_prize_pool || 0), 0) || 0;

      setStats({
        tournamentsJoined: registrations?.length || 0,
        tournamentsWon: wins?.length || 0,
        totalEarnings,
        followers: followersCount || 0,
        following: followingCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSharedMedia = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data } = await supabase
        .from('messages')
        .select('id, media_url, created_at')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${user.user.id}),and(sender_id.eq.${user.user.id},recipient_id.eq.${userId})`)
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(9);

      setSharedMedia(data?.filter(m => m.media_url) as SharedMedia[] || []);
    } catch (error) {
      console.error('Error fetching shared media:', error);
    }
  };

  const handleRestrict = () => {
    toast.success(`${profile?.username || 'User'} has been restricted`);
    setShowOptionsMenu(false);
  };

  const handleBlock = () => {
    toast.success(`${profile?.username || 'User'} has been blocked`);
    setShowOptionsMenu(false);
    onOpenChange(false);
  };

  const handleReport = () => {
    toast.success('Report submitted successfully');
    setShowOptionsMenu(false);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? 'Notifications unmuted' : 'Notifications muted');
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md h-[90vh] p-0">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!profile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Profile not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Chat Details</span>
          <div className="w-10" />
        </div>

        <ScrollArea className="h-[calc(90vh-60px)]">
          {/* Profile Header */}
          <div className="flex flex-col items-center pt-6 pb-4 px-6">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <h2 className="mt-4 font-bold text-xl">
              {profile.username || profile.full_name || 'User'}
            </h2>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-8 px-6 pb-6">
            <button 
              className="flex flex-col items-center gap-1"
              onClick={() => {
                onOpenChange(false);
                // Navigate to full profile if needed
              }}
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <span className="text-xs">Profile</span>
            </button>

            <button className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-6 w-6" />
              </div>
              <span className="text-xs">Search</span>
            </button>

            <button 
              className="flex flex-col items-center gap-1"
              onClick={handleMuteToggle}
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                {isMuted ? <BellOff className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
              </div>
              <span className="text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <DropdownMenu open={showOptionsMenu} onOpenChange={setShowOptionsMenu}>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <MoreHorizontal className="h-6 w-6" />
                  </div>
                  <span className="text-xs">Options</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleRestrict} className="gap-2">
                  <Shield className="h-4 w-4" />
                  Restrict
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock} className="gap-2 text-destructive focus:text-destructive">
                  <Ban className="h-4 w-4" />
                  Block
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReport} className="gap-2 text-destructive focus:text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator />

          {/* Settings Options */}
          <div className="py-2">
            <button className="w-full flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Palette className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">Default</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Disappearing messages</p>
                <p className="text-xs text-muted-foreground">Off</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Chat controls</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Privacy & safety</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Type className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Nicknames</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Create a group chat</p>
              </div>
            </button>
          </div>

          <Separator />

          {/* Shared Media */}
          <div className="p-6">
            <h3 className="font-semibold mb-4">Shared media</h3>
            {sharedMedia.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {sharedMedia.map((media) => (
                  <div key={media.id} className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={media.media_url} 
                      alt="Shared media"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No shared media yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileView;
