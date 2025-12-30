import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Trophy, 
  Users, 
  Wallet, 
  Calendar, 
  ArrowLeft,
  Loader2,
  Award,
  Gamepad2,
  Clock,
  UserPlus,
  AlertCircle,
  Gift
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Tournament {
  id: string;
  title: string;
  game: string;
  description: string | null;
  prize_pool: string | null;
  entry_fee: number | null;
  start_date: string;
  status: string | null;
  max_participants: number | null;
  tournament_type: string;
  joined_users: string[] | null;
  current_prize_pool: number | null;
  tournament_mode: string | null;
  prize_distribution: any;
  created_by: string | null;
  is_giveaway: boolean | null;
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

const TournamentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [joinDialog, setJoinDialog] = useState(false);
  const [teamSelectDialog, setTeamSelectDialog] = useState(false);
  const [joining, setJoining] = useState(false);
  
  // Team selection state
  const [playerTeams, setPlayerTeams] = useState<PlayerTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [teamName, setTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTournament();
    }
    if (user) {
      fetchWalletBalance();
    }
  }, [id, user]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      toast({ title: 'Error', description: 'Tournament not found.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single();
      setWalletBalance(data?.wallet_balance || 0);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const fetchPlayerTeams = async () => {
    if (!user) return;
    setLoadingTeams(true);

    try {
      // Get teams where user is a member
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

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('player_teams')
        .select('id, name')
        .in('id', teamIds);

      if (teamsError) throw teamsError;

      // Fetch all members for these teams with their wallet balances
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

    // For solo tournaments, show regular join dialog
    if (tournament.tournament_mode === 'solo' || !tournament.tournament_mode) {
      setJoinDialog(true);
    } else {
      // For duo/squad, show team selection
      fetchPlayerTeams();
      setTeamSelectDialog(true);
    }
  };

  const handleJoinTournament = async () => {
    if (!tournament || !user) return;

    setJoining(true);

    try {
      const { data, error } = await supabase.rpc('process_tournament_join', {
        p_user_id: user.id,
        p_tournament_id: tournament.id,
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        error?: string; 
        entry_fee?: number;
      };

      if (!result.success) {
        toast({ 
          title: 'Cannot Join', 
          description: result.error || 'Failed to join tournament.', 
          variant: 'destructive' 
        });
        return;
      }

      toast({ 
        title: 'Joined!', 
        description: `You have successfully joined ${tournament.title}. ₹${result.entry_fee} deducted.` 
      });
      
      setJoinDialog(false);
      fetchTournament();
      fetchWalletBalance();
    } catch (error: any) {
      console.error('Error joining tournament:', error);
      toast({
        title: 'Error',
        description: error?.message || error?.details || 'Failed to join tournament.',
        variant: 'destructive',
      });
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
      // RPC expects ALL team member IDs including the leader
      const allTeamMemberIds = [user.id, ...selectedTeamMembers];
      
      const { data, error } = await supabase.rpc('process_team_tournament_join', {
        p_leader_id: user.id,
        p_tournament_id: tournament.id,
        p_team_member_ids: allTeamMemberIds,
        p_team_name: teamName.trim(),
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        error?: string;
        total_fee?: number;
        team_name?: string;
      };

      if (!result.success) {
        toast({ 
          title: 'Cannot Join', 
          description: result.error || 'Failed to join tournament.', 
          variant: 'destructive' 
        });
        return;
      }

      toast({ 
        title: 'Team Joined!', 
        description: `Team "${result.team_name}" joined ${tournament.title}. Total ₹${result.total_fee} deducted.` 
      });
      
      setTeamSelectDialog(false);
      setSelectedTeamMembers([]);
      setTeamName('');
      fetchTournament();
      fetchWalletBalance();
    } catch (error: any) {
      console.error('Error joining tournament:', error);
      toast({
        title: 'Error',
        description: error?.message || error?.details || 'Failed to join tournament.',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    if (memberId === user?.id) return; // Can't deselect self

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

  const getSelectedTeamMembers = () => {
    if (!selectedTeamId) return [];
    const team = playerTeams.find(t => t.id === selectedTeamId);
    return team?.members.filter(m => m.user_id !== user?.id) || [];
  };

  const getRequiredTeamSize = () => {
    if (tournament?.tournament_mode === 'duo') return 2;
    if (tournament?.tournament_mode === 'squad') return 4;
    return 1;
  };

  const getAllTeamMembersList = () => {
    // Return members only from the selected team
    if (!selectedTeamId) return [];
    const team = playerTeams.find(t => t.id === selectedTeamId);
    return team?.members.filter(m => m.user_id !== user?.id) || [];
  };

  const canTeamJoin = () => {
    if (!tournament) return false;
    const requiredSize = getRequiredTeamSize();
    const allMembers = [user?.id, ...selectedTeamMembers].filter(Boolean);
    if (allMembers.length !== requiredSize) return false;

    // Check all selected members have sufficient balance - giveaways require ₹1 per player
    const effectiveFee = tournament.is_giveaway ? 1 : (tournament.entry_fee || 0);
    const teamMembersList = getAllTeamMembersList();
    
    for (const memberId of selectedTeamMembers) {
      const member = teamMembersList.find(m => m.user_id === memberId);
      if (!member || member.wallet_balance < effectiveFee) {
        return false;
      }
    }

    // Check self balance
    if (walletBalance < effectiveFee) return false;

    return teamName.trim().length > 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Trophy className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h1 className="text-xl font-bold mb-2">Tournament Not Found</h1>
        <p className="text-muted-foreground text-sm mb-4">This tournament may have been removed or does not exist.</p>
        <Button onClick={() => navigate('/home')}>Go to Home</Button>
      </div>
    );
  }

  const spotsLeft = (tournament.max_participants || 100) - (tournament.joined_users?.length || 0);
  const isJoined = user && tournament.joined_users?.includes(user.id);
  const canJoin = !isJoined && tournament.status === 'upcoming' && spotsLeft > 0;
  const entryFee = tournament.is_giveaway ? 1 : (tournament.entry_fee || 0);
  const teamMembersList = getAllTeamMembersList();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-lg" />
          <div className="flex-1">
            <h1 className="font-gaming font-bold text-sm truncate">{tournament.title}</h1>
            <p className="text-xs text-muted-foreground">{tournament.game}</p>
          </div>
        </div>
      </header>

      {/* Tournament Banner */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6">
        <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
          {tournament.is_giveaway && (
            <Badge className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-600 border border-pink-500/30">
              <Gift className="h-3 w-3 mr-1" />
              FREE GIVEAWAY
            </Badge>
          )}
          <Badge className={`capitalize ${
            tournament.tournament_type === 'creator' 
              ? 'bg-purple-500/10 text-purple-600' 
              : 'bg-primary/10 text-primary'
          }`}>
            {tournament.tournament_type}
          </Badge>
          <Badge className={`capitalize ${
            tournament.status === 'upcoming' 
              ? 'bg-emerald-500/10 text-emerald-600' 
              : tournament.status === 'ongoing'
              ? 'bg-amber-500/10 text-amber-600'
              : 'bg-muted text-muted-foreground'
          }`}>
            {tournament.status}
          </Badge>
          {tournament.tournament_mode && (
            <Badge variant="outline" className="capitalize">
              {tournament.tournament_mode}
            </Badge>
          )}
        </div>

        <h1 className="text-2xl font-gaming font-bold text-center mb-2">{tournament.title}</h1>
        <p className="text-center text-muted-foreground text-sm">{tournament.game}</p>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Trophy className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">Prize Pool</span>
          </div>
          <p className="text-xl font-bold text-amber-500">
            {tournament.is_giveaway 
              ? `₹${(tournament as any).giveaway_prize_pool || tournament.current_prize_pool || 0}`
              : (tournament.prize_pool || `₹${tournament.current_prize_pool || 0}`)
            }
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">{tournament.is_giveaway ? 'Platform Fee' : 'Entry Fee'}</span>
          </div>
          <p className={`text-xl font-bold ${tournament.is_giveaway ? 'text-pink-500' : 'text-emerald-500'}`}>
            {tournament.is_giveaway ? '₹1' : (entryFee ? `₹${entryFee}` : 'Free')}
          </p>
          {tournament.is_giveaway && (
            <p className="text-xs text-pink-500">Giveaway</p>
          )}
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">Players</span>
          </div>
          <p className="text-xl font-bold">
            {tournament.joined_users?.length || 0}/{tournament.max_participants || 100}
          </p>
          <p className="text-xs text-muted-foreground">{spotsLeft} spots left</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-purple-500 mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">Start Time</span>
          </div>
          <p className="text-sm font-bold">
            {format(new Date(tournament.start_date), 'MMM dd, yyyy')}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(tournament.start_date), 'h:mm a')}
          </p>
        </div>
      </div>

      {/* Mode Info for Duo/Squad */}
      {tournament.tournament_mode && tournament.tournament_mode !== 'solo' && (
        <div className="px-4 pb-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-sm text-blue-600">Team Mode: {tournament.tournament_mode}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {tournament.tournament_mode === 'duo' 
                ? 'You need to select 1 teammate from your player teams to join this tournament.' 
                : 'You need to select 3 teammates from your player teams to join this tournament.'}
              {' '}Entry fee ₹{entryFee} will be deducted from each team member's wallet.
            </p>
          </div>
        </div>
      )}

      {/* Description */}
      {tournament.description && (
        <div className="px-4 pb-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-primary" />
              Description
            </h3>
            <p className="text-sm text-muted-foreground">{tournament.description}</p>
          </div>
        </div>
      )}

      {/* Prize Distribution */}
      <div className="px-4 pb-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Prize Distribution
          </h3>
          {tournament.prize_distribution ? (
            <div className="space-y-2">
              {Object.entries(tournament.prize_distribution).map(([rank, amount]) => (
                <div key={rank} className="flex justify-between items-center bg-muted/50 rounded-lg p-3">
                  <span className="font-medium">Rank {rank}</span>
                  <span className="text-primary font-semibold">₹{String(amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-yellow-500/10 rounded-lg p-3">
                <span className="font-medium">🥇 1st Place</span>
                <span className="text-yellow-600 font-semibold">50%</span>
              </div>
              <div className="flex justify-between items-center bg-gray-300/20 rounded-lg p-3">
                <span className="font-medium">🥈 2nd Place</span>
                <span className="text-muted-foreground font-semibold">30%</span>
              </div>
              <div className="flex justify-between items-center bg-orange-500/10 rounded-lg p-3">
                <span className="font-medium">🥉 3rd Place</span>
                <span className="text-orange-600 font-semibold">20%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for bottom button - accounts for safe area */}
      <div className="h-24" />

      {/* Join Button - Fixed at bottom with safe area support */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="px-4 pt-3 max-w-lg mx-auto">
          {!user ? (
            <Button className="w-full h-12" onClick={() => navigate('/')}>
              Login to Join
            </Button>
          ) : isJoined ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-emerald-500/10 rounded-lg text-emerald-600">
              <Clock className="h-4 w-4" />
              <span className="font-medium">You have joined this tournament</span>
            </div>
          ) : canJoin ? (
            <Button className="w-full h-12 bg-gradient-to-r from-primary to-primary/80" onClick={handleJoinClick}>
              Join Tournament • ₹{entryFee}
              {tournament.tournament_mode && tournament.tournament_mode !== 'solo' && ' per player'}
            </Button>
          ) : (
            <Button className="w-full h-12" disabled>
              {spotsLeft <= 0 ? 'Tournament Full' : 'Registration Closed'}
            </Button>
          )}
        </div>
      </div>

      {/* Solo Join Dialog */}
      <Dialog open={joinDialog} onOpenChange={setJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Tournament</DialogTitle>
            <DialogDescription>
              Confirm your entry for {tournament.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{tournament.is_giveaway ? 'Platform Fee' : 'Entry Fee'}</span>
                <span className="font-semibold">₹{entryFee}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Balance</span>
                <span className="font-semibold">₹{walletBalance}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">After Joining</span>
                <span className={`font-semibold ${walletBalance - entryFee < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  ₹{walletBalance - entryFee}
                </span>
              </div>
            </div>

            {tournament.is_giveaway && (
              <div className="bg-emerald-500/10 text-emerald-600 text-sm p-3 rounded-lg">
                🎁 This is a giveaway tournament! Prize pool is funded by the organizer.
              </div>
            )}

            {walletBalance < entryFee && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                Insufficient balance. Please add ₹{entryFee - walletBalance} to your wallet.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleJoinTournament}
              disabled={joining || walletBalance < entryFee}
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm & Join'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Selection Dialog */}
      <Dialog
        open={teamSelectDialog}
        onOpenChange={(open) => {
          setTeamSelectDialog(open);
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
              {tournament.tournament_mode === 'duo'
                ? 'Select your team first, then pick 1 teammate for duo match'
                : 'Select your team first, then pick 3 teammates for squad match'}
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
                    You must join or create a player team first to participate in {tournament.tournament_mode} matches.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setTeamSelectDialog(false);
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
                                  <span className="text-[10px] text-destructive">Need {requiredSize}+ members</span>
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
                      <ScrollArea className="h-[220px]">
                        <div className="space-y-2">
                          {teamMembersList.map((member) => {
                            const isSelected = selectedTeamMembers.includes(member.user_id);
                            const hasInsufficientBalance = member.wallet_balance < entryFee;
                            const maxSelected = selectedTeamMembers.length >= getRequiredTeamSize() - 1;

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
                      {selectedTeamMembers.length + 1} / {getRequiredTeamSize()}
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

          {/* Fixed footer (always visible) */}
          <DialogFooter className="pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setTeamSelectDialog(false);
                setSelectedTeamMembers([]);
                setTeamName('');
                setSelectedTeamId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleTeamJoin} disabled={joining || !canTeamJoin()}>
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join as Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentDetails;