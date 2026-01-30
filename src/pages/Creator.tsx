import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BrandLogo from '@/components/BrandLogo';
import NotificationBell from '@/components/NotificationBell';
import TournamentCard from '@/components/TournamentCard';
import TournamentShareDialog from '@/components/TournamentShareDialog';
import SEOHead from '@/components/SEOHead';
import {
  Trophy,
  Loader2,
  LogIn,
  Sparkles,
  Gift,
  Users,
  X
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
  youtube_link: string | null;
  instagram_link: string | null;
  is_giveaway: boolean | null;
  rules?: string | null;
}

interface Profile {
  preferred_game: string | null;
  wallet_balance: number | null;
}

interface AdminRule {
  id: string;
  title: string;
  content: string;
  game: string;
  mode?: string;
}

const Creator = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registeredTournaments, setRegisteredTournaments] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [prizeDrawer, setPrizeDrawer] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [shareDialog, setShareDialog] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [rulesDrawer, setRulesDrawer] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [activeMode, setActiveMode] = useState<'solo' | 'duo' | 'squad'>('solo');
  const [exitDialog, setExitDialog] = useState<{ open: boolean; tournament: Tournament | null }>({ open: false, tournament: null });
  const [exiting, setExiting] = useState(false);
  const [showGuestBanner, setShowGuestBanner] = useState(true);
  const [adminRules, setAdminRules] = useState<AdminRule[]>([]);
  const [selectedRulesGame, setSelectedRulesGame] = useState<'bgmi' | 'freefire'>('bgmi');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
    fetchAdminRules();
    if (user) {
      fetchUserRegistrations();
      fetchUserProfile();
    }

    // Subscribe to real-time updates for tournaments
    const channel = supabase
      .channel('creator-tournaments')
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
    // Exit only allowed for solo tournaments
    if (tournament.tournament_mode === 'duo' || tournament.tournament_mode === 'squad') {
      return false;
    }
    const matchTime = new Date(tournament.start_date);
    const now = new Date();
    const timeDiff = matchTime.getTime() - now.getTime();
    return timeDiff > 30 * 60 * 1000; // Can exit if more than 30 minutes before
  };

  const handleExitClick = (tournament: Tournament) => {
    if (tournament.tournament_mode === 'duo' || tournament.tournament_mode === 'squad') {
      toast({ 
        title: 'Cannot Exit', 
        description: 'Exit is not allowed for duo/squad tournaments. Entry fee is non-refundable.', 
        variant: 'destructive' 
      });
      return;
    }
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

  const canJoinTournament = (tournament: Tournament) => {
    const now = new Date();
    const startTime = new Date(tournament.start_date);
    const timeDiff = startTime.getTime() - now.getTime();
    // Can't join if less than 2 minutes before start
    return timeDiff > 2 * 60 * 1000;
  };

  const isTournamentExpired = (tournament: Tournament) => {
    const now = new Date();
    const startTime = new Date(tournament.start_date);
    // Tournament is expired if start time has passed
    return startTime.getTime() < now.getTime();
  };

  const getFilteredTournaments = () => {
    let filtered = tournaments;
    
    // Filter out expired tournaments (start time has passed)
    filtered = filtered.filter(t => !isTournamentExpired(t));
    
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

  return (
    <>
      <SEOHead
        title="Creator Tournaments"
        description="Browse and join creator-hosted BGMI, Free Fire, and COD Mobile tournaments. Compete for prizes and climb the leaderboards on Vyuha Esport."
        url="https://vyuhaesport.in/creator-tournaments"
      />
      <AppLayout>
      {/* Header */}
      <div className="bg-card border-b-2 border-white/30 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" alt="Vyuha" />
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Guest Login Banner */}
      {!user && showGuestBanner && (
        <div className="mx-3 mt-3 relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 border-2 border-primary/30">
          <button 
            onClick={() => setShowGuestBanner(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 transition-colors z-10"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="p-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/20 shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Join the Battle!</h3>
                <p className="text-xs text-muted-foreground mb-2.5">
                  Sign up now to compete in tournaments, win real prizes, and become a champion!
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/')}
                    className="gap-1.5 text-xs h-8 px-3"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Login
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="gap-1.5 text-xs h-8 px-3"
                  >
                    <Gift className="h-3.5 w-3.5" />
                    Sign Up Free
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Trophy className="h-3 w-3 text-yellow-500" />
                <span>Win Prizes</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Users className="h-3 w-3 text-blue-500" />
                <span>Join Teams</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-purple-500" />
                <span>Free Entry</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Filter */}
      <div className="px-3 py-2.5">
        <div className="bg-muted/60 rounded-xl p-1 flex">
          {(['solo', 'duo', 'squad'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
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
      <div className="px-3 pb-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-semibold text-sm">Creator Tournaments</h2>
          <span className="text-[10px] text-muted-foreground">{getFilteredTournaments().length} matches</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : getFilteredTournaments().length === 0 ? (
          <div className="bg-card rounded-xl border-2 border-white/30 p-5 text-center">
            <Trophy className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-xs">No creator tournaments available</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {userProfile?.preferred_game 
                ? `No ${userProfile.preferred_game} ${activeMode} tournaments`
                : 'Check back later for new matches!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredTournaments().map((tournament) => {
              const isJoined = tournament.joined_users?.includes(user?.id || '');
              const showRoomDetails = canSeeRoomDetails(tournament);
              
              const canJoin = canJoinTournament(tournament);
              
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
                    onShareClick={() => setShareDialog({ open: true, tournament })}
                    onRulesClick={() => {
                      setSelectedRulesGame(tournament.game.toLowerCase().includes('bgmi') || tournament.game.toLowerCase().includes('pubg') ? 'bgmi' : 'freefire');
                      setRulesDrawer({ open: true, tournament });
                    }}
                    isLoading={registering === tournament.id}
                    variant="creator"
                    joinDisabled={!canJoin}
                    joinDisabledReason={!canJoin ? "Registration closed (2 min before start)" : undefined}
                    exitDisabled={tournament.tournament_mode === 'duo' || tournament.tournament_mode === 'squad'}
                    exitDisabledReason="Exit not allowed for team tournaments"
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

      {/* Share Dialog */}
      <TournamentShareDialog
        open={shareDialog.open}
        tournament={shareDialog.tournament}
        onOpenChange={(open) => setShareDialog((prev) => ({ ...prev, open }))}
      />

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
                    <span className="text-purple-500 font-semibold">₹{String(amount)}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center mt-3 bg-amber-500/10 p-2 rounded">
                  ⚠️ Note: Prize amounts may be adjusted if maximum players don't join. 
                  Final amounts are recalculated 2 minutes before tournament start.
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Prize distribution not set</p>
                <p className="text-xs mt-2 bg-amber-500/10 p-2 rounded">
                  ⚠️ Note: Prize amounts may be adjusted based on actual participants.
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Rules Drawer with Game Toggle */}
      <Drawer open={rulesDrawer.open} onOpenChange={(open) => setRulesDrawer({ open, tournament: rulesDrawer.tournament })}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <span>Tournament Rules</span>
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8 overflow-y-auto">
            {/* Game Toggle for BGMI / Free Fire */}
            <div className="flex items-center justify-center gap-1 p-1 bg-muted/50 rounded-lg mb-4">
              <button
                onClick={() => setSelectedRulesGame('bgmi')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  selectedRulesGame === 'bgmi'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🎮 BGMI / PUBG
              </button>
              <button
                onClick={() => setSelectedRulesGame('freefire')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  selectedRulesGame === 'freefire'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🔥 Free Fire
              </button>
            </div>

            {/* Mode-specific rules info */}
            {rulesDrawer.tournament?.tournament_mode && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-primary">
                  📋 Mode: {rulesDrawer.tournament.tournament_mode.toUpperCase()}
                </p>
              </div>
            )}

            {/* Tournament specific rules first */}
            {rulesDrawer.tournament?.rules && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-sm mb-2 text-primary">Tournament Specific Rules</h4>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {rulesDrawer.tournament.rules}
                </div>
              </div>
            )}
            
            {/* Game-specific rules from admin */}
            {adminRules.length > 0 ? (
              <div className="space-y-4">
                {adminRules
                  .filter(rule => {
                    const ruleGame = rule.game?.toLowerCase() || '';
                    if (selectedRulesGame === 'bgmi') {
                      return ruleGame.includes('bgmi') || ruleGame.includes('pubg') || !ruleGame;
                    } else {
                      return ruleGame.includes('free fire') || ruleGame.includes('freefire') || !ruleGame;
                    }
                  })
                  .filter(rule => {
                    // Filter by mode if specified
                    if (!rule.mode) return true;
                    return rule.mode.toLowerCase() === rulesDrawer.tournament?.tournament_mode?.toLowerCase();
                  })
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
                {/* Default rules based on selected game */}
                {selectedRulesGame === 'bgmi' ? (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm">BGMI Rules</h4>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                      <li>Join the room 5-10 minutes before match time</li>
                      <li>No hacks, mods, or cheating tools allowed</li>
                      <li>Screen recording may be required for proof</li>
                      <li>iPads are NOT allowed (mobile only)</li>
                      <li>Emulator players will be disqualified</li>
                      <li>Room ID & Password shared 10 mins before start</li>
                      <li>Late entry may result in disqualification</li>
                      <li>Follow fair play guidelines</li>
                    </ul>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm">Free Fire Rules</h4>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                      <li>Join the custom room 5-10 minutes before match</li>
                      <li>No hacks, mods, or script usage allowed</li>
                      <li>Screen recording required for verification</li>
                      <li>Character skills must follow tournament guidelines</li>
                      <li>No teaming with enemies</li>
                      <li>Room details shared 10 mins before start</li>
                      <li>Network issues are player's responsibility</li>
                      <li>Admin decision is final</li>
                    </ul>
                  </div>
                )}
                
                {/* Mode-specific additional rules */}
                {rulesDrawer.tournament?.tournament_mode && rulesDrawer.tournament.tournament_mode !== 'solo' && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-2 text-orange-600">
                      {rulesDrawer.tournament.tournament_mode.toUpperCase()} Mode Rules
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                      {rulesDrawer.tournament.tournament_mode === 'duo' ? (
                        <>
                          <li>Both team members must join the room</li>
                          <li>Team leader is responsible for communication</li>
                          <li>If one member disconnects, team continues</li>
                          <li>Entry fee charged per player</li>
                        </>
                      ) : (
                        <>
                          <li>All 4 squad members must join the room</li>
                          <li>Squad leader handles room entry</li>
                          <li>Team ranking based on squad performance</li>
                          <li>Entry fee charged per player</li>
                          <li>No team changes after registration</li>
                        </>
                      )}
                    </ul>
                  </div>
                )}
                
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

export default Creator;
