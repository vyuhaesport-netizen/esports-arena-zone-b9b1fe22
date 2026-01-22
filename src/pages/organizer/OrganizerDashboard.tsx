import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Plus, 
  Loader2, 
  Trophy,
  Edit2,
  Gamepad2,
  Users,
  Wallet,
  TrendingUp,
  ArrowLeft,
  Award,
  Key,
  Lock,
  Eye,
  Clock,
  Play,
  Square,
  XCircle,
  FileWarning,
  MessageCircle,
  Youtube,
  Instagram,
  FileText,
  Gift
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import PrizeDistributionInput from '@/components/PrizeDistributionInput';
import CountdownTimer from '@/components/CountdownTimer';
import { generateDashboardGuidePDF } from '@/utils/pdfGenerator';

interface Tournament {
  id: string;
  title: string;
  game: string;
  description: string | null;
  prize_pool: string | null;
  entry_fee: number | null;
  max_participants: number | null;
  start_date: string;
  end_date: string | null;
  status: string | null;
  joined_users: string[] | null;
  organizer_earnings: number | null;
  current_prize_pool: number | null;
  winner_user_id: string | null;
  winner_declared_at: string | null;
  room_id: string | null;
  room_password: string | null;
  tournament_mode: string | null;
  prize_distribution: any;
}

interface PlayerProfile {
  user_id: string;
  username: string | null;
  in_game_name: string | null;
  avatar_url: string | null;
  email: string;
  game_uid: string | null;
  team_name?: string | null;
}

