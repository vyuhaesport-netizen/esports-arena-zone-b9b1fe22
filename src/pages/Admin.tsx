import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Shield,
  Calendar,
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
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/');
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access the admin panel.',
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
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
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

        toast({
          title: 'Tournament Updated',
          description: 'The tournament has been updated successfully.',
        });
      } else {
        const { error } = await supabase
          .from('tournaments')
          .insert(tournamentData);

        if (error) throw error;

        toast({
          title: 'Tournament Created',
          description: 'The tournament has been created successfully.',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchTournaments();
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tournament. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Tournament Deleted',
        description: 'The tournament has been deleted successfully.',
      });
      
      fetchTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tournament. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-gaming text-3xl font-bold">
              <span className="gaming-text-gradient">Admin Panel</span>
            </h1>
            <p className="text-muted-foreground">Manage tournaments and users</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-gaming font-bold">{tournaments.length}</p>
                <p className="text-sm text-muted-foreground">Total Tournaments</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-gaming font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Registered Users</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Gamepad2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-gaming font-bold">
                  {tournaments.filter(t => t.status === 'ongoing').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Tournaments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tournaments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tournaments" className="font-gaming">
              <Trophy className="mr-2 h-4 w-4" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger value="users" className="font-gaming">
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments">
            <div className="bg-card rounded-xl border border-border">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="font-gaming font-semibold text-lg">Manage Tournaments</h2>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button variant="gaming">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Tournament
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-gaming">
                        {editingTournament ? 'Edit Tournament' : 'Create New Tournament'}
                      </DialogTitle>
                      <DialogDescription>
                        Fill in the details below to {editingTournament ? 'update' : 'create'} a tournament.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title *</Label>
                          <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Tournament title"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="game">Game *</Label>
                          <Input
                            id="game"
                            value={formData.game}
                            onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                            placeholder="e.g., BGMI, Free Fire"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Tournament description..."
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="prize_pool">Prize Pool</Label>
                          <Input
                            id="prize_pool"
                            value={formData.prize_pool}
                            onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                            placeholder="e.g., ₹10,000"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="entry_fee">Entry Fee (₹)</Label>
                          <Input
                            id="entry_fee"
                            type="number"
                            value={formData.entry_fee}
                            onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                            placeholder="0 for free"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="max_participants">Max Participants</Label>
                          <Input
                            id="max_participants"
                            type="number"
                            value={formData.max_participants}
                            onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                            placeholder="100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start_date">Start Date *</Label>
                          <Input
                            id="start_date"
                            type="datetime-local"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="end_date">End Date</Label>
                          <Input
                            id="end_date"
                            type="datetime-local"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="registration_deadline">Registration Deadline</Label>
                          <Input
                            id="registration_deadline"
                            type="datetime-local"
                            value={formData.registration_deadline}
                            onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
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

                      <div className="space-y-2">
                        <Label htmlFor="rules">Rules</Label>
                        <Textarea
                          id="rules"
                          value={formData.rules}
                          onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                          placeholder="Tournament rules..."
                          rows={4}
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button variant="gaming" onClick={handleSave} disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              {editingTournament ? 'Update' : 'Create'} Tournament
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Game</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prize Pool</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tournaments.map((tournament) => (
                      <TableRow key={tournament.id}>
                        <TableCell className="font-medium">{tournament.title}</TableCell>
                        <TableCell>{tournament.game}</TableCell>
                        <TableCell>
                          {format(new Date(tournament.start_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tournament.status === 'upcoming'
                                ? 'bg-primary/10 text-primary'
                                : tournament.status === 'ongoing'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {tournament.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{tournament.prize_pool || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(tournament)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(tournament.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {tournaments.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No tournaments yet. Create your first tournament!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-card rounded-xl border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="font-gaming font-semibold text-lg">Registered Users</h2>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name || user.username || 'Unknown'}</p>
                              {user.username && (
                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {users.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No users registered yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
