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
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Timer,
  Play,
  Eye,
  EyeOff,
  Radio,
  Hash,
  UserCheck,
  Globe
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
  verification_type?: 'online' | 'spot';
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
  slot_number?: number;
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

interface TeamMember {
  user_id: string;
  username: string | null;
  in_game_name: string | null;
  avatar_url: string | null;
  wallet_balance: number;
}

interface PlayerTeam {
  id: string;
  name: string;
  members: TeamMember[];
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
  const [myTeamNumber, setMyTeamNumber] = useState<number | null>(null);
  
  // Join dialog
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Team selection state
  const [playerTeams, setPlayerTeams] = useState<PlayerTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

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
      setTournament({
        ...data,
        verification_type: (data.verification_type as 'online' | 'spot') || 'online'
      });
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
      
      // Fetch team number (registration order)
      const { data: allTeams } = await supabase
        .from('school_tournament_teams')
        .select('id, registered_at')
        .eq('tournament_id', tournament.id)
        .order('registered_at', { ascending: true });
      
      if (allTeams) {
        const teamIndex = allTeams.findIndex(t => t.id === teamData.id);
        if (teamIndex !== -1) {
          setMyTeamNumber(teamIndex + 1);
        }
      }
      
      // Fetch my room assignment
      const { data: assignmentData } = await supabase
        .from('school_tournament_room_assignments')
        .select('room_id, slot_number')
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
          
          // Fetch all teams in this room with their slot numbers
          const { data: roomAssignments } = await supabase
            .from('school_tournament_room_assignments')
            .select('team_id, slot_number')
            .eq('room_id', roomData.id)
            .order('slot_number', { ascending: true });

