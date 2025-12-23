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
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

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
  tournaments: {
    title: string;
    game: string;
    start_date: string;
    status: string | null;
    prize_pool: string | null;
    entry_fee: number | null;
    room_id: string | null;
    room_password: string | null;
    joined_users: string[] | null;
  };
}

const MyMatch = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
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
          tournaments (
            title,
            game,
            start_date,
            status,
            prize_pool,
            entry_fee,
            room_id,
            room_password,
            joined_users
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

  const handleCancel = async (registrationId: string, tournamentId: string, startDate: string) => {
    if (!user) return;

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
  const completedMatches = registrations.filter(r => r.tournaments.status === 'completed');

  const MatchCard = ({ registration, showCancel = false }: { registration: Registration; showCancel?: boolean }) => {
    const [playersDialogOpen, setPlayersDialogOpen] = useState(false);
    const [roomOpen, setRoomOpen] = useState(false);
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

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
      <div className="bg-card rounded-xl border border-border p-4">
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
                <span className="text-primary font-medium">{registration.tournaments.prize_pool}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge 
              className={`text-[10px] ${
                registration.tournaments.status === 'upcoming' 
                  ? 'bg-primary/10 text-primary' 
                  : registration.tournaments.status === 'ongoing'
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {registration.tournaments.status}
            </Badge>
            {showCancel && (
              <button 
                onClick={() => handleCancel(registration.id, registration.tournament_id, registration.tournaments.start_date)}
                disabled={canceling === registration.id}
                className="text-destructive text-xs flex items-center gap-1 disabled:opacity-50"
              >
                <X className="h-3 w-3" /> {canceling === registration.id ? 'Exiting...' : 'Exit'}
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons Section */}
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
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="upcoming" className="text-xs">
              Upcoming ({upcomingMatches.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="text-xs">
              Live ({liveMatches.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              Completed ({completedMatches.length})
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
                  <MatchCard key={reg.id} registration={reg} />
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
