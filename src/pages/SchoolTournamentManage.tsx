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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ArrowLeft,
  Users,
  Gamepad2,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Play,
  StopCircle,
  QrCode,
  Share2,
  Download,
  Plus,
  Eye,
  CheckCircle,
  Crown,
  Medal,
  Loader2,
  IndianRupee,
  RefreshCw,
  Lock,
  UserPlus
} from 'lucide-react';

interface Tournament {
  id: string;
  tournament_name: string;
  school_name: string;
  school_city: string;
  school_state: string;
  school_district: string;
  school_image_url?: string;
  game: string;
  max_players: number;
  current_players: number;
  status: string;
  tournament_date: string;
  registration_deadline: string;
  private_code: string;
  total_rooms: number;
  current_round: number;
  total_rounds: number;
  entry_type: string;
  entry_fee: number;
  prize_pool: number;
  total_collected: number;
  players_per_room: number;
}

interface Team {
  id: string;
  team_name: string;
  leader_id: string;
  member_1_id?: string;
  member_2_id?: string;
  member_3_id?: string;
  current_round: number;
  is_eliminated: boolean;
  final_rank?: number;
  registration_method: string;
  registered_at: string;
  leader_profile?: { username: string; full_name: string };
}

interface Room {
  id: string;
  round_number: number;
  room_number: number;
  room_name: string;
  room_id?: string;
  room_password?: string;
  status: string;
  scheduled_time?: string;
  winner_team_id?: string;
  teams?: Team[];
}

