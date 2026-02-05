import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Eye,
  EyeOff,
  ShieldCheck,
  Trash2,
  Share2,
  Link2,
  Palette,
  Target,
  Megaphone,
  Crosshair,
  Zap
} from 'lucide-react';
import { TeamAvatarGallery } from '@/components/TeamAvatarGallery';
import { PlayerStatsPreview } from '@/components/PlayerStatsPreview';
import { copyToClipboard, tryNativeShare } from '@/utils/share';

interface PlayerTeam {
  id: string;
  name: string;
  logo_url: string | null;
  slogan: string | null;
  leader_id: string;
  acting_leader_id: string | null;
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
  gameStats?: {
    game_uid: string | null;
    in_game_name: string | null;
    current_tier: string | null;
    current_level: number | null;
    total_kills: number | null;
    total_deaths: number | null;
    total_matches: number | null;
    wins: number | null;
    kd_ratio: number | null;
    win_rate: number | null;
    headshot_percentage: number | null;
    avg_damage_per_match: number | null;
    is_expired: boolean | null;
    stats_valid_until: string | null;
    stats_month: string | null;
    is_verified: boolean | null;
  } | null;
}

interface TeamRequirement {
  id: string;
  team_id: string;
  description: string;
  role_needed: string;
  game: string;
  is_active: boolean;
  created_at: string;
  team?: {
    id: string;
    name: string;
    logo_url: string | null;
    leader_id: string;
    requires_approval: boolean;
    max_members: number;
  };
  leaderName?: string;
  memberCount?: number;
}

// Game-specific roles
const BGMI_ROLES = [
  { value: 'IGL', label: 'IGL (In-Game Leader)', icon: Crown },
  { value: 'Assaulter', label: 'Assaulter', icon: Zap },
  { value: 'Rusher', label: 'Rusher', icon: Target },
  { value: 'Support', label: 'Support', icon: Shield },
  { value: 'Sniper', label: 'Sniper', icon: Crosshair },
  { value: 'Scout', label: 'Scout', icon: Eye },
  { value: 'Flex', label: 'Flex (All-rounder)', icon: Users },
];

