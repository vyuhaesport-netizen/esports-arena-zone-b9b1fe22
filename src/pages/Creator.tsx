import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import TournamentCard from '@/components/TournamentCard';
import { 
  Trophy, 
  Search,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  wallet_balance: number | null;
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
  const [exitDialog, setExitDialog] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [exiting, setExiting] = useState(false);
  
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
        .select('preferred_game, wallet_balance')
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

  const handleRegister = async (tournament: Tournament) => {
    if (!user) return;

    setRegistering(tournament.id);

    try {
      // Use atomic secure database function to prevent any exploits
      const { data, error } = await supabase.rpc('process_tournament_join', {
        p_user_id: user.id,
        p_tournament_id: tournament.id,
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        error?: string; 
        entry_fee?: number;
        new_balance?: number;
        participants?: number;
      };

      if (!result.success) {
        toast({ 
          title: 'Cannot Join', 
          description: result.error || 'Failed to join tournament.', 
          variant: 'destructive' 
        });
        return;
      }

      toast({
        title: 'Joined!',
        description: `Successfully joined ${tournament.title}. ₹${result.entry_fee} deducted.`,
      });
      
      setRegisteredTournaments([...registeredTournaments, tournament.id]);
      fetchTournaments();
      fetchUserProfile();
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

  const canExitTournament = (tournament: Tournament) => {
    const matchTime = new Date(tournament.start_date);
    const now = new Date();
    const timeDiff = matchTime.getTime() - now.getTime();
    return timeDiff > 30 * 60 * 1000; // Can exit if more than 30 minutes before
  };

  const handleExitClick = (tournament: Tournament) => {
    if (!canExitTournament(tournament)) {
      toast({ 
        title: 'Cannot Exit', 
        description: 'You cannot exit a tournament less than 30 minutes before it starts.', 
        variant: 'destructive' 
      });
      return;
    }
    setExitDialog({ open: true, tournament });
  };

  const handleExitTournament = async () => {
    if (!exitDialog.tournament || !user) return;

    const tournament = exitDialog.tournament;
    setExiting(true);

    try {
      // Use atomic secure database function to prevent any exploits
      const { data, error } = await supabase.rpc('process_tournament_exit', {
        p_user_id: user.id,
        p_tournament_id: tournament.id,
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        error?: string; 
        refunded_amount?: number;
        new_balance?: number;
      };

      if (!result.success) {
        toast({ 
          title: 'Cannot Exit', 
          description: result.error || 'Failed to exit tournament.', 
          variant: 'destructive' 
        });
        setExitDialog({ open: false, tournament: null });
        return;
      }

      toast({ 
        title: 'Exited!', 
        description: `You left ${tournament.title}. ₹${result.refunded_amount} refunded.` 
      });
      setExitDialog({ open: false, tournament: null });
      setRegisteredTournaments(prev => prev.filter(id => id !== tournament.id));
      fetchTournaments();
      fetchUserProfile();
    } catch (error) {
      console.error('Error exiting tournament:', error);
      toast({ title: 'Error', description: 'Failed to exit tournament.', variant: 'destructive' });
    } finally {
      setExiting(false);
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
          <div className="space-y-4">
            {getFilteredTournaments().map((tournament) => {
              const isJoined = tournament.joined_users?.includes(user?.id || '');
              const showRoomDetails = canSeeRoomDetails(tournament);
              const isFollowingCreator = tournament.created_by ? followedOrganizers.includes(tournament.created_by) : false;
              
              return (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  isJoined={isJoined}
                  showRoomDetails={showRoomDetails}
                  onJoinClick={() => handleRegister(tournament)}
                  onExitClick={() => handleExitClick(tournament)}
                  onSwipeJoin={() => handleRegister(tournament)}
                  onPrizeClick={() => setPrizeDrawer({ open: true, tournament })}
                  isLoading={registering === tournament.id}
                  variant="creator"
                  isFollowing={isFollowingCreator}
                  onFollowChange={(following) => {
                    if (following) {
                      setFollowedOrganizers(prev => [...prev, tournament.created_by!]);
                    } else {
                      setFollowedOrganizers(prev => prev.filter(id => id !== tournament.created_by));
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitDialog.open} onOpenChange={(open) => setExitDialog({ open, tournament: exitDialog.tournament })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Tournament</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit {exitDialog.tournament?.title}?
            </DialogDescription>
          </DialogHeader>
          
          {exitDialog.tournament && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Fee Paid</span>
                  <span className="font-semibold">₹{exitDialog.tournament.entry_fee || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Refund Amount</span>
                  <span className="font-semibold text-emerald-600">₹{exitDialog.tournament.entry_fee || 0}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your entry fee will be refunded to your wallet immediately.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setExitDialog({ open: false, tournament: null })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleExitTournament}
              disabled={exiting}
            >
              {exiting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Exit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