const SchoolTournamentManage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [addTeamDialogOpen, setAddTeamDialogOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [declareWinnerDialogOpen, setDeclareWinnerDialogOpen] = useState(false);
  
  // Form states
  const [manualTeam, setManualTeam] = useState({ teamName: '', leaderName: '' });
  const [roomCredentials, setRoomCredentials] = useState({ roomId: '', password: '' });
  const [selectedWinnerTeam, setSelectedWinnerTeam] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTournamentData();
    }
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      const [tournamentRes, teamsRes, roomsRes] = await Promise.all([
        supabase.from('school_tournaments').select('*').eq('id', id).single(),
        supabase
          .from('school_tournament_teams')
          .select('*')
          .eq('tournament_id', id)
          .order('registered_at', { ascending: true }),
        supabase
          .from('school_tournament_rooms')
          .select('*')
          .eq('tournament_id', id)
          .order('round_number', { ascending: true })
          .order('room_number', { ascending: true })
      ]);

      if (tournamentRes.data) setTournament(tournamentRes.data);
      if (teamsRes.data) setTeams(teamsRes.data);
      if (roomsRes.data) setRooms(roomsRes.data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      toast.error('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualTeam = async () => {
    if (!manualTeam.teamName) {
      toast.error('Please enter team name');
      return;
    }

    setProcessing(true);
    try {
      // Create a placeholder team with manual registration
      const { error } = await supabase.from('school_tournament_teams').insert({
        tournament_id: id,
        team_name: manualTeam.teamName,
        leader_id: user!.id, // Organizer as placeholder
        registration_method: 'manual'
      });

      if (error) throw error;

      // Update player count
      await supabase
        .from('school_tournaments')
        .update({ current_players: (tournament?.current_players || 0) + 4 })
        .eq('id', id);

      toast.success('Team added successfully!');
      setManualTeam({ teamName: '', leaderName: '' });
      setAddTeamDialogOpen(false);
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add team');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartRound = async (roundNumber: number) => {
    setProcessing(true);
    try {
      // Generate rooms for this round
      const { data, error } = await supabase.rpc('generate_tournament_round_rooms', {
        p_tournament_id: id,
        p_round_number: roundNumber
      });

      if (error) throw error;

      toast.success(`Round ${roundNumber} started with ${data} rooms!`);
      
      // Update tournament status
      await supabase
        .from('school_tournaments')
        .update({ 
          status: roundNumber === tournament?.total_rounds ? 'finale' : `round_${roundNumber}`,
          current_round: roundNumber
        })
        .eq('id', id);

      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start round');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetRoomCredentials = async () => {
    if (!selectedRoom || !roomCredentials.roomId || !roomCredentials.password) {
      toast.error('Please fill room ID and password');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('school_tournament_rooms')
        .update({
          room_id: roomCredentials.roomId,
          room_password: roomCredentials.password,
          status: 'credentials_set'
        })
        .eq('id', selectedRoom.id);

      if (error) throw error;

      toast.success('Room credentials saved!');
      setRoomDialogOpen(false);
      setRoomCredentials({ roomId: '', password: '' });
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save credentials');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclareRoomWinner = async () => {
    if (!selectedRoom || !selectedWinnerTeam) {
      toast.error('Please select a winner team');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.rpc('declare_room_winner', {
        p_room_id: selectedRoom.id,
        p_winner_team_id: selectedWinnerTeam
      });

      if (error) throw error;

      toast.success('Winner declared! Team advances to next round.');
      setDeclareWinnerDialogOpen(false);
      setSelectedWinnerTeam('');
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to declare winner');
    } finally {
      setProcessing(false);
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/join-school-tournament/${tournament?.private_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'secondary';
      case 'finale': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const teamsPerRoom = tournament?.game === 'BGMI' ? 25 : 12;
  const activeTeams = teams.filter(t => !t.is_eliminated);
  const currentRoundRooms = rooms.filter(r => r.round_number === tournament?.current_round);

  if (loading) {
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
          <p className="text-muted-foreground">Tournament not found</p>
          <Button className="mt-4" onClick={() => navigate('/school-tournament')}>
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/school-tournament')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-gaming text-lg font-bold">{tournament.tournament_name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {tournament.school_name}
              </p>
            </div>
            <Badge variant={getStatusColor(tournament.status)}>
              {tournament.status}
            </Badge>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center p-2 bg-card rounded-lg">
              <p className="text-lg font-bold">{tournament.current_players}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="text-center p-2 bg-card rounded-lg">
              <p className="text-lg font-bold">{teams.length}</p>
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
            <div className="text-center p-2 bg-card rounded-lg">
              <p className="text-lg font-bold">{tournament.current_round}/{tournament.total_rounds}</p>
              <p className="text-xs text-muted-foreground">Round</p>
            </div>
            <div className="text-center p-2 bg-card rounded-lg">
              <p className="text-lg font-bold">{activeTeams.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex gap-2 p-4 overflow-x-auto">
          <Button size="sm" variant="outline" onClick={() => setQrDialogOpen(true)}>
            <QrCode className="h-4 w-4 mr-1" /> QR Code
          </Button>
          <Button size="sm" variant="outline" onClick={copyShareLink}>
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAddTeamDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Add Team
          </Button>
          <Button size="sm" variant="outline" onClick={fetchTournamentData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">Teams ({teams.length})</TabsTrigger>
            <TabsTrigger value="rooms">Rooms ({rooms.length})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Tournament Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tournament Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game</span>
                  <span className="font-medium">{tournament.game}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="font-medium">Squad (4 players)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Players</span>
                  <span className="font-medium">{tournament.max_players}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teams/Room</span>
                  <span className="font-medium">{teamsPerRoom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Type</span>
                  <span className="font-medium capitalize">{tournament.entry_type}</span>
                </div>
                {tournament.entry_type === 'paid' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entry Fee</span>
                      <span className="font-medium">₹{tournament.entry_fee}/team</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Collected</span>
                      <span className="font-medium text-green-500">₹{tournament.total_collected}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Private Code */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Join Code</p>
                    <p className="text-2xl font-mono font-bold tracking-widest">
                      {tournament.private_code}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setQrDialogOpen(true)}>
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Round Control */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Round Management</CardTitle>
                <CardDescription>
                  {tournament.status === 'registration' 
                    ? 'Start Round 1 when ready' 
                    : `Currently in ${tournament.status}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tournament.status === 'registration' && teams.length >= teamsPerRoom ? (
                  <Button 
                    className="w-full" 
                    onClick={() => handleStartRound(1)}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    Start Round 1
                  </Button>
                ) : tournament.status === 'registration' ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Need at least {teamsPerRoom} teams to start</p>
                    <p className="text-xs">Current: {teams.length} teams</p>
                  </div>
                ) : tournament.status !== 'completed' && tournament.status !== 'finale' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Complete all rooms in current round to advance
                    </p>
                    <div className="flex items-center justify-between">
                      <span>Rooms Completed</span>
                      <span className="font-bold">
                        {currentRoundRooms.filter(r => r.status === 'completed').length} / {currentRoundRooms.length}
                      </span>
                    </div>
                  </div>
                ) : tournament.status === 'finale' ? (
                  <div className="text-center py-4">
                    <Trophy className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                    <p className="font-semibold">Grand Finale!</p>
                    <p className="text-sm text-muted-foreground">{activeTeams.length} teams competing</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                    <p className="font-semibold">Tournament Completed!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-2">
                {teams.map((team, index) => (
                  <Card key={team.id} className={team.is_eliminated ? 'opacity-50' : ''}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{team.team_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Round {team.current_round} • {team.registration_method}
                          </p>
                        </div>
                      </div>
                      {team.is_eliminated ? (
                        <Badge variant="destructive" className="text-xs">Eliminated</Badge>
                      ) : team.final_rank ? (
                        <Badge className="text-xs">
                          {team.final_rank === 1 && <Crown className="h-3 w-3 mr-1" />}
                          #{team.final_rank}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms" className="mt-4">
            {rooms.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No rooms created yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start a round to generate rooms
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <Card key={room.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{room.room_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Round {room.round_number} • Room {room.room_number}
                            </p>
                          </div>
                          <Badge variant={
                            room.status === 'completed' ? 'default' :
                            room.status === 'credentials_set' ? 'secondary' : 'outline'
                          }>
                            {room.status}
                          </Badge>
                        </div>

                        {room.room_id && (
                          <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded mb-2">
                            <Lock className="h-3 w-3" />
                            <span>ID: {room.room_id}</span>
                            <span>•</span>
                            <span>Pass: {room.room_password}</span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {room.status === 'waiting' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => {
                                setSelectedRoom(room);
                                setRoomDialogOpen(true);
                              }}
                            >
                              <Lock className="h-3 w-3 mr-1" /> Set Credentials
                            </Button>
                          )}
                          {room.status === 'credentials_set' && !room.winner_team_id && (
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                setSelectedRoom(room);
                                setDeclareWinnerDialogOpen(true);
                              }}
                            >
                              <Trophy className="h-3 w-3 mr-1" /> Declare Winner
                            </Button>
                          )}
                          {room.winner_team_id && (
                            <div className="flex-1 text-center text-sm text-green-500">
                              <CheckCircle className="h-4 w-4 inline mr-1" />
                              Winner Declared
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tournament QR Code</DialogTitle>
            <DialogDescription>Scan to join the tournament</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeCanvas
                value={`${window.location.origin}/join-school-tournament/${tournament?.private_code}`}
                size={200}
                level="H"
              />
            </div>
            <p className="text-2xl font-mono font-bold mt-4 tracking-widest">
              {tournament?.private_code}
            </p>
            <Button className="mt-4 w-full" onClick={copyShareLink}>
              <Share2 className="h-4 w-4 mr-2" /> Copy Join Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Team Dialog */}
      <Dialog open={addTeamDialogOpen} onOpenChange={setAddTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Manually</DialogTitle>
            <DialogDescription>Register a team offline</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Team Name *</Label>
              <Input
                placeholder="Team Alpha"
                value={manualTeam.teamName}
                onChange={(e) => setManualTeam(prev => ({ ...prev, teamName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Leader Name (Optional)</Label>
              <Input
                placeholder="Player Name"
                value={manualTeam.leaderName}
                onChange={(e) => setManualTeam(prev => ({ ...prev, leaderName: e.target.value }))}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleAddManualTeam}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Team
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Credentials Dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Room Credentials</DialogTitle>
            <DialogDescription>{selectedRoom?.room_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Room ID *</Label>
              <Input
                placeholder="Enter Room ID"
                value={roomCredentials.roomId}
                onChange={(e) => setRoomCredentials(prev => ({ ...prev, roomId: e.target.value }))}
              />
            </div>
            <div>
              <Label>Password *</Label>
              <Input
                placeholder="Enter Password"
                value={roomCredentials.password}
                onChange={(e) => setRoomCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleSetRoomCredentials}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Save Credentials
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Declare Winner Dialog */}
      <Dialog open={declareWinnerDialogOpen} onOpenChange={setDeclareWinnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare Room Winner</DialogTitle>
            <DialogDescription>
              {selectedRoom?.room_name} - Select the winning team
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {teams
                  .filter(t => !t.is_eliminated && t.current_round === selectedRoom?.round_number)
                  .map((team) => (
                    <button
                      key={team.id}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedWinnerTeam === team.id 
                          ? 'border-primary bg-primary/10' 
                          : 'border-muted hover:bg-muted'
                      }`}
                      onClick={() => setSelectedWinnerTeam(team.id)}
                    >
                      <div className="flex items-center gap-3">
                        {selectedWinnerTeam === team.id && (
                          <Crown className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">{team.team_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {team.registration_method} registration
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </ScrollArea>
            <Button 
              className="w-full mt-4" 
              onClick={handleDeclareRoomWinner}
              disabled={!selectedWinnerTeam || processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trophy className="h-4 w-4 mr-2" />
              )}
              Confirm Winner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SchoolTournamentManage;
