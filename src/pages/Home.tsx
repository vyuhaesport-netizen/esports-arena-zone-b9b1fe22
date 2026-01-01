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
import TournamentQRCode from '@/components/TournamentQRCode';
import TournamentScanner from '@/components/TournamentScanner';
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
import {
  buildTournamentShareText,
  buildTournamentShareUrl,
  copyToClipboard,
  openWhatsAppShare,
  tryNativeShare,
} from '@/utils/share';

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

  const handleShare = async (tournament: Tournament) => {
    const url = buildTournamentShareUrl(tournament.id);
    const text = buildTournamentShareText({
      title: tournament.title,
      prize: tournament.prize_pool || `₹${tournament.current_prize_pool ?? 0}`,
    });

    const shared = await tryNativeShare({
      title: tournament.title,
      text,
      url,
    });

    if (shared) return;

    // Fallback: show QR + WhatsApp share dialog
    setShareDialog({ open: true, tournament });
  };

  const shareToWhatsApp = async (tournament: Tournament) => {
    const url = buildTournamentShareUrl(tournament.id);
    const text = buildTournamentShareText({
      title: tournament.title,
      prize: tournament.prize_pool || `₹${tournament.current_prize_pool ?? 0}`,
    });

    const opened = openWhatsAppShare(`${text} ${url}`);

    // If popups are blocked, copy the message so user can paste in WhatsApp.
    if (!opened) {
      const copied = await copyToClipboard(`${text} ${url}`);
      toast({
        title: copied ? 'Link Copied' : 'Share Failed',
        description: copied
          ? 'Tournament share message copied. Paste it in WhatsApp.'
          : 'Unable to open WhatsApp or copy the link. Please try again.',
        variant: copied ? undefined : 'destructive',
      });
    }
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
    <AppLayout>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={vyuhaLogo} alt="Vyuha" className="h-10 w-10 rounded-full object-cover" />
            <div>
              <h1 className="font-gaming text-lg font-bold">Vyuha Esport</h1>
            </div>
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
                <h3 className="font-gaming font-semibold text-sm mb-1">Join the Battle!</h3>
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
      <Dialog open={shareDialog.open} onOpenChange={(open) => setShareDialog({ open, tournament: shareDialog.tournament })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share Tournament</DialogTitle>
            <DialogDescription>
              Share {shareDialog.tournament?.title} with friends
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* QR Code with Vyuha Logo */}
            {shareDialog.tournament && (
              <TournamentQRCode 
                tournamentId={shareDialog.tournament.id}
                tournamentTitle={shareDialog.tournament.title}
                onDownload={() => toast({ title: 'Downloaded!', description: 'QR code saved to your device.' })}
              />
            )}

            {/* WhatsApp Share */}
            <Button
              variant="outline"
              onClick={() => shareDialog.tournament && void shareToWhatsApp(shareDialog.tournament)}
              disabled={!shareDialog.tournament}
              className="w-full gap-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share on WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
  );
};

export default HomePage;
