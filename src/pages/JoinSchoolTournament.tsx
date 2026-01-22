import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Users,
  Gamepad2,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  IndianRupee,
  CheckCircle,
  Loader2,
  AlertCircle,
  School,
  UserPlus
} from 'lucide-react';

interface Tournament {
  id: string;
  tournament_name: string;
  school_name: string;
  school_city: string;
  school_state: string;
  school_image_url?: string;
  game: string;
  max_players: number;
  current_players: number;
  status: string;
  tournament_date: string;
  registration_deadline: string;
  entry_type: string;
  entry_fee: number;
  prize_pool: number;
}

const JoinSchoolTournament = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  
  // Join dialog
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (code) {
      fetchTournament();
    }
  }, [code]);

  useEffect(() => {
    if (user && tournament) {
      checkIfJoined();
      fetchWalletBalance();
    }
  }, [user, tournament]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('school_tournaments')
        .select('*')
        .eq('private_code', code?.toUpperCase())
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfJoined = async () => {
    if (!user || !tournament) return;
    
    const { data } = await supabase
      .from('school_tournament_teams')
      .select('id')
      .eq('tournament_id', tournament.id)
      .or(`leader_id.eq.${user.id},member_1_id.eq.${user.id},member_2_id.eq.${user.id},member_3_id.eq.${user.id}`)
      .single();

    setAlreadyJoined(!!data);
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('user_id', user.id)
      .single();

    if (data) setWalletBalance(data.wallet_balance || 0);
  };

  const handleJoin = async () => {
    if (!user) {
      navigate('/auth', { state: { from: `/join-school-tournament/${code}` } });
      return;
    }

    if (!teamName.trim()) {
      toast.error('Please enter your team name');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('register_school_tournament_team', {
        p_tournament_id: tournament!.id,
        p_team_name: teamName,
        p_leader_id: user.id,
        p_registration_method: 'qr'
      });

      if (error) throw error;

      toast.success('Successfully joined the tournament!');
      setJoinDialogOpen(false);
      setAlreadyJoined(true);
      fetchTournament();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join tournament');
    } finally {
      setProcessing(false);
    }
  };

  const isRegistrationOpen = tournament && 
    tournament.status === 'registration' && 
    new Date(tournament.registration_deadline) > new Date();

  const canAfford = tournament?.entry_type === 'free' || walletBalance >= (tournament?.entry_fee || 0);

  if (loading || authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!tournament) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Tournament Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The tournament code "{code}" is invalid or expired.
          </p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-20">
        {/* Header Image */}
        {tournament.school_image_url && (
          <div className="relative h-40">
            <img 
              src={tournament.school_image_url} 
              alt={tournament.school_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}

        {/* Tournament Info */}
        <div className="px-4 py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-2" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">{tournament.tournament_name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <School className="h-4 w-4" /> {tournament.school_name}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {tournament.school_city}, {tournament.school_state}
              </p>
            </div>
            <Badge variant={tournament.status === 'registration' ? 'secondary' : 'default'}>
              {tournament.status}
            </Badge>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Gamepad2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Game</p>
                  <p className="font-bold">{tournament.game}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Players</p>
                  <p className="font-bold">{tournament.current_players}/{tournament.max_players}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-bold text-sm">
                    {new Date(tournament.tournament_date).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                {tournament.entry_type === 'free' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <IndianRupee className="h-8 w-8 text-primary" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Entry</p>
                  <p className="font-bold">
                    {tournament.entry_type === 'free' ? 'FREE' : `₹${tournament.entry_fee}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Prize Pool */}
          {tournament.prize_pool > 0 && (
            <Card className="mt-4 border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-4 flex items-center justify-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Prize Pool</p>
                  <p className="text-2xl font-bold text-yellow-500">₹{tournament.prize_pool}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registration Deadline */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Registration Deadline:</span>
                <span className="font-medium">
                  {new Date(tournament.registration_deadline).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tournament Mode Info */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tournament Format</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode</span>
                <span className="font-medium">Squad (4 Players)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teams/Room</span>
                <span className="font-medium">{tournament.game === 'BGMI' ? 25 : 12}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-medium">Top 1 per room advances</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fixed Bottom Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          {alreadyJoined ? (
            <Button className="w-full" disabled>
              <CheckCircle className="h-4 w-4 mr-2" /> Already Joined
            </Button>
          ) : !isRegistrationOpen ? (
            <Button className="w-full" disabled>
              Registration Closed
            </Button>
          ) : tournament.current_players >= tournament.max_players ? (
            <Button className="w-full" disabled>
              Tournament Full
            </Button>
          ) : !user ? (
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth', { state: { from: `/join-school-tournament/${code}` } })}
            >
              Login to Join
            </Button>
          ) : (
            <Button className="w-full" onClick={() => setJoinDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> 
              Join Tournament {tournament.entry_type === 'paid' && `(₹${tournament.entry_fee})`}
            </Button>
          )}
        </div>
      </div>

      {/* Join Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Tournament</DialogTitle>
            <DialogDescription>
              Register your squad for {tournament.tournament_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Team Name *</Label>
              <Input
                placeholder="Enter your squad name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            {tournament.entry_type === 'paid' && (
              <Card className={!canAfford ? 'border-destructive' : ''}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Entry Fee</span>
                    <span className="font-bold">₹{tournament.entry_fee}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">Your Balance</span>
                    <span className={`font-medium ${canAfford ? 'text-green-500' : 'text-destructive'}`}>
                      ₹{walletBalance}
                    </span>
                  </div>
                  {!canAfford && (
                    <p className="text-xs text-destructive mt-2">
                      Insufficient balance. Please add ₹{tournament.entry_fee - walletBalance} to your wallet.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="text-xs text-muted-foreground">
              <p>• You will be registered as the team leader</p>
              <p>• Your teammates can be added later</p>
              <p>• Only squad mode (4 players) is available</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleJoin} 
              disabled={processing || !canAfford}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Join
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default JoinSchoolTournament;
