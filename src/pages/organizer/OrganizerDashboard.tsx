import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Award
} from 'lucide-react';
import { format } from 'date-fns';

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
  joined_users: string[] | null;
  organizer_earnings: number | null;
  current_prize_pool: number | null;
  winner_user_id: string | null;
}

const OrganizerDashboard = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [saving, setSaving] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [selectedWinner, setSelectedWinner] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    game: 'BGMI',
    description: '',
    prize_pool: '',
    entry_fee: '',
    max_participants: '100',
    start_date: '',
    status: 'upcoming',
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
    }
  }, [isOrganizer, user]);

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

      // Calculate total earnings
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
      prize_pool: '',
      entry_fee: '',
      max_participants: '100',
      start_date: '',
      status: 'upcoming',
    });
    setSelectedTournament(null);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.game || !formData.start_date) {
      toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const tournamentData = {
        title: formData.title,
        game: formData.game,
        description: formData.description || null,
        prize_pool: formData.prize_pool || null,
        entry_fee: formData.entry_fee ? parseFloat(formData.entry_fee) : 0,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : 100,
        start_date: new Date(formData.start_date).toISOString(),
        status: formData.status,
        created_by: user?.id,
        tournament_type: 'creator',
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

  const openDeclareWinner = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setSelectedWinner(tournament.winner_user_id || '');
    setWinnerDialogOpen(true);
  };

  const handleDeclareWinner = async () => {
    if (!selectedTournament || !selectedWinner) {
      toast({ title: 'Error', description: 'Please select a winner.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      // Update tournament with winner
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({
          winner_user_id: selectedWinner,
          winner_declared_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', selectedTournament.id);

      if (tournamentError) throw tournamentError;

      // Award prize to winner
      const prizeAmount = selectedTournament.current_prize_pool || 0;
      if (prizeAmount > 0) {
        // Get winner's current balance
        const { data: winnerProfile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('user_id', selectedWinner)
          .single();

        // Update winner's wallet
        await supabase
          .from('profiles')
          .update({ wallet_balance: (winnerProfile?.wallet_balance || 0) + prizeAmount })
          .eq('user_id', selectedWinner);

        // Create transaction record
        await supabase.from('wallet_transactions').insert({
          user_id: selectedWinner,
          type: 'prize',
          amount: prizeAmount,
          status: 'completed',
          description: `Prize for winning ${selectedTournament.title}`,
        });
      }

      toast({ title: 'Winner Declared!', description: `Prize of ₹${prizeAmount} awarded to winner.` });
      setWinnerDialogOpen(false);
      fetchMyTournaments();
    } catch (error) {
      console.error('Error declaring winner:', error);
      toast({ title: 'Error', description: 'Failed to declare winner.', variant: 'destructive' });
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
                          <p className="text-xs text-muted-foreground">{tournament.game}</p>
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

                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(tournament.start_date), 'MMM dd, hh:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    {tournament.status === 'ongoing' && !tournament.winner_user_id && (
                      <Button variant="gaming" size="sm" className="flex-1" onClick={() => openDeclareWinner(tournament)}>
                        <Award className="h-3 w-3 mr-1" /> Declare Winner
                      </Button>
                    )}
                    {tournament.status === 'upcoming' && (
                      <>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                          setSelectedTournament(tournament);
                          setFormData({
                            title: tournament.title,
                            game: tournament.game,
                            description: tournament.description || '',
                            prize_pool: tournament.prize_pool || '',
                            entry_fee: tournament.entry_fee?.toString() || '',
                            max_participants: tournament.max_participants?.toString() || '100',
                            start_date: new Date(tournament.start_date).toISOString().slice(0, 16),
                            status: tournament.status || 'upcoming',
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
                    <SelectItem value="COD Mobile">COD Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Entry Fee (₹)</Label>
                <Input type="number" value={formData.entry_fee} onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Match Time *</Label>
                <Input type="datetime-local" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max Players</Label>
                <Input type="number" value={formData.max_participants} onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })} placeholder="100" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Tournament description..." rows={3} />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">Commission Breakdown:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Your Commission: 10% of entry fees</li>
                <li>• Platform Fee: 10% of entry fees</li>
                <li>• Prize Pool: 80% of entry fees</li>
              </ul>
            </div>

            <Button variant="gaming" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (selectedTournament ? 'Update' : 'Create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Declare Winner Dialog */}
      <Dialog open={winnerDialogOpen} onOpenChange={setWinnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare Winner</DialogTitle>
          </DialogHeader>

          {selectedTournament && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Select the winner for "{selectedTournament.title}"
              </p>
              <p className="text-sm">
                Prize Pool: <span className="font-bold text-primary">₹{selectedTournament.current_prize_pool || 0}</span>
              </p>

              <div className="space-y-2">
                <Label>Winner (User ID)</Label>
                <Select value={selectedWinner} onValueChange={setSelectedWinner}>
                  <SelectTrigger><SelectValue placeholder="Select winner" /></SelectTrigger>
                  <SelectContent>
                    {selectedTournament.joined_users?.map((userId) => (
                      <SelectItem key={userId} value={userId}>
                        {userId.slice(0, 8)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setWinnerDialogOpen(false)}>Cancel</Button>
                <Button variant="gaming" onClick={handleDeclareWinner} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Winner'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerDashboard;