const OrganizerDashboard = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [playersDialogOpen, setPlayersDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [joinedPlayers, setJoinedPlayers] = useState<PlayerProfile[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [winnerPositions, setWinnerPositions] = useState<{[key: string]: number}>({});
  const [teamPositions, setTeamPositions] = useState<{[teamName: string]: number}>({});
  const [roomData, setRoomData] = useState({ room_id: '', room_password: '' });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [editablePrizeDistribution, setEditablePrizeDistribution] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    title: '',
    game: 'BGMI',
    description: '',
    entry_fee: '',
    max_participants: '100',
    start_date: '',
    status: 'upcoming',
    tournament_mode: 'solo',
    prize_distribution: '',
    prize_pool: '',
    youtube_link: '',
    instagram_link: '',
    is_giveaway: false,
    giveaway_prize_pool: '',
  });
  const [organizerWalletBalance, setOrganizerWalletBalance] = useState(0);
  const [commissionSettings, setCommissionSettings] = useState({
    organizer_percent: 10,
    platform_percent: 10,
    prize_pool_percent: 80,
  });

  const { user, isOrganizer, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isOrganizer) {
        navigate('/profile');
        toast({ title: 'Access Denied', description: 'You are not an approved organizer.', variant: 'destructive' });
      }
    }
  }, [user, isOrganizer, authLoading, navigate, toast]);

  useEffect(() => {
    if (isOrganizer && user) {
      fetchMyTournaments();
      fetchCommissionSettings();
      fetchOrganizerBalance();
    }
  }, [isOrganizer, user]);

  const fetchOrganizerBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('user_id', user.id)
      .single();
    setOrganizerWalletBalance(data?.wallet_balance || 0);
  };

  const fetchCommissionSettings = async () => {
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value');
      
      if (data) {
        const settings: any = {};
        data.forEach((s) => {
          if (s.setting_key === 'organizer_commission_percent') settings.organizer_percent = parseFloat(s.setting_value);
          if (s.setting_key === 'platform_commission_percent') settings.platform_percent = parseFloat(s.setting_value);
          if (s.setting_key === 'prize_pool_percent') settings.prize_pool_percent = parseFloat(s.setting_value);
        });
        if (Object.keys(settings).length > 0) {
          setCommissionSettings(prev => ({ ...prev, ...settings }));
        }
      }
    } catch (error) {
      console.error('Error fetching commission settings:', error);
    }
  };

  const fetchMyTournaments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);

      const earnings = (data || []).reduce((sum, t) => sum + (t.organizer_earnings || 0), 0);
      setTotalEarnings(earnings);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      game: 'BGMI',
      description: '',
      entry_fee: '',
      max_participants: '100',
      start_date: '',
      status: 'upcoming',
      tournament_mode: 'solo',
      prize_distribution: '',
      prize_pool: '',
      youtube_link: '',
      instagram_link: '',
      is_giveaway: false,
      giveaway_prize_pool: '',
    });
    setSelectedTournament(null);
  };

  const getPrizePool = () => {
    return parseFloat(formData.prize_pool) || 0;
  };

  const handleSave = async () => {
    if (!formData.title || !formData.game || !formData.start_date) {
      toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }

    // Validate giveaway requirements
    if (formData.is_giveaway) {
      const giveawayPrize = parseFloat(formData.giveaway_prize_pool) || 0;
      if (giveawayPrize < 10) {
        toast({ title: 'Error', description: 'Giveaway prize pool must be at least ₹10.', variant: 'destructive' });
        return;
      }
      if (giveawayPrize > organizerWalletBalance) {
        toast({ 
          title: 'Insufficient Balance', 
          description: `You need ₹${giveawayPrize} in your wallet for this giveaway. Current balance: ₹${organizerWalletBalance}`, 
          variant: 'destructive' 
        });
        return;
      }
    }

    setSaving(true);

    try {
      // Parse prize distribution JSON
      let prizeDistribution = null;
      if (formData.prize_distribution) {
        try {
          prizeDistribution = JSON.parse(formData.prize_distribution);
        } catch {
          toast({ title: 'Invalid Prize Distribution', description: 'Please enter valid JSON format.', variant: 'destructive' });
          setSaving(false);
          return;
        }
      }

      const entryFee = formData.is_giveaway ? 0 : (parseFloat(formData.entry_fee) || 0);
      const maxParticipants = parseInt(formData.max_participants) || 100;
      const prizePoolValue = formData.is_giveaway 
        ? parseFloat(formData.giveaway_prize_pool) || 0 
        : parseFloat(formData.prize_pool) || 0;

      const tournamentData = {
        title: formData.title,
        game: formData.game,
        description: formData.description || null,
        prize_pool: `₹${prizePoolValue.toLocaleString()}`,
        entry_fee: entryFee,
        max_participants: maxParticipants,
        start_date: new Date(formData.start_date).toISOString(),
        status: formData.status,
        created_by: user?.id,
        tournament_type: 'organizer',
        tournament_mode: formData.tournament_mode,
        prize_distribution: prizeDistribution,
        youtube_link: formData.youtube_link || null,
        instagram_link: formData.instagram_link || null,
        is_giveaway: formData.is_giveaway,
        giveaway_prize_pool: formData.is_giveaway ? prizePoolValue : null,
        current_prize_pool: formData.is_giveaway ? prizePoolValue : 0,
      };

      if (selectedTournament) {
        const { error } = await supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('id', selectedTournament.id);

        if (error) throw error;
        toast({ title: 'Updated!', description: 'Tournament updated successfully.' });
      } else {
        // Insert tournament first
        const { data: newTournament, error } = await supabase
          .from('tournaments')
          .insert(tournamentData)
          .select('id')
          .single();

        if (error) throw error;

        // If giveaway with prize pool > 0, process wallet deduction
        if (formData.is_giveaway && newTournament) {
          const giveawayPrize = parseFloat(formData.giveaway_prize_pool) || 0;
          
          // Only process wallet deduction if prize pool > 0
          if (giveawayPrize > 0) {
            const { data: giveawayResult, error: giveawayError } = await supabase.rpc('process_giveaway_tournament_creation' as any, {
              p_organizer_id: user?.id,
              p_prize_pool: giveawayPrize,
              p_tournament_id: newTournament.id,
            });

            if (giveawayError) {
              // Delete the tournament if giveaway processing failed
              await supabase.from('tournaments').delete().eq('id', newTournament.id);
              toast({ title: 'Error', description: giveawayError.message || 'Failed to lock prize pool.', variant: 'destructive' });
              setSaving(false);
              return;
            }

            const result = giveawayResult as { success: boolean; error?: string };
            if (!result.success) {
              // Delete the tournament if giveaway processing failed
              await supabase.from('tournaments').delete().eq('id', newTournament.id);
              toast({ title: 'Error', description: result.error || 'Failed to lock prize pool.', variant: 'destructive' });
              setSaving(false);
              return;
            }

            fetchOrganizerBalance();
          }
        }

        // Notify followers
        const { data: followers } = await supabase
          .from('follows')
          .select('follower_user_id')
          .eq('following_user_id', user?.id);

        if (followers && followers.length > 0) {
          const notifications = followers.map(f => ({
            user_id: f.follower_user_id,
            type: 'new_tournament',
            title: formData.is_giveaway ? '🎁 New Giveaway Tournament!' : 'New Tournament!',
            message: `New ${formData.is_giveaway ? 'giveaway ' : ''}tournament "${formData.title}" has been created.${formData.is_giveaway ? ' Join for just ₹1!' : ''}`,
          }));

          await supabase.from('notifications').insert(notifications);
        }

        toast({ 
          title: formData.is_giveaway ? '🎁 Giveaway Created!' : 'Created!', 
          description: formData.is_giveaway 
            ? `₹${formData.giveaway_prize_pool} locked from your wallet. Players pay just ₹1 to join!`
            : 'Tournament created successfully.' 
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchMyTournaments();
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast({ title: 'Error', description: 'Failed to save tournament.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openCancelDialog = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const handleCancelTournament = async () => {
    if (!selectedTournament || !user) return;
    
    if (!cancelReason.trim()) {
      toast({ title: 'Error', description: 'Please provide a cancellation reason.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('process_tournament_cancellation', {
        p_tournament_id: selectedTournament.id,
        p_organizer_id: user.id,
        p_cancellation_reason: cancelReason.trim(),
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; refunded_players?: number; total_refunded?: number; message?: string };

      if (!result.success) {
        toast({ title: 'Error', description: result.error || 'Failed to cancel tournament.', variant: 'destructive' });
        return;
      }

      toast({ 
        title: 'Tournament Cancelled', 
        description: `${result.refunded_players || 0} players refunded ₹${result.total_refunded || 0} total.` 
      });
      setCancelDialogOpen(false);
      fetchMyTournaments();
    } catch (error) {
      console.error('Error cancelling tournament:', error);
      toast({ title: 'Error', description: 'Failed to cancel tournament.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEditRoom = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setRoomData({
      room_id: tournament.room_id || '',
      room_password: tournament.room_password || '',
    });
    setRoomDialogOpen(true);
  };

  const handleSaveRoom = async () => {
    if (!selectedTournament) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          room_id: roomData.room_id || null,
          room_password: roomData.room_password || null,
        })
        .eq('id', selectedTournament.id);

      if (error) throw error;

      toast({ title: 'Saved!', description: 'Room details updated.' });
      setRoomDialogOpen(false);
      fetchMyTournaments();
    } catch (error) {
      console.error('Error saving room:', error);
      toast({ title: 'Error', description: 'Failed to save room details.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openViewPlayers = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setPlayersDialogOpen(true);
    setLoadingPlayers(true);

    try {
      const userIds = tournament.joined_users || [];
      if (userIds.length > 0) {
        // Fetch profiles with game_uid
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, username, in_game_name, avatar_url, email, game_uid')
          .in('user_id', userIds);

        // Fetch team names from tournament_registrations for duo/squad
        const { data: registrations } = await supabase
          .from('tournament_registrations')
          .select('user_id, team_name')
          .eq('tournament_id', tournament.id);

        if (!profilesError && profilesData) {
          // Merge team_name into player data
          const playersWithTeams = profilesData.map(player => {
            const registration = registrations?.find(r => r.user_id === player.user_id);
            return {
              ...player,
              team_name: registration?.team_name || null
            };
          });
          setJoinedPlayers(playersWithTeams);
        }
      } else {
        setJoinedPlayers([]);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const canDeclareWinner = (tournament: Tournament): { canDeclare: boolean; minutesRemaining: number; targetDate: Date | null } => {
    // Can only declare winner for completed tournaments that haven't had winners declared yet
    // Use winner_declared_at instead of winner_user_id since team tournaments may not set winner_user_id
    if (tournament.status !== 'completed' || tournament.winner_declared_at) {
      return { canDeclare: false, minutesRemaining: 0, targetDate: null };
    }
    
    if (!tournament.end_date) {
      // If no end_date, use start_date + 2 hours as default end
      const endTime = new Date(tournament.start_date);
      endTime.setHours(endTime.getHours() + 2);
      const targetDate = new Date(endTime.getTime() + 30 * 60 * 1000);
      const now = new Date();
      const minutesSinceEnd = differenceInMinutes(now, endTime);
      return { canDeclare: minutesSinceEnd >= 30, minutesRemaining: Math.max(0, 30 - minutesSinceEnd), targetDate };
    }
    
    const endTime = new Date(tournament.end_date);
    const targetDate = new Date(endTime.getTime() + 30 * 60 * 1000);
    const now = new Date();
    const minutesSinceEnd = differenceInMinutes(now, endTime);
    return { canDeclare: minutesSinceEnd >= 30, minutesRemaining: Math.max(0, 30 - minutesSinceEnd), targetDate };
  };

  const openDeclareWinner = async (tournament: Tournament) => {
    const { canDeclare, minutesRemaining } = canDeclareWinner(tournament);
    
    if (!canDeclare) {
      toast({ 
        title: 'Please Wait', 
        description: `You can declare winner after ${minutesRemaining} minutes.`, 
        variant: 'destructive' 
      });
      return;
    }

    setSelectedTournament(tournament);
    setWinnerPositions({});
    setTeamPositions({});
    setEditablePrizeDistribution(tournament.prize_distribution as Record<string, number> || {});
    setWinnerDialogOpen(true);
    setLoadingPlayers(true);

    try {
      const userIds = tournament.joined_users || [];
      if (userIds.length > 0) {
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('user_id, username, in_game_name, avatar_url, email, game_uid')
          .in('user_id', userIds);

        const { data: registrations } = await supabase
          .from('tournament_registrations')
          .select('user_id, team_name')
          .eq('tournament_id', tournament.id);

        if (!error && profilesData) {
          const playersWithTeams = profilesData.map(player => {
            const registration = registrations?.find(r => r.user_id === player.user_id);
            return {
              ...player,
              team_name: registration?.team_name || null
            };
          });
          setJoinedPlayers(playersWithTeams);
        }
      } else {
        setJoinedPlayers([]);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleDeclareWinners = async () => {
    if (!selectedTournament || !user) return;
    
    const isTeamMode = selectedTournament.tournament_mode === 'duo' || selectedTournament.tournament_mode === 'squad';
    
    if (isTeamMode) {
      // Team-based winner declaration
      const teamsAssigned = Object.keys(teamPositions).length;
      if (teamsAssigned === 0) {
        toast({ title: 'Error', description: 'Please assign at least one team position.', variant: 'destructive' });
        return;
      }

      setSaving(true);

      try {
        const { data, error } = await supabase.rpc('process_team_winner_declaration', {
          p_tournament_id: selectedTournament.id,
          p_organizer_id: user.id,
          p_team_positions: teamPositions,
        });

        if (error) throw error;

        const result = data as { 
          success: boolean; 
          error?: string; 
          total_distributed?: number;
          organizer_earnings?: number;
        };

        if (!result.success) {
          toast({ 
            title: 'Cannot Declare Winners', 
            description: result.error || 'Failed to declare winners.', 
            variant: 'destructive' 
          });
          return;
        }

        toast({ 
          title: 'Team Winners Declared!', 
          description: `Prizes distributed equally among team members. You earned ₹${result.organizer_earnings?.toFixed(0) || 0} commission.` 
        });
        setWinnerDialogOpen(false);
        fetchMyTournaments();
      } catch (error) {
        console.error('Error declaring team winners:', error);
        toast({ title: 'Error', description: 'Failed to declare winners.', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    } else {
      // Solo tournament - individual winner declaration
      const positionsAssigned = Object.keys(winnerPositions).length;
      if (positionsAssigned === 0) {
        toast({ title: 'Error', description: 'Please assign at least one winner position.', variant: 'destructive' });
        return;
      }

      setSaving(true);

      try {
        const { data, error } = await supabase.rpc('process_winner_declaration', {
          p_tournament_id: selectedTournament.id,
          p_organizer_id: user.id,
          p_winner_positions: winnerPositions,
        });

        if (error) throw error;

        const result = data as { 
          success: boolean; 
          error?: string; 
          total_distributed?: number;
          organizer_earnings?: number;
        };

        if (!result.success) {
          toast({ 
            title: 'Cannot Declare Winners', 
            description: result.error || 'Failed to declare winners.', 
            variant: 'destructive' 
          });
          return;
        }

        toast({ 
          title: 'Winners Declared!', 
          description: `Prizes distributed. You earned ₹${result.organizer_earnings?.toFixed(0) || 0} commission.` 
        });
        setWinnerDialogOpen(false);
        fetchMyTournaments();
      } catch (error) {
        console.error('Error declaring winners:', error);
        toast({ title: 'Error', description: 'Failed to declare winners.', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-600';
      case 'ongoing': return 'bg-green-500/10 text-green-600';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted';
    }
  };

  // Check if tournament can be started (start_date has passed)
  const canStartTournament = (tournament: Tournament): boolean => {
    if (tournament.status !== 'upcoming') return false;
    const startTime = new Date(tournament.start_date);
    const now = new Date();
    return now >= startTime;
  };

  // Handle starting a tournament
  const handleStartTournament = async (tournament: Tournament) => {
    // Validate room ID is set before starting
    if (!tournament.room_id || tournament.room_id.trim() === '') {
      toast({ 
        title: 'Room ID Required', 
        description: 'Please set the Room ID before starting the tournament. Players need this to join the game.', 
        variant: 'destructive' 
      });
      openEditRoom(tournament);
      return;
    }

    if (!confirm('Start this tournament? This will recalculate the prize pool based on actual participants.')) return;

    setSaving(true);
    try {
      // First recalculate the prize pool
      const { error: recalcError } = await supabase.rpc('recalculate_tournament_prizepool', {
        p_tournament_id: tournament.id
      });
      if (recalcError) console.error('Recalculation error:', recalcError);

      // Update status to ongoing
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'ongoing' })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({ title: 'Tournament Started!', description: 'Prize pool has been recalculated and tournament is now live.' });
      fetchMyTournaments();
    } catch (error) {
      console.error('Error starting tournament:', error);
      toast({ title: 'Error', description: 'Failed to start tournament.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Handle ending a tournament
  const handleEndTournament = async (tournament: Tournament) => {
    if (!confirm('End this tournament? Players will see it in the completed section.')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ 
          status: 'completed',
          end_date: new Date().toISOString()
        })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({ title: 'Tournament Ended!', description: 'You can declare winners after 30 minutes.' });
      fetchMyTournaments();
    } catch (error) {
      console.error('Error ending tournament:', error);
      toast({ title: 'Error', description: 'Failed to end tournament.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate('/organizer')} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-lg" />
          <div>
            <h1 className="font-bold">Tournament Management</h1>
            <p className="text-xs text-muted-foreground">Create and manage tournaments</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Tournaments</span>
              </div>
              <p className="text-2xl font-bold">{tournaments.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Earnings</span>
              </div>
              <p className="text-2xl font-bold text-green-500">₹{totalEarnings.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Commission Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Commission Split</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-background rounded-lg">
                <p className="text-lg font-bold text-primary">{commissionSettings.organizer_percent}%</p>
                <p className="text-[10px] text-muted-foreground">Your Share</p>
              </div>
              <div className="p-2 bg-background rounded-lg">
                <p className="text-lg font-bold text-blue-500">{commissionSettings.platform_percent}%</p>
                <p className="text-[10px] text-muted-foreground">Platform</p>
              </div>
              <div className="p-2 bg-background rounded-lg">
                <p className="text-lg font-bold text-green-500">{commissionSettings.prize_pool_percent}%</p>
                <p className="text-[10px] text-muted-foreground">Prize Pool</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="gaming" className="flex-1" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Create Tournament
          </Button>
          <Button 
            variant="outline" 
            className="flex-shrink-0"
            onClick={() => generateDashboardGuidePDF('organizer')}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>

        {/* Tournament List - Active */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            Active Tournaments
          </h2>

          {(() => {
            const activeTournaments = tournaments.filter(t => t.status === 'upcoming' || t.status === 'ongoing' || (t.status === 'completed' && !t.winner_declared_at));
            
            if (activeTournaments.length === 0) {
              return (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-sm">No active tournaments</p>
                  </CardContent>
                </Card>
              );
            }
            
            return activeTournaments.map((t) => {
              const { canDeclare, minutesRemaining, targetDate } = canDeclareWinner(t);
              
              return (
                <Card key={t.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-purple-500/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{t.title}</h3>
                          <p className="text-xs text-muted-foreground">{t.game}</p>
                        </div>
                        <Badge className={`text-[10px] ${getStatusColor(t.status)}`}>
                          {t.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-4 gap-2 text-center mb-3">
                        <div>
                          <p className="text-sm font-bold text-primary">₹{Math.round(t.current_prize_pool || 0)}</p>
                          <p className="text-[9px] text-muted-foreground">Prize</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold">₹{Math.round(t.entry_fee || 0)}</p>
                          <p className="text-[9px] text-muted-foreground">Entry</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-blue-500">{t.joined_users?.length || 0}/{t.max_participants}</p>
                          <p className="text-[9px] text-muted-foreground">Players</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-green-500">₹{Math.round(t.organizer_earnings || 0)}</p>
                          <p className="text-[9px] text-muted-foreground">Earned</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openViewPlayers(t)}>
                          <Users className="h-3.5 w-3.5 mr-1" /> Players
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditRoom(t)}>
                          <Key className="h-3.5 w-3.5 mr-1" /> Room
                        </Button>
                        {t.status === 'upcoming' && (
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedTournament(t);
                            setFormData({
                              title: t.title,
                              game: t.game,
                              description: t.description || '',
                              entry_fee: t.entry_fee?.toString() || '',
                              max_participants: t.max_participants?.toString() || '100',
                              start_date: format(new Date(t.start_date), "yyyy-MM-dd'T'HH:mm"),
                              status: t.status || 'upcoming',
                              tournament_mode: t.tournament_mode || 'solo',
                              prize_distribution: t.prize_distribution ? JSON.stringify(t.prize_distribution) : '',
                              prize_pool: t.prize_pool?.replace(/[₹,]/g, '') || '',
                              youtube_link: (t as any).youtube_link || '',
                              instagram_link: (t as any).instagram_link || '',
                              is_giveaway: (t as any).is_giveaway || false,
                              giveaway_prize_pool: (t as any).giveaway_prize_pool?.toString() || '',
                            });
                            setDialogOpen(true);
                          }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* Cancel Tournament - for upcoming or ongoing */}
                        {(t.status === 'upcoming' || t.status === 'ongoing') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive border-destructive/50 hover:bg-destructive/10"
                            onClick={() => openCancelDialog(t)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Start/End Tournament Buttons */}
                      {t.status === 'upcoming' && canStartTournament(t) && (
                        <Button 
                          className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-500"
                          size="sm"
                          onClick={() => handleStartTournament(t)}
                          disabled={saving}
                        >
                          <Play className="h-4 w-4 mr-2" /> Start Tournament
                        </Button>
                      )}

                      {t.status === 'ongoing' && (
                        <Button 
                          className="w-full mt-2 bg-gradient-to-r from-red-500 to-rose-500"
                          size="sm"
                          onClick={() => handleEndTournament(t)}
                          disabled={saving}
                        >
                          <Square className="h-4 w-4 mr-2" /> End Tournament
                        </Button>
                      )}

                      {/* Winner Declaration - Only after tournament is ended and 30 min passed */}
                      {t.status === 'completed' && !t.winner_declared_at && (
                        <div className="mt-2">
                          {!canDeclare && targetDate && (
                            <div className="mb-2 p-2 bg-amber-500/10 rounded-lg text-center">
                              <p className="text-xs text-amber-600 mb-1">Winner declaration available in:</p>
                              <CountdownTimer 
                                targetDate={targetDate}
                                className="text-amber-600 justify-center font-semibold"
                                showIcon={false}
                              />
                            </div>
                          )}
                          <Button 
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                            size="sm"
                            onClick={() => openDeclareWinner(t)}
                            disabled={!canDeclare}
                          >
                            {canDeclare ? (
                              <>
                                <Award className="h-4 w-4 mr-2" /> Declare Winners
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 mr-2" /> Wait {minutesRemaining}m
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {t.winner_declared_at && (
                        <div className="mt-2 p-2 bg-green-500/10 rounded-lg text-center">
                          <p className="text-xs text-green-600 font-medium">
                            ✓ Winners declared on {format(new Date(t.winner_declared_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            });
          })()}
        </div>

        {/* Completed Tournaments Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-500" />
            Completed Tournaments
          </h2>

          {(() => {
            const completedTournaments = tournaments.filter(t => t.status === 'completed' && t.winner_declared_at);
            
            if (completedTournaments.length === 0) {
              return (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-sm">No completed tournaments yet</p>
                  </CardContent>
                </Card>
              );
            }
            
            return completedTournaments.map((t) => (
              <Card key={t.id} className="overflow-hidden opacity-80">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-border bg-gradient-to-r from-green-500/5 to-emerald-500/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{t.title}</h3>
                        <p className="text-xs text-muted-foreground">{t.game} • {t.tournament_mode}</p>
                      </div>
                      <Badge className="text-[10px] bg-green-500/10 text-green-600">
                        Completed
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2 text-center mb-3">
                      <div>
                        <p className="text-sm font-bold text-primary">₹{Math.round(t.current_prize_pool || 0)}</p>
                        <p className="text-[9px] text-muted-foreground">Prize</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold">₹{Math.round(t.entry_fee || 0)}</p>
                        <p className="text-[9px] text-muted-foreground">Entry</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-blue-500">{t.joined_users?.length || 0}</p>
                        <p className="text-[9px] text-muted-foreground">Players</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-500">₹{Math.round(t.organizer_earnings || 0)}</p>
                        <p className="text-[9px] text-muted-foreground">Earned</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openViewPlayers(t)}>
                        <Users className="h-3.5 w-3.5 mr-1" /> Players
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditRoom(t)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Room
                      </Button>
                    </div>

                    {t.winner_declared_at && (
                      <div className="mt-2 p-2 bg-green-500/10 rounded-lg text-center">
                        <p className="text-xs text-green-600 font-medium">
                          ✓ Winners declared on {format(new Date(t.winner_declared_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ));
          })()}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold">
              {selectedTournament ? 'Edit Tournament' : 'Create Tournament'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Giveaway Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                <div>
                  <p className="font-medium text-sm">Giveaway Tournament</p>
                  <p className="text-xs text-muted-foreground">You pay the prize pool, players join free</p>
                </div>
              </div>
              <Switch
                checked={formData.is_giveaway}
                onCheckedChange={(checked) => setFormData({ ...formData, is_giveaway: checked, entry_fee: checked ? '0' : formData.entry_fee })}
              />
            </div>

            {formData.is_giveaway && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Your Wallet Balance:</span>
                  <span className="font-bold text-primary">₹{organizerWalletBalance}</span>
                </div>
                <div className="space-y-2">
                  <Label>Prize Pool (₹) - Deducted from your wallet *</Label>
                  <Input
                    type="number"
                    value={formData.giveaway_prize_pool}
                    onChange={(e) => setFormData({ ...formData, giveaway_prize_pool: e.target.value })}
                    placeholder="Enter prize amount"
                    className="bg-background"
                  />
                </div>
                <p className="text-xs text-amber-600">
                  ⚠️ This amount will be deducted from your wallet when tournament is created.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Tournament title" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Game *</Label>
                <Select value={formData.game} onValueChange={(value) => {
                  const maxPlayers = value === 'BGMI' ? '100' : value === 'Free Fire' ? '50' : '100';
                  const entryFee = parseFloat(formData.entry_fee) || 0;
                  const autoPool = Math.round(entryFee * parseInt(maxPlayers) * (commissionSettings.prize_pool_percent / 100));
                  setFormData({ ...formData, game: value, max_participants: maxPlayers, prize_pool: autoPool.toString() });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BGMI">BGMI (Max 100)</SelectItem>
                    <SelectItem value="Free Fire">Free Fire (Max 50)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={formData.tournament_mode} onValueChange={(value) => setFormData({ ...formData, tournament_mode: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="duo">Duo</SelectItem>
                    <SelectItem value="squad">Squad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Entry Fee and Max Participants */}
            <div className="grid grid-cols-2 gap-3">
              {!formData.is_giveaway && (
                <div className="space-y-2">
                  <Label>Entry Fee (₹)</Label>
                  <Input 
                    type="number" 
                    value={formData.entry_fee} 
                    onChange={(e) => {
                      const newEntryFee = e.target.value;
                      const maxP = parseInt(formData.max_participants) || 100;
                      const autoPool = Math.round((parseFloat(newEntryFee) || 0) * maxP * (commissionSettings.prize_pool_percent / 100));
                      setFormData({ ...formData, entry_fee: newEntryFee, prize_pool: autoPool.toString() });
                    }} 
                    placeholder="0" 
                  />
                </div>
              )}
              {formData.is_giveaway && (
                <div className="space-y-2">
                  <Label>Entry Fee</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border border-input bg-green-500/10">
                    <span className="text-green-600 font-medium">FREE (Giveaway)</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Max Participants</Label>
                <Input 
                  type="number" 
                  value={formData.max_participants} 
                  onChange={(e) => {
                    const maxLimit = formData.game === 'BGMI' ? 100 : formData.game === 'Free Fire' ? 50 : 100;
                    let newMaxP = parseInt(e.target.value) || 0;
                    if (newMaxP > maxLimit) newMaxP = maxLimit;
                    const entryFee = parseFloat(formData.entry_fee) || 0;
                    const autoPool = Math.round(entryFee * newMaxP * (commissionSettings.prize_pool_percent / 100));
                    setFormData({ ...formData, max_participants: newMaxP.toString(), prize_pool: autoPool.toString() });
                  }} 
                  placeholder={formData.game === 'Free Fire' ? '50' : '100'}
                  max={formData.game === 'BGMI' ? 100 : formData.game === 'Free Fire' ? 50 : 100}
                />
                <p className="text-xs text-muted-foreground">
                  Max: {formData.game === 'BGMI' ? '100' : formData.game === 'Free Fire' ? '50' : '100'} players
                </p>
              </div>
            </div>

            {/* Auto-calculated Prize Pool */}
            {/* Prize Pool Section - Different for giveaway vs regular */}
            {!formData.is_giveaway && (
              <div className="space-y-2">
                <Label>Estimated Prize Pool (₹)</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xl font-bold text-green-600">₹{parseInt(formData.prize_pool || '0').toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-calculated: Entry Fee × Max Players × {commissionSettings.prize_pool_percent}%
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Final prize pool will be recalculated based on actual players 2 min before start
                  </p>
                </div>
              </div>
            )}

            <PrizeDistributionInput
              value={formData.prize_distribution}
              onChange={(value) => setFormData({ ...formData, prize_distribution: value })}
              prizePool={getPrizePool()}
            />

            <div className="space-y-2">
              <Label>Start Date & Time *</Label>
              <Input type="datetime-local" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Tournament details..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-red-500" /> YouTube Link
                </Label>
                <Input 
                  value={formData.youtube_link} 
                  onChange={(e) => setFormData({ ...formData, youtube_link: e.target.value })} 
                  placeholder="https://youtube.com/..." 
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" /> Instagram Link
                </Label>
                <Input 
                  value={formData.instagram_link} 
                  onChange={(e) => setFormData({ ...formData, instagram_link: e.target.value })} 
                  placeholder="https://instagram.com/..." 
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button variant="gaming" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (selectedTournament ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room ID/Password Dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={(open) => setRoomDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Match Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" /> Room ID
              </Label>
              <Input 
                value={roomData.room_id} 
                onChange={(e) => setRoomData({ ...roomData, room_id: e.target.value })} 
                placeholder="Enter room ID" 
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Password
              </Label>
              <Input 
                value={roomData.room_password} 
                onChange={(e) => setRoomData({ ...roomData, room_password: e.target.value })} 
                placeholder="Enter room password" 
              />
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
              Room details will be visible to joined players 30 minutes before the match starts.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
            <Button variant="gaming" onClick={handleSaveRoom} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Declare Winner Dialog */}
      <Dialog open={winnerDialogOpen} onOpenChange={(open) => setWinnerDialogOpen(open)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Declare Winners
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4 overflow-y-auto flex-1">
            {selectedTournament && (
              <div className="bg-primary/10 rounded-lg p-4 text-center flex-shrink-0">
                <p className="text-sm text-muted-foreground">Prize Pool</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{Math.round(selectedTournament.current_prize_pool || 0)}
                </p>
              </div>
            )}

            {/* Editable Prize Distribution */}
            {selectedTournament && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Edit Prize Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((pos) => (
                      <div key={pos} className="flex items-center gap-2">
                        <Badge variant="outline" className="w-12 justify-center">#{pos}</Badge>
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={editablePrizeDistribution[pos.toString()] || ''}
                          onChange={(e) => {
                            const newDist = { ...editablePrizeDistribution };
                            if (e.target.value) {
                              newDist[pos.toString()] = parseFloat(e.target.value);
                            } else {
                              delete newDist[pos.toString()];
                            }
                            setEditablePrizeDistribution(newDist);
                          }}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground">₹</span>
                      </div>
                    ))}
                  </div>

                  {/* Validation Display */}
                  {(() => {
                    const totalDist = Object.values(editablePrizeDistribution).reduce((a, b) => a + (b || 0), 0);
                    const prizePool = selectedTournament?.current_prize_pool || 0;
                    const isValid = totalDist <= prizePool;
                    const remaining = prizePool - totalDist;
                    
                    return (
                      <div className={`flex flex-col gap-1 pt-2 border-t ${!isValid ? 'text-destructive' : ''}`}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Distribution:</span>
                          <span className={`font-bold ${!isValid ? 'text-destructive' : ''}`}>
                            ₹{totalDist}
                          </span>
                        </div>
                        {!isValid ? (
                          <p className="text-xs text-destructive">
                            ⚠️ Exceeds prize pool by ₹{totalDist - prizePool}. Please reduce amounts.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Remaining: ₹{remaining}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={async () => {
                      if (!selectedTournament) return;
                      const totalDist = Object.values(editablePrizeDistribution).reduce((a, b) => a + (b || 0), 0);
                      if (totalDist > (selectedTournament.current_prize_pool || 0)) {
                        toast({ title: 'Error', description: 'Total distribution exceeds prize pool.', variant: 'destructive' });
                        return;
                      }
                      const { error } = await supabase
                        .from('tournaments')
                        .update({ prize_distribution: editablePrizeDistribution })
                        .eq('id', selectedTournament.id);
                      
                      if (error) {
                        toast({ title: 'Error', description: 'Failed to save prize distribution.', variant: 'destructive' });
                      } else {
                        toast({ title: 'Saved!', description: 'Prize distribution updated.' });
                        setSelectedTournament({ ...selectedTournament, prize_distribution: editablePrizeDistribution });
                      }
                    }}
                    disabled={Object.values(editablePrizeDistribution).reduce((a, b) => a + (b || 0), 0) > (selectedTournament?.current_prize_pool || 0)}
                  >
                    Save Prize Distribution
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>
                {selectedTournament?.tournament_mode === 'solo' 
                  ? 'Assign Positions to Players' 
                  : 'Assign Positions to Teams'}
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                {selectedTournament?.tournament_mode === 'solo'
                  ? 'Select position for each winner (1st, 2nd, 3rd...)'
                  : 'Select position for each team. Prize will be split equally among team members.'}
              </p>
              
              {loadingPlayers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : joinedPlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No players joined this tournament</p>
              ) : selectedTournament?.tournament_mode !== 'solo' ? (
                // Team-based winner selection for duo/squad
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {(() => {
                      const teamGroups = joinedPlayers.reduce((acc, player) => {
                        const teamName = player.team_name || 'No Team';
                        if (!acc[teamName]) acc[teamName] = [];
                        acc[teamName].push(player);
                        return acc;
                      }, {} as Record<string, PlayerProfile[]>);

                      return Object.entries(teamGroups).map(([teamName, players]) => (
                        <div key={teamName} className="border border-border rounded-lg overflow-hidden">
                          <div className="bg-primary/10 px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm">Team: {teamName}</span>
                              <Badge variant="secondary" className="text-xs">
                                {players.length} players
                              </Badge>
                            </div>
                            <Select 
                              value={teamPositions[teamName]?.toString() || ''} 
                              onValueChange={(value) => {
                                if (value === 'none' || !value) {
                                  const newPositions = { ...teamPositions };
                                  delete newPositions[teamName];
                                  setTeamPositions(newPositions);
                                } else {
                                  setTeamPositions({ ...teamPositions, [teamName]: parseInt(value) });
                                }
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Rank" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {(() => {
                                  return Array.from({ length: 10 }, (_, i) => i + 1).map(pos => {
                                    const amount = editablePrizeDistribution[pos.toString()] || 0;
                                    const emoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '🏅';
                                    const suffix = pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th';
                                    return (
                                      <SelectItem key={pos} value={pos.toString()}>
                                        {emoji} {pos}{suffix} {amount > 0 && `(₹${amount})`}
                                      </SelectItem>
                                    );
                                  });
                                })()}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="divide-y divide-border">
                            {players.map((player) => (
                              <div key={player.user_id} className="flex items-center gap-3 p-2 px-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={player.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">{(player.username || player.email)?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{player.username || player.email.split('@')[0]}</p>
                                  {player.in_game_name && (
                                    <p className="text-xs text-muted-foreground">IGN: {player.in_game_name}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </ScrollArea>
              ) : (
                // Solo player selection
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {joinedPlayers.map((player) => {
                      const playerPosition = winnerPositions[player.user_id];
                      const prizeAmount = playerPosition 
                        ? editablePrizeDistribution[playerPosition.toString()] || 0 
                        : 0;
                      
                      return (
                        <div key={player.user_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={player.avatar_url || undefined} />
                              <AvatarFallback>{(player.username || player.email)?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{player.username || player.email.split('@')[0]}</p>
                              {player.in_game_name && (
                                <p className="text-xs text-muted-foreground">IGN: {player.in_game_name}</p>
                              )}
                              {playerPosition && prizeAmount > 0 && (
                                <p className="text-xs text-green-600 font-medium">Prize: ₹{prizeAmount.toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                          <Select 
                            value={winnerPositions[player.user_id]?.toString() || ''} 
                            onValueChange={(value) => {
                              if (value === 'none') {
                                const newPositions = { ...winnerPositions };
                                delete newPositions[player.user_id];
                                setWinnerPositions(newPositions);
                              } else {
                                setWinnerPositions({ ...winnerPositions, [player.user_id]: parseInt(value) });
                              }
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Rank" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {(() => {
                                return Array.from({ length: 10 }, (_, i) => i + 1).map(pos => {
                                  const amount = editablePrizeDistribution[pos.toString()] || 0;
                                  const emoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '🏅';
                                  const suffix = pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th';
                                  return (
                                    <SelectItem key={pos} value={pos.toString()}>
                                      {emoji} {pos}{suffix} {amount > 0 && `(₹${amount})`}
                                    </SelectItem>
                                  );
                                });
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Show selected winners/teams with prize amounts */}
            {selectedTournament?.tournament_mode !== 'solo' && Object.keys(teamPositions).length > 0 && (
              <div className="bg-green-500/10 rounded-lg p-3">
                <p className="text-sm font-medium text-green-700">Selected Team Winners:</p>
                {(() => {
                  let totalPrize = 0;
                  const items = Object.entries(teamPositions)
                    .sort(([, a], [, b]) => a - b)
                    .map(([teamName, position]) => {
                      const amount = editablePrizeDistribution[position.toString()] || 0;
                      totalPrize += amount;
                      return (
                        <p key={teamName} className="text-xs text-green-600">
                          #{position} - Team {teamName} → ₹{amount.toLocaleString()}
                        </p>
                      );
                    });
                  return (
                    <>
                      {items}
                      <p className="text-xs text-green-700 font-semibold mt-2 pt-2 border-t border-green-500/20">
                        Total: ₹{totalPrize.toLocaleString()}
                      </p>
                    </>
                  );
                })()}
              </div>
            )}

            {selectedTournament?.tournament_mode === 'solo' && Object.keys(winnerPositions).length > 0 && (
              <div className="bg-green-500/10 rounded-lg p-3">
                <p className="text-sm font-medium text-green-700">Selected Winners:</p>
                {(() => {
                  let totalPrize = 0;
                  const items = Object.entries(winnerPositions)
                    .sort(([, a], [, b]) => a - b)
                    .map(([userId, position]) => {
                      const player = joinedPlayers.find(p => p.user_id === userId);
                      const amount = editablePrizeDistribution[position.toString()] || 0;
                      totalPrize += amount;
                      return (
                        <p key={userId} className="text-xs text-green-600">
                          #{position} - {player?.username || player?.email?.split('@')[0]} → ₹{amount.toLocaleString()}
                        </p>
                      );
                    });
                  return (
                    <>
                      {items}
                      <p className="text-xs text-green-700 font-semibold mt-2 pt-2 border-t border-green-500/20">
                        Total: ₹{totalPrize.toLocaleString()}
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWinnerDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="gaming" 
              onClick={handleDeclareWinners} 
              disabled={saving || (selectedTournament?.tournament_mode === 'solo' 
                ? Object.keys(winnerPositions).length === 0 
                : Object.keys(teamPositions).length === 0)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Winners'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Joined Players Dialog */}
      <Dialog open={playersDialogOpen} onOpenChange={(open) => setPlayersDialogOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Joined Players ({joinedPlayers.length})
              {selectedTournament && (
                <Badge variant="outline" className="ml-2 capitalize">
                  {selectedTournament.tournament_mode || 'solo'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {loadingPlayers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : joinedPlayers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No players have joined yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {/* Group by team for duo/squad modes */}
                  {selectedTournament?.tournament_mode !== 'solo' ? (
                    (() => {
                      const teamGroups = joinedPlayers.reduce((acc, player) => {
                        const teamName = player.team_name || 'No Team';
                        if (!acc[teamName]) acc[teamName] = [];
                        acc[teamName].push(player);
                        return acc;
                      }, {} as Record<string, PlayerProfile[]>);

                      return Object.entries(teamGroups).map(([teamName, players], teamIndex) => (
                        <div key={teamName} className="border border-border rounded-lg overflow-hidden">
                          <div className="bg-primary/10 px-3 py-2 flex items-center justify-between">
                            <span className="font-semibold text-sm flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary" />
                              Team: {teamName}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {players.length} players
                            </Badge>
                          </div>
                          <div className="divide-y divide-border">
                            {players.map((player) => (
                              <div key={player.user_id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={player.avatar_url || undefined} />
                                  <AvatarFallback>{(player.username || player.email)?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{player.username || player.email.split('@')[0]}</p>
                                  <div className="flex flex-wrap gap-2 mt-0.5">
                                    {player.in_game_name && (
                                      <span className="text-xs bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">
                                        IGN: {player.in_game_name}
                                      </span>
                                    )}
                                    {player.game_uid && (
                                      <span className="text-xs bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded">
                                        UID: {player.game_uid}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    joinedPlayers.map((player, index) => (
                      <div key={player.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player.avatar_url || undefined} />
                          <AvatarFallback>{(player.username || player.email)?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{player.username || player.email.split('@')[0]}</p>
                          <div className="flex flex-wrap gap-2 mt-0.5">
                            {player.in_game_name && (
                              <span className="text-xs bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">
                                IGN: {player.in_game_name}
                              </span>
                            )}
                            {player.game_uid && (
                              <span className="text-xs bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded">
                                UID: {player.game_uid}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPlayersDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Tournament Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => setCancelDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Cancel Tournament
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm font-medium text-destructive">Warning</p>
              <p className="text-xs text-muted-foreground mt-1">
                Cancelling this tournament will refund all joined players their entry fees. This action cannot be undone.
              </p>
            </div>

            {selectedTournament && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{selectedTournament.title}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedTournament.joined_users?.length || 0} players × ₹{selectedTournament.entry_fee || 0} = 
                  ₹{(selectedTournament.joined_users?.length || 0) * (selectedTournament.entry_fee || 0)} to refund
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Cancellation Reason *</Label>
              <Textarea 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain why this tournament is being cancelled..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be shown to all players in their notification.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Back</Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelTournament} 
              disabled={saving || !cancelReason.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Cancel Tournament
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerDashboard;
