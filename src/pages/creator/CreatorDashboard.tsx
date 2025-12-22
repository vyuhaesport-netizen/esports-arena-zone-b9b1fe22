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
import PrizeDistributionInput from '@/components/PrizeDistributionInput';

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

const CreatorDashboard = () => {
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
    prize_pool: '',
  });
  const [commissionSettings, setCommissionSettings] = useState({
    organizer_percent: 10,
    platform_percent: 10,
    prize_pool_percent: 80,
  });

  const { user, isCreator, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isCreator) {
        navigate('/profile');
        toast({ title: 'Access Denied', description: 'You are not an approved creator.', variant: 'destructive' });
      }
    }
  }, [user, isCreator, authLoading, navigate, toast]);

  useEffect(() => {
    if (isCreator && user) {
      fetchMyTournaments();
      fetchCommissionSettings();
    }
  }, [isCreator, user]);

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
        .eq('tournament_type', 'creator')
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

    setSaving(true);

    try {
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

      const entryFee = parseFloat(formData.entry_fee) || 0;
      const maxParticipants = parseInt(formData.max_participants) || 100;
      const prizePoolValue = parseFloat(formData.prize_pool) || 0;

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
            message: `New tournament "${formData.title}" has been created by your followed creator.`,
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

  const canDeclareWinner = (tournament: Tournament): { canDeclare: boolean; minutesRemaining: number } => {
    if (!tournament.end_date) {
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
    
    const positionsAssigned = Object.keys(winnerPositions).length;
    if (positionsAssigned === 0) {
      toast({ title: 'Error', description: 'Please assign at least one winner position.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      // Use atomic secure database function to prevent any exploits
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
  };

  const openEditDialog = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setFormData({
      title: tournament.title,
      game: tournament.game,
      description: tournament.description || '',
      entry_fee: tournament.entry_fee?.toString() || '',
      max_participants: tournament.max_participants?.toString() || '100',
      start_date: tournament.start_date ? format(new Date(tournament.start_date), "yyyy-MM-dd'T'HH:mm") : '',
      status: tournament.status || 'upcoming',
      tournament_mode: tournament.tournament_mode || 'solo',
      prize_distribution: tournament.prize_distribution ? JSON.stringify(tournament.prize_distribution) : '',
      prize_pool: tournament.prize_pool?.replace(/[₹,]/g, '') || '',
    });
    setDialogOpen(true);
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
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-lg" />
            <span className="font-gaming font-bold text-pink-500">Creator Dashboard</span>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-pink-500" />
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
                <p className="text-lg font-bold text-pink-500">{commissionSettings.organizer_percent}%</p>
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

        {/* Create Tournament Button */}
        <Button 
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Create Tournament
        </Button>

        {/* Tournament List */}
        <div className="space-y-3">
          <h2 className="font-gaming text-lg flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-pink-500" />
            My Tournaments
          </h2>

          {tournaments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No tournaments yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first tournament!</p>
              </CardContent>
            </Card>
          ) : (
            tournaments.map((t) => {
              const { canDeclare, minutesRemaining } = canDeclareWinner(t);
              
              return (
                <Card key={t.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 border-b border-border bg-gradient-to-r from-pink-500/5 to-purple-500/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{t.title}</h3>
                          <p className="text-xs text-muted-foreground">{t.game}</p>
                        </div>
                        <Badge className={`text-[10px] ${
                          t.status === 'upcoming' ? 'bg-emerald-500/10 text-emerald-600' :
                          t.status === 'ongoing' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {t.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-4 gap-2 text-center mb-3">
                        <div>
                          <p className="text-sm font-bold text-pink-500">{t.prize_pool}</p>
                          <p className="text-[9px] text-muted-foreground">Prize</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold">₹{t.entry_fee || 0}</p>
                          <p className="text-[9px] text-muted-foreground">Entry</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-blue-500">{t.joined_users?.length || 0}/{t.max_participants}</p>
                          <p className="text-[9px] text-muted-foreground">Players</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-green-500">₹{t.organizer_earnings?.toFixed(0) || 0}</p>
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
                        {t.status !== 'completed' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(t)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>

                      {t.status !== 'completed' && !t.winner_user_id && (
                        <Button 
                          className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500"
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
            })
          )}
        </div>
      </div>

      {/* Create/Edit Tournament Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTournament ? 'Edit Tournament' : 'Create Tournament'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Tournament name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Game *</Label>
                <Select value={formData.game} onValueChange={(v) => setFormData({ ...formData, game: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BGMI">BGMI</SelectItem>
                    <SelectItem value="Free Fire">Free Fire</SelectItem>
                    <SelectItem value="COD Mobile">COD Mobile</SelectItem>
                    <SelectItem value="Valorant">Valorant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={formData.tournament_mode} onValueChange={(v) => setFormData({ ...formData, tournament_mode: v })}>
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
                <Input
                  type="number"
                  value={formData.entry_fee}
                  onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Players</Label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>

            {/* Direct Prize Pool Input */}
            <div className="space-y-2">
              <Label>Prize Pool (₹) *</Label>
              <Input 
                type="number" 
                value={formData.prize_pool} 
                onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })} 
                placeholder="Enter prize pool amount" 
              />
              <p className="text-xs text-muted-foreground">Enter the total prize pool amount to be distributed among winners</p>
            </div>

            <div className="space-y-2">
              <Label>Start Date & Time *</Label>
              <Input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <PrizeDistributionInput
              value={formData.prize_distribution}
              onChange={(value) => setFormData({ ...formData, prize_distribution: value })}
              prizePool={getPrizePool()}
            />

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tournament rules and info"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-pink-500 to-purple-500">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedTournament ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Details Dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Room ID</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  value={roomData.room_id}
                  onChange={(e) => setRoomData({ ...roomData, room_id: e.target.value })}
                  placeholder="Enter room ID"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Room Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  value={roomData.room_password}
                  onChange={(e) => setRoomData({ ...roomData, room_password: e.target.value })}
                  placeholder="Enter room password"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRoom} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Players Dialog */}
      <Dialog open={playersDialogOpen} onOpenChange={setPlayersDialogOpen}>
        <DialogContent className="max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-500" />
              Joined Players ({joinedPlayers.length})
              {selectedTournament && (
                <Badge variant="outline" className="ml-2 capitalize">
                  {selectedTournament.tournament_mode || 'solo'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {loadingPlayers ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : joinedPlayers.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No players joined yet</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
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

                    return Object.entries(teamGroups).map(([teamName, players]) => (
                      <div key={teamName} className="border border-border rounded-lg overflow-hidden">
                        <div className="bg-pink-500/10 px-3 py-2 flex items-center justify-between">
                          <span className="font-semibold text-sm flex items-center gap-2">
                            <Users className="h-4 w-4 text-pink-500" />
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
                                <AvatarFallback>{player.username?.charAt(0) || 'P'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{player.in_game_name || player.username || 'Player'}</p>
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
                        <AvatarFallback>{player.username?.charAt(0) || 'P'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{player.in_game_name || player.username || 'Player'}</p>
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
        </DialogContent>
      </Dialog>

      {/* Declare Winner Dialog */}
      <Dialog open={winnerDialogOpen} onOpenChange={setWinnerDialogOpen}>
        <DialogContent className="max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Declare Winners</DialogTitle>
          </DialogHeader>

          {loadingPlayers ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : joinedPlayers.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No players to select</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-2">
                {joinedPlayers.map((player) => (
                  <div key={player.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback>{player.username?.charAt(0) || 'P'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{player.in_game_name || player.username || 'Player'}</p>
                    </div>
                    <Select
                      value={winnerPositions[player.user_id]?.toString() || ''}
                      onValueChange={(v) => {
                        if (v) {
                          setWinnerPositions({ ...winnerPositions, [player.user_id]: parseInt(v) });
                        } else {
                          const newPositions = { ...winnerPositions };
                          delete newPositions[player.user_id];
                          setWinnerPositions(newPositions);
                        }
                      }}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Rank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setWinnerDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleDeclareWinners} 
              disabled={saving || Object.keys(winnerPositions).length === 0}
              className="bg-gradient-to-r from-amber-500 to-orange-500"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Winners'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorDashboard;
