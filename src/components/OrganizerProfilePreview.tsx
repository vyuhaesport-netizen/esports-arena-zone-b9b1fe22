import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, 
  Users, 
  IndianRupee, 
  Calendar,
  Loader2,
  Star
} from 'lucide-react';
import { format } from 'date-fns';

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
}

const OrganizerProfilePreview = ({
  organizerId,
  open,
  onOpenChange,
}: OrganizerProfilePreviewProps) => {
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [role, setRole] = useState<'organizer' | 'creator' | null>(null);

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
                <AvatarFallback className="text-xl bg-gradient-to-br from-primary to-primary/70 text-white">
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
                  <Star className="h-3 w-3 text-warning" />
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
                  <Users className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">{stats.total_participants}</p>
                  <p className="text-[10px] text-muted-foreground">Players</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <IndianRupee className="h-4 w-4 mx-auto text-success mb-1" />
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
