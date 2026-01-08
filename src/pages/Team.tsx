import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import {
  ArrowLeft,
  Users,
  Plus,
  Search,
  Loader2,
  Crown,
  UserPlus,
  UserMinus,
  Shield,
  Gamepad2,
  Globe,
  Inbox,
  Check,
  X,
  Send,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface PlayerTeam {
  id: string;
  name: string;
  logo_url: string | null;
  slogan: string | null;
  leader_id: string;
  is_open_for_players: boolean;
  requires_approval: boolean;
  max_members: number;
  game: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    in_game_name: string | null;
    game_uid: string | null;
  };
}

interface JoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    in_game_name: string | null;
    game_uid: string | null;
  };
}

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState('browse'); // Default to browse for users without team
  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeam] = useState<PlayerTeam | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [openTeams, setOpenTeams] = useState<(PlayerTeam & { memberCount: number; leaderName: string })[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [myRequests, setMyRequests] = useState<(JoinRequest & { teamName: string })[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedTeamForRequest, setSelectedTeamForRequest] = useState<PlayerTeam | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  
  const [teamForm, setTeamForm] = useState({
    name: '',
    slogan: '',
    game: '',
    is_open_for_players: true,
    requires_approval: true,
  });

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const games = ['Free Fire', 'BGMI', 'Call of Duty Mobile', 'PUBG New State', 'Clash Royale'];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMyTeam();
      fetchOpenTeams();
      fetchMyRequests();
    }
  }, [user]);

  // Set correct default tab based on team membership
  useEffect(() => {
    if (!loading) {
      if (myTeam) {
        setActiveTab('my-team');
      } else {
        setActiveTab('browse');
      }
    }
  }, [myTeam, loading]);

  const fetchMyTeam = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: membership } = await supabase
        .from('player_team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership) {
        const { data: team } = await supabase
          .from('player_teams')
          .select('*')
          .eq('id', membership.team_id)
          .single();

        if (team) {
          setMyTeam(team as PlayerTeam);
          fetchTeamMembers(team.id);
          if (team.leader_id === user.id) {
            fetchJoinRequests(team.id);
          }
        }
      } else {
        setMyTeam(null);
        setTeamMembers([]);
        setJoinRequests([]);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data: members } = await supabase
        .from('player_team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('role', { ascending: false });

      if (members) {
        const membersWithProfiles = await Promise.all(
          members.map(async (member) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url, in_game_name, game_uid')
              .eq('user_id', member.user_id)
              .single();
            return { ...member, profile };
          })
        );
        setTeamMembers(membersWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchJoinRequests = async (teamId: string) => {
    try {
      const { data: requests } = await supabase
        .from('player_team_requests')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requests) {
        const requestsWithProfiles = await Promise.all(
          requests.map(async (request) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url, in_game_name, game_uid')
              .eq('user_id', request.user_id)
              .single();
            return { ...request, profile };
          })
        );
        setJoinRequests(requestsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  };

  const fetchMyRequests = async () => {
    if (!user) return;
    try {
      const { data: requests } = await supabase
        .from('player_team_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (requests) {
        const requestsWithTeams = await Promise.all(
          requests.map(async (request) => {
            const { data: team } = await supabase
              .from('player_teams')
              .select('name')
              .eq('id', request.team_id)
              .single();
            return { ...request, teamName: team?.name || 'Unknown Team' };
          })
        );
        setMyRequests(requestsWithTeams);
      }
    } catch (error) {
      console.error('Error fetching my requests:', error);
    }
  };

  const fetchOpenTeams = async () => {
    try {
      const { data: teams } = await supabase
        .from('player_teams')
        .select('*')
        .eq('is_open_for_players', true)
        .order('created_at', { ascending: false });

      if (teams) {
        const teamsWithDetails = await Promise.all(
          teams.map(async (team) => {
            const { count } = await supabase
              .from('player_team_members')
              .select('*', { count: 'exact', head: true })
              .eq('team_id', team.id);

            const { data: leaderProfile } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('user_id', team.leader_id)
              .single();

            return {
              ...team,
              memberCount: count || 0,
              leaderName: leaderProfile?.full_name || leaderProfile?.username || 'Unknown',
            };
          })
        );
        setOpenTeams(teamsWithDetails as (PlayerTeam & { memberCount: number; leaderName: string })[]);
      }
    } catch (error) {
      console.error('Error fetching open teams:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!user || !teamForm.name.trim()) {
      toast({ title: 'Error', description: 'Please enter a team name.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const { data: newTeam, error: teamError } = await supabase
        .from('player_teams')
        .insert({
          name: teamForm.name.trim(),
          slogan: teamForm.slogan.trim() || null,
          game: teamForm.game || null,
          leader_id: user.id,
          is_open_for_players: teamForm.is_open_for_players,
          requires_approval: teamForm.requires_approval,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      const { error: memberError } = await supabase
        .from('player_team_members')
        .insert({
          team_id: newTeam.id,
          user_id: user.id,
          role: 'leader',
        });

      if (memberError) throw memberError;

      toast({ title: 'Team Created!', description: `Your team "${newTeam.name}" has been created.` });
      setCreateDialogOpen(false);
      setTeamForm({ name: '', slogan: '', game: '', is_open_for_players: true, requires_approval: true });
      fetchMyTeam();
      fetchOpenTeams();
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({ title: 'Error', description: 'Failed to create team.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user || !selectedTeamForRequest) return;

    if (myTeam) {
      toast({ title: 'Already in a Team', description: 'Leave your current team first.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('player_team_requests')
        .insert({
          team_id: selectedTeamForRequest.id,
          user_id: user.id,
          message: requestMessage.trim() || null,
        });

      if (error) throw error;

      toast({ title: 'Request Sent!', description: 'Your join request has been sent to the team leader.' });
      setRequestDialogOpen(false);
      setRequestMessage('');
      setSelectedTeamForRequest(null);
      fetchMyRequests();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Already Requested', description: 'You already have a pending request for this team.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to send request.', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleJoinTeam = async (team: PlayerTeam & { memberCount: number }) => {
    if (!user) return;

    if (myTeam) {
      toast({ title: 'Already in a Team', description: 'Leave your current team first.', variant: 'destructive' });
      return;
    }

    if (team.memberCount >= team.max_members) {
      toast({ title: 'Team Full', description: 'This team has reached maximum capacity.', variant: 'destructive' });
      return;
    }

    // If requires approval, open request dialog
    if (team.requires_approval) {
      setSelectedTeamForRequest(team);
      setRequestDialogOpen(true);
      return;
    }

    // Direct join
    try {
      const { error } = await supabase
        .from('player_team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'member',
        });

      if (error) throw error;

      toast({ title: 'Joined Team!', description: 'You have joined the team successfully.' });
      fetchMyTeam();
      fetchOpenTeams();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Already a Member', description: 'You are already in this team.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to join team.', variant: 'destructive' });
      }
    }
  };

  const handleApproveRequest = async (request: JoinRequest) => {
    if (!user || !myTeam) return;

    try {
      // Check capacity
      if (teamMembers.length >= myTeam.max_members) {
        toast({ title: 'Team Full', description: 'Cannot approve - team is at maximum capacity.', variant: 'destructive' });
        return;
      }

      // Add member
      const { error: memberError } = await supabase
        .from('player_team_members')
        .insert({
          team_id: myTeam.id,
          user_id: request.user_id,
          role: 'member',
        });

      if (memberError) throw memberError;

      // Update request status
      const { error: updateError } = await supabase
        .from('player_team_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast({ title: 'Request Approved', description: `${request.profile?.full_name || 'Player'} has joined your team.` });
      fetchTeamMembers(myTeam.id);
      fetchJoinRequests(myTeam.id);
    } catch (error) {
      console.error('Error approving request:', error);
      toast({ title: 'Error', description: 'Failed to approve request.', variant: 'destructive' });
    }
  };

  const handleRejectRequest = async (request: JoinRequest) => {
    if (!user || !myTeam) return;

    try {
      const { error } = await supabase
        .from('player_team_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
        .eq('id', request.id);

      if (error) throw error;

      toast({ title: 'Request Rejected', description: 'Join request has been rejected.' });
      fetchJoinRequests(myTeam.id);
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({ title: 'Error', description: 'Failed to reject request.', variant: 'destructive' });
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('player_team_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: 'Request Cancelled', description: 'Your join request has been cancelled.' });
      fetchMyRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({ title: 'Error', description: 'Failed to cancel request.', variant: 'destructive' });
    }
  };

  const handleLeaveTeam = async () => {
    if (!user || !myTeam) return;

    try {
      if (myTeam.leader_id === user.id) {
        const { error } = await supabase
          .from('player_teams')
          .delete()
          .eq('id', myTeam.id);

        if (error) throw error;
        toast({ title: 'Team Disbanded', description: 'Your team has been disbanded.' });
      } else {
        const { error } = await supabase
          .from('player_team_members')
          .delete()
          .eq('team_id', myTeam.id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast({ title: 'Left Team', description: 'You have left the team.' });
      }

      fetchMyTeam();
      fetchOpenTeams();
    } catch (error) {
      console.error('Error leaving team:', error);
      toast({ title: 'Error', description: 'Failed to leave team.', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!user || !myTeam || myTeam.leader_id !== user.id) return;

    if (memberUserId === user.id) {
      toast({ title: 'Cannot Remove', description: 'You cannot remove yourself.', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('player_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: 'Member Removed', description: 'Player has been removed from the team.' });
      fetchTeamMembers(myTeam.id);
    } catch (error) {
      console.error('Error removing member:', error);
      toast({ title: 'Error', description: 'Failed to remove member.', variant: 'destructive' });
    }
  };

  const toggleTeamApproval = async () => {
    if (!user || !myTeam || myTeam.leader_id !== user.id) return;

    try {
      const { error } = await supabase
        .from('player_teams')
        .update({ requires_approval: !myTeam.requires_approval })
        .eq('id', myTeam.id);

      if (error) throw error;

      toast({ 
        title: myTeam.requires_approval ? 'Direct Join Enabled' : 'Approval Required',
        description: myTeam.requires_approval 
          ? 'Players can now join directly without approval.' 
          : 'Players must request to join and you can approve/reject.'
      });
      fetchMyTeam();
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const toggleTeamVisibility = async () => {
    if (!user || !myTeam || myTeam.leader_id !== user.id) return;

    try {
      const { error } = await supabase
        .from('player_teams')
        .update({ is_open_for_players: !myTeam.is_open_for_players })
        .eq('id', myTeam.id);

      if (error) throw error;

      toast({ 
        title: myTeam.is_open_for_players ? 'Team Hidden' : 'Team Visible',
        description: myTeam.is_open_for_players 
          ? 'Your team is now hidden from browse.' 
          : 'Players can now find your team.'
      });
      fetchMyTeam();
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const filteredOpenTeams = openTeams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (team.game && team.game.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingRequestsForTeam = (teamId: string) => 
    myRequests.filter(r => r.team_id === teamId && r.status === 'pending').length > 0;

  const isLeader = myTeam?.leader_id === user?.id;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate('/profile')} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <h1 className="font-gaming font-bold">Teams</h1>
            <p className="text-xs text-muted-foreground">Build your squad for duo/squad matches</p>
          </div>
          {!myTeam && (
            <Button
              variant="gaming"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          )}
        </div>
      </header>

      {/* Tabs - Conditional based on team membership */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-3">
          {/* If user has a team, show different tab layout */}
          {myTeam ? (
            isLeader ? (
              // Leader: My Team + Requests only
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="my-team" className="gap-1.5 text-xs">
                  <Shield className="h-3.5 w-3.5" />
                  My Team
                </TabsTrigger>
                <TabsTrigger value="requests" className="gap-1.5 text-xs relative">
                  <Inbox className="h-3.5 w-3.5" />
                  Requests
                  {joinRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-[10px] rounded-full flex items-center justify-center text-primary-foreground font-bold animate-pulse">
                      {joinRequests.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            ) : (
              // Member (not leader): Only My Team tab
              <TabsList className="w-full">
                <TabsTrigger value="my-team" className="w-full gap-1.5 text-xs">
                  <Shield className="h-3.5 w-3.5" />
                  My Team
                </TabsTrigger>
              </TabsList>
            )
          ) : (
            // No team: Browse + My Requests
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="browse" className="gap-1.5 text-xs">
                <Globe className="h-3.5 w-3.5" />
                Browse Teams
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5 text-xs relative">
                <Send className="h-3.5 w-3.5" />
                My Requests
                {myRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-[10px] rounded-full flex items-center justify-center text-white font-bold">
                    {myRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          )}
        </div>

        {/* My Team Tab */}
        <TabsContent value="my-team" className="flex-1 mt-0 p-4">
          {myTeam ? (
            <div className="space-y-4">
              {/* Team Card - Enhanced Design */}
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-orange-500/5 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                <CardHeader className="pb-3 relative">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl font-gaming">{myTeam.name}</CardTitle>
                        {isLeader && (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[10px] shadow-sm">
                            <Crown className="h-3 w-3 mr-0.5" /> Leader
                          </Badge>
                        )}
                      </div>
                      {myTeam.slogan && (
                        <p className="text-sm text-muted-foreground italic mt-1">"{myTeam.slogan}"</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        {myTeam.game && (
                          <span className="flex items-center gap-1 bg-muted/80 px-2 py-0.5 rounded-full text-xs">
                            <Gamepad2 className="h-3 w-3" /> {myTeam.game}
                          </span>
                        )}
                        <span className="flex items-center gap-1 bg-muted/80 px-2 py-0.5 rounded-full text-xs">
                          <Users className="h-3 w-3" /> {teamMembers.length}/{myTeam.max_members}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Badges */}
                  <div className="flex gap-2 mt-3">
                    {myTeam.is_open_for_players ? (
                      <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10 text-xs">
                        <Globe className="h-3 w-3 mr-1" /> Visible to Others
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground bg-muted/50 text-xs">
                        Hidden from Browse
                      </Badge>
                    )}
                    {myTeam.requires_approval ? (
                      <Badge variant="outline" className="text-orange-500 border-orange-500/30 bg-orange-500/10 text-xs">
                        <Clock className="h-3 w-3 mr-1" /> Approval Required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10 text-xs">
                        <Check className="h-3 w-3 mr-1" /> Direct Join
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Leader Actions */}
                  {isLeader && (
                    <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-muted/30 rounded-xl border border-border/50">
                      <p className="col-span-2 text-xs font-medium text-muted-foreground mb-1">Team Settings</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleTeamVisibility}
                        className="text-xs h-9"
                      >
                        {myTeam.is_open_for_players ? (
                          <><Globe className="h-3.5 w-3.5 mr-1.5" /> Hide Team</>
                        ) : (
                          <><Globe className="h-3.5 w-3.5 mr-1.5" /> Show Team</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleTeamApproval}
                        className="text-xs h-9"
                      >
                        {myTeam.requires_approval ? (
                          <><Check className="h-3.5 w-3.5 mr-1.5" /> Allow Direct</>
                        ) : (
                          <><Clock className="h-3.5 w-3.5 mr-1.5" /> Require Approval</>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Pending Requests Alert - Only for Leaders */}
                  {isLeader && joinRequests.length > 0 && (
                    <div 
                      onClick={() => setActiveTab('requests')}
                      className="p-4 mb-4 bg-gradient-to-r from-primary/15 to-orange-500/10 border border-primary/30 rounded-xl cursor-pointer hover:from-primary/20 hover:to-orange-500/15 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Inbox className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold">{joinRequests.length} pending request{joinRequests.length > 1 ? 's' : ''}</span>
                          <p className="text-xs text-muted-foreground">Tap to review and approve players</p>
                        </div>
                        <Badge className="bg-primary text-primary-foreground animate-pulse">{joinRequests.length}</Badge>
                      </div>
                    </div>
                  )}

                  {/* Team Members */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold">Team Members</p>
                      <Badge variant="secondary" className="text-xs">{teamMembers.length}/{myTeam.max_members}</Badge>
                    </div>
                    {teamMembers.map((member, index) => (
                      <div
                        key={member.id}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          member.role === 'leader' 
                            ? 'bg-gradient-to-r from-primary/10 to-orange-500/5 border border-primary/20' 
                            : 'bg-muted/50 hover:bg-muted/70'
                        }`}
                      >
                        <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
                          <AvatarImage src={member.profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                            {member.profile?.username?.charAt(0).toUpperCase() || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {member.profile?.full_name || member.profile?.username || 'Player'}
                            </p>
                            {member.role === 'leader' && (
                              <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate">
                              {member.profile?.in_game_name || 'No IGN set'}
                            </p>
                            {member.profile?.game_uid && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                UID: {member.profile.game_uid}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isLeader && member.user_id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id, member.user_id)}
                            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Leave/Disband Button */}
                  <Button
                    variant="outline"
                    className="w-full mt-5 text-destructive border-destructive/30 hover:bg-destructive/10 h-11"
                    onClick={handleLeaveTeam}
                  >
                    {isLeader ? 'Disband Team' : 'Leave Team'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-gradient-to-br from-primary/20 to-orange-500/10 flex items-center justify-center">
                <Users className="h-12 w-12 text-primary/50" />
              </div>
              <h3 className="font-gaming text-xl font-bold mb-2">No Team Yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Create your own team to lead, or browse and request to join existing squads
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="gaming" size="lg" onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-5 w-5" /> Create Team
                </Button>
                <Button variant="outline" size="lg" onClick={() => setActiveTab('browse')} className="gap-2">
                  <Search className="h-5 w-5" /> Browse
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Browse Teams Tab - Only visible when user has no team */}
        <TabsContent value="browse" className="flex-1 mt-0 p-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams by name or game..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Create Team CTA */}
          <Card className="mb-4 border-dashed border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-orange-500/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Want to lead?</p>
                <p className="text-xs text-muted-foreground">Create your own team and recruit players</p>
              </div>
              <Button variant="gaming" size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Available Teams ({filteredOpenTeams.length})
          </p>

          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="space-y-3">
              {filteredOpenTeams.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No open teams found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try creating your own team!</p>
                </div>
              ) : (
                filteredOpenTeams.map((team) => (
                  <Card key={team.id} className="border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm truncate">{team.name}</h4>
                            {team.requires_approval ? (
                              <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30">
                                Approval
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">
                                Direct
                              </Badge>
                            )}
                          </div>
                          {team.slogan && (
                            <p className="text-xs text-muted-foreground italic truncate">"{team.slogan}"</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {team.game && (
                              <Badge variant="secondary" className="text-[10px] px-1.5">
                                {team.game}
                              </Badge>
                            )}
                            <span>{team.memberCount}/{team.max_members}</span>
                          </div>
                        </div>
                        <Button
                          variant={pendingRequestsForTeam(team.id) ? "outline" : "gaming"}
                          size="sm"
                          onClick={() => handleJoinTeam(team)}
                          disabled={!!myTeam || team.memberCount >= team.max_members || pendingRequestsForTeam(team.id)}
                        >
                          {team.memberCount >= team.max_members ? (
                            'Full'
                          ) : pendingRequestsForTeam(team.id) ? (
                            <><Clock className="h-3.5 w-3.5 mr-1" /> Pending</>
                          ) : team.requires_approval ? (
                            <><Send className="h-3.5 w-3.5 mr-1" /> Request</>
                          ) : (
                            <><UserPlus className="h-3.5 w-3.5 mr-1" /> Join</>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Leader: {team.leaderName}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="flex-1 mt-0 p-4">
          {isLeader && myTeam ? (
            // Leader's inbox
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Inbox className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Join Requests</h3>
                <Badge variant="secondary">{joinRequests.length}</Badge>
              </div>

              {joinRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No pending requests</p>
                  <p className="text-xs text-muted-foreground mt-1">New requests will appear here</p>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-3">
                    {joinRequests.map((request) => (
                      <Card key={request.id} className="border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={request.profile?.avatar_url || ''} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {request.profile?.username?.charAt(0).toUpperCase() || 'P'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">
                                {request.profile?.full_name || request.profile?.username || 'Player'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px]">
                                  IGN: {request.profile?.in_game_name || 'Not set'}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  UID: {request.profile?.game_uid || 'Not set'}
                                </Badge>
                              </div>
                              {request.message && (
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  "{request.message}"
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Requested {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="gaming"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleApproveRequest(request)}
                              disabled={teamMembers.length >= myTeam.max_members}
                            >
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-destructive border-destructive/30"
                              onClick={() => handleRejectRequest(request)}
                            >
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : (
            // Player's sent requests
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">My Requests</h3>
              </div>

              {myRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Send className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No requests sent</p>
                  <p className="text-xs text-muted-foreground mt-1">Browse teams and send join requests</p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab('browse')}>
                    <Search className="h-4 w-4 mr-1" /> Browse Teams
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-3">
                    {myRequests.map((request) => (
                      <Card key={request.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm">{request.teamName}</p>
                              <p className="text-xs text-muted-foreground">
                                Sent {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {request.status === 'pending' ? (
                                <>
                                  <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                                    <Clock className="h-3 w-3 mr-1" /> Pending
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => handleCancelRequest(request.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : request.status === 'approved' ? (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Approved
                                </Badge>
                              ) : (
                                <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                                  <XCircle className="h-3 w-3 mr-1" /> Rejected
                                </Badge>
                              )}
                            </div>
                          </div>
                          {request.message && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              Your message: "{request.message}"
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Team Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Create Team
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team Name *</Label>
              <Input
                placeholder="Enter team name"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                maxLength={30}
              />
            </div>

            <div className="space-y-2">
              <Label>Team Slogan</Label>
              <Textarea
                placeholder="Enter your team's motto (optional)"
                value={teamForm.slogan}
                onChange={(e) => setTeamForm({ ...teamForm, slogan: e.target.value })}
                maxLength={100}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Game</Label>
              <Select
                value={teamForm.game}
                onValueChange={(value) => setTeamForm({ ...teamForm, game: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game} value={game}>
                      {game}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Visible to Players</p>
                <p className="text-xs text-muted-foreground">Show team in browse section</p>
              </div>
              <Button
                variant={teamForm.is_open_for_players ? "gaming" : "outline"}
                size="sm"
                onClick={() => setTeamForm({ ...teamForm, is_open_for_players: !teamForm.is_open_for_players })}
              >
                <Globe className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Require Approval</p>
                <p className="text-xs text-muted-foreground">Review players before they join</p>
              </div>
              <Button
                variant={teamForm.requires_approval ? "gaming" : "outline"}
                size="sm"
                onClick={() => setTeamForm({ ...teamForm, requires_approval: !teamForm.requires_approval })}
              >
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="gaming" onClick={handleCreateTeam} disabled={saving || !teamForm.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request to Join Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Request to Join
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {selectedTeamForRequest && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{selectedTeamForRequest.name}</p>
                {selectedTeamForRequest.slogan && (
                  <p className="text-xs text-muted-foreground italic">"{selectedTeamForRequest.slogan}"</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Message (Optional)</Label>
              <Textarea
                placeholder="Introduce yourself to the team leader..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Let them know why you want to join
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="gaming" onClick={handleSendRequest} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
