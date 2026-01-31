import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Gamepad2,
  Users,
  Calendar,
  Trophy,
  Loader2,
  Wallet,
  Building2,
  CheckCircle,
  Key,
  Lock,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import LocalTournamentCountdown from '@/components/LocalTournamentCountdown';

interface LocalTournament {
  id: string;
  institution_name: string;
  tournament_name: string;
  game: string;
  tournament_mode: string;
  entry_fee: number;
  max_participants: number;
  tournament_date: string;
  current_prize_pool: number;
  joined_users: string[];
  status: string;
  room_id: string | null;
  room_password: string | null;
  prize_distribution: Record<string, number>;
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

const JoinLocalTournamentPage = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [tournament, setTournament] = useState<LocalTournament | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  // Team selection state
  const [teamSelectDialog, setTeamSelectDialog] = useState(false);
  const [playerTeams, setPlayerTeams] = useState<PlayerTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [teamName, setTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchWalletBalance();
    }
    if (code) {
      searchTournament();
    } else {
      setLoading(false);
    }
  }, [code, user]);

  const fetchWalletBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('user_id', user.id)
      .maybeSingle();
    setWalletBalance(data?.wallet_balance || 0);
  };

  const searchTournament = async () => {
    if (!code || code.length < 6) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('local_tournaments')
        .select('*')
        .eq('private_code', code.toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({ title: 'Not Found', description: 'No tournament found with this code.', variant: 'destructive' });
        setTournament(null);
        return;
      }

      setTournament(data as LocalTournament);
      setHasJoined(data.joined_users?.includes(user?.id) || false);
    } catch (error) {
      console.error('Error searching tournament:', error);
    } finally {
      setLoading(false);
    }
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
    if (!tournament || !user) return;

    if (tournament.tournament_mode === 'solo' || !tournament.tournament_mode) {
      handleJoin();
    } else {
      fetchPlayerTeams();
      setTeamSelectDialog(true);
    }
  };

  const handleJoin = async () => {
    if (!user || !tournament) return;

    if (walletBalance < tournament.entry_fee) {
      toast({ title: 'Insufficient Balance', description: `You need ₹${tournament.entry_fee} to join.`, variant: 'destructive' });
      return;
    }

    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('join_local_tournament', {
        p_user_id: user.id,
        p_private_code: code.toUpperCase(),
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; entry_fee?: number };

      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }

      toast({ title: '🎮 Joined Successfully!', description: `Entry fee ₹${result.entry_fee} deducted.` });
      setHasJoined(true);
      fetchWalletBalance();
      searchTournament();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const handleTeamJoin = async () => {
    if (!tournament || !user || !teamName.trim()) {
      toast({ title: 'Error', description: 'Please enter a team name.', variant: 'destructive' });
      return;
    }

    const requiredMembers = tournament.tournament_mode === 'duo' ? 2 : 4;
    const allMembers = [user.id, ...selectedTeamMembers];

    if (allMembers.length !== requiredMembers) {
      toast({ 
        title: 'Invalid Team Size', 
        description: `Please select exactly ${requiredMembers - 1} teammate(s) for ${tournament.tournament_mode} mode.`, 
        variant: 'destructive' 
      });
      return;
    }

    setJoining(true);

    try {
      // For local tournaments, we need to join each member individually
      // First check all members have sufficient balance
      const entryFee = tournament.entry_fee;
      const teamMembersList = getAllTeamMembersList();
      
      for (const memberId of selectedTeamMembers) {
        const member = teamMembersList.find(m => m.user_id === memberId);
        if (!member || member.wallet_balance < entryFee) {
          toast({ 
            title: 'Insufficient Balance', 
            description: `Team member ${member?.username || 'Unknown'} doesn't have enough balance.`, 
            variant: 'destructive' 
          });
          setJoining(false);
          return;
        }
      }

      // Join leader first
      const { data: leaderResult, error: leaderError } = await supabase.rpc('join_local_tournament', {
        p_user_id: user.id,
        p_private_code: code.toUpperCase(),
      });

      if (leaderError) throw leaderError;

      const leaderData = leaderResult as { success: boolean; error?: string };
      if (!leaderData.success && leaderData.error !== 'Already joined this tournament') {
        toast({ title: 'Error', description: leaderData.error, variant: 'destructive' });
        setJoining(false);
        return;
      }

      // Join each team member
      for (const memberId of selectedTeamMembers) {
        const { data, error } = await supabase.rpc('join_local_tournament', {
          p_user_id: memberId,
          p_private_code: code.toUpperCase(),
        });

        if (error) throw error;

        const result = data as { success: boolean; error?: string };
        if (!result.success && result.error !== 'Already joined this tournament') {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
          setJoining(false);
          return;
        }
      }

      const totalMembers = selectedTeamMembers.length + 1; // +1 for leader
      toast({ 
        title: 'Team Joined!', 
        description: `Team "${teamName}" joined the tournament. ₹${entryFee * totalMembers} total deducted.` 
      });
      
      setTeamSelectDialog(false);
      setSelectedTeamMembers([]);
      setTeamName('');
      setSelectedTeamId(null);
      setHasJoined(true);
      fetchWalletBalance();
      searchTournament();
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast({ title: 'Error', description: 'Failed to join tournament.', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    if (memberId === user?.id) return;

    setSelectedTeamMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedTeamMembers([]);
  };

  const getRequiredTeamSize = () => {
    if (tournament?.tournament_mode === 'duo') return 2;
    if (tournament?.tournament_mode === 'squad') return 4;
    return 1;
  };

  const getAllTeamMembersList = () => {
    if (!selectedTeamId) return [];
    const team = playerTeams.find(t => t.id === selectedTeamId);
    return team?.members.filter(m => m.user_id !== user?.id) || [];
  };

  const canTeamJoin = () => {
    if (!tournament) return false;
    const requiredSize = getRequiredTeamSize();
    const allMembers = [user?.id, ...selectedTeamMembers].filter(Boolean);
    if (allMembers.length !== requiredSize) return false;

    const entryFee = tournament.entry_fee || 0;
    const teamMembersList = getAllTeamMembersList();
    
    for (const memberId of selectedTeamMembers) {
      const member = teamMembersList.find(m => m.user_id === memberId);
      if (!member || member.wallet_balance < entryFee) {
        return false;
      }
    }

    if (walletBalance < entryFee) return false;

    return teamName.trim().length > 0;
  };

  const teamMembersList = getAllTeamMembersList();
  const entryFee = tournament?.entry_fee || 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Join Local Tournament</h1>
            <p className="text-[10px] text-muted-foreground">Private school/college event</p>
          </div>
        </div>
      </header>

      <div className="p-3 space-y-3">
        {!code && (
          <Card variant="glass" className="border-2 border-white/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Scan a tournament QR code to join</p>
            </CardContent>
          </Card>
        )}

        {tournament && (
          <Card variant="glass" className="border-2 border-white/30">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">{tournament.tournament_name}</CardTitle>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3" />
                    {tournament.institution_name}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Badge variant={tournament.status === 'ongoing' ? 'default' : 'outline'}
                    className={`text-[10px] ${tournament.status === 'ongoing' ? 'bg-green-500 text-white' : 'border-white/30'}`}>
                    {tournament.status}
                  </Badge>
                  {tournament.tournament_mode && tournament.tournament_mode !== 'solo' && (
                    <Badge variant="outline" className="capitalize text-[10px] border-white/30">
                      {tournament.tournament_mode}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {tournament.status === 'upcoming' && (
                <LocalTournamentCountdown targetDate={new Date(tournament.tournament_date)} />
              )}

              {/* Team Mode Info */}
              {tournament.tournament_mode && tournament.tournament_mode !== 'solo' && (
                <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <UserPlus className="h-3 w-3 text-blue-500" />
                    <span className="font-semibold text-xs text-blue-400">Team Mode: {tournament.tournament_mode}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {tournament.tournament_mode === 'duo' 
                      ? 'You need 1 teammate from your player team to join.' 
                      : 'You need 3 teammates from your player team to join.'}
                    {' '}Entry fee ₹{tournament.entry_fee} per player.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <Gamepad2 className="h-3 w-3 text-primary" />
                  <span className="text-xs">{tournament.game}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-primary" />
                  <span className="text-xs">{tournament.tournament_mode}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span className="text-xs">{format(new Date(tournament.tournament_date), 'dd MMM, hh:mm a')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-3 w-3 text-green-600" />
                  <span className="text-xs">₹{tournament.current_prize_pool} Prize</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5 border border-white/10">
                <span className="text-xs text-muted-foreground">Entry Fee</span>
                <span className="font-bold text-sm text-primary">₹{tournament.entry_fee}</span>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted-foreground">Players</span>
                <span className="font-medium text-xs">{tournament.joined_users?.length || 0} / {tournament.max_participants}</span>
              </div>

              {hasJoined && tournament.status === 'ongoing' && (tournament.room_id || tournament.room_password) && (
                <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-3 space-y-1.5">
                  <h4 className="font-semibold text-xs flex items-center gap-1.5">
                    <Key className="h-3 w-3 text-primary" />
                    Room Details
                  </h4>
                  {tournament.room_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Room ID:</span>
                      <span className="font-mono font-bold text-xs">{tournament.room_id}</span>
                    </div>
                  )}
                  {tournament.room_password && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Password:</span>
                      <span className="font-mono font-bold text-xs">{tournament.room_password}</span>
                    </div>
                  )}
                </div>
              )}

              {hasJoined ? (
                <div className="flex items-center justify-center gap-1.5 text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg p-2.5">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium text-xs">You've Joined This Tournament</span>
                </div>
              ) : tournament.status === 'upcoming' ? (
                <>
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-muted-foreground">Your Wallet Balance</span>
                    <span className={walletBalance < tournament.entry_fee ? 'text-destructive' : 'text-green-400'}>
                      ₹{walletBalance}
                    </span>
                  </div>
                  <Button onClick={handleJoinClick} disabled={joining || walletBalance < tournament.entry_fee || !user} className="w-full text-xs h-9">
                    {joining ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Gamepad2 className="h-3 w-3 mr-1.5" />}
                    {!user ? 'Login to Join' : walletBalance < tournament.entry_fee ? 'Insufficient Balance' : `Join Tournament (₹${tournament.entry_fee}${tournament.tournament_mode !== 'solo' ? ' per player' : ''})`}
                  </Button>
                  {walletBalance < tournament.entry_fee && user && (
                    <Button variant="outline" className="w-full text-xs h-9 border-white/30" onClick={() => navigate('/wallet')}>
                      Add Money to Wallet
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground bg-muted/30 border border-white/10 rounded-lg p-2.5">
                  <Lock className="h-4 w-4" />
                  <span className="text-xs">Registration Closed</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!user && (
          <Card variant="glass" className="border-2 border-white/30">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-3">Please login to join tournaments</p>
              <Button size="sm" className="text-xs" onClick={() => navigate('/auth')}>Login</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Team Selection Dialog */}
      <Dialog open={teamSelectDialog} onOpenChange={(open) => {
        setTeamSelectDialog(open);
        if (!open) {
          setSelectedTeamMembers([]);
          setTeamName('');
          setSelectedTeamId(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Select Team Members
            </DialogTitle>
            <DialogDescription>
              {tournament?.tournament_mode === 'duo' 
                ? 'Select your team first, then pick 1 teammate for duo match' 
                : 'Select your team first, then pick 3 teammates for squad match'}
            </DialogDescription>
          </DialogHeader>
          
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
                  You must join or create a player team first to participate in {tournament?.tournament_mode} matches.
                </p>
                <Button size="sm" className="mt-3" onClick={() => { setTeamSelectDialog(false); navigate('/team'); }}>
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
                      const requiredSize = getRequiredTeamSize();
                      const hasEnoughMembers = teamMemberCount >= requiredSize;

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
                                  Need {requiredSize}+ members
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Select Teammates (only if team is selected) */}
                {selectedTeamId && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-semibold">
                      Step 2: Select {getRequiredTeamSize() - 1} Teammate(s) • Entry ₹{entryFee} per player
                    </Label>
                    <ScrollArea className="h-[180px]">
                      <div className="space-y-2">
                        {teamMembersList.map((member) => {
                          const isSelected = selectedTeamMembers.includes(member.user_id);
                          const hasInsufficientBalance = member.wallet_balance < entryFee;
                          const maxSelected = selectedTeamMembers.length >= (getRequiredTeamSize() - 1);

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
                                  <p className="text-sm font-medium">{member.in_game_name || member.username || 'Player'}</p>
                                  <p className="text-xs text-muted-foreground">@{member.username}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge className={`text-[10px] ${
                                  member.wallet_balance >= entryFee 
                                    ? 'bg-green-500/10 text-green-600' 
                                    : 'bg-red-500/10 text-red-600'
                                }`}>
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
                  <span className="font-medium">{selectedTeamMembers.length + 1} / {getRequiredTeamSize()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Per Player</span>
                  <span className="font-medium">₹{entryFee}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground font-semibold">Total Fee</span>
                  <span className="font-bold text-primary">₹{entryFee * (selectedTeamMembers.length + 1)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setTeamSelectDialog(false); setSelectedTeamMembers([]); setTeamName(''); setSelectedTeamId(null); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleTeamJoin}
              disabled={joining || !canTeamJoin()}
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join as Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default JoinLocalTournamentPage;
