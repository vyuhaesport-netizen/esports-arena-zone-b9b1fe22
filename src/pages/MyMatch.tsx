import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CountdownTimer from '@/components/CountdownTimer';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Trophy, 
  Calendar,
  Loader2,
  Gamepad2,
  X,
  Users,
  Eye,
  ChevronDown,
  Copy,
  Check,
  Clock,
  Crown,
  Info,
  AlertTriangle,
  User,
  Send,
  MapPin,
  QrCode,
  LogOut
} from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { format } from 'date-fns';

interface PlayerInfo {
  user_id: string;
  in_game_name: string | null;
  game_uid: string | null;
}

interface WinnerPosition {
  position: number;
  user_id: string;
  amount: number;
}

interface Registration {
  id: string;
  tournament_id: string;
  status: string | null;
  registered_at: string;
  team_name: string | null;
  team_members: string[] | null;
  is_team_leader: boolean | null;
  tournaments: {
    title: string;
    game: string;
    start_date: string;
    end_date: string | null;
    status: string | null;
    prize_pool: string | null;
    entry_fee: number | null;
    room_id: string | null;
    room_password: string | null;
    joined_users: string[] | null;
    winner_user_id: string | null;
    winner_declared_at: string | null;
    prize_distribution: { position: number; amount: number; user_id?: string }[] | null;
    current_prize_pool: number | null;
    tournament_mode: string | null;
  };
}

interface LocalTournament {
  id: string;
  tournament_name: string;
  game: string;
  tournament_mode: string;
  tournament_date: string;
  status: string;
  entry_fee: number;
  institution_name: string;
  current_prize_pool: number | null;
  room_id: string | null;
  room_password: string | null;
  joined_users: string[] | null;
  prize_distribution: any;
  winner_user_id: string | null;
  started_at: string | null;
  ended_at: string | null;
}

