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
  UserPlus,
  Timer
} from 'lucide-react';
import RoundProgressionChart from '@/components/RoundProgressionChart';

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

interface PlayerProfile {
  user_id: string;
  username?: string;
  full_name?: string;
  in_game_name?: string;
  game_uid?: string;
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
  const [roomAssignments, setRoomAssignments] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [addTeamDialogOpen, setAddTeamDialogOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [declareWinnerDialogOpen, setDeclareWinnerDialogOpen] = useState(false);
  const [viewTeamsDialogOpen, setViewTeamsDialogOpen] = useState(false);
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, PlayerProfile>>({});
  
  // Form states
  const [manualTeam, setManualTeam] = useState({ teamName: '', leaderName: '' });
  const [roomCredentials, setRoomCredentials] = useState({ roomId: '', password: '', scheduledTime: '' });
  const [selectedWinnerTeam, setSelectedWinnerTeam] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [tournamentStats, setTournamentStats] = useState<{
    roomsByRound: Record<number, { total: number; completed: number }>;
  }>({ roomsByRound: {} });

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
          .order('room_number', { ascending: true }),
      ]);

      if (tournamentRes.data) setTournament(tournamentRes.data);
      if (teamsRes.data) setTeams(teamsRes.data);
      if (roomsRes.data) {
        setRooms(roomsRes.data);
        // Calculate rooms by round stats
        const roomStats: Record<number, { total: number; completed: number }> = {};
        roomsRes.data.forEach((room: any) => {
          if (!roomStats[room.round_number]) {
            roomStats[room.round_number] = { total: 0, completed: 0 };
          }
          roomStats[room.round_number].total++;
          if (room.status === 'completed') {
            roomStats[room.round_number].completed++;
          }
        });
        setTournamentStats({ roomsByRound: roomStats });
      }
      
      // Build room -> team_ids mapping (IMPORTANT: filter to this tournament rooms + fetch >1000 safely)
      const roomIds = (roomsRes.data || []).map((r: any) => r.id);
      if (roomIds.length > 0) {
        const { data: assignments, error: assignmentsError } = await supabase
          .from('school_tournament_room_assignments')
          .select('room_id, team_id')
          .in('room_id', roomIds)
          .range(0, 5000);

        if (assignmentsError) {
          console.warn('Failed to fetch room assignments:', assignmentsError);
        }

        const mapping: Record<string, string[]> = {};
        (assignments || []).forEach((a: any) => {
          if (!mapping[a.room_id]) mapping[a.room_id] = [];
          mapping[a.room_id].push(a.team_id);
        });
        setRoomAssignments(mapping);
      } else {
        setRoomAssignments({});
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      toast.error('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  // Fetch player profiles for a room when viewing teams
  const fetchRoomPlayerProfiles = async (room: Room) => {
    if (!room) return;
    
    const teamIds = roomAssignments[room.id] || [];
    const roomTeams = teams.filter(t => teamIds.includes(t.id));
    
    // Collect all player IDs
    const playerIds: string[] = [];
    roomTeams.forEach(team => {
      if (team.leader_id) playerIds.push(team.leader_id);
      if (team.member_1_id) playerIds.push(team.member_1_id);
      if (team.member_2_id) playerIds.push(team.member_2_id);
      if (team.member_3_id) playerIds.push(team.member_3_id);
    });

    if (playerIds.length === 0) return;

    // Fetch profiles (only unique IDs)
    const uniqueIds = [...new Set(playerIds)];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, full_name, in_game_name, game_uid')
      .in('user_id', uniqueIds);

    if (profiles) {
      const profileMap: Record<string, PlayerProfile> = {};
      profiles.forEach(p => {
        profileMap[p.user_id] = p;
      });
      setPlayerProfiles(prev => ({ ...prev, ...profileMap }));
    }
  };

  const handleViewRoomTeams = (room: Room) => {
    setSelectedRoom(room);
    setViewTeamsDialogOpen(true);
    fetchRoomPlayerProfiles(room);
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
    if (!id) return;
    setProcessing(true);
    try {
      // Prevent duplicate start: if rooms already exist for this round, don't call the RPC again
      const { data: existingRooms, error: existingRoomsError } = await supabase
        .from('school_tournament_rooms')
        .select('id')
        .eq('tournament_id', id)
        .eq('round_number', roundNumber)
        .limit(1);

      if (existingRoomsError) throw existingRoomsError;

      if (existingRooms && existingRooms.length > 0) {
        await supabase
          .from('school_tournaments')
          .update({
            status: roundNumber === tournament?.total_rounds ? 'finale' : `round_${roundNumber}`,
            current_round: roundNumber,
          })
          .eq('id', id);

        toast.success(`Round ${roundNumber} already started`);
        fetchTournamentData();
        return;
      }

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

  const handleStartNextRound = async () => {
    if (!tournament) return;
    
    // CRITICAL: Prevent creating rounds beyond total_rounds
    if (tournament.current_round >= tournament.total_rounds) {
      toast.error('Tournament has reached finale. No more rounds can be created.');
      return;
    }
    
    setProcessing(true);
    try {
      // Determine which round to process based on room state
      const currentRoundRoomsCheck = rooms.filter(r => r.round_number === tournament.current_round);
      const previousRoundRoomsCheck = rooms.filter(r => r.round_number === (tournament.current_round - 1));
      
      // If current round has no rooms but previous round rooms exist, we need to create current round rooms
      const needsCurrentRoundRooms = currentRoundRoomsCheck.length === 0 && previousRoundRoomsCheck.length > 0;
      
      const roundToProcess = needsCurrentRoundRooms 
        ? tournament.current_round - 1 // Process from previous round
        : tournament.current_round;      // Normal - process from current round
      
      // Call backend function to generate next round (it will delete old rooms + create new ones)
      const { data: result, error } = await supabase.functions.invoke('school-tournament-engine', {
        body: {
          action: 'start_next_round',
          tournamentId: id,
          currentRound: roundToProcess,
        }
      });

      if (error) throw error;
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to start next round');
      }
      
      const targetRound = needsCurrentRoundRooms ? tournament.current_round : (tournament.current_round || 1) + 1;
      toast.success(`Round ${targetRound} started with ${result.newRoomsCreated} rooms!`);
      
      fetchTournamentData();
    } catch (error: any) {
      console.error('Start next round error:', error);
      toast.error(error.message || 'Failed to start next round');
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
      const updateData: any = {
        room_id: roomCredentials.roomId,
        room_password: roomCredentials.password,
        status: 'credentials_set'
      };
      
      // Add scheduled time if provided
      if (roomCredentials.scheduledTime) {
        updateData.scheduled_time = new Date(roomCredentials.scheduledTime).toISOString();
      }
      
      const { error } = await supabase
        .from('school_tournament_rooms')
        .update(updateData)
        .eq('id', selectedRoom.id);

      if (error) throw error;

      toast.success('Room credentials saved!');
      setRoomDialogOpen(false);
      setRoomCredentials({ roomId: '', password: '', scheduledTime: '' });
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
  
  // Check if previous round rooms need to be cleaned up and new round rooms created
  const previousRoundRooms = rooms.filter(r => r.round_number === (tournament?.current_round || 1) - 1);
  const hasPreviousRoundRoomsOnly = currentRoundRooms.length === 0 && previousRoundRooms.length > 0;
  const allPreviousRoomsCompleted = previousRoundRooms.every(r => r.status === 'completed');
  const allCurrentRoomsCompleted = currentRoundRooms.length > 0 && currentRoundRooms.every(r => r.status === 'completed');
  
  // CRITICAL: Don't allow next round if we're already at total_rounds (finale)
  const isAtFinale = (tournament?.current_round || 0) >= (tournament?.total_rounds || 999);
  
  // Show "Start Round X" button when:
  // 1. NOT at finale already
  // 2. Current round has no rooms but previous round rooms are all completed (need to create new round rooms)
  // 3. OR Current round rooms exist and are all completed (ready for next round)
  const shouldShowStartNextRound = !isAtFinale && ((hasPreviousRoundRoomsOnly && allPreviousRoomsCompleted) || allCurrentRoomsCompleted);
  const nextRoundNumber = (tournament?.current_round || 1) + (hasPreviousRoundRoomsOnly ? 0 : 1);

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
              <h1 className="text-lg font-bold">{tournament.tournament_name}</h1>
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

            {/* Round Progression Chart */}
            <RoundProgressionChart
              game={tournament.game}
              totalTeams={teams.length}
              currentRound={tournament.current_round}
              status={tournament.status}
              roomsByRound={tournamentStats.roomsByRound}
            />

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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rooms Completed</span>
                      <span className="font-bold">
                        {currentRoundRooms.length > 0 
                          ? `${currentRoundRooms.filter(r => r.status === 'completed').length} / ${currentRoundRooms.length}`
                          : `${previousRoundRooms.filter(r => r.status === 'completed').length} / ${previousRoundRooms.length}`
                        }
                      </span>
                    </div>
                    
                    {/* Show Start Next Round button when ready */}
                    {shouldShowStartNextRound ? (
                      <Button 
                        className="w-full" 
                        onClick={() => handleStartNextRound()}
                        disabled={processing}
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        {hasPreviousRoundRoomsOnly 
                          ? `Create Round ${tournament.current_round} Rooms`
                          : `Start Round ${nextRoundNumber}`
                        }
                      </Button>
                    ) : (
                      <p className="text-xs text-center text-muted-foreground">
                        Complete all rooms to start next round
                      </p>
                    )}
                  </div>
                ) : tournament.status === 'finale' ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <Trophy className="h-8 w-8 mx-auto text-warning mb-2" />
                      <p className="font-semibold text-sm">Grand Finale!</p>
                      <p className="text-xs text-muted-foreground">{activeTeams.length} teams competing</p>
                    </div>
                    
                    {/* Finale Room Controls */}
                    {currentRoundRooms.length === 0 ? (
                      <Button 
                        className="w-full" 
                        onClick={() => handleStartRound(tournament.current_round)}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                        Start Finale Room
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Finale Room</span>
                        <Badge variant={currentRoundRooms[0]?.status === 'completed' ? 'default' : 'secondary'}>
                          {currentRoundRooms[0]?.status || 'waiting'}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
                    <p className="font-semibold text-sm">Tournament Completed!</p>
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
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Round {room.round_number} • Room {room.room_number}</span>
                              {room.scheduled_time && (
                                <span className="flex items-center gap-1 text-primary">
                                  <Timer className="h-3 w-3" />
                                  {new Date(room.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
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

                        <div className="flex gap-2 flex-wrap">
                          {/* View Teams Button - always visible */}
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => handleViewRoomTeams(room)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> View Teams ({(roomAssignments[room.id] || []).length})
                          </Button>
                          
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
            <div className="bg-white p-4 rounded-lg relative">
              <QRCodeCanvas
                value={`${window.location.origin}/join-school-tournament/${tournament?.private_code}`}
                size={200}
                level="H"
              />
              {/* School Image in Center */}
              {tournament?.school_image_url && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white rounded-lg scale-125" />
                    <img 
                      src={tournament.school_image_url} 
                      alt={tournament.school_name}
                      className="relative w-12 h-12 object-cover rounded-lg ring-2 ring-primary"
                    />
                  </div>
                </div>
              )}
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
            <div>
              <Label className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Start Time (Optional)
              </Label>
              <Input
                type="datetime-local"
                value={roomCredentials.scheduledTime}
                onChange={(e) => setRoomCredentials(prev => ({ ...prev, scheduledTime: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Each room can have its own start time
              </p>
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
                {/* Filter teams by room assignments, not by current_round */}
                {selectedRoom && roomAssignments[selectedRoom.id] ? (
                  teams
                    .filter(t => roomAssignments[selectedRoom.id]?.includes(t.id))
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
                    ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No teams assigned to this room
                  </p>
                )}
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

      {/* View Teams Dialog - Shows teams in a room with player details */}
      <Dialog open={viewTeamsDialogOpen} onOpenChange={setViewTeamsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedRoom?.room_name}
            </DialogTitle>
            <DialogDescription>
              {(roomAssignments[selectedRoom?.id || ''] || []).length} teams assigned
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] mt-4">
            <div className="space-y-3">
              {selectedRoom && roomAssignments[selectedRoom.id] ? (
                teams
                  .filter(t => roomAssignments[selectedRoom.id]?.includes(t.id))
                  .map((team, idx) => {
                    // Get player IDs for this team
                    const playerIds = [
                      team.leader_id,
                      team.member_1_id,
                      team.member_2_id,
                      team.member_3_id
                    ].filter(Boolean);

                    return (
                      <Card key={team.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </div>
                              <span className="font-medium">{team.team_name}</span>
                            </div>
                            {team.is_eliminated && (
                              <Badge variant="destructive" className="text-xs">Eliminated</Badge>
                            )}
                          </div>
                          {/* Player Details */}
                          <div className="space-y-1 text-xs">
                            {playerIds.map((pid, pIdx) => {
                              const profile = playerProfiles[pid as string];
                              return (
                                <div key={pid} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded">
                                  <span className="text-muted-foreground w-6">P{pIdx + 1}</span>
                                  <div className="flex-1">
                                    <span className="font-medium">
                                      {profile?.in_game_name || profile?.username || 'Player ' + (pIdx + 1)}
                                    </span>
                                    {profile?.game_uid && (
                                      <span className="text-muted-foreground ml-2">
                                        UID: {profile.game_uid}
                                      </span>
                                    )}
                                  </div>
                                  {pIdx === 0 && (
                                    <Badge variant="secondary" className="text-xs py-0">Leader</Badge>
                                  )}
                                </div>
                              );
                            })}
                            {playerIds.length === 0 && (
                              <p className="text-muted-foreground italic">No players registered yet</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No teams in this room
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SchoolTournamentManage;