const FREE_FIRE_ROLES = [
  { value: 'IGL', label: 'IGL (In-Game Leader)', icon: Crown },
  { value: 'Rusher', label: 'Rusher', icon: Target },
  { value: 'Support', label: 'Support', icon: Shield },
  { value: 'Fragger', label: 'Fragger', icon: Zap },
  { value: 'Sniper', label: 'Sniper', icon: Crosshair },
  { value: 'Entry Fragger', label: 'Entry Fragger', icon: Target },
  { value: 'Flex', label: 'Flex (All-rounder)', icon: Users },
];

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeam] = useState<PlayerTeam | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [openTeams, setOpenTeams] = useState<(PlayerTeam & { memberCount: number; leaderName: string })[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [myRequests, setMyRequests] = useState<(JoinRequest & { teamName: string })[]>([]);
  const [requirements, setRequirements] = useState<TeamRequirement[]>([]);
  const [userPreferredGame, setUserPreferredGame] = useState<string | null>(null);
  const [myTeamRequirements, setMyTeamRequirements] = useState<TeamRequirement[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedTeamForRequest, setSelectedTeamForRequest] = useState<PlayerTeam | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [actingLeaderDialogOpen, setActingLeaderDialogOpen] = useState(false);
  const [createRequirementDialogOpen, setCreateRequirementDialogOpen] = useState(false);
  const [selectedRequirementForRequest, setSelectedRequirementForRequest] = useState<TeamRequirement | null>(null);
  const [requirementRequestDialogOpen, setRequirementRequestDialogOpen] = useState(false);
  
  const [teamForm, setTeamForm] = useState({
    name: '',
    slogan: '',
    is_open_for_players: true,
    requires_approval: true,
    max_members: 4,
  });

  const [requirementForm, setRequirementForm] = useState({
    description: '',
    role_needed: '',
  });

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const maxMemberOptions = [4, 6, 8];
  const [onlineMembers, setOnlineMembers] = useState<Set<string>>(new Set());

  // Get roles based on team's game
  const getRolesForGame = (game: string | null) => {
    if (game === 'BGMI' || game === 'PUBG New State') return BGMI_ROLES;
    if (game === 'Free Fire') return FREE_FIRE_ROLES;
    return BGMI_ROLES; // Default to BGMI roles
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserPreferredGame();
      fetchMyTeam();
      fetchMyRequests();
    }
  }, [user]);

  // Fetch open teams and requirements after we know user's preferred game
  useEffect(() => {
    if (user && userPreferredGame !== null) {
      fetchOpenTeams();
      fetchRequirements();
    }
  }, [user, userPreferredGame]);

  // Track online status for team members using Supabase Presence
  useEffect(() => {
    if (!myTeam || !user) return;

    const channelName = `team_presence_${myTeam.id}`;
    const presenceChannel = supabase.channel(channelName);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineUserIds = new Set<string>();
        Object.values(state).forEach((presences) => {
          (presences as { user_id?: string }[]).forEach((presence) => {
            if (presence.user_id) {
              onlineUserIds.add(presence.user_id);
            }
          });
        });
        setOnlineMembers(onlineUserIds);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineMembers(prev => {
          const updated = new Set(prev);
          (newPresences as unknown as { user_id?: string }[]).forEach((p) => {
            if (p.user_id) updated.add(p.user_id);
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineMembers(prev => {
          const updated = new Set(prev);
          (leftPresences as unknown as { user_id?: string }[]).forEach((p) => {
            if (p.user_id) updated.delete(p.user_id);
          });
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [myTeam?.id, user?.id]);

  const fetchUserPreferredGame = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('preferred_game')
        .eq('user_id', user.id)
        .single();
      
      setUserPreferredGame(data?.preferred_game || '');
    } catch (error) {
      console.error('Error fetching user preferred game:', error);
      setUserPreferredGame('');
    }
  };

  // Handle join team from shared link
  useEffect(() => {
    const handleJoinFromLink = async () => {
      const joinTeamId = searchParams.get('join');
      if (!joinTeamId || !user || myTeam || loading) return;
      
      setSearchParams({});
      
      const { data: teamToJoin } = await supabase
        .from('player_teams')
        .select('*, player_team_members(count)')
        .eq('id', joinTeamId)
        .single();
      
      if (!teamToJoin) {
        toast({ title: 'Team Not Found', description: 'This team link is invalid or expired.', variant: 'destructive' });
        return;
      }
      
      const { count } = await supabase
        .from('player_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', joinTeamId);
      
      if ((count || 0) >= (teamToJoin.max_members || 4)) {
        toast({ title: 'Team Full', description: 'This team has reached maximum capacity.', variant: 'destructive' });
        return;
      }
      
      if (teamToJoin.requires_approval) {
        setSelectedTeamForRequest(teamToJoin as PlayerTeam);
        setRequestDialogOpen(true);
        toast({ title: `Join ${teamToJoin.name}`, description: 'Send a request to join this team.' });
      } else {
        try {
          const { error } = await supabase
            .from('player_team_members')
            .insert({
              team_id: joinTeamId,
              user_id: user.id,
              role: 'member',
            });

          if (error) throw error;

          toast({ title: 'Joined Team!', description: `You have joined ${teamToJoin.name}!` });
          fetchMyTeam();
          fetchOpenTeams();
        } catch (error: any) {
          if (error.code === '23505') {
            toast({ title: 'Already a Member', description: 'You are already in this team.', variant: 'destructive' });
          } else {
            toast({ title: 'Error', description: 'Failed to join team.', variant: 'destructive' });
          }
        }
      }
    };
    
    handleJoinFromLink();
  }, [searchParams, user, myTeam, loading]);

  useEffect(() => {
    if (!loading) {
      if (myTeam) {
        setActiveTab('my-team');
      } else {
        setActiveTab('browse');
      }
    }
  }, [myTeam, loading]);

  const fetchMyTeam = async (showLoadingState = true) => {
    if (!user) return;
    if (showLoadingState) setLoading(true);

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
          await fetchTeamMembers(team.id);
          await fetchMyTeamRequirements(team.id);
          if (team.leader_id === user.id || team.acting_leader_id === user.id) {
            await fetchJoinRequests(team.id);
          }
          // Auto-switch to My Team tab when team is found
          setActiveTab('my-team');
        } else {
          // Team found in membership but not in player_teams - clear membership
          setMyTeam(null);
          setTeamMembers([]);
          setJoinRequests([]);
          setMyTeamRequirements([]);
        }
      } else {
        setMyTeam(null);
        setTeamMembers([]);
        setJoinRequests([]);
        setMyTeamRequirements([]);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load team data. Please refresh.', 
        variant: 'destructive' 
      });
    } finally {
      if (showLoadingState) setLoading(false);
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
            
            const { data: gameStats } = await supabase
              .from('player_game_stats')
              .select('game_uid, in_game_name, current_tier, current_level, total_kills, total_deaths, total_matches, wins, kd_ratio, win_rate, headshot_percentage, avg_damage_per_match, is_expired, stats_valid_until, stats_month, is_verified')
              .eq('user_id', request.user_id)
              .maybeSingle();
            
            return { ...request, profile, gameStats };
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
      let query = supabase
        .from('player_teams')
        .select('*')
        .eq('is_open_for_players', true)
        .order('created_at', { ascending: false });
      
      // Filter by user's preferred game
      if (userPreferredGame) {
        query = query.eq('game', userPreferredGame);
      }

      const { data: teams } = await query;

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
        
        // Filter out full teams - only show teams with available slots
        const availableTeams = teamsWithDetails.filter(team => 
          team.memberCount < (team.max_members || 4)
        );
        
        setOpenTeams(availableTeams as (PlayerTeam & { memberCount: number; leaderName: string })[]);
      }
    } catch (error) {
      console.error('Error fetching open teams:', error);
    }
  };

  const fetchRequirements = async () => {
    try {
      let query = supabase
        .from('team_requirements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      // Filter by user's preferred game
      if (userPreferredGame) {
        query = query.eq('game', userPreferredGame);
      }

      const { data: reqs } = await query;

      if (reqs) {
        const requirementsWithDetails = await Promise.all(
          reqs.map(async (req) => {
            const { data: team } = await supabase
              .from('player_teams')
              .select('id, name, logo_url, leader_id, requires_approval, max_members')
              .eq('id', req.team_id)
              .single();
            
            const { count } = await supabase
              .from('player_team_members')
              .select('*', { count: 'exact', head: true })
              .eq('team_id', req.team_id);

            const { data: leaderProfile } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('user_id', team?.leader_id || '')
              .single();

            return {
              ...req,
              team: team || undefined,
              leaderName: leaderProfile?.full_name || leaderProfile?.username || 'Unknown',
              memberCount: count || 0,
            };
          })
        );
        
        // Filter out requirements from full teams
        const activeRequirements = requirementsWithDetails.filter(req => 
          req.team && req.memberCount < (req.team.max_members || 4)
        );
        
        setRequirements(activeRequirements);
      }
    } catch (error) {
      console.error('Error fetching requirements:', error);
    }
  };

  const fetchMyTeamRequirements = async (teamId: string) => {
    try {
      const { data: reqs } = await supabase
        .from('team_requirements')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setMyTeamRequirements(reqs || []);
    } catch (error) {
      console.error('Error fetching team requirements:', error);
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
          game: userPreferredGame || null,
          leader_id: user.id,
          is_open_for_players: teamForm.is_open_for_players,
          requires_approval: teamForm.requires_approval,
          max_members: teamForm.max_members,
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
      setTeamForm({ name: '', slogan: '', is_open_for_players: true, requires_approval: true, max_members: 4 });
      
      // Immediately set the new team to avoid loading delay
      setMyTeam(newTeam as PlayerTeam);
      setTeamMembers([{
        id: 'temp-leader',
        team_id: newTeam.id,
        user_id: user.id,
        role: 'leader',
        joined_at: new Date().toISOString(),
        profile: undefined
      }]);
      setActiveTab('my-team');
      
      // Then fetch full data in background
      setTimeout(() => {
        fetchMyTeam(false);
        fetchOpenTeams();
      }, 500);
    } catch (error: any) {
      console.error('Error creating team:', error);
      if (error.code === '23505') {
        toast({ title: 'Error', description: 'A team with this name already exists.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to create team. Please try again.', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRequirement = async () => {
    if (!user || !myTeam || !requirementForm.role_needed) {
      toast({ title: 'Error', description: 'Please select a role.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('team_requirements')
        .insert({
          team_id: myTeam.id,
          description: requirementForm.description.trim(),
          role_needed: requirementForm.role_needed,
          game: myTeam.game || 'BGMI',
        });

      if (error) throw error;

      toast({ title: 'Requirement Posted!', description: 'Your recruitment post is now visible to players.' });
      setCreateRequirementDialogOpen(false);
      setRequirementForm({ description: '', role_needed: '' });
      fetchMyTeamRequirements(myTeam.id);
      fetchRequirements();
    } catch (error) {
      console.error('Error creating requirement:', error);
      toast({ title: 'Error', description: 'Failed to post requirement.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequirement = async (reqId: string) => {
    if (!user || !myTeam) return;

    try {
      const { error } = await supabase
        .from('team_requirements')
        .delete()
        .eq('id', reqId);

      if (error) throw error;

      toast({ title: 'Deleted', description: 'Requirement post has been removed.' });
      fetchMyTeamRequirements(myTeam.id);
      fetchRequirements();
    } catch (error) {
      console.error('Error deleting requirement:', error);
      toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
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

  const handleSendRequestFromRequirement = async () => {
    if (!user || !selectedRequirementForRequest?.team) return;

    if (myTeam) {
      toast({ title: 'Already in a Team', description: 'Leave your current team first.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('player_team_requests')
        .insert({
          team_id: selectedRequirementForRequest.team.id,
          user_id: user.id,
          message: `Applying for: ${selectedRequirementForRequest.role_needed}\n\n${requestMessage.trim() || ''}`.trim(),
        });

      if (error) throw error;

      toast({ title: 'Request Sent!', description: 'Your join request has been sent to the team leader.' });
      setRequirementRequestDialogOpen(false);
      setRequestMessage('');
      setSelectedRequirementForRequest(null);
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

    if (team.memberCount >= (team.max_members || 4)) {
      toast({ title: 'Team Full', description: `This team has reached maximum capacity (${team.max_members || 4} players).`, variant: 'destructive' });
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
      if (teamMembers.length >= (myTeam.max_members || 4)) {
        toast({ title: 'Team Full', description: `Cannot approve - team is at maximum capacity (${myTeam.max_members || 4} players).`, variant: 'destructive' });
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
      fetchRequirements();
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
      fetchOpenTeams(); // Refresh to show team if it now has slots
      fetchRequirements();
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

  const handleSelectTeamAvatar = async (avatarSrc: string) => {
    if (!user || !myTeam || myTeam.leader_id !== user.id) return;

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('player_teams')
        .update({ logo_url: avatarSrc })
        .eq('id', myTeam.id);

      if (updateError) throw updateError;

      toast({ title: 'Avatar Updated!', description: 'Your team avatar has been updated.' });
      setAvatarDialogOpen(false);
      fetchMyTeam();
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({ title: 'Error', description: 'Failed to update avatar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Show all teams without filtering (search removed)
  const filteredOpenTeams = openTeams;
  const filteredRequirements = requirements;

  const pendingRequestsForTeam = (teamId: string) => 
    myRequests.filter(r => r.team_id === teamId && r.status === 'pending').length > 0;

  const isLeader = myTeam?.leader_id === user?.id;
  const isActingLeader = myTeam?.acting_leader_id === user?.id;
  const canManageRequests = isLeader || isActingLeader;
  const canPostRequirements = isLeader || isActingLeader;

  const handleShareTeamLink = async () => {
    if (!myTeam) return;
    
    const teamLink = `${window.location.origin}/team?join=${myTeam.id}`;
    const shareText = `Join my team "${myTeam.name}" on Vyuha Esports! 🎮🔥`;
    
    const shared = await tryNativeShare({
      title: `Join ${myTeam.name}`,
      text: shareText,
      url: teamLink,
    });
    
    if (!shared) {
      const copied = await copyToClipboard(teamLink);
      if (copied) {
        setCopiedLink(true);
        toast({ title: 'Link Copied!', description: 'Share this link with friends to invite them.' });
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        toast({ title: 'Error', description: 'Could not copy link.', variant: 'destructive' });
      }
    }
  };

  const handleSetActingLeader = async (memberId: string | null) => {
    if (!user || !myTeam || myTeam.leader_id !== user.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('player_teams')
        .update({ acting_leader_id: memberId })
        .eq('id', myTeam.id);

      if (error) throw error;

      toast({ 
        title: memberId ? 'Acting Leader Set' : 'Acting Leader Removed',
        description: memberId ? 'This member can now manage join requests.' : 'Acting leader has been removed.'
      });
      setActingLeaderDialogOpen(false);
      fetchMyTeam();
    } catch (error) {
      console.error('Error setting acting leader:', error);
      toast({ title: 'Error', description: 'Failed to update acting leader.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Get role icon component
  const getRoleIcon = (roleName: string) => {
    const allRoles = [...BGMI_ROLES, ...FREE_FIRE_ROLES];
    const role = allRoles.find(r => r.value === roleName);
    return role?.icon || Target;
  };

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
          <div className="flex-1">
            <h1 className="font-bold text-lg">Team</h1>
          </div>
          
          {/* Post Requirement Button (for leaders with space) */}
          {canPostRequirements && myTeam && teamMembers.length < (myTeam.max_members || 4) && (
            <div className="relative group">
              <button
                onClick={() => setCreateRequirementDialogOpen(true)}
                className="relative p-2.5 rounded-xl bg-success/10 hover:bg-success/20 transition-colors"
                title="Post recruitment requirement"
              >
                <Plus className="h-5 w-5 text-success" />
              </button>
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-card border border-border rounded-lg shadow-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <p className="font-medium text-success">Post Requirement</p>
                <p className="text-muted-foreground">Find players for specific roles</p>
              </div>
            </div>
          )}
          
          {/* Inbox Button */}
          {canManageRequests && myTeam && (
            <div className="relative group">
              <button
                onClick={() => setActiveTab('requests')}
                className="relative p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
                title="View join requests"
              >
                <Inbox className="h-5 w-5 text-primary" />
                {joinRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-[10px] rounded-full flex items-center justify-center text-destructive-foreground font-bold animate-pulse">
                    {joinRequests.length}
                  </span>
                )}
              </button>
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-card border border-border rounded-lg shadow-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <p className="font-medium text-primary">Join Requests</p>
                <p className="text-muted-foreground">Review pending requests</p>
              </div>
            </div>
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
            <TabsList className="w-full grid grid-cols-1 h-11 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="my-team" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md">
                <Shield className="h-4 w-4" />
                My Team
              </TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="w-full grid grid-cols-2 h-11 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="browse" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md">
                <Globe className="h-4 w-4" />
                Browse Teams
              </TabsTrigger>
              <TabsTrigger value="requirements" className="gap-1.5 text-xs rounded-lg relative data-[state=active]:bg-card data-[state=active]:shadow-md">
                <Megaphone className="h-4 w-4" />
                Requirements
                {requirements.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[9px] rounded-full flex items-center justify-center text-primary-foreground font-bold">
                    {requirements.length}
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
                  <div className="relative">
                    {myTeam.logo_url ? (
                      <Avatar className="w-14 h-14 rounded-full">
                        <AvatarImage src={myTeam.logo_url} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/50 rounded-full">
                          <Users className="h-7 w-7 text-primary-foreground" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                        <Users className="h-7 w-7 text-primary-foreground" />
                      </div>
                    )}
                    {isLeader && (
                      <button
                        onClick={() => setAvatarDialogOpen(true)}
                        disabled={saving}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90 transition-colors border-2 border-card"
                      >
                        {saving ? (
                          <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                        ) : (
                          <Palette className="h-3 w-3 text-primary-foreground" />
                        )}
                      </button>
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
                      {isActingLeader && (
                        <Badge className="bg-warning/20 text-warning text-[9px] px-1.5 py-0">
                          <Crown className="h-2.5 w-2.5 mr-0.5" /> Acting Leader
                        </Badge>
                      )}
                    </div>
                    {myTeam.slogan && (
                      <p className="text-[10px] text-muted-foreground italic mt-0.5">"{myTeam.slogan}"</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {myTeam.game && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
                          <Gamepad2 className="h-2.5 w-2.5" /> {myTeam.game}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {teamMembers.length}/{myTeam.max_members || 4} players
                      </Badge>
                    </div>
                  </div>
                  
                  {isLeader && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
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
                        <DropdownMenuItem onClick={() => setActingLeaderDialogOpen(true)} className="cursor-pointer gap-2">
                          <Crown className="h-4 w-4 text-warning" />
                          <span>Acting Leader</span>
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
                
                {/* Share Team Link Button */}
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 h-10 rounded-xl border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
                    onClick={handleShareTeamLink}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4 text-success" />
                        <span className="text-success">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 text-primary" />
                        <span>Share Team Link</span>
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                    Share this link with friends to invite them to your team
                  </p>
                </div>
              </div>

              {/* My Recruitment Posts (display only - no button) */}
              {myTeamRequirements.length > 0 && (
                <div 
                  className="p-4 rounded-xl border border-primary/30 bg-primary/5"
                  style={{ backdropFilter: 'blur(8px)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Recruitment Posts</span>
                  </div>
                  
                  <div className="space-y-2">
                    {myTeamRequirements.map((req) => {
                      const RoleIcon = getRoleIcon(req.role_needed);
                      return (
                        <div key={req.id} className="p-3 rounded-lg bg-card/80 border border-border/30">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <RoleIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <Badge variant="secondary" className="text-[9px]">{req.role_needed}</Badge>
                                {req.description && (
                                  <p className="text-[10px] text-muted-foreground mt-1">{req.description}</p>
                                )}
                              </div>
                            </div>
                            {canPostRequirements && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteRequirement(req.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {canManageRequests && joinRequests.length > 0 && (
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
                  <Badge variant="secondary" className="text-[9px]">{teamMembers.length}/{myTeam.max_members || 4}</Badge>
                </div>
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        member.role === 'leader' 
                          ? 'bg-gradient-to-r from-primary/10 to-transparent border border-primary/20' 
                          : myTeam?.acting_leader_id === member.user_id
                            ? 'bg-gradient-to-r from-warning/10 to-transparent border border-warning/20'
                            : 'bg-muted/30 hover:bg-muted/50 border border-border/30'
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 border border-border/50">
                          <AvatarImage src={member.profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                            {member.profile?.username?.charAt(0).toUpperCase() || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        {onlineMembers.has(member.user_id) && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-xs truncate">
                            {member.profile?.full_name || member.profile?.username || 'Player'}
                          </p>
                          {member.role === 'leader' && (
                            <Crown className="h-3 w-3 text-warning shrink-0" />
                          )}
                          {myTeam?.acting_leader_id === member.user_id && (
                            <Badge className="bg-warning/20 text-warning text-[8px] px-1 py-0 shrink-0">
                              Acting Leader
                            </Badge>
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
          <div className="space-y-3">
            {filteredOpenTeams.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">No teams with open slots</p>
                <p className="text-xs text-muted-foreground mt-1">Check "Requirements" tab or create your own team</p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-xl"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Create Team
                </Button>
              </div>
            ) : (
              filteredOpenTeams.map((team) => {
                return (
                  <div 
                    key={team.id} 
                    className="p-3 rounded-xl border border-border/30 bg-card/50 hover:border-primary/30 transition-all"
                    style={{
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {team.logo_url ? (
                        <Avatar className="w-10 h-10 rounded-full shrink-0">
                          <AvatarImage src={team.logo_url} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-full">
                            <Users className="h-5 w-5 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      )}
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
                          <span>{team.memberCount}/{team.max_members || 4}</span>
                          <span>•</span>
                          <span>{team.leaderName}</span>
                        </div>
                      </div>
                      <Button
                        variant={pendingRequestsForTeam(team.id) ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleJoinTeam(team)}
                        disabled={!!myTeam || pendingRequestsForTeam(team.id)}
                        className="rounded-lg h-8 text-[10px] px-2.5"
                      >
                        {pendingRequestsForTeam(team.id) ? (
                          <><Clock className="h-3 w-3 mr-1" /> Pending</>
                        ) : team.requires_approval ? (
                          <><Send className="h-3 w-3 mr-1" /> Request</>
                        ) : (
                          <><UserPlus className="h-3 w-3 mr-1" /> Join</>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Requirements Tab (for players without teams) */}
        <TabsContent value="requirements" className="flex-1 mt-0 overflow-auto px-4 py-4 pb-20">
          <div className="space-y-3">
            {filteredRequirements.length === 0 ? (
              <div className="text-center py-16">
                <Megaphone className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">No active requirements</p>
                <p className="text-xs text-muted-foreground mt-1">Teams will post here when looking for players</p>
              </div>
            ) : (
              filteredRequirements.map((req) => {
                const RoleIcon = getRoleIcon(req.role_needed);
                return (
                  <div 
                    key={req.id} 
                    className="p-4 rounded-xl border border-border/30 bg-card/50 hover:border-primary/30 transition-all"
                    style={{
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    {/* Twitter-like post header */}
                    <div className="flex items-start gap-3">
                      {req.team?.logo_url ? (
                        <Avatar className="w-10 h-10 rounded-full shrink-0">
                          <AvatarImage src={req.team.logo_url} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-full">
                            <Users className="h-5 w-5 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-xs truncate">{req.team?.name || 'Team'}</h4>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] text-muted-foreground">{req.leaderName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">{req.game}</Badge>
                          <span>{req.memberCount}/{req.team?.max_members || 4} players</span>
                        </div>
                      </div>
                    </div>

                    {/* Requirement content */}
                    <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <RoleIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Looking for</p>
                          <Badge className="bg-primary/20 text-primary text-xs">{req.role_needed}</Badge>
                        </div>
                      </div>
                      {req.description && (
                        <p className="text-xs text-foreground mt-2">{req.description}</p>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant={pendingRequestsForTeam(req.team_id) ? "outline" : "default"}
                        size="sm"
                        onClick={() => {
                          if (!pendingRequestsForTeam(req.team_id)) {
                            setSelectedRequirementForRequest(req);
                            setRequirementRequestDialogOpen(true);
                          }
                        }}
                        disabled={!!myTeam || pendingRequestsForTeam(req.team_id)}
                        className="rounded-lg h-9 text-xs gap-1.5"
                      >
                        {pendingRequestsForTeam(req.team_id) ? (
                          <><Clock className="h-3.5 w-3.5" /> Request Pending</>
                        ) : (
                          <><Send className="h-3.5 w-3.5" /> Apply for {req.role_needed}</>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Requests Tab (for team leaders) */}
        <TabsContent value="requests" className="flex-1 mt-0 overflow-auto px-4 py-4 pb-20">
          {canManageRequests && myTeam ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Inbox className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Join Requests</h3>
                <Badge variant="secondary">{joinRequests.length}</Badge>
                {isActingLeader && (
                  <Badge variant="outline" className="ml-auto text-[9px] bg-warning/10 text-warning border-warning/30">
                    Acting Leader
                  </Badge>
                )}
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
                    <Card key={request.id} className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12 border-2 border-primary/30">
                            <AvatarImage src={request.profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {request.profile?.username?.charAt(0).toUpperCase() || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">
                              {request.profile?.full_name || request.profile?.username || 'Player'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Requested {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {request.message && (
                          <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/30">
                            <p className="text-[10px] text-muted-foreground mb-1">Message from player:</p>
                            <p className="text-xs italic">"{request.message}"</p>
                          </div>
                        )}

                        <div className="mt-3">
                          <PlayerStatsPreview stats={request.gameStats || null} />
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="flex-1 rounded-xl h-10 bg-gradient-to-r from-success to-success/80"
                            onClick={() => handleApproveRequest(request)}
                            disabled={teamMembers.length >= (myTeam.max_members || 4)}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-xl h-10 border-destructive/30 text-destructive hover:bg-destructive/10"
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
            /* My Requests (for players without teams) - shown when they click from old UI */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Send className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">My Requests</h3>
                <Badge variant="secondary">{myRequests.filter(r => r.status === 'pending').length} pending</Badge>
              </div>

              {myRequests.length === 0 ? (
                <div className="text-center py-16">
                  <Send className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No requests sent</p>
                  <p className="text-xs text-muted-foreground mt-1">Browse teams or check requirements to join one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((request) => (
                    <Card key={request.id} className="border-border/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{request.teamName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Sent {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {request.status === 'pending' && (
                              <>
                                <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-[9px]">
                                  <Clock className="h-2.5 w-2.5 mr-0.5" /> Pending
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleCancelRequest(request.id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {request.status === 'approved' && (
                              <Badge className="bg-success/20 text-success text-[9px]">
                                <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Approved
                              </Badge>
                            )}
                            {request.status === 'rejected' && (
                              <Badge variant="destructive" className="text-[9px]">
                                <XCircle className="h-2.5 w-2.5 mr-0.5" /> Rejected
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

            {/* Game is auto-set from profile */}
            {userPreferredGame && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-medium">Team Game: {userPreferredGame}</p>
                    <p className="text-[10px] text-muted-foreground">Based on your profile's preferred game</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label>Maximum Players</Label>
              <RadioGroup
                value={teamForm.max_members.toString()}
                onValueChange={(value) => setTeamForm({ ...teamForm, max_members: parseInt(value) })}
                className="flex gap-4"
              >
                {maxMemberOptions.map((num) => (
                  <div key={num} className="flex items-center space-x-2">
                    <RadioGroupItem value={num.toString()} id={`max-${num}`} />
                    <Label htmlFor={`max-${num}`} className="text-sm cursor-pointer">
                      {num} Players
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <p className="text-[10px] text-muted-foreground">Choose based on your game mode (Duo: 4, Squad: 4-6, Custom: 8)</p>
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

            {/* Avatar Info */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Team Avatar</p>
                <p className="text-xs text-muted-foreground">After creating your team, tap on the avatar to choose from 8 unique mascot logos!</p>
              </div>
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

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">Note:</span> Your in-game stats will be automatically shared with the team leader for review.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Your Message</Label>
              <Textarea
                placeholder="Tell the leader why you want to join their team..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                maxLength={200}
                rows={3}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Introduce yourself and your experience</p>
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

      {/* Apply for Requirement Dialog */}
      <Dialog open={requirementRequestDialogOpen} onOpenChange={setRequirementRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Apply for Role
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {selectedRequirementForRequest && (
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-semibold">{selectedRequirementForRequest.team?.name}</p>
                  <Badge variant="secondary" className="text-[9px]">{selectedRequirementForRequest.game}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary">{selectedRequirementForRequest.role_needed}</Badge>
                </div>
                {selectedRequirementForRequest.description && (
                  <p className="text-xs text-muted-foreground mt-2">{selectedRequirementForRequest.description}</p>
                )}
              </div>
            )}

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">Note:</span> Your in-game stats will be automatically shared with the team leader for review.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Why are you a good fit for this role?</Label>
              <Textarea
                placeholder="Describe your experience with this role..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                maxLength={300}
                rows={4}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Highlight your relevant skills and experience</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequirementRequestDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleSendRequestFromRequirement} 
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-primary to-gaming-purple"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Apply Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Requirement Dialog */}
      <Dialog open={createRequirementDialogOpen} onOpenChange={setCreateRequirementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Post Recruitment Requirement
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Role Needed *</Label>
              <Select
                value={requirementForm.role_needed}
                onValueChange={(value) => setRequirementForm({ ...requirementForm, role_needed: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {getRolesForGame(myTeam?.game || null).map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <role.icon className="h-4 w-4" />
                        {role.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Describe what you're looking for... (e.g., 'Need experienced IGL with good callouts')"
                value={requirementForm.description}
                onChange={(e) => setRequirementForm({ ...requirementForm, description: e.target.value })}
                maxLength={200}
                rows={3}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Add any specific requirements or expectations</p>
            </div>

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                This post will be visible to all players in the "Requirements" section. They can directly apply for this role.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRequirementDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRequirement} 
              disabled={saving || !requirementForm.role_needed}
              className="rounded-xl bg-gradient-to-r from-primary to-gaming-purple"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Megaphone className="h-4 w-4 mr-1" />}
              Post Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Avatar Selection Dialog */}
      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Team Avatar
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <TeamAvatarGallery
              currentAvatarUrl={myTeam?.logo_url}
              onSelect={handleSelectTeamAvatar}
              disabled={saving}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Acting Leader Selection Dialog */}
      <Dialog open={actingLeaderDialogOpen} onOpenChange={setActingLeaderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-warning" />
              Set Acting Leader
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">Acting Leader</span> can view and manage join requests on your behalf. They cannot change team settings or disband the team.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Select Team Member</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {myTeam?.acting_leader_id && (
                  <button
                    onClick={() => handleSetActingLeader(null)}
                    className="w-full p-3 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 transition-all text-left flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <X className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-destructive">Remove Acting Leader</p>
                      <p className="text-[10px] text-muted-foreground">Only you can manage requests</p>
                    </div>
                  </button>
                )}

                {teamMembers
                  .filter(m => m.user_id !== user?.id)
                  .map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSetActingLeader(member.user_id)}
                      className={`w-full p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${
                        myTeam?.acting_leader_id === member.user_id
                          ? 'border-warning/50 bg-warning/10'
                          : 'border-border/30 bg-muted/30 hover:bg-muted/50 hover:border-primary/30'
                      }`}
                    >
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={member.profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {member.profile?.username?.charAt(0).toUpperCase() || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile?.full_name || member.profile?.username || 'Player'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {member.profile?.in_game_name || 'No IGN set'}
                        </p>
                      </div>
                      {myTeam?.acting_leader_id === member.user_id && (
                        <Badge className="bg-warning/20 text-warning text-[9px] shrink-0">
                          <Crown className="h-2.5 w-2.5 mr-0.5" /> Current
                        </Badge>
                      )}
                    </button>
                  ))}

                {teamMembers.filter(m => m.user_id !== user?.id).length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No team members yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Invite players to your team first</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActingLeaderDialogOpen(false)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
