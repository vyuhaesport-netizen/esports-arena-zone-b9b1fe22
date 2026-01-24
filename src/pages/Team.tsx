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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  XCircle,
  MoreVertical,
  Settings,
  Eye,
  EyeOff,
  ShieldCheck,
  Trash2
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
  const [activeTab, setActiveTab] = useState('browse');
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
  const MAX_TEAM_MEMBERS = 6;

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

    if (team.memberCount >= MAX_TEAM_MEMBERS) {
      toast({ title: 'Team Full', description: 'This team has reached maximum capacity (6 players).', variant: 'destructive' });
      return;
    }

    if (team.requires_approval) {
      setSelectedTeamForRequest(team);
      setRequestDialogOpen(true);
      return;
    }

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
      if (teamMembers.length >= MAX_TEAM_MEMBERS) {
        toast({ title: 'Team Full', description: 'Cannot approve - team is at maximum capacity (6 players).', variant: 'destructive' });
        return;
      }

      const { error: memberError } = await supabase
        .from('player_team_members')
        .insert({
          team_id: myTeam.id,
          user_id: request.user_id,
          role: 'member',
        });

      if (memberError) throw memberError;

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !myTeam || myTeam.leader_id !== user.id) return;
    
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Image must be less than 2MB.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `team-logos/${myTeam.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('player_teams')
        .update({ logo_url: publicUrl })
        .eq('id', myTeam.id);

      if (updateError) throw updateError;

      toast({ title: 'Logo Updated!', description: 'Your team logo has been updated.' });
      fetchMyTeam();
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({ title: 'Error', description: 'Failed to upload logo.', variant: 'destructive' });
    } finally {
      setSaving(false);
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
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/10">
        <div className="flex items-center gap-3 px-4 h-16">
          <button 
            onClick={() => navigate('/profile')} 
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg scale-150" />
            <img src={vyuhaLogo} alt="Vyuha" className="w-10 h-10 rounded-full shadow-lg relative z-10 border-2 border-primary/30" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Teams</h1>
            <p className="text-[11px] text-muted-foreground">Build your squad for duo/squad matches</p>
          </div>
          
          {isLeader && myTeam && (
            <button
              onClick={() => setActiveTab('requests')}
              className="relative p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Inbox className="h-5 w-5 text-primary" />
              {joinRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-[10px] rounded-full flex items-center justify-center text-destructive-foreground font-bold animate-pulse">
                  {joinRequests.length}
                </span>
              )}
            </button>
          )}
          
          {!myTeam && (
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="gap-1.5 shadow-lg hover:shadow-xl transition-all h-9 rounded-xl bg-gradient-to-r from-primary to-gaming-purple"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          )}
        </div>
      </header>

      {/* Premium Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-4 shrink-0">
          {myTeam ? (
            isLeader ? (
              <TabsList className="w-full grid grid-cols-1 h-11 rounded-xl bg-muted/50 p-1">
                <TabsTrigger value="my-team" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md">
                  <Shield className="h-4 w-4" />
                  My Team
                </TabsTrigger>
              </TabsList>
            ) : (
              <TabsList className="w-full grid grid-cols-1 h-11 rounded-xl bg-muted/50 p-1">
                <TabsTrigger value="my-team" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md">
                  <Shield className="h-4 w-4" />
                  My Team
                </TabsTrigger>
              </TabsList>
            )
          ) : (
            <TabsList className="w-full grid grid-cols-2 h-11 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="browse" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md">
                <Globe className="h-4 w-4" />
                Browse Teams
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5 text-xs rounded-lg relative data-[state=active]:bg-card data-[state=active]:shadow-md">
                <Send className="h-4 w-4" />
                My Requests
                {myRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[9px] rounded-full flex items-center justify-center text-primary-foreground font-bold">
                    {myRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          )}
        </div>

        {/* My Team Tab */}
        <TabsContent value="my-team" className="flex-1 mt-0 overflow-auto px-4 py-4 pb-20">
          {myTeam && (
            <div className="space-y-4 animate-fade-in">
              {/* Team Card */}
              <div 
                className="p-4 rounded-xl border border-border/30 bg-card/50 overflow-hidden"
                style={{
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="relative group">
                    {myTeam.logo_url ? (
                      <Avatar className="w-12 h-12 rounded-xl">
                        <AvatarImage src={myTeam.logo_url} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/50 rounded-xl">
                          <Users className="h-6 w-6 text-primary-foreground" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary-foreground" />
                      </div>
                    )}
                    {isLeader && (
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                        <Plus className="h-4 w-4 text-white" />
                      </label>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold">{myTeam.name}</h3>
                      {isLeader && (
                        <Badge className="bg-warning/20 text-warning text-[9px] px-1.5 py-0">
                          <Crown className="h-2.5 w-2.5 mr-0.5" /> Leader
                        </Badge>
                      )}
                    </div>
                    {myTeam.slogan && (
                      <p className="text-[10px] text-muted-foreground italic mt-0.5">"{myTeam.slogan}"</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {myTeam.game && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
                          <Gamepad2 className="h-2.5 w-2.5" /> {myTeam.game}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5">
                        <Users className="h-2.5 w-2.5" /> {teamMembers.length}/{MAX_TEAM_MEMBERS}
                      </Badge>
                    </div>
                  </div>
                    
                    {isLeader && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted">
                            <MoreVertical className="h-5 w-5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <div className="px-2 py-1.5">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <Settings className="h-3.5 w-3.5" /> Team Settings
                            </p>
                          </div>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={toggleTeamVisibility} className="cursor-pointer gap-2">
                            {myTeam.is_open_for_players ? (
                              <><EyeOff className="h-4 w-4 text-muted-foreground" /><span>Hide from Browse</span></>
                            ) : (
                              <><Eye className="h-4 w-4 text-success" /><span>Show in Browse</span></>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={toggleTeamApproval} className="cursor-pointer gap-2">
                            {myTeam.requires_approval ? (
                              <><Check className="h-4 w-4 text-primary" /><span>Allow Direct Join</span></>
                            ) : (
                              <><ShieldCheck className="h-4 w-4 text-warning" /><span>Require Approval</span></>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleLeaveTeam} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4" /><span>Disband Team</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                </div>
                
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {myTeam.is_open_for_players ? (
                    <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-[9px] px-1.5 py-0 gap-0.5">
                      <Eye className="h-2.5 w-2.5" /> Visible
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground bg-muted/50 text-[9px] px-1.5 py-0 gap-0.5">
                      <EyeOff className="h-2.5 w-2.5" /> Hidden
                    </Badge>
                  )}
                  {myTeam.requires_approval ? (
                    <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-[9px] px-1.5 py-0 gap-0.5">
                      <ShieldCheck className="h-2.5 w-2.5" /> Approval Required
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 text-[9px] px-1.5 py-0 gap-0.5">
                      <Check className="h-2.5 w-2.5" /> Direct Join
                    </Badge>
                  )}
                </div>
              </div>

              {/* Pending Requests Alert */}
              {isLeader && joinRequests.length > 0 && (
                <div 
                  onClick={() => setActiveTab('requests')}
                  className="p-3 mt-4 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl cursor-pointer hover:border-primary/40 transition-all"
                  style={{ backdropFilter: 'blur(8px)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                      <Inbox className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold">{joinRequests.length} pending request{joinRequests.length > 1 ? 's' : ''}</span>
                      <p className="text-[10px] text-muted-foreground">Tap to review and approve players</p>
                    </div>
                    <Badge className="bg-primary text-primary-foreground text-[10px]">{joinRequests.length}</Badge>
                  </div>
                </div>
              )}

              {/* Team Members Section */}
              <div 
                className="mt-4 p-3 rounded-xl border border-border/30 bg-card/50"
                style={{ backdropFilter: 'blur(8px)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" /> Team Members
                  </p>
                  <Badge variant="secondary" className="text-[9px]">{teamMembers.length}/{MAX_TEAM_MEMBERS}</Badge>
                </div>
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        member.role === 'leader' 
                          ? 'bg-gradient-to-r from-primary/10 to-transparent border border-primary/20' 
                          : 'bg-muted/30 hover:bg-muted/50 border border-border/30'
                      }`}
                    >
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={member.profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                          {member.profile?.username?.charAt(0).toUpperCase() || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-xs truncate">
                            {member.profile?.full_name || member.profile?.username || 'Player'}
                          </p>
                          {member.role === 'leader' && (
                            <Crown className="h-3 w-3 text-warning shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            IGN: {member.profile?.in_game_name || 'N/A'}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            UID: {member.profile?.game_uid || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                      {isLeader && member.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {!isLeader && (
                  <Button
                    variant="outline"
                    className="w-full mt-4 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl h-9 text-xs"
                    onClick={handleLeaveTeam}
                  >
                    <UserMinus className="h-3.5 w-3.5 mr-1.5" /> Leave Team
                  </Button>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse" className="flex-1 mt-0 overflow-auto px-4 py-4 pb-20">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams by name or game..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl h-11 bg-card border-border/50"
            />
          </div>

          <div className="space-y-3">
            {filteredOpenTeams.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">No teams found</p>
                <p className="text-xs text-muted-foreground mt-1">Create your own team to get started</p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-xl"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Create Team
                </Button>
              </div>
            ) : (
              filteredOpenTeams.map((team) => (
                <div 
                  key={team.id} 
                  className="p-3 rounded-xl border border-border/30 bg-card/50 hover:border-primary/30 transition-all"
                  style={{
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-xs truncate">{team.name}</h4>
                        {team.requires_approval ? (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 text-warning border-warning/30 bg-warning/10">
                            Approval
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 text-success border-success/30 bg-success/10">
                            Direct
                          </Badge>
                        )}
                      </div>
                      {team.slogan && (
                        <p className="text-[10px] text-muted-foreground italic truncate mt-0.5">"{team.slogan}"</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                        {team.game && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">{team.game}</Badge>
                        )}
                        <span>{team.memberCount}/{MAX_TEAM_MEMBERS}</span>
                        <span>•</span>
                        <span>{team.leaderName}</span>
                      </div>
                    </div>
                    <Button
                      variant={pendingRequestsForTeam(team.id) ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleJoinTeam(team)}
                      disabled={!!myTeam || team.memberCount >= MAX_TEAM_MEMBERS || pendingRequestsForTeam(team.id)}
                      className="rounded-lg h-8 text-[10px] px-2.5"
                    >
                      {team.memberCount >= MAX_TEAM_MEMBERS ? (
                        'Full'
                      ) : pendingRequestsForTeam(team.id) ? (
                        <><Clock className="h-3 w-3 mr-1" /> Pending</>
                      ) : team.requires_approval ? (
                        <><Send className="h-3 w-3 mr-1" /> Request</>
                      ) : (
                        <><UserPlus className="h-3 w-3 mr-1" /> Join</>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>


        {/* Requests Tab */}
        <TabsContent value="requests" className="flex-1 mt-0 overflow-auto px-4 py-4 pb-20">
          {isLeader && myTeam ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Inbox className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Join Requests</h3>
                <Badge variant="secondary">{joinRequests.length}</Badge>
              </div>

              {joinRequests.length === 0 ? (
                <div className="text-center py-16">
                  <Inbox className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No pending requests</p>
                  <p className="text-xs text-muted-foreground mt-1">New requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map((request) => (
                    <Card key={request.id} variant="premium" className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-14 w-14 border-2 border-primary/30">
                            <AvatarImage src={request.profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {request.profile?.username?.charAt(0).toUpperCase() || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold">
                              {request.profile?.full_name || request.profile?.username || 'Player'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-[10px]">
                                IGN: {request.profile?.in_game_name || 'Not set'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                UID: {request.profile?.game_uid || 'Not set'}
                              </Badge>
                            </div>
                            {request.message && (
                              <p className="text-xs text-muted-foreground mt-2 italic">"{request.message}"</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Requested {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="flex-1 rounded-xl h-10 bg-gradient-to-r from-success to-gaming-green"
                            onClick={() => handleApproveRequest(request)}
                            disabled={teamMembers.length >= MAX_TEAM_MEMBERS}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-xl h-10 text-destructive border-destructive/30"
                            onClick={() => handleRejectRequest(request)}
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Send className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">My Requests</h3>
              </div>

              {myRequests.length === 0 ? (
                <div className="text-center py-16">
                  <Send className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No requests sent</p>
                  <p className="text-xs text-muted-foreground mt-1">Browse teams and send join requests</p>
                  <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setActiveTab('browse')}>
                    <Search className="h-4 w-4 mr-1" /> Browse Teams
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((request) => (
                    <Card key={request.id} variant="premium">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{request.teamName}</p>
                            <p className="text-xs text-muted-foreground">
                              Sent {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {request.status === 'pending' ? (
                              <>
                                <Badge className="bg-warning/10 text-warning border-warning/30">
                                  <Clock className="h-3 w-3 mr-1" /> Pending
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive rounded-lg"
                                  onClick={() => handleCancelRequest(request.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : request.status === 'approved' ? (
                              <Badge className="bg-success/10 text-success border-success/30">
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
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Team Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
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
                className="rounded-xl"
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
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Game</Label>
              <Select
                value={teamForm.game}
                onValueChange={(value) => setTeamForm({ ...teamForm, game: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game} value={game}>{game}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="text-sm font-medium">Visible to Players</p>
                <p className="text-xs text-muted-foreground">Show team in browse section</p>
              </div>
              <Button
                variant={teamForm.is_open_for_players ? "default" : "outline"}
                size="sm"
                onClick={() => setTeamForm({ ...teamForm, is_open_for_players: !teamForm.is_open_for_players })}
                className="rounded-xl"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="text-sm font-medium">Require Approval</p>
                <p className="text-xs text-muted-foreground">Review players before they join</p>
              </div>
              <Button
                variant={teamForm.requires_approval ? "default" : "outline"}
                size="sm"
                onClick={() => setTeamForm({ ...teamForm, requires_approval: !teamForm.requires_approval })}
                className="rounded-xl"
              >
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTeam} 
              disabled={saving || !teamForm.name.trim()}
              className="rounded-xl bg-gradient-to-r from-primary to-gaming-purple"
            >
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
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="font-semibold">{selectedTeamForRequest.name}</p>
                {selectedTeamForRequest.slogan && (
                  <p className="text-xs text-muted-foreground italic mt-1">"{selectedTeamForRequest.slogan}"</p>
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
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Let them know why you want to join</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleSendRequest} 
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-primary to-gaming-purple"
            >
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
