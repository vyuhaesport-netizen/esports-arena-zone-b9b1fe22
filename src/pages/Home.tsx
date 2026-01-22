import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import NotificationBell from '@/components/NotificationBell';
import TournamentCard from '@/components/TournamentCard';
import TournamentScanner from '@/components/TournamentScanner';
import TournamentShareDialog from '@/components/TournamentShareDialog';
import SEOHead from '@/components/SEOHead';
import { 
  Trophy, 
  Users, 
  ChevronRight,
  Loader2,
  ScanLine,
  LogIn,
  Sparkles,
  Gift,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
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
  prize_pool: string | null;
  entry_fee: number | null;
  start_date: string;
  status: string | null;
  max_participants: number | null;
  tournament_type: string;
  joined_users: string[] | null;
  current_prize_pool: number | null;
  tournament_mode: string | null;
  room_id: string | null;
  room_password: string | null;
  prize_distribution: any;
  created_by: string | null;
  registration_deadline: string | null;
  youtube_link: string | null;
  instagram_link: string | null;
  is_giveaway: boolean | null;
  rules: string | null;
}

interface Profile {
  wallet_balance: number | null;
  preferred_game: string | null;
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
}

const HomePage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [joinDialog, setJoinDialog] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [exitDialog, setExitDialog] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [joining, setJoining] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [activeMode, setActiveMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [shareDialog, setShareDialog] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [prizeDrawer, setPrizeDrawer] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [rulesDrawer, setRulesDrawer] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [followedOrganizers, setFollowedOrganizers] = useState<string[]>([]);
  const [showGuestBanner, setShowGuestBanner] = useState(true);
  const [adminRules, setAdminRules] = useState<{ id: string; title: string; content: string; game: string }[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
    fetchAdminRules();
    if (user) {
      fetchUserProfile();
      fetchFollowedOrganizers();
    }

    // Subscribe to real-time updates for tournaments
    const channel = supabase
      .channel('home-tournaments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
        },
        (payload) => {
          // Update the specific tournament in state
          setTournaments(prev => prev.map(t => 
            t.id === payload.new.id ? { ...t, ...payload.new } as Tournament : t
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance, preferred_game, username, avatar_url, full_name')
        .eq('user_id', user.id)
        .single();
      
      setUserProfile(data);
      setWalletBalance(data?.wallet_balance || 0);
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

  const fetchAdminRules = async () => {
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'tournament_rules_config')
        .single();
      
      if (data?.setting_value) {
        try {
          const parsed = JSON.parse(data.setting_value);
          setAdminRules(Array.isArray(parsed) ? parsed : []);
        } catch {
          setAdminRules([]);
        }
      }
    } catch (error) {
      // No rules configured yet
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, title, game, prize_pool, entry_fee, start_date, status, max_participants, tournament_type, joined_users, current_prize_pool, tournament_mode, room_id, room_password, prize_distribution, created_by, registration_deadline, youtube_link, instagram_link, is_giveaway, rules')
        .eq('status', 'upcoming')
        .eq('tournament_type', 'organizer')
        .order('start_date', { ascending: true });

      if (error) throw error;
      
      // Filter out tournaments:
      // 1. With passed registration deadline
      // 2. Starting within 2 minutes (registration locked)
      const now = new Date();
      const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);
      
      const filteredData = (data || []).filter(tournament => {
        // Check registration deadline
        if (tournament.registration_deadline && new Date(tournament.registration_deadline) <= now) {
          return false;
        }
        
        // Check if tournament starts within 2 minutes (registration locked)
        const startTime = new Date(tournament.start_date);
        if (startTime <= twoMinutesFromNow) {
          return false;
        }
        
        return true;
      });
      
      setTournaments(filteredData);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (tournament: Tournament) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to join tournaments',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
    // For duo/squad tournaments, redirect to tournament details page for team selection
    if (tournament.tournament_mode === 'duo' || tournament.tournament_mode === 'squad') {
      navigate(`/tournament/${tournament.id}`);
      return;
    }
    setJoinDialog({ open: true, tournament });
  };

  const handleJoinTournament = async () => {
    if (!joinDialog.tournament || !user) return;

    const tournament = joinDialog.tournament;
    setJoining(true);

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
        setJoinDialog({ open: false, tournament: null });
        return;
      }

      toast({ 
        title: 'Joined!', 
        description: `You have successfully joined ${tournament.title}. ₹${result.entry_fee} deducted.` 
      });
      
      setJoinDialog({ open: false, tournament: null });
      fetchTournaments();
      fetchUserProfile();
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast({ title: 'Error', description: 'Failed to join tournament. Please try again.', variant: 'destructive' });
    } finally {
      setJoining(false);
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
      fetchTournaments();
      fetchUserProfile();
    } catch (error) {
      console.error('Error exiting tournament:', error);
      toast({ title: 'Error', description: 'Failed to exit tournament.', variant: 'destructive' });
    } finally {
      setExiting(false);
    }
  };

  const handleShare = (tournament: Tournament) => {
    setShareDialog({ open: true, tournament });
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
    
    return filtered;
  };

  const isUserJoined = (tournament: Tournament) => {
    return user && tournament.joined_users?.includes(user.id);
  };

  const canSeeRoomDetails = (tournament: Tournament) => {
    if (!user || !tournament.joined_users?.includes(user.id)) return false;
    const matchTime = new Date(tournament.start_date);
    const now = new Date();
    const timeDiff = matchTime.getTime() - now.getTime();
    return timeDiff < 30 * 60 * 1000; // 30 minutes before match
  };

  return (
    <>
      <SEOHead
        title="Home"
        description="Join Vyuha Esport - India's premier esports tournament platform. Compete in BGMI, Free Fire, COD Mobile tournaments and win real cash prizes!"
        url="https://vyuhaesport.in/home"
      />
      <AppLayout>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={vyuhaLogo} alt="Vyuha" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-sm font-semibold">Vyuha eSports</span>
          </div>
          <div className="flex items-center gap-1">
            <TournamentScanner />
            <NotificationBell />
          </div>
        </div>
        
      </div>

      {/* Guest Login Banner */}
      {!user && showGuestBanner && (
        <div className="mx-4 mt-3 relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 border border-primary/30">
          <button 
            onClick={() => setShowGuestBanner(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 transition-colors z-10"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/20 shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Join the Battle!</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Sign up now to compete in tournaments, win real prizes, and become a champion!
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/')}
                    className="gap-1.5 text-xs h-8"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Login
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Gift className="h-3.5 w-3.5" />
                    Sign Up Free
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                <span>Win Prizes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-blue-500" />
                <span>Join Teams</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                <span>Free Entry</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Filter - Solo/Duo/Squad */}
      <div className="px-4 py-3">
        <div className="bg-muted rounded-lg p-1 flex">
          {(['solo', 'duo', 'squad'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeMode === mode 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>


      {/* Tournaments Section */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Live Tournaments</h2>
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
            <p className="text-xs text-muted-foreground mt-1">
              {userProfile?.preferred_game 
                ? `No ${userProfile.preferred_game} ${activeMode} matches found`
                : 'Check back soon for exciting matches!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredTournaments().map((tournament) => {
              const joined = isUserJoined(tournament);
              const showRoomDetails = canSeeRoomDetails(tournament);
              const isFollowingOrganizer = tournament.created_by ? followedOrganizers.includes(tournament.created_by) : false;
              
              return (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  isJoined={joined}
                  showRoomDetails={showRoomDetails}
                  onJoinClick={() => handleJoinClick(tournament)}
                  onExitClick={() => handleExitClick(tournament)}
                  onShareClick={() => void handleShare(tournament)}
                  onPrizeClick={() => setPrizeDrawer({ open: true, tournament })}
                  onRulesClick={() => setRulesDrawer({ open: true, tournament })}
                  onSwipeJoin={() => handleJoinClick(tournament)}
                  variant="organizer"
                  isFollowing={isFollowingOrganizer}
                  onFollowChange={(following) => {
                    if (following) {
                      setFollowedOrganizers(prev => [...prev, tournament.created_by!]);
                    } else {
                      setFollowedOrganizers(prev => prev.filter(id => id !== tournament.created_by));
                    }
                  }}
                  exitDisabled={tournament.tournament_mode === 'duo' || tournament.tournament_mode === 'squad'}
                  exitDisabledReason="Exit not allowed for team tournaments"
                />
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
              {(() => {
                const isGiveaway = joinDialog.tournament.is_giveaway;
                const effectiveFee = isGiveaway ? 1 : (joinDialog.tournament.entry_fee || 0);
                return (
                  <>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{isGiveaway ? 'Platform Fee' : 'Entry Fee'}</span>
                        <span className="font-semibold">₹{effectiveFee}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Your Balance</span>
                        <span className="font-semibold">₹{walletBalance}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">After Joining</span>
                        <span className={`font-semibold ${walletBalance - effectiveFee < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          ₹{walletBalance - effectiveFee}
                        </span>
                      </div>
                    </div>

                    {isGiveaway && (
                      <div className="bg-emerald-500/10 text-emerald-600 text-sm p-3 rounded-lg">
                        🎁 This is a giveaway tournament! Prize pool is funded by the organizer.
                      </div>
                    )}

                    {walletBalance < effectiveFee && (
                      <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                        Insufficient balance. Please add ₹{effectiveFee - walletBalance} to your wallet.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialog({ open: false, tournament: null })}>
              Cancel
            </Button>
            <Button 
              variant="gaming" 
              onClick={handleJoinTournament}
              disabled={joining || walletBalance < (joinDialog.tournament?.is_giveaway ? 1 : (joinDialog.tournament?.entry_fee || 0))}
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm & Join'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <TournamentShareDialog
        open={shareDialog.open}
        tournament={shareDialog.tournament}
        onOpenChange={(open) => setShareDialog((prev) => ({ ...prev, open }))}
      />
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
                {Object.entries(prizeDrawer.tournament.prize_distribution)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([rank, amount]) => (
                  <div key={rank} className="flex justify-between items-center bg-muted/50 rounded-lg p-3">
                    <span className="font-medium flex items-center gap-2">
                      {rank === '1' ? '🥇' : rank === '2' ? '🥈' : rank === '3' ? '🥉' : '🏅'} Rank {rank}
                    </span>
                    <span className="text-primary font-semibold">₹{String(amount)}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center mt-3 bg-amber-500/10 p-2 rounded">
                  ⚠️ Note: Prize amounts may be adjusted if maximum players don't join. 
                  Final amounts are recalculated 2 minutes before tournament start.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-primary/10 rounded-lg p-4 text-center mb-4">
                  <p className="text-sm text-muted-foreground">Total Prize Pool</p>
                  <p className="text-2xl font-bold text-primary">
                    {prizeDrawer.tournament?.prize_pool || `₹${prizeDrawer.tournament?.current_prize_pool || 0}`}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-yellow-500/10 rounded-lg p-3">
                    <span className="font-medium flex items-center gap-2">🥇 1st Place</span>
                    <span className="text-yellow-600 font-semibold">50%</span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-300/20 rounded-lg p-3">
                    <span className="font-medium flex items-center gap-2">🥈 2nd Place</span>
                    <span className="text-muted-foreground font-semibold">30%</span>
                  </div>
                  <div className="flex justify-between items-center bg-orange-500/10 rounded-lg p-3">
                    <span className="font-medium flex items-center gap-2">🥉 3rd Place</span>
                    <span className="text-orange-600 font-semibold">20%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3 bg-amber-500/10 p-2 rounded">
                  ⚠️ Note: Prize amounts may be adjusted if maximum players don't join. 
                  Final amounts are recalculated 2 minutes before tournament start.
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Rules Drawer */}
      <Drawer open={rulesDrawer.open} onOpenChange={(open) => setRulesDrawer({ open, tournament: rulesDrawer.tournament })}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Tournament Rules</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8 overflow-y-auto">
            {/* Tournament specific rules first */}
            {rulesDrawer.tournament?.rules && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-sm mb-2 text-primary">Tournament Specific Rules</h4>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {rulesDrawer.tournament.rules}
                </div>
              </div>
            )}
            
            {/* Admin configured rules */}
            {adminRules.length > 0 ? (
              <div className="space-y-4">
                {adminRules
                  .filter(rule => !rule.game || rule.game.toLowerCase() === rulesDrawer.tournament?.game.toLowerCase())
                  .map((rule) => (
                    <div key={rule.id} className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2">{rule.title}</h4>
                      <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {rule.content}
                      </div>
                    </div>
                  ))}
              </div>
            ) : !rulesDrawer.tournament?.rules && (
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">General Rules</h4>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li>Join the room 5-10 minutes before match time</li>
                    <li>No hacks, mods, or cheating tools allowed</li>
                    <li>Screen recording may be required for proof</li>
                    <li>Follow fair play guidelines</li>
                    <li>Room ID & Password shared 10 mins before start</li>
                    <li>Late entry may result in disqualification</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Additional rules may apply. Contact organizer for details.
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </AppLayout>
    </>
  );
};

export default HomePage;
