import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
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
  DialogTrigger,
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
import { 
  Plus, 
  Trophy, 
  Users, 
  Loader2, 
  Edit2, 
  Trash2,
  ArrowLeft,
  Gamepad2
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
  end_date: string | null;
  registration_deadline: string | null;
  status: string | null;
  rules: string | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

const Admin = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    game: '',
    description: '',
    prize_pool: '',
    entry_fee: '',
    max_participants: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    status: 'upcoming',
    rules: '',
  });

  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isAdmin) {
        navigate('/home');
        toast({
          title: 'Access Denied',
          description: 'Admin access required.',
          variant: 'destructive',
        });
      }
    }
  }, [user, isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    await Promise.all([fetchTournaments(), fetchUsers()]);
    setLoading(false);
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      game: '',
      description: '',
      prize_pool: '',
      entry_fee: '',
      max_participants: '',
      start_date: '',
      end_date: '',
      registration_deadline: '',
      status: 'upcoming',
      rules: '',
    });
    setEditingTournament(null);
  };

  const openEditDialog = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      title: tournament.title,
      game: tournament.game,
      description: tournament.description || '',
      prize_pool: tournament.prize_pool || '',
      entry_fee: tournament.entry_fee?.toString() || '',
      max_participants: tournament.max_participants?.toString() || '',
      start_date: tournament.start_date ? new Date(tournament.start_date).toISOString().slice(0, 16) : '',
      end_date: tournament.end_date ? new Date(tournament.end_date).toISOString().slice(0, 16) : '',
      registration_deadline: tournament.registration_deadline ? new Date(tournament.registration_deadline).toISOString().slice(0, 16) : '',
      status: tournament.status || 'upcoming',
      rules: tournament.rules || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.game || !formData.start_date) {
      toast({
        title: 'Error',
        description: 'Please fill required fields.',
        variant: 'destructive',
      });
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
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        registration_deadline: formData.registration_deadline ? new Date(formData.registration_deadline).toISOString() : null,
        status: formData.status,
        rules: formData.rules || null,
        created_by: user?.id,
      };

      if (editingTournament) {
        const { error } = await supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('id', editingTournament.id);

        if (error) throw error;
        toast({ title: 'Updated!', description: 'Tournament updated.' });
      } else {
        const { error } = await supabase
          .from('tournaments')
          .insert(tournamentData);

        if (error) throw error;
        toast({ title: 'Created!', description: 'Tournament created.' });
      }

      setDialogOpen(false);
      resetForm();
      fetchTournaments();
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tournament.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tournament?')) return;

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Deleted', description: 'Tournament deleted.' });
      fetchTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete.',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Admin">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/profile')} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Admin Panel</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{tournaments.length}</p>
              <p className="text-xs text-muted-foreground">Tournaments</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-4">
        <Tabs defaultValue="tournaments">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="tournaments" className="text-xs">Tournaments</TabsTrigger>
            <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments" className="mt-4">
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="gaming" size="sm" className="w-full mb-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tournament
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-bold">
                    {editingTournament ? 'Edit Tournament' : 'New Tournament'}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Game *</Label>
                      <Input
                        value={formData.game}
                        onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                        placeholder="BGMI"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Prize Pool</Label>
                      <Input
                        value={formData.prize_pool}
                        onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                        placeholder="₹10,000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Entry Fee</Label>
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button variant="gaming" className="w-full" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingTournament ? 'Update' : 'Create')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="space-y-3">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Gamepad2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-1">{tournament.title}</h3>
                      <p className="text-xs text-muted-foreground">{tournament.game}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(tournament.start_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge className={`text-[10px] ${
                      tournament.status === 'upcoming' ? 'bg-primary/10 text-primary' : 'bg-muted'
                    }`}>
                      {tournament.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(tournament)}>
                      <Edit2 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(tournament.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {tournaments.length === 0 && (
                <div className="text-center py-8">
                  <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">No tournaments yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {u.username?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{u.full_name || u.username || 'User'}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{u.email}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(u.created_at), 'MMM dd')}
                  </p>
                </div>
              ))}

              {users.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">No users yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
