import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Trash2,
  Gamepad2,
  Users,
  Wallet,
  TrendingUp,
  ArrowLeft,
  Award,
  Key,
  Lock,
  Eye,
  Medal,
  Clock
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

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
  const [roomData, setRoomData] = useState({ room_id: '', room_password: '' });
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
  });
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
    }
  }, [isOrganizer, user]);

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
    });
    setSelectedTournament(null);
  };

  const calculatePrizePool = () => {
    const entryFee = parseFloat(formData.entry_fee) || 0;
    const maxParticipants = parseInt(formData.max_participants) || 0;
    const totalCollection = entryFee * maxParticipants;
    const prizePool = (totalCollection * commissionSettings.prize_pool_percent) / 100;
    return prizePool;
  };

  const handleSave = async () => {
    if (!formData.title || !formData.game || !formData.start_date) {
      toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
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

      // Calculate prize pool based on commission settings
      const entryFee = parseFloat(formData.entry_fee) || 0;
      const maxParticipants = parseInt(formData.max_participants) || 100;
      const totalCollection = entryFee * maxParticipants;
      const calculatedPrizePool = Math.floor((totalCollection * commissionSettings.prize_pool_percent) / 100);

      const tournamentData = {
        title: formData.title,
        game: formData.game,
        description: formData.description || null,
        prize_pool: `₹${calculatedPrizePool.toLocaleString()}`,
        entry_fee: entryFee,
        max_participants: maxParticipants,
        start_date: new Date(formData.start_date).toISOString(),
        status: formData.status,
        created_by: user?.id,
        tournament_type: 'creator',
        tournament_mode: formData.tournament_mode,
        prize_distribution: prizeDistribution,
      };

      if (selectedTournament) {
        const { error } = await supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('id', selectedTournament.id);

        if (error) throw error;
        toast({ title: 'Updated!', description: 'Tournament updated successfully.' });
      } else {
        const { error } = await supabase
          .from('tournaments')
          .insert(tournamentData);

        if (error) throw error;

        // Notify followers
        const { data: followers } = await supabase
          .from('follows')
          .select('follower_user_id')
          .eq('following_user_id', user?.id);

        if (followers && followers.length > 0) {
          const notifications = followers.map(f => ({
            user_id: f.follower_user_id,
            type: 'new_tournament',
            title: 'New Tournament!',
            message: `New tournament "${formData.title}" has been created.`,
          }));

          await supabase.from('notifications').insert(notifications);
        }

        toast({ title: 'Created!', description: 'Tournament created successfully.' });
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tournament?')) return;

    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Tournament deleted successfully.' });
      fetchMyTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({ title: 'Error', description: 'Failed to delete tournament.', variant: 'destructive' });
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
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, username, in_game_name, avatar_url, email')
          .in('user_id', userIds);

        if (!error && data) {
          setJoinedPlayers(data);
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

  const canDeclareWinner = (tournament: Tournament): { canDeclare: boolean; minutesRemaining: number } => {
    if (!tournament.end_date) {
      // If no end_date, use start_date + 2 hours as default end
      const endTime = new Date(tournament.start_date);
      endTime.setHours(endTime.getHours() + 2);
      const now = new Date();
      const minutesSinceEnd = differenceInMinutes(now, endTime);
      return { canDeclare: minutesSinceEnd >= 30, minutesRemaining: Math.max(0, 30 - minutesSinceEnd) };
    }
    
    const endTime = new Date(tournament.end_date);
    const now = new Date();
    const minutesSinceEnd = differenceInMinutes(now, endTime);
    return { canDeclare: minutesSinceEnd >= 30, minutesRemaining: Math.max(0, 30 - minutesSinceEnd) };
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
    setWinnerDialogOpen(true);
    setLoadingPlayers(true);

    try {
      const userIds = tournament.joined_users || [];
      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, username, in_game_name, avatar_url, email')
          .in('user_id', userIds);

        if (!error && data) {
          setJoinedPlayers(data);
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
    if (!selectedTournament) return;
    
    const positionsAssigned = Object.keys(winnerPositions).length;
    if (positionsAssigned === 0) {
      toast({ title: 'Error', description: 'Please assign at least one winner position.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      // Get prize distribution
      const prizeDistribution = selectedTournament.prize_distribution || {};
      const prizePool = selectedTournament.current_prize_pool || 0;

      // Award prizes based on positions
      for (const [userId, position] of Object.entries(winnerPositions)) {
        let prizeAmount = 0;
        
        // Check if prize_distribution has amount for this position
        if (prizeDistribution[position.toString()]) {
          prizeAmount = parseFloat(prizeDistribution[position.toString()]);
        } else if (position === 1) {
          // Default: 1st place gets 60% of prize pool
          prizeAmount = prizePool * 0.6;
        } else if (position === 2) {
          // 2nd place gets 25%
          prizeAmount = prizePool * 0.25;
        } else if (position === 3) {
          // 3rd place gets 15%
          prizeAmount = prizePool * 0.15;
        }

        if (prizeAmount > 0) {
          const { data: winnerProfile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('user_id', userId)
            .single();

          await supabase
            .from('profiles')
            .update({ wallet_balance: (winnerProfile?.wallet_balance || 0) + prizeAmount })
            .eq('user_id', userId);

          await supabase.from('wallet_transactions').insert({
            user_id: userId,
            type: 'prize',
            amount: prizeAmount,
            status: 'completed',
            description: `Position #${position} prize for ${selectedTournament.title}`,
          });

          // Notify winner
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'prize_won',
            title: 'Congratulations! 🎉',
            message: `You won position #${position} in ${selectedTournament.title}! ₹${prizeAmount} credited to your wallet.`,
          });
        }
      }

      // Get first place winner
      const firstPlaceWinner = Object.entries(winnerPositions).find(([, pos]) => pos === 1);

      // Update tournament status
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({
          winner_user_id: firstPlaceWinner ? firstPlaceWinner[0] : Object.keys(winnerPositions)[0],
          winner_declared_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', selectedTournament.id);

      if (tournamentError) throw tournamentError;

      // Credit organizer earnings
      const organizerEarnings = ((selectedTournament.entry_fee || 0) * (selectedTournament.joined_users?.length || 0) * commissionSettings.organizer_percent) / 100;
      
      if (organizerEarnings > 0) {
        const { data: organizerProfile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('user_id', user?.id)
          .single();

        await supabase
          .from('profiles')
          .update({ wallet_balance: (organizerProfile?.wallet_balance || 0) + organizerEarnings })
          .eq('user_id', user?.id);

        await supabase.from('wallet_transactions').insert({
          user_id: user?.id,
          type: 'organizer_commission',
          amount: organizerEarnings,
          status: 'completed',
          description: `Organizer commission for ${selectedTournament.title}`,
        });

        await supabase
          .from('tournaments')
          .update({ organizer_earnings: organizerEarnings })
          .eq('id', selectedTournament.id);
      }

      toast({ title: 'Winners Declared!', description: 'Prizes have been distributed to winners.' });
      setWinnerDialogOpen(false);
      fetchMyTournaments();
    } catch (error) {
      console.error('Error declaring winners:', error);
      toast({ title: 'Error', description: 'Failed to declare winners.', variant: 'destructive' });
    } finally {
      setSaving(false);
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
          <button onClick={() => navigate('/profile')} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-lg" />
          <div>
            <h1 className="font-gaming font-bold">Organizer Dashboard</h1>
            <p className="text-xs text-muted-foreground">Manage your tournaments</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Earnings Card */}
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Earnings</p>
                <p className="text-3xl font-gaming font-bold mt-1">₹{totalEarnings.toFixed(0)}</p>
                <p className="text-xs opacity-75 mt-1">10% commission from entry fees</p>
              </div>
              <TrendingUp className="h-12 w-12 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 mx-auto text-primary mb-1" />
              <p className="text-xl font-bold">{tournaments.length}</p>
              <p className="text-xs text-muted-foreground">Tournaments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto text-blue-500 mb-1" />
              <p className="text-xl font-bold">
                {tournaments.reduce((sum, t) => sum + (t.joined_users?.length || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Participants</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Wallet className="h-6 w-6 mx-auto text-green-500 mb-1" />
              <p className="text-xl font-bold">
                ₹{tournaments.reduce((sum, t) => sum + (t.current_prize_pool || 0), 0).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Prize Pools</p>
            </CardContent>
          </Card>
        </div>

        {/* Create Button */}
        <Button variant="gaming" className="w-full" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Create Tournament
        </Button>

        {/* My Tournaments */}
        <div className="space-y-3">
          <h2 className="font-gaming font-semibold">My Tournaments</h2>
          
          {tournaments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No tournaments yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first tournament!</p>
              </CardContent>
            </Card>
          ) : (
            tournaments.map((tournament) => (
              <Card key={tournament.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Gamepad2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold line-clamp-1">{tournament.title}</h3>
                          <p className="text-xs text-muted-foreground">{tournament.game} • {tournament.tournament_mode || 'Solo'}</p>
                        </div>
                        <Badge className={`text-[10px] ${getStatusColor(tournament.status)}`}>
                          {tournament.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {tournament.joined_users?.length || 0}/{tournament.max_participants}
                        </span>
                        <span className="flex items-center gap-1">
                          <Wallet className="h-3 w-3 text-green-500" />
                          ₹{tournament.organizer_earnings || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-primary" />
                          ₹{tournament.current_prize_pool || 0}
                        </span>
                      </div>

                      {tournament.room_id && (
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <Key className="h-3 w-3 text-green-500" />
                          <span className="text-green-600">Room: {tournament.room_id}</span>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(tournament.start_date), 'MMM dd, hh:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                    {/* View Players Button - Always visible */}
                    <Button variant="outline" size="sm" onClick={() => openViewPlayers(tournament)}>
                      <Eye className="h-3 w-3 mr-1" /> Players ({tournament.joined_users?.length || 0})
                    </Button>

                    {(tournament.status === 'upcoming' || tournament.status === 'ongoing') && !tournament.winner_user_id && (
                      <Button variant="outline" size="sm" onClick={() => openEditRoom(tournament)}>
                        <Lock className="h-3 w-3 mr-1" /> Room ID
                      </Button>
                    )}
                    
                    {(tournament.status === 'ongoing' || tournament.status === 'completed') && !tournament.winner_user_id && (
                      <Button variant="gaming" size="sm" onClick={() => openDeclareWinner(tournament)}>
                        <Award className="h-3 w-3 mr-1" /> 
                        {(() => {
                          const { canDeclare, minutesRemaining } = canDeclareWinner(tournament);
                          return canDeclare ? 'Winner' : `Wait ${minutesRemaining}m`;
                        })()}
                      </Button>
                    )}
                    
                    {tournament.status === 'upcoming' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedTournament(tournament);
                          setFormData({
                            title: tournament.title,
                            game: tournament.game,
                            description: tournament.description || '',
                            entry_fee: tournament.entry_fee?.toString() || '',
                            max_participants: tournament.max_participants?.toString() || '100',
                            start_date: new Date(tournament.start_date).toISOString().slice(0, 16),
                            status: tournament.status || 'upcoming',
                            tournament_mode: tournament.tournament_mode || 'solo',
                            prize_distribution: tournament.prize_distribution ? JSON.stringify(tournament.prize_distribution, null, 2) : '',
                          });
                          setDialogOpen(true);
                        }}>
                          <Edit2 className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(tournament.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    
                    {tournament.winner_user_id && (
                      <Badge className="bg-green-500/10 text-green-600">Winner Declared ✓</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-gaming">
              {selectedTournament ? 'Edit Tournament' : 'Create Tournament'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Tournament title" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Game *</Label>
                <Select value={formData.game} onValueChange={(value) => setFormData({ ...formData, game: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BGMI">BGMI</SelectItem>
                    <SelectItem value="Free Fire">Free Fire</SelectItem>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Entry Fee (₹)</Label>
                <Input type="number" value={formData.entry_fee} onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Max Participants</Label>
                <Input type="number" value={formData.max_participants} onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })} placeholder="100" />
              </div>
            </div>

            {/* Auto-calculated Prize Pool Info */}
            <div className="bg-primary/10 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Auto Prize Pool ({commissionSettings.prize_pool_percent}%)</span>
                <span className="font-gaming font-bold text-primary">₹{calculatePrizePool().toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-muted-foreground">Your Commission ({commissionSettings.organizer_percent}%)</span>
                <span className="text-xs text-green-600">₹{Math.floor(((parseFloat(formData.entry_fee) || 0) * (parseInt(formData.max_participants) || 0) * commissionSettings.organizer_percent) / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Platform ({commissionSettings.platform_percent}%)</span>
                <span className="text-xs">₹{Math.floor(((parseFloat(formData.entry_fee) || 0) * (parseInt(formData.max_participants) || 0) * commissionSettings.platform_percent) / 100).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prize Distribution (JSON)</Label>
              <Textarea 
                value={formData.prize_distribution} 
                onChange={(e) => setFormData({ ...formData, prize_distribution: e.target.value })} 
                placeholder='{"1": 500, "2": 200, "3": 100}'
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Format: {"{ \"rank\": amount }"}</p>
            </div>

            <div className="space-y-2">
              <Label>Start Date & Time *</Label>
              <Input type="datetime-local" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Tournament details..." rows={3} />
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-primary" />
              Declare Winners
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {selectedTournament && (
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Prize Pool</p>
                <p className="text-2xl font-gaming font-bold text-primary">
                  ₹{selectedTournament.current_prize_pool || 0}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Assign Positions to Players</Label>
              <p className="text-xs text-muted-foreground mb-3">Select position for each winner (1st, 2nd, 3rd...)</p>
              
              {loadingPlayers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : joinedPlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No players joined this tournament</p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {joinedPlayers.map((player) => (
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
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Rank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="1">🥇 1st</SelectItem>
                            <SelectItem value="2">🥈 2nd</SelectItem>
                            <SelectItem value="3">🥉 3rd</SelectItem>
                            <SelectItem value="4">4th</SelectItem>
                            <SelectItem value="5">5th</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {Object.keys(winnerPositions).length > 0 && (
              <div className="bg-green-500/10 rounded-lg p-3">
                <p className="text-sm font-medium text-green-700">Selected Winners:</p>
                {Object.entries(winnerPositions)
                  .sort(([, a], [, b]) => a - b)
                  .map(([userId, position]) => {
                    const player = joinedPlayers.find(p => p.user_id === userId);
                    return (
                      <p key={userId} className="text-xs text-green-600">
                        #{position} - {player?.username || player?.email?.split('@')[0]}
                      </p>
                    );
                  })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWinnerDialogOpen(false)}>Cancel</Button>
            <Button variant="gaming" onClick={handleDeclareWinners} disabled={saving || Object.keys(winnerPositions).length === 0}>
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
                <div className="space-y-2">
                  {joinedPlayers.map((player, index) => (
                    <div key={player.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback>{(player.username || player.email)?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{player.username || player.email.split('@')[0]}</p>
                        {player.in_game_name && (
                          <p className="text-xs text-muted-foreground">IGN: {player.in_game_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPlayersDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerDashboard;
