import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CountdownTimer from '@/components/CountdownTimer';
import SchoolTournamentPlayerCard from '@/components/SchoolTournamentPlayerCard';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trophy, Calendar, Loader2, Gamepad2, X, Users, Eye, ChevronDown, Copy, Check,
  Clock, Crown, AlertTriangle, User, Send, MapPin, QrCode, LogOut
} from 'lucide-react';
import { differenceInMinutes, format } from 'date-fns';

interface PlayerInfo {
  user_id: string;
  in_game_name: string | null;
  game_uid: string | null;
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

interface SchoolTournament {
  id: string;
  tournament_name: string;
  school_name: string;
  school_city: string;
  game: string;
  status: string;
  tournament_date: string;
  entry_fee: number;
  prize_pool: number;
  current_round: number;
  private_code: string;
}

interface SchoolTeam {
  id: string;
  team_name: string;
  is_eliminated: boolean;
  current_round: number;
  tournament_id: string;
}

const MyMatch = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [localTournaments, setLocalTournaments] = useState<LocalTournament[]>([]);
  const [schoolTournaments, setSchoolTournaments] = useState<{ tournament: SchoolTournament; team: SchoolTeam }[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRegistrations();
      fetchLocalTournaments();
      fetchSchoolTournaments();
    }
  }, [user]);

  const fetchRegistrations = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`id, tournament_id, status, registered_at, team_name, team_members, is_team_leader,
          tournaments (title, game, start_date, end_date, status, prize_pool, entry_fee, room_id, room_password, joined_users, winner_user_id, winner_declared_at, prize_distribution, current_prize_pool, tournament_mode)`)
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
      const { data, error } = await supabase.from('local_tournaments').select('*').contains('joined_users', [user.id]).order('tournament_date', { ascending: false });
      if (error) throw error;
      setLocalTournaments(data || []);
    } catch (error) {
      console.error('Error fetching local tournaments:', error);
    }
  };

  const fetchSchoolTournaments = async () => {
    if (!user) return;
    try {
      const { data: teamsData, error: teamsError } = await supabase.from('school_tournament_teams')
        .select('id, team_name, is_eliminated, current_round, tournament_id')
        .or(`leader_id.eq.${user.id},member_1_id.eq.${user.id},member_2_id.eq.${user.id},member_3_id.eq.${user.id}`);
      if (teamsError) throw teamsError;
      if (!teamsData || teamsData.length === 0) { setSchoolTournaments([]); return; }

      const tournamentIds = teamsData.map(t => t.tournament_id);
      const { data: tournamentsData, error: tournamentsError } = await supabase.from('school_tournaments')
        .select('id, tournament_name, school_name, school_city, game, status, tournament_date, entry_fee, prize_pool, current_round, private_code')
        .in('id', tournamentIds);
      if (tournamentsError) throw tournamentsError;

      const combined = teamsData.map(team => {
        const tournament = tournamentsData?.find(t => t.id === team.tournament_id);
        return tournament ? { tournament, team } : null;
      }).filter(Boolean) as { tournament: SchoolTournament; team: SchoolTeam }[];
      setSchoolTournaments(combined);
    } catch (error) {
      console.error('Error fetching school tournaments:', error);
    }
  };

  const fetchPlayers = async (userIds: string[]): Promise<PlayerInfo[]> => {
    if (!userIds.length) return [];
    const { data, error } = await supabase.from('profiles').select('user_id, in_game_name, game_uid').in('user_id', userIds);
    if (error) { console.error('Error fetching players:', error); return []; }
    return data || [];
  };

  const handleCancel = async (registrationId: string, tournamentId: string, startDate: string, tournamentMode: string | null) => {
    if (!user) return;
    if (tournamentMode === 'duo' || tournamentMode === 'squad') {
      toast({ title: 'Cannot Exit', description: 'Exit not allowed for duo/squad tournaments.', variant: 'destructive' });
      return;
    }
    const timeDiff = new Date(startDate).getTime() - new Date().getTime();
    if (timeDiff <= 30 * 60 * 1000) {
      toast({ title: 'Cannot Exit', description: 'Cannot exit less than 30 minutes before start.', variant: 'destructive' });
      return;
    }
    setCanceling(registrationId);
    try {
      const { data, error } = await supabase.rpc('process_tournament_exit', { p_user_id: user.id, p_tournament_id: tournamentId });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; refunded_amount?: number };
      if (!result.success) { toast({ title: 'Exit Failed', description: result.error || 'Failed to exit.', variant: 'destructive' }); return; }
      toast({ title: 'Exited', description: `₹${result.refunded_amount || 0} refunded.` });
      fetchRegistrations();
    } catch (error) {
      console.error('Error exiting tournament:', error);
      toast({ title: 'Error', description: 'Failed to exit.', variant: 'destructive' });
    } finally {
      setCanceling(null);
    }
  };

  const upcomingMatches = registrations.filter(r => r.tournaments.status === 'upcoming');
  const liveMatches = registrations.filter(r => r.tournaments.status === 'ongoing');
  const completedMatches = registrations.filter(r => r.tournaments.status === 'completed' || r.tournaments.status === 'cancelled');

  // Compact Local Tournament Card
  const LocalTournamentCard = ({ tournament }: { tournament: LocalTournament }) => {
    const [roomOpen, setRoomOpen] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [exiting, setExiting] = useState(false);

    const copyToClipboard = async (text: string, field: string) => {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: 'Copied!' });
      setTimeout(() => setCopiedField(null), 2000);
    };

    const handleExitLocalTournament = async () => {
      if (!user) return;
      if (tournament.tournament_mode === 'duo' || tournament.tournament_mode === 'squad') {
        toast({ title: 'Cannot Exit', description: 'No exit for team tournaments.', variant: 'destructive' });
        return;
      }
      setExiting(true);
      try {
        const { data, error } = await supabase.rpc('process_local_tournament_exit', { p_tournament_id: tournament.id });
        if (error) throw error;
        const result = data as { success: boolean; error?: string; refunded_amount?: number };
        if (!result.success) { toast({ title: 'Exit Failed', description: result.error, variant: 'destructive' }); return; }
        toast({ title: 'Exited', description: `₹${result.refunded_amount || 0} refunded.` });
        fetchLocalTournaments();
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } finally {
        setExiting(false);
      }
    };

    const hasRoomDetails = tournament.room_id || tournament.room_password;
    const isOngoingOrCompleted = tournament.status === 'ongoing' || tournament.status === 'completed';
    const canExit = tournament.status === 'upcoming' && new Date(tournament.tournament_date) > new Date() && tournament.tournament_mode !== 'duo' && tournament.tournament_mode !== 'squad';

    return (
      <div className="bg-card rounded-lg border border-border p-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-md bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-4 w-4 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <h3 className="font-semibold text-xs line-clamp-1">{tournament.tournament_name}</h3>
                <p className="text-[10px] text-muted-foreground">{tournament.game} • {tournament.tournament_mode}</p>
              </div>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${tournament.status === 'ongoing' ? 'text-green-500 border-green-500/50 animate-pulse' : tournament.status === 'upcoming' ? 'text-blue-500 border-blue-500/50' : 'text-muted-foreground'}`}>
                {tournament.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(tournament.tournament_date), 'MMM dd, hh:mm a')}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">📍 {tournament.institution_name}</p>

            {tournament.status === 'upcoming' && (
              <div className="mt-1.5 p-1.5 bg-primary/10 rounded">
                <CountdownTimer targetDate={tournament.tournament_date} label="Starts:" className="text-primary text-[10px]" />
              </div>
            )}

            {tournament.current_prize_pool && tournament.current_prize_pool > 0 && (
              <div className="flex items-center gap-1 mt-1 text-[10px]">
                <Trophy className="h-2.5 w-2.5 text-yellow-500" />
                <span className="text-yellow-500 font-medium">₹{Math.round(tournament.current_prize_pool)}</span>
              </div>
            )}

            {hasRoomDetails && isOngoingOrCompleted && (
              <Collapsible open={roomOpen} onOpenChange={setRoomOpen} className="mt-2">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full text-[10px] h-6">
                    <Eye className="h-2.5 w-2.5 mr-1" />
                    {roomOpen ? 'Hide' : 'View'} Room
                    <ChevronDown className={`h-2.5 w-2.5 ml-auto transition-transform ${roomOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5 space-y-1.5 p-2 bg-muted/50 rounded text-[10px]">
                  {tournament.room_id && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground">Room ID</p>
                        <p className="font-mono font-medium truncate">{tournament.room_id}</p>
                      </div>
                      <button onClick={() => copyToClipboard(tournament.room_id!, 'Room ID')} className="p-1 hover:bg-muted rounded">
                        {copiedField === 'Room ID' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  )}
                  {tournament.room_password && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground">Password</p>
                        <p className="font-mono font-medium truncate">{tournament.room_password}</p>
                      </div>
                      <button onClick={() => copyToClipboard(tournament.room_password!, 'Password')} className="p-1 hover:bg-muted rounded">
                        {copiedField === 'Password' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Users className="h-2.5 w-2.5" />
                <span>{tournament.joined_users?.length || 0} joined</span>
              </div>
              {canExit && (
                <Button variant="destructive" size="sm" className="text-[10px] h-5 px-2" onClick={handleExitLocalTournament} disabled={exiting}>
                  {exiting ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><LogOut className="h-2.5 w-2.5 mr-0.5" />Exit</>}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Compact Match Card
  const MatchCard = ({ registration, showCancel = false, isCompleted = false }: { registration: Registration; showCancel?: boolean; isCompleted?: boolean }) => {
    const [playersDialogOpen, setPlayersDialogOpen] = useState(false);
    const [roomOpen, setRoomOpen] = useState(false);
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [hasShownConfetti, setHasShownConfetti] = useState(false);
    const [winnerCountdown, setWinnerCountdown] = useState<string | null>(null);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportPlayers, setReportPlayers] = useState<PlayerInfo[]>([]);
    const [loadingReportPlayers, setLoadingReportPlayers] = useState(false);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportForm, setReportForm] = useState({ reported_player_id: '', report_type: 'hack', description: '' });

    const getUserWinnerInfo = () => {
      const pd = registration.tournaments.prize_distribution;
      const winnerId = registration.tournaments.winner_user_id;
      const tournamentMode = registration.tournaments.tournament_mode;
      const teamMembers = registration.team_members || [];
      const isTeamTournament = tournamentMode === 'duo' || tournamentMode === 'squad';
      const isUserInWinningTeam = isTeamTournament && winnerId && teamMembers.includes(winnerId);
      const isUserTheWinner = winnerId === user?.id;
      const isWinningMember = isUserTheWinner || isUserInWinningTeam;
      
      if (!pd) {
        if (isWinningMember) return { position: 1, amount: registration.tournaments.current_prize_pool || 0 };
        return null;
      }
      if (Array.isArray(pd)) {
        const found = pd.find((p: any) => p.user_id === user?.id);
        if (found) return { position: found.position, amount: found.amount };
        if (isTeamTournament && teamMembers.length > 0) {
          const teamWinner = pd.find((p: any) => teamMembers.includes(p.user_id));
          if (teamWinner) return { position: teamWinner.position, amount: teamWinner.amount };
        }
      }
      if (typeof pd === 'object' && !Array.isArray(pd)) {
        if (isWinningMember) {
          const amount = (pd as any)['1'] || (pd as any)[1] || 0;
          return { position: 1, amount };
        }
      }
      return null;
    };

    const userWinnerInfo = getUserWinnerInfo();
    const isWinner = !!userWinnerInfo;
    const winnerPosition = userWinnerInfo?.position;
    const winnerAmount = userWinnerInfo?.amount;
    const endDate = registration.tournaments.end_date ? new Date(registration.tournaments.end_date) : null;
    const winnerDeclarationTime = endDate ? new Date(endDate.getTime() + 30 * 60 * 1000) : null;
    const isAwaitingWinner = registration.tournaments.status === 'completed' && !registration.tournaments.winner_declared_at && winnerDeclarationTime && new Date() < winnerDeclarationTime;
    const isResultNotOut = registration.tournaments.status === 'completed' && !registration.tournaments.winner_declared_at;
    const isCancelled = registration.tournaments.status === 'cancelled';
    const [showCardConfetti, setShowCardConfetti] = useState(false);

    useEffect(() => {
      if (isWinner && registration.tournaments.status === 'completed' && !hasShownConfetti) {
        setShowCardConfetti(true);
        setHasShownConfetti(true);
        const timer = setTimeout(() => setShowCardConfetti(false), 4000);
        return () => clearTimeout(timer);
      }
    }, [isWinner, registration.tournaments.status, hasShownConfetti]);

    useEffect(() => {
      if (!isAwaitingWinner || !winnerDeclarationTime) { setWinnerCountdown(null); return; }
      const updateCountdown = () => {
        const diff = winnerDeclarationTime.getTime() - new Date().getTime();
        if (diff <= 0) { setWinnerCountdown(null); return; }
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setWinnerCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }, [isAwaitingWinner, winnerDeclarationTime]);

    const canReport = () => {
      if (!endDate || registration.tournaments.status !== 'completed') return false;
      if (registration.tournaments.winner_user_id) return false;
      const minutesSinceEnd = differenceInMinutes(new Date(), endDate);
      return minutesSinceEnd >= 0 && minutesSinceEnd < 30;
    };

    const reportTimeRemaining = () => {
      if (!endDate) return null;
      const reportDeadline = new Date(endDate.getTime() + 30 * 60 * 1000);
      const diff = reportDeadline.getTime() - new Date().getTime();
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
        const otherPlayers = registration.tournaments.joined_users.filter(id => id !== user?.id);
        const playerData = await fetchPlayers(otherPlayers);
        setReportPlayers(playerData);
        setLoadingReportPlayers(false);
      }
    };

    const handleSubmitReport = async () => {
      if (!user || !reportForm.reported_player_id || !reportForm.description.trim()) {
        toast({ title: 'Missing Information', description: 'Select a player and provide description.', variant: 'destructive' });
        return;
      }
      setSubmittingReport(true);
      try {
        const { error } = await supabase.from('tournament_reports').insert({
          tournament_id: registration.tournament_id, reporter_id: user.id, reported_player_id: reportForm.reported_player_id, report_type: reportForm.report_type, description: reportForm.description.trim()
        });
        if (error) {
          if (error.code === '42501') { toast({ title: 'Report Window Closed', variant: 'destructive' }); } else { throw error; }
          return;
        }
        toast({ title: 'Report Submitted' });
        setReportDialogOpen(false);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to submit report.', variant: 'destructive' });
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
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: 'Copied!' });
      setTimeout(() => setCopiedField(null), 2000);
    };

    const hasRoomDetails = registration.tournaments.room_id || registration.tournaments.room_password;
    const playerCount = registration.tournaments.joined_users?.length || 0;

    return (
      <div className={`bg-card rounded-lg border p-3 relative overflow-hidden transition-all ${isWinner && registration.tournaments.status === 'completed' ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5' : 'border-border'}`}>
        {showCardConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {[...Array(12)].map((_, i) => {
              const emojis = ['🎉', '✨', '🏆', '⭐', '🎊', '💰'];
              return (
                <div key={i} className="absolute animate-confetti-fall text-sm" style={{ left: `${5 + i * 8}%`, top: '-10px', animationDelay: `${i * 0.12}s` }}>
                  {emojis[i % emojis.length]}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Gamepad2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <h3 className="font-semibold text-xs line-clamp-1">{registration.tournaments.title}</h3>
                <p className="text-[10px] text-muted-foreground">{registration.tournaments.game}</p>
              </div>
              {isWinner && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                  <Crown className="h-2.5 w-2.5 text-yellow-500" />
                  <span className="text-[9px] font-bold text-yellow-600">#{winnerPosition}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(registration.tournaments.start_date), 'MMM dd, hh:mm a')}
            </div>

            {registration.tournaments.status === 'upcoming' && (
              <div className="mt-1.5 p-1.5 bg-primary/10 rounded">
                <CountdownTimer targetDate={registration.tournaments.start_date} label="Starts:" className="text-primary text-[10px]" />
              </div>
            )}

            {isWinner && winnerAmount && winnerAmount > 0 && (
              <div className="mt-1.5 p-1.5 bg-gradient-to-r from-yellow-500/10 to-green-500/10 rounded border border-yellow-500/20">
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-yellow-500" />
                  <span className="text-[10px] font-bold text-green-600">Won ₹{Math.round(winnerAmount)}</span>
                </div>
              </div>
            )}

            {isAwaitingWinner && winnerCountdown && (
              <div className="mt-1.5 p-1.5 bg-blue-500/10 rounded border border-blue-500/20">
                <div className="flex items-center gap-1 text-[10px]">
                  <Clock className="h-2.5 w-2.5 text-blue-500 animate-pulse" />
                  <span className="text-blue-600">Result in {winnerCountdown}</span>
                </div>
              </div>
            )}

            {isResultNotOut && !isAwaitingWinner && !isWinner && (
              <div className="mt-1.5 p-1.5 bg-muted rounded">
                <p className="text-[10px] text-muted-foreground">⏳ Result pending</p>
              </div>
            )}

            {isCancelled && (
              <div className="mt-1.5 p-1.5 bg-orange-500/10 rounded border border-orange-500/20">
                <p className="text-[10px] text-orange-600">Tournament cancelled. Entry refunded.</p>
              </div>
            )}

            {registration.team_name && (
              <div className="mt-1.5 p-1.5 bg-secondary/50 rounded text-[10px]">
                <span className="text-muted-foreground">Team: </span>
                <span className="font-medium">{registration.team_name}</span>
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${
                registration.tournaments.status === 'upcoming' ? 'bg-primary/10 text-primary' 
                : registration.tournaments.status === 'ongoing' ? 'bg-green-500/10 text-green-600 animate-pulse'
                : registration.tournaments.status === 'cancelled' ? 'bg-orange-500/10 text-orange-500'
                : 'bg-muted text-muted-foreground'
              }`}>
                {registration.tournaments.status}
              </Badge>
              {showCancel && registration.tournaments.tournament_mode !== 'duo' && registration.tournaments.tournament_mode !== 'squad' && (
                <button onClick={() => handleCancel(registration.id, registration.tournament_id, registration.tournaments.start_date, registration.tournaments.tournament_mode)} disabled={canceling === registration.id} className="text-destructive text-[10px] flex items-center gap-0.5 disabled:opacity-50">
                  <X className="h-2.5 w-2.5" /> {canceling === registration.id ? '...' : 'Exit'}
                </button>
              )}
            </div>

            {!isCompleted && (
              <div className="mt-2 flex gap-1.5">
                <Button variant="outline" size="sm" onClick={handleViewPlayers} className="flex-1 h-6 text-[10px] gap-1">
                  <Users className="h-2.5 w-2.5 text-blue-500" />Players ({playerCount})
                </Button>
                <Collapsible open={roomOpen} onOpenChange={setRoomOpen} className="flex-1">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full h-6 text-[10px] gap-1">
                      <Eye className="h-2.5 w-2.5 text-emerald-500" />Room
                      <ChevronDown className={`h-2 w-2 ml-auto transition-transform ${roomOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
            )}

            <Collapsible open={roomOpen} onOpenChange={setRoomOpen}>
              <CollapsibleContent className="mt-1.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px]">
                  {hasRoomDetails ? (
                    <div className="space-y-1.5">
                      {registration.tournaments.room_id && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">ID:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-medium text-emerald-600 truncate max-w-[100px]">{registration.tournaments.room_id}</span>
                            <button onClick={() => copyToClipboard(registration.tournaments.room_id!, 'Room ID')} className="p-0.5 hover:bg-emerald-500/20 rounded">
                              {copiedField === 'Room ID' ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5 text-emerald-600" />}
                            </button>
                          </div>
                        </div>
                      )}
                      {registration.tournaments.room_password && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Pass:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-medium text-emerald-600 truncate max-w-[100px]">{registration.tournaments.room_password}</span>
                            <button onClick={() => copyToClipboard(registration.tournaments.room_password!, 'Password')} className="p-0.5 hover:bg-emerald-500/20 rounded">
                              {copiedField === 'Password' ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5 text-emerald-600" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center">Room details coming soon</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {isCompleted && canReport() && (
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={handleOpenReport} className="w-full h-6 text-[10px] gap-1 border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30">
                  <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                  <span className="text-red-600">Report ({reportTimeRemaining()})</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <Dialog open={playersDialogOpen} onOpenChange={setPlayersDialogOpen}>
          <DialogContent className="max-w-xs max-h-[70vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-500" />Players ({playerCount})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 max-h-[45vh] overflow-y-auto">
              {loadingPlayers ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : players.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No players</p>
              ) : (
                players.map((player, idx) => (
                  <div key={player.user_id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-semibold text-[10px]">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{player.in_game_name || 'Unknown'}</p>
                      <p className="text-[10px] text-muted-foreground">UID: {player.game_uid || 'N/A'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4" />Report Player
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-[10px] text-amber-700 dark:text-amber-400">
                ⚠️ False reports may result in action against your account.
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Select Player *</Label>
                {loadingReportPlayers ? (
                  <div className="flex items-center justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
                ) : (
                  <Select value={reportForm.reported_player_id} onValueChange={(v) => setReportForm(prev => ({ ...prev, reported_player_id: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose player..." /></SelectTrigger>
                    <SelectContent>
                      {reportPlayers.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id} className="text-xs">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />{p.in_game_name || 'Unknown'}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Report Type *</Label>
                <Select value={reportForm.report_type} onValueChange={(v) => setReportForm(prev => ({ ...prev, report_type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hack" className="text-xs">🎮 Hacking</SelectItem>
                    <SelectItem value="exploit" className="text-xs">⚠️ Exploit</SelectItem>
                    <SelectItem value="teaming" className="text-xs">🤝 Teaming</SelectItem>
                    <SelectItem value="toxic" className="text-xs">💬 Toxic</SelectItem>
                    <SelectItem value="other" className="text-xs">📝 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description *</Label>
                <Textarea placeholder="Describe what happened..." value={reportForm.description} onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className="resize-none text-xs" />
              </div>
              <Button className="w-full h-8 text-xs bg-red-600 hover:bg-red-700" onClick={handleSubmitReport} disabled={submittingReport || !reportForm.reported_player_id || !reportForm.description.trim()}>
                {submittingReport ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="My Matches" showBack>
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  // Apple Glass Tab Component - Rectangle Shape with theme support
  const GlassTab = ({ value, label, count, isActive, onClick, icon: Icon, accentColor }: {
    value: string;
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }) => (
    <button
      onClick={onClick}
      className={`
        relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all duration-300 ease-out min-w-0
        border shadow-sm
        ${isActive 
          ? 'bg-primary/20 dark:bg-white/20 backdrop-blur-xl border-primary/30 dark:border-white/30 scale-[1.02] shadow-lg' 
          : 'bg-card/80 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10 hover:bg-primary/10 dark:hover:bg-white/10 hover:border-primary/20 dark:hover:border-white/20'
        }
      `}
    >
      {/* Glow effect for active tab */}
      {isActive && (
        <div 
          className="absolute inset-0 rounded-lg opacity-30 blur-sm"
          style={{ background: `linear-gradient(135deg, ${accentColor}40, transparent 60%)` }}
        />
      )}
      
      {/* Icon */}
      <div className={`relative z-10 p-1.5 rounded-md transition-all duration-300 ${isActive ? 'bg-primary/20 dark:bg-white/20' : 'bg-muted dark:bg-white/5'}`}>
        <Icon className={`h-3 w-3 transition-colors duration-300 ${isActive ? 'text-primary dark:text-white' : 'text-muted-foreground'}`} />
      </div>
      
      {/* Label & Count in a row */}
      <div className="relative z-10 flex items-center gap-1.5">
        <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? 'text-primary dark:text-white' : 'text-muted-foreground'}`}>
          {label}
        </span>
        <div className={`
          min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[8px] font-bold transition-all duration-300
          ${isActive 
            ? 'bg-primary/30 dark:bg-white/30 text-primary dark:text-white shadow-inner' 
            : 'bg-muted dark:bg-white/10 text-muted-foreground'
          }
        `}>
          {count}
        </div>
      </div>
      
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary dark:bg-white shadow-lg" />
      )}
    </button>
  );

  const tabs = [
    { value: 'upcoming', label: 'Upcoming', count: upcomingMatches.length, icon: Clock, accentColor: '#3b82f6' },
    { value: 'live', label: 'Live', count: liveMatches.length, icon: Gamepad2, accentColor: '#22c55e' },
    { value: 'completed', label: 'Done', count: completedMatches.length, icon: Trophy, accentColor: '#f59e0b' },
    { value: 'local', label: 'Local', count: localTournaments.length + schoolTournaments.length, icon: MapPin, accentColor: '#f97316' },
  ];

  return (
    <AppLayout title="My Matches" showBack>
      <div className="p-3">
        {/* Apple Glass Effect Tabs Container */}
        <div className="relative mb-4">
          {/* Glass background container */}
          <div 
            className="relative p-1.5 rounded-2xl overflow-hidden bg-card/50 dark:bg-transparent border border-border dark:border-white/15 shadow-md"
            style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Inner glass reflection */}
            <div 
              className="absolute top-0 left-0 right-0 h-1/2 rounded-t-xl pointer-events-none opacity-50 dark:opacity-100"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
              }}
            />
            
            {/* Tabs Grid - Rectangle layout */}
            <div className="relative z-10 grid grid-cols-2 gap-1.5">
              {tabs.map((tab) => (
                <GlassTab
                  key={tab.value}
                  value={tab.value}
                  label={tab.label}
                  count={tab.count}
                  isActive={activeTab === tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  icon={tab.icon}
                  accentColor={tab.accentColor}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="animate-fade-in">
          {activeTab === 'upcoming' && (
            <>
              {upcomingMatches.length === 0 ? (
                <div className="text-center py-10">
                  <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-xs">No upcoming matches</p>
                  <Button variant="gaming" size="sm" className="mt-3 h-7 text-xs" onClick={() => navigate('/creator')}>Browse</Button>
                </div>
              ) : (
                <div className="space-y-2">{upcomingMatches.map((reg) => <MatchCard key={reg.id} registration={reg} showCancel />)}</div>
              )}
            </>
          )}

          {activeTab === 'live' && (
            <>
              {liveMatches.length === 0 ? (
                <div className="text-center py-10">
                  <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-xs">No live matches</p>
                </div>
              ) : (
                <div className="space-y-2">{liveMatches.map((reg) => <MatchCard key={reg.id} registration={reg} />)}</div>
              )}
            </>
          )}

          {activeTab === 'completed' && (
            <>
              {completedMatches.length === 0 ? (
                <div className="text-center py-10">
                  <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-xs">No completed matches</p>
                </div>
              ) : (
                <div className="space-y-2">{completedMatches.map((reg) => <MatchCard key={reg.id} registration={reg} isCompleted />)}</div>
              )}
            </>
          )}

          {activeTab === 'local' && (
            <>
              {localTournaments.length === 0 && schoolTournaments.length === 0 ? (
                <div className="text-center py-10">
                  <QrCode className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-xs">No local tournaments</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">Scan QR to join</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {schoolTournaments.map((st) => <SchoolTournamentPlayerCard key={st.team.id} tournament={st.tournament} team={st.team} userId={user?.id || ''} />)}
                  {localTournaments.map((lt) => <LocalTournamentCard key={lt.id} tournament={lt} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default MyMatch;
