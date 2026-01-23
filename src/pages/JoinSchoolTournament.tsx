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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  UserPlus,
  Crown,
  Lock,
  Timer
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
  current_round: number;
  total_rounds: number;
  status: string;
  tournament_date: string;
  registration_deadline: string;
  entry_type: string;
  entry_fee: number;
  prize_pool: number;
  total_rooms: number;
}

interface MyTeam {
  id: string;
  team_name: string;
  leader_id: string;
  member_1_id?: string;
  member_2_id?: string;
  member_3_id?: string;
  current_round: number;
  is_eliminated: boolean;
  final_rank?: number;
}

interface RoomTeam {
  id: string;
  team_name: string;
  leader_id: string;
  member_1_id?: string;
  member_2_id?: string;
  member_3_id?: string;
}

interface MyRoom {
  id: string;
  room_name: string;
  room_number: number;
  round_number: number;
  room_id?: string;
  room_password?: string;
  status: string;
  scheduled_time?: string;
}

interface PlayerProfile {
  user_id: string;
  username?: string;
  in_game_name?: string;
  game_uid?: string;
}

const JoinSchoolTournament = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [myTeam, setMyTeam] = useState<MyTeam | null>(null);
  const [myRoom, setMyRoom] = useState<MyRoom | null>(null);
  const [roomTeams, setRoomTeams] = useState<RoomTeam[]>([]);
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, PlayerProfile>>({});
  
  // Join dialog
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

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
    
    const { data: teamData } = await supabase
      .from('school_tournament_teams')
      .select('*')
      .eq('tournament_id', tournament.id)
      .or(`leader_id.eq.${user.id},member_1_id.eq.${user.id},member_2_id.eq.${user.id},member_3_id.eq.${user.id}`)
      .single();

    if (teamData) {
      setAlreadyJoined(true);
      setMyTeam(teamData);
      setActiveTab('my-room');
      
      // Fetch my room assignment
      const { data: assignmentData } = await supabase
        .from('school_tournament_room_assignments')
        .select('room_id')
        .eq('team_id', teamData.id)
        .single();

      if (assignmentData) {
        // Fetch room details
        const { data: roomData } = await supabase
          .from('school_tournament_rooms')
          .select('*')
          .eq('id', assignmentData.room_id)
          .single();

        if (roomData) {
          setMyRoom(roomData);
          
          // Fetch all teams in this room
          const { data: roomAssignments } = await supabase
            .from('school_tournament_room_assignments')
            .select('team_id')
            .eq('room_id', roomData.id);

          if (roomAssignments && roomAssignments.length > 0) {
            const teamIds = roomAssignments.map(a => a.team_id);
            
            const { data: teamsData } = await supabase
              .from('school_tournament_teams')
              .select('id, team_name, leader_id, member_1_id, member_2_id, member_3_id')
              .in('id', teamIds);

            if (teamsData) {
              setRoomTeams(teamsData);
              
              // Fetch player profiles for all teams
              const allPlayerIds: string[] = [];
              teamsData.forEach(team => {
                if (team.leader_id) allPlayerIds.push(team.leader_id);
                if (team.member_1_id) allPlayerIds.push(team.member_1_id);
                if (team.member_2_id) allPlayerIds.push(team.member_2_id);
                if (team.member_3_id) allPlayerIds.push(team.member_3_id);
              });

              const uniqueIds = [...new Set(allPlayerIds)];
              if (uniqueIds.length > 0) {
                const { data: profiles } = await supabase
                  .from('profiles')
                  .select('user_id, username, in_game_name, game_uid')
                  .in('user_id', uniqueIds);

                if (profiles) {
                  const profileMap: Record<string, PlayerProfile> = {};
                  profiles.forEach(p => { profileMap[p.user_id] = p; });
                  setPlayerProfiles(profileMap);
                }
              }
            }
          }
        }
      }
    } else {
      setAlreadyJoined(false);
    }
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
      checkIfJoined();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join tournament');
    } finally {
      setProcessing(false);
    }
  };

  const isRegistrationOpen = tournament && 
    tournament.status === 'registration' && 
    new Date(tournament.registration_deadline) > new Date();

  const isFull = tournament && tournament.current_players >= tournament.max_players;
  const canAfford = tournament?.entry_type === 'free' || walletBalance >= (tournament?.entry_fee || 0);
  const teamsPerRoom = tournament?.game === 'BGMI' ? 25 : 12;

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
      <div className="pb-40">
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
            <div className="flex flex-col items-end gap-1">
              <Badge variant={tournament.status === 'registration' ? 'secondary' : 'default'}>
                {tournament.status}
              </Badge>
              {isFull && (
                <Badge variant="destructive">FULL</Badge>
              )}
            </div>
          </div>

          {/* Tabs for Joined Users */}
          {alreadyJoined ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my-room">My Room</TabsTrigger>
                <TabsTrigger value="info">Tournament Info</TabsTrigger>
              </TabsList>

              {/* My Room Tab */}
              <TabsContent value="my-room" className="mt-4 space-y-4">
                {myRoom ? (
                  <>
                    {/* Room Info Card */}
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{myRoom.room_name}</CardTitle>
                          <Badge variant={myRoom.status === 'completed' ? 'default' : 'secondary'}>
                            {myRoom.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          Round {myRoom.round_number} • Room {myRoom.room_number}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* My Team Highlight */}
                        {myTeam && (
                          <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Crown className="h-4 w-4 text-yellow-500" />
                              <span className="font-medium">Your Team: {myTeam.team_name}</span>
                            </div>
                            {myTeam.is_eliminated && (
                              <Badge variant="destructive">Eliminated</Badge>
                            )}
                            {myTeam.final_rank && (
                              <Badge className="bg-yellow-500">Rank #{myTeam.final_rank}</Badge>
                            )}
                          </div>
                        )}

                        {/* Room Credentials (if set) */}
                        {myRoom.room_id && (
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Lock className="h-4 w-4" />
                              <span className="font-medium">Room Credentials</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Room ID:</span>
                                <span className="ml-2 font-mono font-bold">{myRoom.room_id}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Password:</span>
                                <span className="ml-2 font-mono font-bold">{myRoom.room_password}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Scheduled Time */}
                        {myRoom.scheduled_time && (
                          <div className="flex items-center gap-2 text-sm">
                            <Timer className="h-4 w-4 text-primary" />
                            <span>Match Time: {new Date(myRoom.scheduled_time).toLocaleString()}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Teams in My Room */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Teams in Your Room ({roomTeams.length}/{teamsPerRoom})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {roomTeams.map((team, idx) => {
                              const isMyTeam = team.id === myTeam?.id;
                              const playerIds = [
                                team.leader_id,
                                team.member_1_id,
                                team.member_2_id,
                                team.member_3_id
                              ].filter(Boolean);

                              return (
                                <Card 
                                  key={team.id} 
                                  className={isMyTeam ? 'border-primary bg-primary/5' : ''}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                                        {idx + 1}
                                      </div>
                                      <span className="font-medium flex-1">{team.team_name}</span>
                                      {isMyTeam && (
                                        <Badge variant="secondary" className="text-xs">You</Badge>
                                      )}
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      {playerIds.map((pid, pIdx) => {
                                        const profile = playerProfiles[pid as string];
                                        return (
                                          <div key={pid} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded">
                                            <span className="text-muted-foreground w-6">P{pIdx + 1}</span>
                                            <div className="flex-1 flex items-center gap-2">
                                              <span className="font-medium">
                                                {profile?.in_game_name || profile?.username || `Player ${pIdx + 1}`}
                                              </span>
                                              {profile?.game_uid && (
                                                <span className="text-muted-foreground">
                                                  UID: {profile.game_uid}
                                                </span>
                                              )}
                                            </div>
                                            {pIdx === 0 && (
                                              <Badge variant="outline" className="text-xs py-0">Leader</Badge>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Tournament Format */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Tournament Format</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Game</span>
                          <span className="font-medium">{tournament.game}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mode</span>
                          <span className="font-medium">Squad (4 Players)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Teams/Room</span>
                          <span className="font-medium">{teamsPerRoom}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Rooms</span>
                          <span className="font-medium">{tournament.total_rooms}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Round</span>
                          <span className="font-medium">Round {tournament.current_round || 1}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium">Top 1 per room advances</span>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Loading your room...</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tournament Info Tab */}
              <TabsContent value="info" className="mt-4 space-y-4">
                {renderTournamentInfo()}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="mt-4 space-y-4">
              {renderTournamentInfo()}
            </div>
          )}
        </div>

        {/* Fixed Bottom Button - Above bottom nav */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t z-40">
          {alreadyJoined ? (
            <Button className="w-full" variant="secondary" disabled>
              <CheckCircle className="h-4 w-4 mr-2" /> Already Joined - Check "My Room" tab
            </Button>
          ) : !isRegistrationOpen ? (
            <Button className="w-full" disabled>
              Registration Closed
            </Button>
          ) : isFull ? (
            <Button className="w-full" disabled variant="destructive">
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

  function renderTournamentInfo() {
    return (
      <>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Game</p>
                <p className="font-bold">{tournament!.game}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Players</p>
                <p className="font-bold">{tournament!.current_players}/{tournament!.max_players}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-bold text-sm">
                  {new Date(tournament!.tournament_date).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              {tournament!.entry_type === 'free' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <IndianRupee className="h-8 w-8 text-primary" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Entry</p>
                <p className="font-bold">
                  {tournament!.entry_type === 'free' ? 'FREE' : `₹${tournament!.entry_fee}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prize Pool */}
        {tournament!.prize_pool > 0 && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4 flex items-center justify-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Prize Pool</p>
                <p className="text-2xl font-bold text-yellow-500">₹{tournament!.prize_pool}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Deadline */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Registration Deadline:</span>
              <span className="font-medium">
                {new Date(tournament!.registration_deadline).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Mode Info */}
        <Card>
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
              <span className="font-medium">{teamsPerRoom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-medium">Top 1 per room advances</span>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }
};

export default JoinSchoolTournament;