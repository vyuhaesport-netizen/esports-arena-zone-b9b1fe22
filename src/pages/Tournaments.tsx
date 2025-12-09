import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Search, 
  Loader2, 
  Gamepad2,
  Clock,
  IndianRupee
} from 'lucide-react';
import { format } from 'date-fns';

interface Tournament {
  id: string;
  title: string;
  game: string;
  description: string | null;
  image_url: string | null;
  prize_pool: string | null;
  entry_fee: number | null;
  max_participants: number | null;
  start_date: string;
  end_date: string | null;
  registration_deadline: string | null;
  status: string | null;
  rules: string | null;
}

const Tournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [registering, setRegistering] = useState<string | null>(null);
  const [registeredTournaments, setRegisteredTournaments] = useState<string[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
    if (user) {
      fetchUserRegistrations();
    }
  }, [user]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournaments',
        variant: 'destructive',
      });
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

  const handleRegister = async (tournamentId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setRegistering(tournamentId);

    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Registered',
            description: 'You are already registered for this tournament.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Registration Successful!',
          description: 'You have been registered for the tournament.',
        });
        setRegisteredTournaments([...registeredTournaments, tournamentId]);
      }
    } catch (error) {
      console.error('Error registering:', error);
      toast({
        title: 'Registration Failed',
        description: 'Failed to register for the tournament. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRegistering(null);
    }
  };

  const filteredTournaments = tournaments.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.game.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Upcoming</Badge>;
      case 'ongoing':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Live</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-gaming text-3xl md:text-4xl font-bold mb-2">
            <span className="gaming-text-gradient">Tournaments</span>
          </h1>
          <p className="text-muted-foreground">
            Browse and register for upcoming esports tournaments
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tournaments or games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tournaments Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-gaming text-xl font-semibold mb-2">No Tournaments Found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Check back later for upcoming tournaments'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-card rounded-xl border border-border overflow-hidden card-hover"
              >
                {/* Tournament Image */}
                <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                  {tournament.image_url ? (
                    <img 
                      src={tournament.image_url} 
                      alt={tournament.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Gamepad2 className="h-16 w-16 text-primary/40" />
                  )}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(tournament.status)}
                  </div>
                </div>

                {/* Tournament Details */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-gaming font-semibold text-lg line-clamp-1">
                      {tournament.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Gamepad2 className="h-4 w-4" />
                    <span>{tournament.game}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>{format(new Date(tournament.start_date), 'MMM dd, yyyy • hh:mm a')}</span>
                    </div>
                    
                    {tournament.prize_pool && (
                      <div className="flex items-center gap-2 text-sm">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span>Prize: {tournament.prize_pool}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <IndianRupee className="h-4 w-4 text-primary" />
                      <span>Entry: {tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free'}</span>
                    </div>

                    {tournament.max_participants && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-primary" />
                        <span>Max {tournament.max_participants} players</span>
                      </div>
                    )}
                  </div>

                  {tournament.status === 'upcoming' && (
                    <Button
                      variant={registeredTournaments.includes(tournament.id) ? 'secondary' : 'gaming'}
                      className="w-full"
                      disabled={registering === tournament.id || registeredTournaments.includes(tournament.id)}
                      onClick={() => handleRegister(tournament.id)}
                    >
                      {registering === tournament.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : registeredTournaments.includes(tournament.id) ? (
                        'Registered'
                      ) : (
                        'Register Now'
                      )}
                    </Button>
                  )}

                  {tournament.status === 'ongoing' && (
                    <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-medium">
                      <Clock className="h-4 w-4 animate-pulse" />
                      Tournament in Progress
                    </div>
                  )}

                  {tournament.status === 'completed' && (
                    <Button variant="secondary" className="w-full" disabled>
                      Tournament Ended
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tournaments;
