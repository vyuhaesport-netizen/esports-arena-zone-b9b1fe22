import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, 
  Users, 
  IndianRupee, 
  Calendar,
  Loader2,
  UserPlus,
  UserMinus,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface OrganizerProfile {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface OrganizerStats {
  total_tournaments: number;
  active_tournaments: number;
  completed_tournaments: number;
  total_participants: number;
  total_prize_distributed: number;
}

interface OrganizerProfilePreviewProps {
  organizerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

const OrganizerProfilePreview = ({
  organizerId,
  open,
  onOpenChange,
  isFollowing = false,
  onFollowChange,
}: OrganizerProfilePreviewProps) => {
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [role, setRole] = useState<'organizer' | 'creator' | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && organizerId) {
      fetchOrganizerData();
    }
  }, [open, organizerId]);

  const fetchOrganizerData = async () => {
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, bio, created_at')
        .eq('user_id', organizerId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', organizerId)
        .in('role', ['organizer', 'creator']);

      if (roleData && roleData.length > 0) {
        const hasCreator = roleData.some(r => r.role === 'creator');
        const hasOrganizer = roleData.some(r => r.role === 'organizer');
        setRole(hasCreator ? 'creator' : hasOrganizer ? 'organizer' : null);
      }

      // Fetch tournament stats
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, status, joined_users, current_prize_pool')
        .eq('created_by', organizerId);

      if (tournaments) {
        const total = tournaments.length;
        const active = tournaments.filter(t => t.status === 'upcoming' || t.status === 'ongoing').length;
        const completed = tournaments.filter(t => t.status === 'completed').length;
        const participants = tournaments.reduce((sum, t) => sum + (t.joined_users?.length || 0), 0);
        const prizeDistributed = tournaments
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + (t.current_prize_pool || 0), 0);

        setStats({
          total_tournaments: total,
          active_tournaments: active,
          completed_tournaments: completed,
          total_participants: participants,
          total_prize_distributed: prizeDistributed,
        });
      }

      // Fetch follower count
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_user_id', organizerId);

      setFollowerCount(count || 0);
    } catch (error) {
      console.error('Error fetching organizer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to follow organizers.', variant: 'destructive' });
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_user_id', user.id)
          .eq('following_user_id', organizerId);

        if (error) throw error;
        onFollowChange?.(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast({ title: 'Unfollowed', description: 'You will no longer receive notifications from this organizer.' });
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_user_id: user.id,
            following_user_id: organizerId,
          });

        if (error) throw error;
        onFollowChange?.(true);
        setFollowerCount(prev => prev + 1);
        toast({ title: 'Following!', description: 'You will be notified of new tournaments.' });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({ title: 'Error', description: 'Failed to update follow status.', variant: 'destructive' });
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            {role === 'creator' ? 'Creator' : 'Organizer'} Profile
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Profile Header */}
            <div className="text-center">
              <Avatar className="w-20 h-20 mx-auto mb-3 ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-xl bg-gradient-to-br from-primary to-gaming-orange text-white">
                  {profile.username?.charAt(0).toUpperCase() || profile.full_name?.charAt(0).toUpperCase() || 'O'}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="font-bold text-lg">
                {profile.full_name || profile.username || 'Organizer'}
              </h3>
              
              {profile.username && profile.full_name && (
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              )}
              
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge className={`text-[10px] ${
                  role === 'creator' 
                    ? 'bg-pink-500/10 text-pink-600' 
                    : 'bg-primary/10 text-primary'
                }`}>
                  {role === 'creator' ? 'Creator' : 'Organizer'}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span>{followerCount} followers</span>
                </div>
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{profile.bio}</p>
              )}
            </div>

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Trophy className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">{stats.total_tournaments}</p>
                  <p className="text-[10px] text-muted-foreground">Tournaments</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Users className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-bold">{stats.total_participants}</p>
                  <p className="text-[10px] text-muted-foreground">Players</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <IndianRupee className="h-4 w-4 mx-auto text-green-500 mb-1" />
                  <p className="text-lg font-bold">₹{(stats.total_prize_distributed / 1000).toFixed(0)}k</p>
                  <p className="text-[10px] text-muted-foreground">Distributed</p>
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Member since {format(new Date(profile.created_at), 'MMM yyyy')}</span>
            </div>

            {/* Follow Button */}
            {user?.id !== organizerId && (
              <Button
                className="w-full"
                variant={isFollowing ? 'outline' : 'default'}
                onClick={handleFollowToggle}
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Profile not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrganizerProfilePreview;