          if (roomAssignments && roomAssignments.length > 0) {
            const teamIds = roomAssignments.map(a => a.team_id);
            
            const { data: teamsData } = await supabase
              .from('school_tournament_teams')
              .select('id, team_name, leader_id, member_1_id, member_2_id, member_3_id')
              .in('id', teamIds);

            if (teamsData) {
              // Merge slot numbers with teams
              const teamsWithSlots = teamsData.map(team => ({
                ...team,
                slot_number: roomAssignments.find(a => a.team_id === team.id)?.slot_number
              }));
              setRoomTeams(teamsWithSlots.sort((a, b) => (a.slot_number || 0) - (b.slot_number || 0)));
              
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

  const fetchPlayerTeams = async () => {
    if (!user) return;
    setLoadingTeams(true);

    try {
      const { data: membershipData, error: membershipError } = await supabase
        .from('player_team_members')
        .select('team_id')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      if (!membershipData || membershipData.length === 0) {
        setPlayerTeams([]);
        setLoadingTeams(false);
        return;
      }

      const teamIds = membershipData.map(m => m.team_id);

      const { data: teamsData, error: teamsError } = await supabase
        .from('player_teams')
        .select('id, name')
        .in('id', teamIds);

      if (teamsError) throw teamsError;

      const teams: PlayerTeam[] = [];
      
      for (const team of teamsData || []) {
        const { data: membersData } = await supabase
          .from('player_team_members')
          .select('user_id')
          .eq('team_id', team.id);

        if (membersData) {
          const memberIds = membersData.map(m => m.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, username, in_game_name, avatar_url, wallet_balance')
            .in('user_id', memberIds);

          teams.push({
            id: team.id,
            name: team.name,
            members: (profilesData || []).map(p => ({
              user_id: p.user_id,
              username: p.username,
              in_game_name: p.in_game_name,
              avatar_url: p.avatar_url,
              wallet_balance: p.wallet_balance || 0,
            })),
          });
        }
      }

      setPlayerTeams(teams);
    } catch (error) {
      console.error('Error fetching player teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleJoinClick = () => {
    if (!user) {
      navigate('/auth', { state: { from: `/join-school-tournament/${code}` } });
      return;
    }
    fetchPlayerTeams();
    setJoinDialogOpen(true);
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

    if (selectedTeamMembers.length !== 3) {
      toast.error('Please select exactly 3 teammates for squad mode');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('register_school_tournament_team', {
        p_tournament_id: tournament!.id,
        p_team_name: teamName,
        p_leader_id: user.id,
        p_member_1_id: selectedTeamMembers[0] || null,
        p_member_2_id: selectedTeamMembers[1] || null,
        p_member_3_id: selectedTeamMembers[2] || null,
        p_registration_method: 'qr'
      });

      if (error) throw error;

      const entryFee = tournament?.entry_fee || 0;
      const totalFee = entryFee * 4;
      toast.success(`Team joined! ₹${totalFee} total deducted (₹${entryFee} per player)`);
      setJoinDialogOpen(false);
      setAlreadyJoined(true);
      setSelectedTeamMembers([]);
      setTeamName('');
      setSelectedTeamId(null);
      fetchTournament();
      checkIfJoined();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join tournament');
    } finally {
      setProcessing(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    if (memberId === user?.id) return;
    setSelectedTeamMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : prev.length < 3 ? [...prev, memberId] : prev
    );
  };

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedTeamMembers([]);
  };

  const getSelectedTeamMembers = () => {
    if (!selectedTeamId) return [];
    const team = playerTeams.find(t => t.id === selectedTeamId);
    return team?.members.filter(m => m.user_id !== user?.id) || [];
  };

  const canTeamJoin = () => {
    if (!tournament) return false;
    if (selectedTeamMembers.length !== 3) return false;
    
    const entryFee = tournament.entry_fee || 0;
    const teamMembersList = getSelectedTeamMembers();
    
    for (const memberId of selectedTeamMembers) {
      const member = teamMembersList.find(m => m.user_id === memberId);
      if (!member || member.wallet_balance < entryFee) {
        return false;
      }
    }

    if (walletBalance < entryFee) return false;

    return teamName.trim().length > 0;
  };

  const teamMembersList = getSelectedTeamMembers();

  const isRegistrationOpen = tournament && 
    tournament.status === 'registration' && 
    new Date(tournament.registration_deadline) > new Date();

  const isFull = tournament && tournament.current_players >= tournament.max_players;
  const canAfford = tournament?.entry_type === 'free' || walletBalance >= (tournament?.entry_fee || 0);
  const teamsPerRoom = tournament?.game === 'BGMI' ? 25 : 12;
  const entryFee = tournament?.entry_fee || 0;
  const isTournamentCompleted = tournament?.status === 'completed';

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

  const getRoomStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return (
          <Badge className="bg-green-500 text-white gap-1">
            <Radio className="h-2.5 w-2.5 animate-pulse" />
            Live
          </Badge>
        );
      case 'completed':
        return <Badge variant="secondary">Finished</Badge>;
      case 'waiting':
        return <Badge variant="outline">Waiting</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="pb-40">
        {/* Header - No Image, Just Registration Title */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-sm font-bold">Registration</h1>
              <p className="text-[10px] text-muted-foreground">{tournament.school_name}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant={tournament.status === 'registration' ? 'secondary' : tournament.status === 'ongoing' ? 'default' : 'outline'}
                className={tournament.status === 'ongoing' ? 'bg-green-500' : ''}>
                {tournament.status}
              </Badge>
              {isFull && <Badge variant="destructive">FULL</Badge>}
            </div>
          </div>
        </header>

        {/* Tournament Info */}
        <div className="px-4 py-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold">{tournament.tournament_name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {tournament.school_city}, {tournament.school_state}
              </p>
            </div>
            {myTeamNumber && (
              <Badge className="bg-primary/10 text-primary border-primary/30">
                <Hash className="h-3 w-3 mr-0.5" />
                Team {myTeamNumber}
              </Badge>
            )}
          </div>

          {/* Spot Verification Notice */}
          {tournament.verification_type === 'spot' && (
            <Card className="border-orange-500/30 bg-orange-500/5 mb-4">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <UserCheck className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-orange-500">Spot Verification Required</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      After online registration, you must visit {tournament.school_name} for physical ID verification. 
                      Bring your Government ID and all team members must be present.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs for Joined Users */}
          {alreadyJoined ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my-room">My Room</TabsTrigger>
                <TabsTrigger value="info">Tournament Info</TabsTrigger>
              </TabsList>

              {/* My Room Tab */}
              <TabsContent value="my-room" className="mt-4 space-y-4">
                {/* Tournament Completed - Can't view room/teams */}
                {isTournamentCompleted ? (
                  <Card className="border-muted">
                    <CardContent className="p-6 text-center">
                      <EyeOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <h3 className="font-semibold text-sm mb-1">Tournament Completed</h3>
                      <p className="text-xs text-muted-foreground">
                        You can't view your room or teams anymore. Previous round data has been cleared.
                      </p>
                      {myTeam?.final_rank && (
                        <Badge className="mt-3 bg-yellow-500 text-white">
                          <Trophy className="h-3 w-3 mr-1" />
                          Final Rank: #{myTeam.final_rank}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ) : myRoom ? (
                  <>
                    {/* Room Info Card */}
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{myRoom.room_name}</CardTitle>
                          {getRoomStatusBadge(myRoom.status)}
                        </div>
                        <CardDescription className="text-xs">
                          Round {myRoom.round_number} • Room {myRoom.room_number}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* My Team Highlight */}
                        {myTeam && (
                          <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/30">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Crown className="h-3.5 w-3.5 text-yellow-500" />
                              <span className="font-medium text-sm">Your Team: {myTeam.team_name}</span>
                              {myTeamNumber && (
                                <Badge variant="outline" className="text-[10px] ml-auto">
                                  #{myTeamNumber}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {myTeam.is_eliminated && (
                                <Badge variant="destructive" className="text-xs">Eliminated</Badge>
                              )}
                              {myTeam.final_rank && (
                                <Badge className="bg-yellow-500 text-xs">Rank #{myTeam.final_rank}</Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Room Status Indicator */}
                        {myRoom.status === 'ongoing' && (
                          <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                            <Play className="h-4 w-4 text-green-500 fill-green-500" />
                            <span className="text-xs font-medium text-green-600">Room is LIVE - Match in progress</span>
                          </div>
                        )}

                        {/* Room Credentials (if set and room is ongoing/waiting) */}
                        {myRoom.room_id && myRoom.status !== 'completed' ? (
                          <div className="p-2.5 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Lock className="h-3.5 w-3.5" />
                              <span className="font-medium text-xs">Room Credentials</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
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
                        ) : myRoom.status === 'completed' ? (
                          <div className="p-2.5 bg-muted/50 rounded-lg text-center">
                            <EyeOff className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground">
                              Room credentials hidden - Match finished
                            </p>
                          </div>
                        ) : null}

                        {/* Scheduled Time */}
                        {myRoom.scheduled_time && (
                          <div className="flex items-center gap-2 text-xs">
                            <Timer className="h-3.5 w-3.5 text-primary" />
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
                        <ScrollArea className="h-[280px]">
                          <div className="space-y-2">
                            {roomTeams.map((team) => {
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
                                  <CardContent className="p-2.5">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                        {team.slot_number || '-'}
                                      </div>
                                      <span className="font-medium text-xs flex-1 truncate">{team.team_name}</span>
                                      {isMyTeam && (
                                        <Badge variant="secondary" className="text-[10px]">You</Badge>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      {playerIds.map((pid, pIdx) => {
                                        const profile = playerProfiles[pid as string];
                                        return (
                                          <div key={pid} className="flex items-center gap-2 p-1 bg-muted/50 rounded text-[10px]">
                                            <span className="text-muted-foreground w-5">P{pIdx + 1}</span>
                                            <div className="flex-1 flex items-center gap-1.5 min-w-0">
                                              <span className="font-medium truncate">
                                                {profile?.in_game_name || profile?.username || `Player ${pIdx + 1}`}
                                              </span>
                                              {profile?.game_uid && (
                                                <span className="text-muted-foreground truncate">
                                                  UID: {profile.game_uid}
                                                </span>
                                              )}
                                            </div>
                                            {pIdx === 0 && (
                                              <Badge variant="outline" className="text-[9px] py-0 h-4">Leader</Badge>
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
                      <CardContent className="text-xs space-y-1.5">
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
                      <p className="text-muted-foreground text-sm">Loading your room...</p>
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
            <Button className="w-full" onClick={handleJoinClick}>
              <UserPlus className="h-4 w-4 mr-2" /> 
              Join Tournament {tournament.entry_type === 'paid' && `(₹${tournament.entry_fee} per player)`}
            </Button>
          )}
        </div>
      </div>

      {/* Join Dialog with Team Selection */}
      <Dialog 
        open={joinDialogOpen} 
        onOpenChange={(open) => {
          setJoinDialogOpen(open);
          if (!open) {
            setSelectedTeamMembers([]);
            setTeamName('');
            setSelectedTeamId(null);
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Select Team Members
            </DialogTitle>
            <DialogDescription>
              Select your team first, then pick 3 teammates for squad match
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="py-4 space-y-4">
              {/* Team Name Input */}
              <div className="space-y-2">
                <Label>Team Name *</Label>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name for this match"
                  maxLength={30}
                />
              </div>

              {/* Your Info */}
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Gamepad2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">You (Leader)</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600">₹{walletBalance}</Badge>
                </div>
              </div>

              {/* Team Members Selection */}
              {loadingTeams ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : playerTeams.length === 0 ? (
                <div className="text-center py-6 bg-muted/50 rounded-lg">
                  <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm font-medium">No Player Team Found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You must join or create a player team first to participate in squad matches.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setJoinDialogOpen(false);
                      navigate('/team');
                    }}
                  >
                    Go to Teams
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Step 1: Select Team */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-semibold">
                      Step 1: Select Your Player Team
                    </Label>
                    <div className="grid gap-2">
                      {playerTeams.map((team) => {
                        const isSelected = selectedTeamId === team.id;
                        const teamMemberCount = team.members.length;
                        const hasEnoughMembers = teamMemberCount >= 4;

                        return (
                          <div
                            key={team.id}
                            onClick={() => hasEnoughMembers && handleTeamSelect(team.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-primary/10 border-primary' 
                                : !hasEnoughMembers
                                ? 'bg-muted/50 border-border opacity-60 cursor-not-allowed'
                                : 'bg-card border-border hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">{team.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {teamMemberCount} members
                                </Badge>
                                {!hasEnoughMembers && (
                                  <span className="text-[10px] text-destructive">
                                    Need 4+ members
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Select Teammates */}
                  {selectedTeamId && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-semibold">
                        Step 2: Select 3 Teammates • Entry ₹{entryFee} per player
                      </Label>
                      <ScrollArea className="h-[180px]">
                        <div className="space-y-2">
                          {teamMembersList.map((member) => {
                            const isSelected = selectedTeamMembers.includes(member.user_id);
                            const hasInsufficientBalance = member.wallet_balance < entryFee;
                            const maxSelected = selectedTeamMembers.length >= 3;

                            return (
                              <div 
                                key={member.user_id}
                                onClick={() => !hasInsufficientBalance && toggleMemberSelection(member.user_id)}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 border-primary' 
                                    : hasInsufficientBalance
                                    ? 'bg-muted/50 border-border opacity-60 cursor-not-allowed'
                                    : maxSelected && !isSelected
                                    ? 'bg-muted/30 border-border opacity-50'
                                    : 'bg-card border-border hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={isSelected} 
                                    disabled={hasInsufficientBalance || (maxSelected && !isSelected)}
                                  />
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={member.avatar_url || ''} />
                                    <AvatarFallback className="bg-muted text-xs">
                                      {member.username?.charAt(0).toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {member.in_game_name || member.username || 'Player'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">@{member.username}</p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge
                                    className={`text-[10px] ${
                                      member.wallet_balance >= entryFee
                                        ? 'bg-green-500/10 text-green-600'
                                        : 'bg-red-500/10 text-red-600'
                                    }`}
                                  >
                                    ₹{member.wallet_balance}
                                  </Badge>
                                  {hasInsufficientBalance && (
                                    <span className="text-[9px] text-destructive flex items-center gap-0.5">
                                      <AlertCircle className="h-3 w-3" /> Low balance
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedTeamMembers.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Team Members</span>
                    <span className="font-medium">
                      {selectedTeamMembers.length + 1} / 4
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entry Per Player</span>
                    <span className="font-medium">₹{entryFee}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground font-semibold">Total Fee</span>
                    <span className="font-bold text-primary">
                      ₹{entryFee * (selectedTeamMembers.length + 1)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed footer */}
          <DialogFooter className="pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setJoinDialogOpen(false);
                setSelectedTeamMembers([]);
                setTeamName('');
                setSelectedTeamId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleJoin} disabled={processing || !canTeamJoin()}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join as Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );

  function renderTournamentInfo() {
    return (
      <>
        {/* Stats Cards - Compact like regular tournament */}
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Game</p>
                <p className="font-bold text-xs">{tournament!.game}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Players</p>
                <p className="font-bold text-xs">{tournament!.current_players}/{tournament!.max_players}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Date</p>
                <p className="font-bold text-xs">
                  {new Date(tournament!.tournament_date).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              {tournament!.entry_type === 'free' ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <IndianRupee className="h-6 w-6 text-primary" />
              )}
              <div>
                <p className="text-[10px] text-muted-foreground">Entry</p>
                <p className="font-bold text-xs">
                  {tournament!.entry_type === 'free' ? 'FREE' : `₹${tournament!.entry_fee}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prize Pool */}
        {tournament!.prize_pool > 0 && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-3 flex items-center justify-center gap-3">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Prize Pool</p>
                <p className="text-xl font-bold text-yellow-500">₹{tournament!.prize_pool}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Deadline */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-xs">
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
          <CardContent className="text-xs space-y-1.5">
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