const MyMatch = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [localTournaments, setLocalTournaments] = useState<LocalTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState<string | null>(null);
  
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRegistrations();
      fetchLocalTournaments();
    }
  }, [user]);

  const fetchRegistrations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          id,
          tournament_id,
          status,
          registered_at,
          team_name,
          team_members,
          is_team_leader,
          tournaments (
            title,
            game,
            start_date,
            end_date,
            status,
            prize_pool,
            entry_fee,
            room_id,
            room_password,
            joined_users,
            winner_user_id,
            winner_declared_at,
            prize_distribution,
            current_prize_pool,
            tournament_mode
          )
        `)
        .eq('user_id', user.id)
        .order('registered_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data as unknown as Registration[] || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalTournaments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('local_tournaments')
        .select('*')
        .contains('joined_users', [user.id])
        .order('tournament_date', { ascending: false });

      if (error) throw error;
      setLocalTournaments(data || []);
    } catch (error) {
      console.error('Error fetching local tournaments:', error);
    }
  };

  const fetchPlayers = async (userIds: string[]): Promise<PlayerInfo[]> => {
    if (!userIds.length) return [];
    
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, in_game_name, game_uid')
      .in('user_id', userIds);
    
    if (error) {
      console.error('Error fetching players:', error);
      return [];
    }
    
    return data || [];
  };

  const handleCancel = async (registrationId: string, tournamentId: string, startDate: string, tournamentMode: string | null) => {
    if (!user) return;

    // Exit only allowed for solo tournaments
    if (tournamentMode === 'duo' || tournamentMode === 'squad') {
      toast({
        title: 'Cannot Exit',
        description: 'Exit is not allowed for duo/squad tournaments. Entry fee is non-refundable.',
        variant: 'destructive',
      });
      return;
    }

    const matchTime = new Date(startDate);
    const now = new Date();
    const timeDiff = matchTime.getTime() - now.getTime();

    if (timeDiff <= 30 * 60 * 1000) {
      toast({
        title: 'Cannot Exit',
        description: 'You cannot exit a tournament less than 30 minutes before it starts.',
        variant: 'destructive',
      });
      return;
    }

    setCanceling(registrationId);

    try {
      const { data, error } = await supabase.rpc('process_tournament_exit', {
        p_user_id: user.id,
        p_tournament_id: tournamentId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; refunded_amount?: number };
      if (!result.success) {
        toast({
          title: 'Exit Failed',
          description: result.error || 'Failed to exit tournament.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Exited',
        description: `₹${result.refunded_amount || 0} refunded to your wallet.`,
      });

      fetchRegistrations();
    } catch (error) {
      console.error('Error exiting tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to exit. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCanceling(null);
    }
  };

  const upcomingMatches = registrations.filter(r => r.tournaments.status === 'upcoming');
  const liveMatches = registrations.filter(r => r.tournaments.status === 'ongoing');
  const completedMatches = registrations.filter(r => r.tournaments.status === 'completed' || r.tournaments.status === 'cancelled');

  // Local Tournament Card Component
  const LocalTournamentCard = ({ tournament }: { tournament: LocalTournament }) => {
    const [roomOpen, setRoomOpen] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [exiting, setExiting] = useState(false);

    const copyToClipboard = async (text: string, field: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast({ title: 'Copied!', description: `${field} copied to clipboard.` });
        setTimeout(() => setCopiedField(null), 2000);
      } catch {
        toast({ title: 'Failed to copy', variant: 'destructive' });
      }
    };

    const handleExitLocalTournament = async () => {
      if (!user) return;

      // Exit only allowed for solo tournaments
      if (tournament.tournament_mode === 'duo' || tournament.tournament_mode === 'squad') {
        toast({
          title: 'Cannot Exit',
          description: 'Exit is not allowed for duo/squad tournaments. Entry fee is non-refundable.',
          variant: 'destructive',
        });
        return;
      }

      setExiting(true);
      try {
        const { data, error } = await supabase.rpc('process_local_tournament_exit', {
          p_tournament_id: tournament.id,
        });

        if (error) throw error;

        const result = data as { success: boolean; error?: string; refunded_amount?: number };
        if (!result.success) {
          toast({
            title: 'Exit Failed',
            description: result.error || 'Failed to exit tournament.',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Exited Successfully',
          description: `₹${result.refunded_amount || 0} refunded to your wallet.`,
        });

        // Refresh local tournaments list
        fetchLocalTournaments();
      } catch (error: any) {
        console.error('Error exiting local tournament:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to exit. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setExiting(false);
      }
    };

    const getStatusBadge = () => {
      switch (tournament.status) {
        case 'upcoming':
          return <Badge variant="outline" className="text-blue-500 border-blue-500/50">Upcoming</Badge>;
        case 'ongoing':
          return <Badge variant="outline" className="text-green-500 border-green-500/50 animate-pulse">Live</Badge>;
        case 'completed':
          return <Badge variant="outline" className="text-muted-foreground">Completed</Badge>;
        default:
          return <Badge variant="outline">{tournament.status}</Badge>;
      }
    };

    const hasRoomDetails = tournament.room_id || tournament.room_password;
    const isOngoingOrCompleted = tournament.status === 'ongoing' || tournament.status === 'completed';
    // Exit only for solo and upcoming tournaments
    const canExit = tournament.status === 'upcoming' && 
                   new Date(tournament.tournament_date) > new Date() &&
                   tournament.tournament_mode !== 'duo' && 
                   tournament.tournament_mode !== 'squad';

    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-6 w-6 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm line-clamp-1">{tournament.tournament_name}</h3>
                <p className="text-xs text-muted-foreground">{tournament.game} • {tournament.tournament_mode}</p>
              </div>
              {getStatusBadge()}
            </div>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(tournament.tournament_date), 'MMM dd, hh:mm a')}
            </div>
            
            <p className="text-xs text-muted-foreground mt-1">
              📍 {tournament.institution_name}
            </p>

            {/* Countdown for upcoming */}
            {tournament.status === 'upcoming' && (
              <div className="mt-2 p-2 bg-primary/10 rounded-lg">
                <CountdownTimer 
                  targetDate={new Date(tournament.tournament_date)}
                  label="Starts in:"
                  className="text-primary justify-center"
                />
              </div>
            )}

            {/* Prize Pool */}
            {tournament.current_prize_pool && tournament.current_prize_pool > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs">
                <Trophy className="h-3 w-3 text-yellow-500" />
                <span className="text-yellow-500 font-medium">Prize Pool: ₹{Math.round(tournament.current_prize_pool)}</span>
              </div>
            )}

            {/* Room Details Collapsible */}
            {hasRoomDetails && isOngoingOrCompleted && (
              <Collapsible open={roomOpen} onOpenChange={setRoomOpen} className="mt-3">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    {roomOpen ? 'Hide' : 'View'} Room Details
                    <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${roomOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 p-3 bg-muted/50 rounded-lg">
                  {tournament.room_id && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Room ID</p>
                        <p className="font-mono text-sm font-medium">{tournament.room_id}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(tournament.room_id!, 'Room ID')}
                      >
                        {copiedField === 'Room ID' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                  {tournament.room_password && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Password</p>
                        <p className="font-mono text-sm font-medium">{tournament.room_password}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(tournament.room_password!, 'Password')}
                      >
                        {copiedField === 'Password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Player count + Exit button */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{tournament.joined_users?.length || 0} players joined</span>
              </div>
              
              {canExit ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleExitLocalTournament}
                  disabled={exiting}
                >
                  {exiting ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <LogOut className="h-3 w-3 mr-1" />
                  )}
                  Exit
                </Button>
              ) : tournament.status === 'upcoming' && (tournament.tournament_mode === 'duo' || tournament.tournament_mode === 'squad') && (
                <span className="text-amber-600 text-[10px]">No exit for teams</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MatchCard = ({ registration, showCancel = false, isCompleted = false }: { registration: Registration; showCancel?: boolean; isCompleted?: boolean }) => {
    const [playersDialogOpen, setPlayersDialogOpen] = useState(false);
    const [roomOpen, setRoomOpen] = useState(false);
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [hasShownConfetti, setHasShownConfetti] = useState(false);
    const [winnerCountdown, setWinnerCountdown] = useState<string | null>(null);
    
    // Report states
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportPlayers, setReportPlayers] = useState<PlayerInfo[]>([]);
    const [loadingReportPlayers, setLoadingReportPlayers] = useState(false);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportForm, setReportForm] = useState({
      reported_player_id: '',
      report_type: 'hack',
      description: ''
    });

    // Find user's winning position and amount from prize_distribution
    // For team tournaments (duo/squad), check if user is in the winning team
    // prize_distribution can be stored in different formats:
    // 1. Object with position as key and amount as value: {"1": 60, "2": 30}
    // 2. Array with position, amount, and user_id
    // 3. Object with user_id mapped to position
    const getUserWinnerInfo = () => {
      const pd = registration.tournaments.prize_distribution;
      const winnerId = registration.tournaments.winner_user_id;
      const tournamentMode = registration.tournaments.tournament_mode;
      const teamMembers = registration.team_members || [];
      
      // For team tournaments (duo/squad), check if user is part of the winning team
      const isTeamTournament = tournamentMode === 'duo' || tournamentMode === 'squad';
      const isUserInWinningTeam = isTeamTournament && winnerId && teamMembers.includes(winnerId);
      const isUserTheWinner = winnerId === user?.id;
      const isWinningMember = isUserTheWinner || isUserInWinningTeam;
      
      if (!pd) {
        // Check if user is the winner or part of the winning team
        if (isWinningMember) {
          return { position: 1, amount: registration.tournaments.current_prize_pool || 0 };
        }
        return null;
      }
      
      // Handle array format with user_id
      if (Array.isArray(pd)) {
        // First check if user is directly in prize distribution
        const found = pd.find((p: any) => p.user_id === user?.id);
        if (found) return { position: found.position, amount: found.amount };
        
        // For team tournaments, check if user is in a winning team
        if (isTeamTournament && teamMembers.length > 0) {
          const teamWinner = pd.find((p: any) => teamMembers.includes(p.user_id));
          if (teamWinner) return { position: teamWinner.position, amount: teamWinner.amount };
        }
      }
      
      // Handle object format {"1": 60, "2": 30} - check if user is winner or in winning team
      if (typeof pd === 'object' && !Array.isArray(pd)) {
        if (isWinningMember) {
          const amount = (pd as any)['1'] || (pd as any)[1] || 0;
          return { position: 1, amount };
        }
      }
      
      // Parse if string
      if (typeof pd === 'string') {
        try {
          const parsed = JSON.parse(pd);
          if (Array.isArray(parsed)) {
            const found = parsed.find((p: any) => p.user_id === user?.id);
            if (found) return { position: found.position, amount: found.amount };
            
            // For team tournaments, check if user is in a winning team
            if (isTeamTournament && teamMembers.length > 0) {
              const teamWinner = parsed.find((p: any) => teamMembers.includes(p.user_id));
              if (teamWinner) return { position: teamWinner.position, amount: teamWinner.amount };
            }
          }
          if (isWinningMember) {
            const amount = parsed['1'] || parsed[1] || 0;
            return { position: 1, amount };
          }
        } catch { /* ignore */ }
      }
      
      return null;
    };
    
    const userWinnerInfo = getUserWinnerInfo();
    const isWinner = !!userWinnerInfo;
    const winnerPosition = userWinnerInfo?.position;
    const winnerAmount = userWinnerInfo?.amount;

    // Calculate 30 min after end_date for winner declaration
    const endDate = registration.tournaments.end_date ? new Date(registration.tournaments.end_date) : null;
    const winnerDeclarationTime = endDate ? new Date(endDate.getTime() + 30 * 60 * 1000) : null;
    const isAwaitingWinner = registration.tournaments.status === 'completed' && 
                             !registration.tournaments.winner_declared_at && 
                             winnerDeclarationTime && 
                             new Date() < winnerDeclarationTime;
    
    // Check if result is not out (winner not declared and 30 min window passed or still waiting)
    const isResultNotOut = registration.tournaments.status === 'completed' && 
                           !registration.tournaments.winner_declared_at;
    
    // Check if user lost (result declared but user is not a winner)
    const isLoser = registration.tournaments.status === 'completed' && 
                    registration.tournaments.winner_declared_at && 
                    !isWinner;
    
    // Check if tournament was cancelled
    const isCancelled = registration.tournaments.status === 'cancelled';

    // Show confetti animation state for this specific card
    const [showCardConfetti, setShowCardConfetti] = useState(false);

    // Trigger card confetti when winner card is viewed
    useEffect(() => {
      if (isWinner && registration.tournaments.status === 'completed' && !hasShownConfetti) {
        setShowCardConfetti(true);
        setHasShownConfetti(true);
        // Auto-hide confetti after 4 seconds
        const timer = setTimeout(() => setShowCardConfetti(false), 4000);
        return () => clearTimeout(timer);
      }
    }, [isWinner, registration.tournaments.status, hasShownConfetti]);

    // Winner declaration countdown timer
    useEffect(() => {
      if (!isAwaitingWinner || !winnerDeclarationTime) {
        setWinnerCountdown(null);
        return;
      }

      const updateCountdown = () => {
        const now = new Date();
        const diff = winnerDeclarationTime.getTime() - now.getTime();

        if (diff <= 0) {
          setWinnerCountdown(null);
          return;
        }

        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setWinnerCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }, [isAwaitingWinner, winnerDeclarationTime]);

    // Check if player can report (within 30 minutes after tournament ends)
    const canReport = () => {
      if (!endDate || registration.tournaments.status !== 'completed') return false;
      if (registration.tournaments.winner_user_id) return false; // Winner already declared
      const now = new Date();
      const minutesSinceEnd = differenceInMinutes(now, endDate);
      return minutesSinceEnd >= 0 && minutesSinceEnd < 30;
    };

    const reportTimeRemaining = () => {
      if (!endDate) return null;
      const now = new Date();
      const reportDeadline = new Date(endDate.getTime() + 30 * 60 * 1000);
      const diff = reportDeadline.getTime() - now.getTime();
      if (diff <= 0) return null;
      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleOpenReport = async () => {
      setReportDialogOpen(true);
      setReportForm({ reported_player_id: '', report_type: 'hack', description: '' });
      
      if (reportPlayers.length === 0 && registration.tournaments.joined_users?.length) {
        setLoadingReportPlayers(true);
        // Filter out current user from report list
        const otherPlayers = registration.tournaments.joined_users.filter(id => id !== user?.id);
        const playerData = await fetchPlayers(otherPlayers);
        setReportPlayers(playerData);
        setLoadingReportPlayers(false);
      }
    };

    const handleSubmitReport = async () => {
      if (!user || !reportForm.reported_player_id || !reportForm.description.trim()) {
        toast({
          title: 'Missing Information',
          description: 'Please select a player and provide a description.',
          variant: 'destructive',
        });
        return;
      }

      setSubmittingReport(true);
      try {
        const { error } = await supabase
          .from('tournament_reports')
          .insert({
            tournament_id: registration.tournament_id,
            reporter_id: user.id,
            reported_player_id: reportForm.reported_player_id,
            report_type: reportForm.report_type,
            description: reportForm.description.trim(),
          });

        if (error) {
          if (error.code === '42501') {
            toast({
              title: 'Report Window Closed',
              description: 'The 30-minute report window has ended.',
              variant: 'destructive',
            });
          } else {
            throw error;
          }
          return;
        }

        toast({
          title: 'Report Submitted',
          description: 'Your report has been submitted to the organizer.',
        });
        setReportDialogOpen(false);
      } catch (error) {
        console.error('Error submitting report:', error);
        toast({
          title: 'Error',
          description: 'Failed to submit report. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setSubmittingReport(false);
      }
    };

    const handleViewPlayers = async () => {
      setPlayersDialogOpen(true);
      if (players.length === 0 && registration.tournaments.joined_users?.length) {
        setLoadingPlayers(true);
        const playerData = await fetchPlayers(registration.tournaments.joined_users);
        setPlayers(playerData);
        setLoadingPlayers(false);
      }
    };

    const copyToClipboard = async (text: string, field: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast({
          title: 'Copied!',
          description: `${field} copied to clipboard.`,
        });
        setTimeout(() => setCopiedField(null), 2000);
      } catch (err) {
        toast({
          title: 'Failed to copy',
          description: 'Please copy manually.',
          variant: 'destructive',
        });
      }
    };

    const hasRoomDetails = registration.tournaments.room_id || registration.tournaments.room_password;
    const playerCount = registration.tournaments.joined_users?.length || 0;

    return (
      <div className={`bg-card rounded-xl border p-4 relative overflow-hidden transition-all duration-300 ${isWinner && registration.tournaments.status === 'completed' ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 shadow-lg shadow-yellow-500/10' : 'border-border'}`}>
        {/* Card Confetti Animation for Winners */}
        {showCardConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {[...Array(15)].map((_, i) => {
              const emojis = ['🎉', '✨', '🏆', '⭐', '🎊', '💰', '🥇'];
              const randomEmoji = emojis[i % emojis.length];
              const randomLeft = 5 + (i * 6.5);
              const randomDelay = i * 0.15;
              return (
                <div
                  key={i}
                  className="absolute animate-confetti-fall text-base"
                  style={{
                    left: `${randomLeft}%`,
                    top: '-10px',
                    animationDelay: `${randomDelay}s`,
                  }}
                >
                  {randomEmoji}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Gamepad2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1">{registration.tournaments.title}</h3>
            <p className="text-xs text-muted-foreground">{registration.tournaments.game}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(registration.tournaments.start_date), 'MMM dd, hh:mm a')}
            </div>
            {/* Countdown Timer for upcoming tournaments */}
            {registration.tournaments.status === 'upcoming' && (
              <div className="mt-2 p-2 bg-primary/10 rounded-lg">
                <CountdownTimer 
                  targetDate={new Date(registration.tournaments.start_date)}
                  label="Starts in:"
                  className="text-primary justify-center"
                />
              </div>
            )}
            {registration.tournaments.prize_pool && (
              <div className="flex items-center gap-1 mt-1 text-xs">
                <Trophy className="h-3 w-3 text-primary" />
                <span className="text-primary font-medium">
                  ₹{Math.round(parseFloat(registration.tournaments.prize_pool.replace(/[₹,]/g, '')) || 0)}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Winner Badge - Show prominently if user won with position and amount */}
            {isWinner && registration.tournaments.status === 'completed' && (
              <div className="flex flex-col items-end gap-1">
                <Badge className="bg-red-500/20 text-red-600 border border-red-500/30 text-[10px] font-bold animate-pulse">
                  <Crown className="h-3 w-3 mr-1" />
                  🏆 #{winnerPosition} Winner
                </Badge>
                {winnerAmount && (
                  <Badge className="bg-green-500/20 text-green-600 border border-green-500/30 text-[10px] font-semibold">
                    Won ₹{Math.round(winnerAmount)}
                  </Badge>
                )}
              </div>
            )}
            
            {/* You Lost Badge */}
            {isLoser && (
              <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-medium">
                😔 You Lost
              </Badge>
            )}
            
            {/* Result Not Out Badge */}
            {isResultNotOut && !isAwaitingWinner && (
              <Badge className="bg-gray-500/10 text-gray-500 border border-gray-500/20 text-[10px] font-medium">
                ⏳ Result Not Out
              </Badge>
            )}
            
            {/* Cancelled Badge */}
            {isCancelled && (
              <Badge className="bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[10px] font-medium">
                🚫 Cancelled (Refunded)
              </Badge>
            )}
            
            {/* Winner Declaration Countdown */}
            {isAwaitingWinner && winnerCountdown && (
              <div className="flex items-center gap-1">
                <Badge className="bg-amber-500/20 text-amber-600 border border-amber-500/30 text-[10px] font-medium">
                  <Clock className="h-3 w-3 mr-1" />
                  {winnerCountdown}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                        <Info className="h-3 w-3 text-amber-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[200px]">
                      <p className="text-xs">Winner will be declared within 30 minutes after tournament ends. Please wait!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            <Badge 
              className={`text-[10px] ${
                registration.tournaments.status === 'upcoming' 
                  ? 'bg-primary/10 text-primary' 
                  : registration.tournaments.status === 'ongoing'
                  ? 'bg-green-500/10 text-green-600'
                  : registration.tournaments.status === 'cancelled'
                  ? 'bg-orange-500/10 text-orange-500'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {registration.tournaments.status}
            </Badge>
            {showCancel && registration.tournaments.tournament_mode !== 'duo' && registration.tournaments.tournament_mode !== 'squad' && (
              <button 
                onClick={() => handleCancel(registration.id, registration.tournament_id, registration.tournaments.start_date, registration.tournaments.tournament_mode)}
                disabled={canceling === registration.id}
                className="text-destructive text-xs flex items-center gap-1 disabled:opacity-50"
              >
                <X className="h-3 w-3" /> {canceling === registration.id ? 'Exiting...' : 'Exit'}
              </button>
            )}
            {showCancel && (registration.tournaments.tournament_mode === 'duo' || registration.tournaments.tournament_mode === 'squad') && (
              <span className="text-amber-600 text-[10px]">No exit for teams</span>
            )}
          </div>
        </div>

        {/* Action Buttons Section - Hide View Players and Room Details for completed tournaments */}
        {!isCompleted && (
          <>
            <div className="mt-3 flex gap-2">
              {/* View Players Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewPlayers}
                className="flex-1 h-8 text-xs gap-1.5"
              >
                <Users className="h-3.5 w-3.5 text-blue-500" />
                View Players ({playerCount})
              </Button>

              {/* Room Details Collapsible */}
              <Collapsible open={roomOpen} onOpenChange={setRoomOpen} className="flex-1">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5 text-emerald-500" />
                    Room Details
                    <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${roomOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>

            {/* Room Details Content */}
            <Collapsible open={roomOpen} onOpenChange={setRoomOpen}>
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  {hasRoomDetails ? (
                    <div className="space-y-2">
                      {registration.tournaments.room_id && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Room ID:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-emerald-600">{registration.tournaments.room_id}</span>
                            <button
                              onClick={() => copyToClipboard(registration.tournaments.room_id!, 'Room ID')}
                              className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
                            >
                              {copiedField === 'Room ID' ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      {registration.tournaments.room_password && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Password:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-emerald-600">{registration.tournaments.room_password}</span>
                            <button
                              onClick={() => copyToClipboard(registration.tournaments.room_password!, 'Password')}
                              className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
                            >
                              {copiedField === 'Password' ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Room details will appear here once the organizer sets them up.
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Report Player Button - Only show in 30-min window after tournament ends */}
        {isCompleted && canReport() && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenReport}
              className="w-full h-9 text-xs gap-1.5 border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:hover:bg-red-950/50"
            >
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-red-600 dark:text-red-400">Report a Player</span>
              <span className="ml-auto text-red-500 text-[10px]">
                ⏱ {reportTimeRemaining()} left
              </span>
            </Button>
          </div>
        )}

        {/* Players Dialog */}
        <Dialog open={playersDialogOpen} onOpenChange={setPlayersDialogOpen}>
          <DialogContent className="max-w-sm max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Total Players ({playerCount})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {loadingPlayers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : players.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No players yet</p>
              ) : (
                players.map((player, idx) => (
                  <div key={player.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{player.in_game_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">UID: {player.game_uid || 'N/A'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Report Player Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Report a Player
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Submit reports for hacking, cheating, or unethical practices. 
                  False reports may result in action against your account.
                </p>
              </div>

              {/* Select Player */}
              <div className="space-y-2">
                <Label className="text-sm">Select Player to Report *</Label>
                {loadingReportPlayers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Select
                    value={reportForm.reported_player_id}
                    onValueChange={(value) => setReportForm(prev => ({ ...prev, reported_player_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a player..." />
                    </SelectTrigger>
                    <SelectContent>
                      {reportPlayers.map((player) => (
                        <SelectItem key={player.user_id} value={player.user_id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{player.in_game_name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">({player.game_uid || 'N/A'})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Report Type */}
              <div className="space-y-2">
                <Label className="text-sm">Report Type *</Label>
                <Select
                  value={reportForm.report_type}
                  onValueChange={(value) => setReportForm(prev => ({ ...prev, report_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hack">🎮 Hacking / Cheating</SelectItem>
                    <SelectItem value="exploit">⚠️ Exploit Abuse</SelectItem>
                    <SelectItem value="teaming">🤝 Illegal Teaming</SelectItem>
                    <SelectItem value="toxic">💬 Toxic Behavior</SelectItem>
                    <SelectItem value="other">📝 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm">Description *</Label>
                <Textarea
                  placeholder="Describe what happened in detail..."
                  value={reportForm.description}
                  onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={handleSubmitReport}
                disabled={submittingReport || !reportForm.reported_player_id || !reportForm.description.trim()}
              >
                {submittingReport ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="My Matches">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Matches">
      <div className="p-4">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="upcoming" className="text-xs">
              Upcoming ({upcomingMatches.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="text-xs">
              Live ({liveMatches.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              Done ({completedMatches.length})
            </TabsTrigger>
            <TabsTrigger value="local" className="text-xs">
              Local ({localTournaments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {upcomingMatches.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No upcoming matches</p>
                <Button variant="gaming" size="sm" className="mt-4" onClick={() => navigate('/creator')}>
                  Browse Tournaments
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMatches.map((reg) => (
                  <MatchCard key={reg.id} registration={reg} showCancel />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="live" className="mt-4">
            {liveMatches.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No live matches</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveMatches.map((reg) => (
                  <MatchCard key={reg.id} registration={reg} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedMatches.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No completed matches</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedMatches.map((reg) => (
                  <MatchCard key={reg.id} registration={reg} isCompleted />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="local" className="mt-4">
            {localTournaments.length === 0 ? (
              <div className="text-center py-12">
                <QrCode className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No local tournaments joined</p>
                <p className="text-muted-foreground text-xs mt-1">Scan a tournament QR code to join</p>
              </div>
            ) : (
              <div className="space-y-3">
                {localTournaments.map((lt) => (
                  <LocalTournamentCard key={lt.id} tournament={lt} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default MyMatch;
