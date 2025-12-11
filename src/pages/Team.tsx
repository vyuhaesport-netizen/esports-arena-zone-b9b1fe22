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
  Lock
} from 'lucide-react';

interface PlayerTeam {
  id: string;
  name: string;
  logo_url: string | null;
  slogan: string | null;
  leader_id: string;
  is_open_for_players: boolean;
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

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState('my-team');
  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeam] = useState<PlayerTeam | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [openTeams, setOpenTeams] = useState<(PlayerTeam & { memberCount: number; leaderName: string })[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [memberUid, setMemberUid] = useState('');
  
  const [teamForm, setTeamForm] = useState({
    name: '',
    slogan: '',
    game: '',
    is_open_for_players: true,
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
    }
  }, [user]);

  const fetchMyTeam = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // First check if user is a member of any team
      const { data: membership } = await supabase
        .from('player_team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership) {
        // Fetch team details
        const { data: team } = await supabase
          .from('player_teams')
          .select('*')
          .eq('id', membership.team_id)
          .single();

        if (team) {
          setMyTeam(team);
          fetchTeamMembers(team.id);
        }
      } else {
        setMyTeam(null);
        setTeamMembers([]);
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
        // Fetch profiles for each member
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

  const fetchOpenTeams = async () => {
    try {
      const { data: teams } = await supabase
        .from('player_teams')
        .select('*')
        .eq('is_open_for_players', true)
        .order('created_at', { ascending: false });

      if (teams) {
        // Get member counts and leader names
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
        setOpenTeams(teamsWithDetails);
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
      // Create team
      const { data: newTeam, error: teamError } = await supabase
        .from('player_teams')
        .insert({
          name: teamForm.name.trim(),
          slogan: teamForm.slogan.trim() || null,
          game: teamForm.game || null,
          leader_id: user.id,
          is_open_for_players: teamForm.is_open_for_players,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as leader member
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
      setTeamForm({ name: '', slogan: '', game: '', is_open_for_players: true });
      fetchMyTeam();
      fetchOpenTeams();
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({ title: 'Error', description: 'Failed to create team.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    if (!user) return;

    try {
      // Check if already in a team
      if (myTeam) {
        toast({ title: 'Already in a Team', description: 'Leave your current team first to join another.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('player_team_members')
        .insert({
          team_id: teamId,
          user_id: user.id,
          role: 'member',
        });

      if (error) throw error;

      toast({ title: 'Joined Team!', description: 'You have joined the team successfully.' });
      fetchMyTeam();
      fetchOpenTeams();
    } catch (error: any) {
      console.error('Error joining team:', error);
      if (error.code === '23505') {
        toast({ title: 'Already a Member', description: 'You are already in this team.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to join team.', variant: 'destructive' });
      }
    }
  };

  const handleLeaveTeam = async () => {
    if (!user || !myTeam) return;

    try {
      // Check if user is the leader
      if (myTeam.leader_id === user.id) {
        // If leader, delete the entire team
        const { error } = await supabase
          .from('player_teams')
          .delete()
          .eq('id', myTeam.id);

        if (error) throw error;
        toast({ title: 'Team Disbanded', description: 'Your team has been disbanded.' });
      } else {
        // Otherwise just leave
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

  const handleAddMember = async () => {
    if (!user || !myTeam || !memberUid.trim()) {
      toast({ title: 'Error', description: 'Please enter a Player UID.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      // Find user by game_uid
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('game_uid', memberUid.trim())
        .single();

      if (!profile) {
        toast({ title: 'User Not Found', description: 'No player found with this UID.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Check team capacity
      if (teamMembers.length >= myTeam.max_members) {
        toast({ title: 'Team Full', description: `Maximum ${myTeam.max_members} members allowed.`, variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Add member
      const { error } = await supabase
        .from('player_team_members')
        .insert({
          team_id: myTeam.id,
          user_id: profile.user_id,
          role: 'member',
        });

      if (error) throw error;

      toast({ title: 'Member Added!', description: 'Player has been added to your team.' });
      setAddMemberDialogOpen(false);
      setMemberUid('');
      fetchTeamMembers(myTeam.id);
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Already a Member', description: 'This player is already in the team.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to add member.', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!user || !myTeam || myTeam.leader_id !== user.id) return;

    // Can't remove self (leader)
    if (memberUserId === user.id) {
      toast({ title: 'Cannot Remove', description: 'You cannot remove yourself. Disband the team instead.', variant: 'destructive' });
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

  const toggleTeamVisibility = async () => {
    if (!user || !myTeam || myTeam.leader_id !== user.id) return;

    try {
      const { error } = await supabase
        .from('player_teams')
        .update({ is_open_for_players: !myTeam.is_open_for_players })
        .eq('id', myTeam.id);

      if (error) throw error;

      toast({ 
        title: myTeam.is_open_for_players ? 'Team Closed' : 'Team Open',
        description: myTeam.is_open_for_players 
          ? 'New players can no longer find your team.' 
          : 'New players can now find and join your team.'
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
            <h1 className="font-gaming font-bold">My Team</h1>
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

      {/* Tabs - Only show Find Team tab if user doesn't have a team */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-3">
          <TabsList className={`w-full grid ${myTeam ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <TabsTrigger value="my-team" className="gap-2">
              <Shield className="h-4 w-4" />
              My Team
            </TabsTrigger>
            {!myTeam && (
              <TabsTrigger value="find-team" className="gap-2">
                <Globe className="h-4 w-4" />
                Find Team
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* My Team Tab */}
        <TabsContent value="my-team" className="flex-1 mt-0 p-4">
          {myTeam ? (
            <div className="space-y-4">
              {/* Team Card */}
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                        <Users className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {myTeam.name}
                          {isLeader && (
                            <Badge className="bg-primary/10 text-primary text-[10px]">
                              <Crown className="h-2.5 w-2.5 mr-0.5" /> Leader
                            </Badge>
                          )}
                        </CardTitle>
                        {myTeam.slogan && (
                          <p className="text-sm text-muted-foreground italic">"{myTeam.slogan}"</p>
                        )}
                      </div>
                    </div>
                    {myTeam.is_open_for_players ? (
                      <Badge variant="outline" className="text-green-600 border-green-600/30">
                        <Globe className="h-3 w-3 mr-1" /> Open
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Lock className="h-3 w-3 mr-1" /> Private
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    {myTeam.game && (
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="h-4 w-4" /> {myTeam.game}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" /> {teamMembers.length}/{myTeam.max_members}
                    </span>
                  </div>

                  {/* Leader Actions */}
                  {isLeader && (
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddMemberDialogOpen(true)}
                        className="flex-1"
                        disabled={teamMembers.length >= myTeam.max_members}
                      >
                        <UserPlus className="h-4 w-4 mr-1" /> Add Member
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleTeamVisibility}
                        className="flex-1"
                      >
                        {myTeam.is_open_for_players ? (
                          <><Lock className="h-4 w-4 mr-1" /> Make Private</>
                        ) : (
                          <><Globe className="h-4 w-4 mr-1" /> Make Open</>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Team Members */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Team Members
                    </p>
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {member.profile?.username?.charAt(0).toUpperCase() || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {member.profile?.full_name || member.profile?.username || 'Player'}
                            </p>
                            {member.role === 'leader' && (
                              <Crown className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.profile?.in_game_name || member.profile?.game_uid || 'No IGN'}
                          </p>
                        </div>
                        {isLeader && member.user_id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id, member.user_id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                    className="w-full mt-4 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleLeaveTeam}
                  >
                    {isLeader ? 'Disband Team' : 'Leave Team'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Team Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your own team or join an existing one to play duo/squad matches
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="gaming" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Create Team
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('find-team')}>
                  <Search className="h-4 w-4 mr-1" /> Find Team
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Find Team Tab */}
        <TabsContent value="find-team" className="flex-1 mt-0 p-4">
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

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Open Teams ({filteredOpenTeams.length})
          </p>

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3">
              {filteredOpenTeams.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No open teams found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try creating your own team!</p>
                </div>
              ) : (
                filteredOpenTeams.map((team) => (
                  <Card key={team.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{team.name}</h4>
                          {team.slogan && (
                            <p className="text-xs text-muted-foreground italic truncate">"{team.slogan}"</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {team.game && (
                              <Badge variant="secondary" className="text-[10px] px-1.5">
                                {team.game}
                              </Badge>
                            )}
                            <span>{team.memberCount}/{team.max_members} members</span>
                          </div>
                        </div>
                        <Button
                          variant="gaming"
                          size="sm"
                          onClick={() => handleJoinTeam(team.id)}
                          disabled={!!myTeam || team.memberCount >= team.max_members}
                        >
                          {team.memberCount >= team.max_members ? 'Full' : 'Join'}
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
                <p className="text-sm font-medium">Open for New Players</p>
                <p className="text-xs text-muted-foreground">Allow players to find and join your team</p>
              </div>
              <Button
                variant={teamForm.is_open_for_players ? "gaming" : "outline"}
                size="sm"
                onClick={() => setTeamForm({ ...teamForm, is_open_for_players: !teamForm.is_open_for_players })}
              >
                {teamForm.is_open_for_players ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
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

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Team Member
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Player UID</Label>
              <Input
                placeholder="Enter player's game UID"
                value={memberUid}
                onChange={(e) => setMemberUid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ask your friend for their UID from their profile
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="gaming" onClick={handleAddMember} disabled={saving || !memberUid.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
