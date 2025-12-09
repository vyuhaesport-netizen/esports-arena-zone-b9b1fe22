import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Trophy, 
  Users, 
  ChevronRight,
  Loader2,
  Bell,
  Wallet,
  Gamepad2
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Tournament {
  id: string;
  title: string;
  game: string;
  prize_pool: string | null;
  entry_fee: number | null;
  start_date: string;
  status: string | null;
  max_participants: number | null;
  tournament_type: string;
  joined_users: string[] | null;
  current_prize_pool: number | null;
}

interface Profile {
  wallet_balance: number | null;
}

const HomePage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [joinDialog, setJoinDialog] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [joining, setJoining] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'bgmi' | 'freefire' | 'cod'>('all');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
    if (user) {
      fetchWalletBalance();
    }
  }, [user]);

  const fetchWalletBalance = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single();
      
      setWalletBalance(data?.wallet_balance || 0);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, title, game, prize_pool, entry_fee, start_date, status, max_participants, tournament_type, joined_users, current_prize_pool')
        .eq('status', 'upcoming')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (tournament: Tournament) => {
    if (!user) {
      navigate('/');
      return;
    }
    setJoinDialog({ open: true, tournament });
  };

  const handleJoinTournament = async () => {
    if (!joinDialog.tournament || !user) return;

    const tournament = joinDialog.tournament;
    const entryFee = tournament.entry_fee || 0;

    // Check if already joined
    if (tournament.joined_users?.includes(user.id)) {
      toast({ title: 'Already Joined', description: 'You have already joined this tournament.', variant: 'destructive' });
      setJoinDialog({ open: false, tournament: null });
      return;
    }

    // Check wallet balance
    if (walletBalance < entryFee) {
      toast({ title: 'Insufficient Balance', description: `You need ₹${entryFee} to join. Your balance: ₹${walletBalance}`, variant: 'destructive' });
      setJoinDialog({ open: false, tournament: null });
      return;
    }

    // Check max participants
    const currentJoined = tournament.joined_users?.length || 0;
    if (tournament.max_participants && currentJoined >= tournament.max_participants) {
      toast({ title: 'Tournament Full', description: 'This tournament has reached maximum participants.', variant: 'destructive' });
      setJoinDialog({ open: false, tournament: null });
      return;
    }

    setJoining(true);

    try {
      // Get commission settings
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value');

      const organizerPercent = parseFloat(settings?.find(s => s.setting_key === 'organizer_commission_percent')?.setting_value || '10');
      const platformPercent = parseFloat(settings?.find(s => s.setting_key === 'platform_commission_percent')?.setting_value || '10');
      const prizePoolPercent = parseFloat(settings?.find(s => s.setting_key === 'prize_pool_percent')?.setting_value || '80');

      // Calculate splits
      const organizerShare = (entryFee * organizerPercent) / 100;
      const platformShare = (entryFee * platformPercent) / 100;
      const prizePoolShare = (entryFee * prizePoolPercent) / 100;

      // Deduct from user wallet
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: walletBalance - entryFee })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Create transaction record
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'entry_fee',
        amount: -entryFee,
        status: 'completed',
        description: `Entry fee for ${tournament.title}`,
      });

      // Update tournament with new joined user and earnings
      const newJoinedUsers = [...(tournament.joined_users || []), user.id];
      const newPrizePool = (tournament.current_prize_pool || 0) + prizePoolShare;

      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({
          joined_users: newJoinedUsers,
          organizer_earnings: organizerShare,
          platform_earnings: platformShare,
          current_prize_pool: newPrizePool,
        })
        .eq('id', tournament.id);

      if (tournamentError) throw tournamentError;

      // Add to tournament_registrations
      await supabase.from('tournament_registrations').insert({
        user_id: user.id,
        tournament_id: tournament.id,
        status: 'registered',
      });

      toast({ title: 'Joined!', description: `You have successfully joined ${tournament.title}. ₹${entryFee} deducted.` });
      
      setJoinDialog({ open: false, tournament: null });
      fetchTournaments();
      fetchWalletBalance();
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast({ title: 'Error', description: 'Failed to join tournament. Please try again.', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const getFilteredTournaments = () => {
    if (activeFilter === 'all') return tournaments;
    const gameMap: Record<string, string[]> = {
      'bgmi': ['BGMI', 'Battlegrounds Mobile India'],
      'freefire': ['Free Fire', 'FF'],
      'cod': ['COD Mobile', 'Call of Duty Mobile'],
    };
    return tournaments.filter(t => 
      gameMap[activeFilter]?.some(g => t.game.toLowerCase().includes(g.toLowerCase()))
    );
  };

  const isUserJoined = (tournament: Tournament) => {
    return user && tournament.joined_users?.includes(user.id);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={vyuhaLogo} alt="Vyuha" className="h-10 w-10" />
          <div>
            <h1 className="font-gaming text-lg font-bold">Vyuha Esport</h1>
            <p className="text-xs text-muted-foreground">Welcome, {user?.email?.split('@')[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/wallet')}
            className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full"
          >
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">₹{walletBalance}</span>
          </button>
          <button className="relative p-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </button>
        </div>
      </div>

      {/* Game Filter */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {[
          { key: 'all', label: 'All Games' },
          { key: 'bgmi', label: 'BGMI' },
          { key: 'freefire', label: 'Free Fire' },
          { key: 'cod', label: 'COD Mobile' },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key as typeof activeFilter)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === filter.key 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Creator Section Banner */}
      <div className="px-4 mb-4">
        <button 
          onClick={() => navigate('/creator')}
          className="w-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center gap-3 hover:from-purple-500/20 hover:to-pink-500/20 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-sm">Creator Tournaments</p>
            <p className="text-xs text-muted-foreground">Join community-created matches</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Tournaments Section */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-gaming font-semibold">Available Tournaments</h2>
          <span className="text-xs text-muted-foreground">{getFilteredTournaments().length} matches</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : getFilteredTournaments().length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">No tournaments available</p>
            <p className="text-xs text-muted-foreground mt-1">Check back soon for exciting matches!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {getFilteredTournaments().map((tournament) => {
              const joined = isUserJoined(tournament);
              const spotsLeft = (tournament.max_participants || 100) - (tournament.joined_users?.length || 0);
              
              return (
                <div
                  key={tournament.id}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  {/* Header Row */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Gamepad2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-1">{tournament.title}</h3>
                          <p className="text-xs text-muted-foreground">{tournament.game}</p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${tournament.tournament_type === 'organizer' ? 'bg-primary/10 text-primary' : 'bg-purple-500/10 text-purple-600'}`}>
                        {tournament.tournament_type === 'organizer' ? 'Official' : 'Creator'}
                      </Badge>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="px-4 py-2 bg-muted/30 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Prize</p>
                      <p className="text-sm font-semibold text-primary">{tournament.prize_pool || `₹${tournament.current_prize_pool || 0}`}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Entry</p>
                      <p className="text-sm font-semibold">₹{tournament.entry_fee || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Spots</p>
                      <p className="text-sm font-semibold">{spotsLeft} left</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="text-sm font-semibold">{tournament.joined_users?.length || 0}</p>
                    </div>
                  </div>

                  {/* Footer Row */}
                  <div className="p-4 pt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(tournament.start_date), 'MMM dd, hh:mm a')}
                    </div>
                    {joined ? (
                      <Badge className="bg-green-500/10 text-green-600">Joined ✓</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="gaming"
                        onClick={() => handleJoinClick(tournament)}
                        disabled={spotsLeft <= 0}
                      >
                        {spotsLeft <= 0 ? 'Full' : 'Join Now'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Confirmation Dialog */}
      <Dialog open={joinDialog.open} onOpenChange={(open) => setJoinDialog({ open, tournament: joinDialog.tournament })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Tournament</DialogTitle>
            <DialogDescription>
              Confirm your entry for {joinDialog.tournament?.title}
            </DialogDescription>
          </DialogHeader>
          
          {joinDialog.tournament && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Fee</span>
                  <span className="font-semibold">₹{joinDialog.tournament.entry_fee || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Balance</span>
                  <span className="font-semibold">₹{walletBalance}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">After Joining</span>
                  <span className={`font-semibold ${walletBalance - (joinDialog.tournament.entry_fee || 0) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    ₹{walletBalance - (joinDialog.tournament.entry_fee || 0)}
                  </span>
                </div>
              </div>

              {walletBalance < (joinDialog.tournament.entry_fee || 0) && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                  Insufficient balance. Please add ₹{(joinDialog.tournament.entry_fee || 0) - walletBalance} to your wallet.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialog({ open: false, tournament: null })}>
              Cancel
            </Button>
            <Button 
              variant="gaming" 
              onClick={handleJoinTournament}
              disabled={joining || walletBalance < (joinDialog.tournament?.entry_fee || 0)}
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm & Join'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default HomePage;
