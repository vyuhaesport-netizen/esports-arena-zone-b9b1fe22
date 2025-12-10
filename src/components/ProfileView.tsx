import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Trophy,
  Gamepad2,
  Users,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Star,
  Target,
  Award,
  TrendingUp,
  Loader2,
  X,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';

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

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
      fetchStats();
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
      // Count tournaments joined
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('user_id', userId);

      // Count tournaments won
      const { data: wins } = await supabase
        .from('tournaments')
        .select('id, current_prize_pool')
        .eq('winner_user_id', userId);

      // Count followers
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_user_id', userId);

      // Count following
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

  const winRate = stats.tournamentsJoined > 0 
    ? ((stats.tournamentsWon / stats.tournamentsJoined) * 100).toFixed(1) 
    : '0.0';

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!profile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Profile not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-br from-primary/30 via-primary/10 to-background pt-8 pb-4 px-6">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <h2 className="mt-3 font-bold text-lg">
              {profile.full_name || profile.username || 'User'}
            </h2>
            
            {profile.username && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}

            {profile.bio && (
              <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">{profile.bio}</p>
            )}

            {/* Quick Stats */}
            <div className="flex items-center gap-6 mt-4">
              <div className="text-center">
                <p className="font-bold text-lg">{stats.followers}</p>
                <p className="text-[10px] text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{stats.following}</p>
                <p className="text-[10px] text-muted-foreground">Following</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{stats.tournamentsJoined}</p>
                <p className="text-[10px] text-muted-foreground">Matches</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="font-bold">{stats.tournamentsWon}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Wins</p>
            </div>
            
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Target className="h-4 w-4 text-green-500" />
                <span className="font-bold">{winRate}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Win Rate</p>
            </div>
            
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-bold">₹{stats.totalEarnings}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Earnings</p>
            </div>
            
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Gamepad2 className="h-4 w-4 text-purple-500" />
                <span className="font-bold text-sm truncate">{profile.preferred_game || 'N/A'}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Main Game</p>
            </div>
          </div>

          {/* Game Info */}
          {(profile.in_game_name || profile.game_uid) && (
            <div className="mt-4 bg-muted/30 rounded-xl p-3">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                Game Profile
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {profile.in_game_name && (
                  <div>
                    <p className="text-muted-foreground text-[10px]">IGN</p>
                    <p className="font-medium">{profile.in_game_name}</p>
                  </div>
                )}
                {profile.game_uid && (
                  <div>
                    <p className="text-muted-foreground text-[10px]">UID</p>
                    <p className="font-medium">{profile.game_uid}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-4 space-y-2">
            {profile.location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{profile.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Joined {format(new Date(profile.created_at), 'MMM yyyy')}</span>
            </div>
          </div>

          {/* Action Button */}
          {onMessageClick && (
            <Button 
              className="w-full mt-4 gap-2" 
              onClick={() => {
                onOpenChange(false);
                onMessageClick();
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileView;
