import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, 
  Users, 
  Search,
  Loader2,
  Calendar,
  IndianRupee,
  Gamepad2,
  Share2,
  UserPlus,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface Tournament {
  id: string;
  title: string;
  game: string;
  description: string | null;
  prize_pool: string | null;
  entry_fee: number | null;
  max_participants: number | null;
  start_date: string;
  status: string | null;
  tournament_type: string;
  tournament_mode: string | null;
  joined_users: string[] | null;
  current_prize_pool: number | null;
  room_id: string | null;
  room_password: string | null;
  prize_distribution: any;
  created_by: string | null;
}

interface Profile {
  preferred_game: string | null;
}

const Creator = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [registering, setRegistering] = useState<string | null>(null);
  const [registeredTournaments, setRegisteredTournaments] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [followedOrganizers, setFollowedOrganizers] = useState<string[]>([]);
  const [prizeDrawer, setPrizeDrawer] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [activeMode, setActiveMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
    if (user) {
      fetchUserRegistrations();
      fetchUserProfile();
      fetchFollowedOrganizers();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('preferred_game')
        .eq('user_id', user.id)
        .single();
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchFollowedOrganizers = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('follows')
        .select('following_user_id')
        .eq('follower_user_id', user.id);
      setFollowedOrganizers(data?.map(f => f.following_user_id) || []);
    } catch (error) {
      console.error('Error fetching follows:', error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('tournament_type', 'creator')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRegistrations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('tournament_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setRegisteredTournaments(data?.map(r => r.tournament_id) || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const handleRegister = async (tournamentId: string) => {
    if (!user) return;

    setRegistering(tournamentId);

    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Registered',
            description: 'You are already registered for this tournament.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Registered!',
          description: 'Successfully registered for the tournament.',
        });
        setRegisteredTournaments([...registeredTournaments, tournamentId]);
      }
    } catch (error) {
      console.error('Error registering:', error);
      toast({
        title: 'Failed',
        description: 'Could not register. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRegistering(null);
    }
  };

  const handleFollow = async (organizerId: string) => {
    if (!user) return;
    
    try {
      if (followedOrganizers.includes(organizerId)) {
        await supabase.from('follows').delete()
          .eq('follower_user_id', user.id)
          .eq('following_user_id', organizerId);
        setFollowedOrganizers(prev => prev.filter(id => id !== organizerId));
        toast({ title: 'Unfollowed' });
      } else {
        await supabase.from('follows').insert({
          follower_user_id: user.id,
          following_user_id: organizerId,
        });
        setFollowedOrganizers(prev => [...prev, organizerId]);
        toast({ title: 'Following!' });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const canSeeRoomDetails = (tournament: Tournament) => {
    if (!user || !tournament.joined_users?.includes(user.id)) return false;
    const matchTime = new Date(tournament.start_date);
    const now = new Date();
    const timeDiff = matchTime.getTime() - now.getTime();
    return timeDiff < 30 * 60 * 1000;
  };

  const getFilteredTournaments = () => {
    let filtered = tournaments;
    
    // Filter by user's preferred game
    if (userProfile?.preferred_game) {
      filtered = filtered.filter(t => 
        t.game.toLowerCase().includes(userProfile.preferred_game!.toLowerCase())
      );
    }
    
    // Filter by mode
    filtered = filtered.filter(t => 
      !t.tournament_mode || t.tournament_mode === activeMode
    );
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.game.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  return (
    <AppLayout title="Creator Tournaments">
      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creator tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Mode Filter */}
      <div className="px-4 pb-3">
        <div className="bg-muted rounded-lg p-1 flex">
          {(['solo', 'duo', 'squad'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeMode === mode 
                  ? 'bg-purple-500 text-white shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-4 mb-4">
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Creator Tournaments</p>
          <p className="text-xs text-muted-foreground mt-1">Community-created matches for gamers by gamers</p>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : getFilteredTournaments().length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No creator tournaments found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {userProfile?.preferred_game 
                ? `No ${userProfile.preferred_game} ${activeMode} tournaments available`
                : 'Check back later for new matches!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {getFilteredTournaments().map((tournament) => {
              const isJoined = tournament.joined_users?.includes(user?.id || '');
              const showRoomDetails = canSeeRoomDetails(tournament);
              
              return (
                <div
                  key={tournament.id}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  {/* Tournament Header */}
                  <div className="h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center relative">
                    <Gamepad2 className="h-10 w-10 text-purple-500/40" />
                    <Badge 
                      className={`absolute top-2 right-2 text-[10px] ${
                        tournament.status === 'upcoming' 
                          ? 'bg-purple-500/10 text-purple-600' 
                          : tournament.status === 'ongoing'
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tournament.status}
                    </Badge>
                    <Badge className="absolute top-2 left-2 text-[10px] bg-purple-500/10 text-purple-600">
                      {tournament.tournament_mode || 'Solo'}
                    </Badge>
                  </div>

                  {/* Tournament Details */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">{tournament.title}</h3>
                        <p className="text-xs text-muted-foreground">{tournament.game}</p>
                      </div>
                      {tournament.created_by && (
                        <button 
                          onClick={() => handleFollow(tournament.created_by!)}
                          className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full ${
                            followedOrganizers.includes(tournament.created_by) 
                              ? 'bg-purple-500/10 text-purple-600' 
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <UserPlus className="h-3 w-3" />
                          {followedOrganizers.includes(tournament.created_by) ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-4 mt-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-purple-500" />
                        {format(new Date(tournament.start_date), 'MMM dd, hh:mm a')}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Trophy className="h-3.5 w-3.5 text-purple-500" />
                        {tournament.prize_pool || `₹${tournament.current_prize_pool || 0}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <IndianRupee className="h-3.5 w-3.5 text-purple-500" />
                        {tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free'}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5 text-purple-500" />
                        {tournament.joined_users?.length || 0}/{tournament.max_participants} slots
                      </div>
                    </div>

                    {/* Room Details - Only for joined users near match time */}
                    {isJoined && showRoomDetails && tournament.room_id && (
                      <div className="mb-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-600 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Room: {tournament.room_id}</span>
                          {tournament.room_password && (
                            <span>| Pass: {tournament.room_password}</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {tournament.status === 'upcoming' && (
                        <Button
                          variant={isJoined ? 'secondary' : 'gaming'}
                          className="flex-1"
                          size="sm"
                          disabled={registering === tournament.id || isJoined}
                          onClick={() => handleRegister(tournament.id)}
                        >
                          {registering === tournament.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isJoined ? (
                            'Registered ✓'
                          ) : (
                            'Join Now'
                          )}
                        </Button>
                      )}

                      {tournament.status === 'ongoing' && (
                        <Button variant="secondary" className="flex-1" size="sm" disabled>
                          In Progress
                        </Button>
                      )}

                      {tournament.status === 'completed' && (
                        <Button variant="secondary" className="flex-1" size="sm" disabled>
                          Completed
                        </Button>
                      )}

                      {tournament.prize_distribution && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setPrizeDrawer({ open: true, tournament })}
                        >
                          Prizes
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prize Distribution Drawer */}
      <Drawer open={prizeDrawer.open} onOpenChange={(open) => setPrizeDrawer({ open, tournament: prizeDrawer.tournament })}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Prize Distribution</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8">
            {prizeDrawer.tournament?.prize_distribution ? (
              <div className="space-y-2">
                {Object.entries(prizeDrawer.tournament.prize_distribution).map(([rank, amount]) => (
                  <div key={rank} className="flex justify-between items-center bg-muted/50 rounded-lg p-3">
                    <span className="font-medium">Rank {rank}</span>
                    <span className="text-purple-500 font-semibold">₹{String(amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Prize distribution not set</p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </AppLayout>
  );
};

export default Creator;
