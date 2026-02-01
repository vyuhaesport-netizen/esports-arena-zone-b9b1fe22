import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Medal, Crown, Users, Target, ChevronDown, ChevronUp, Gamepad2, Trophy } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TeamMember {
  user_id: string;
  username: string | null;
  in_game_name: string | null;
  game_uid: string | null;
  avatar_url: string | null;
  role: string;
  stats_points: number;
}

interface LeaderboardTeam {
  team_id: string;
  team_name: string;
  logo_url: string | null;
  game: string | null;
  total_points: number;
  member_count: number;
  members: TeamMember[];
}

interface LeaderboardUser {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  preferred_game: string | null;
  stats_points: number;
}

const Leaderboard = () => {
  const [topTeams, setTopTeams] = useState<LeaderboardTeam[]>([]);
  const [topPlayers, setTopPlayers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      // Fetch all teams
      const { data: teamsData } = await supabase
        .from('player_teams')
        .select('id, name, logo_url, game, leader_id')
        .order('created_at', { ascending: false });

      // Fetch all user stats for calculating points
      const { data: allUserStats } = await supabase
        .from('user_stats')
        .select('user_id, first_place_count, second_place_count, third_place_count');

      // Create stats points map
      const statsPointsMap: Record<string, number> = {};
      allUserStats?.forEach((stats) => {
        const first = stats.first_place_count || 0;
        const second = stats.second_place_count || 0;
        const third = stats.third_place_count || 0;
        statsPointsMap[stats.user_id] = (first * 10) + (second * 9) + (third * 8);
      });

      if (teamsData && teamsData.length > 0) {
        // Fetch all team members
        const { data: membersData } = await supabase
          .from('player_team_members')
          .select('team_id, user_id, role')
          .in('team_id', teamsData.map(t => t.id));

        // Get all unique user IDs (members + leaders)
        const allUserIds = new Set<string>();
        teamsData.forEach(t => allUserIds.add(t.leader_id));
        membersData?.forEach(m => allUserIds.add(m.user_id));

        // Fetch profiles for all users
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, in_game_name, game_uid, avatar_url')
          .in('user_id', Array.from(allUserIds));

        // Create profile map
        const profileMap: Record<string, any> = {};
        profilesData?.forEach(p => {
          profileMap[p.user_id] = p;
        });

        // Build team data with members and calculate total points
        const teamsWithMembers: LeaderboardTeam[] = teamsData.map(team => {
          const teamMembers = membersData?.filter(m => m.team_id === team.id) || [];
          
          // Build members array (leader first, then members)
          const members: TeamMember[] = [];
          let totalPoints = 0;
          
          // Add leader
          const leaderProfile = profileMap[team.leader_id];
          const leaderPoints = statsPointsMap[team.leader_id] || 0;
          totalPoints += leaderPoints;
          
          if (leaderProfile) {
            members.push({
              user_id: team.leader_id,
              username: leaderProfile.username,
              in_game_name: leaderProfile.in_game_name,
              game_uid: leaderProfile.game_uid,
              avatar_url: leaderProfile.avatar_url,
              role: 'leader',
              stats_points: leaderPoints
            });
          }

          // Add other members
          teamMembers.forEach(m => {
            if (m.user_id !== team.leader_id) {
              const memberProfile = profileMap[m.user_id];
              const memberPoints = statsPointsMap[m.user_id] || 0;
              totalPoints += memberPoints;
              
              if (memberProfile) {
                members.push({
                  user_id: m.user_id,
                  username: memberProfile.username,
                  in_game_name: memberProfile.in_game_name,
                  game_uid: memberProfile.game_uid,
                  avatar_url: memberProfile.avatar_url,
                  role: m.role,
                  stats_points: memberPoints
                });
              }
            }
          });

          return {
            team_id: team.id,
            team_name: team.name,
            logo_url: team.logo_url,
            game: team.game,
            total_points: totalPoints,
            member_count: members.length,
            members
          };
        });

        // Sort by total points and take top 50
        const sortedTeams = teamsWithMembers
          .sort((a, b) => b.total_points - a.total_points)
          .slice(0, 50);

        setTopTeams(sortedTeams);
      }

      // Fetch top players (Best Players tab)
      const topUserIds = Object.entries(statsPointsMap)
        .filter(([_, points]) => points > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([userId]) => userId);

      // Fetch profiles for top users
      const { data: topProfilesData } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, preferred_game')
        .in('user_id', topUserIds);

      const topPlayersData: LeaderboardUser[] = topUserIds
        .map(userId => {
          const profile = topProfilesData?.find(p => p.user_id === userId);
          if (!profile) return null;
          return {
            user_id: userId,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            preferred_game: profile.preferred_game,
            stats_points: statsPointsMap[userId] || 0
          };
        })
        .filter(Boolean) as LeaderboardUser[];

      setTopPlayers(topPlayersData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamExpand = (teamId: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-slate-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20';
    if (index === 1) return 'bg-gradient-to-r from-slate-300/10 to-slate-400/10 border-slate-300/20';
    if (index === 2) return 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20';
    return 'bg-card border-border';
  };

  const renderTeamsList = () => {
    if (topTeams.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-10 w-10 mx-auto opacity-50 mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No teams available yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a team to appear here!</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {topTeams.map((team, index) => (
          <Collapsible
            key={team.team_id}
            open={expandedTeams.has(team.team_id)}
            onOpenChange={() => toggleTeamExpand(team.team_id)}
          >
            <div className={`rounded-xl border ${getRankBg(index)}`}>
              <CollapsibleTrigger className="w-full">
                <div className="p-3 flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(index)}
                  </div>
                  <Avatar className="h-10 w-10 border-2 border-border">
                    <AvatarImage src={team.logo_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {team.team_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-xs truncate">{team.team_name}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Users className="h-2.5 w-2.5" />
                        {team.member_count}
                      </span>
                      {team.game && (
                        <Badge variant="secondary" className="text-[9px] py-0 px-1 h-4">
                          {team.game}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-right">
                      <div className="flex items-center gap-0.5">
                        <Target className="h-3 w-3 text-primary" />
                        <span className="font-bold text-xs text-primary">{team.total_points}</span>
                        <span className="text-[9px] text-muted-foreground">pts</span>
                      </div>
                    </div>
                    {expandedTeams.has(team.team_id) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-3 pb-3 border-t border-border/50 pt-2">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Team Members</p>
                  <div className="space-y-1.5">
                    {team.members.map((member) => (
                      <div 
                        key={member.user_id} 
                        className="flex items-center gap-2 p-2 rounded-lg bg-background/50"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={member.avatar_url || ''} />
                          <AvatarFallback className="bg-muted text-xs">
                            {member.username?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-medium truncate">
                              {member.in_game_name || member.username || 'Unknown'}
                            </p>
                            {member.role === 'leader' && (
                              <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {member.game_uid ? `UID: ${member.game_uid}` : ''}{member.game_uid && member.username ? ' • ' : ''}{member.username ? `@${member.username}` : ''}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-primary">{member.stats_points}pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    );
  };

  const renderPlayersList = () => {
    if (topPlayers.length === 0) {
      return (
        <div className="text-center py-12">
          <Target className="h-10 w-10 mx-auto opacity-50 mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No data available yet</p>
          <p className="text-xs text-muted-foreground mt-1">Earn stats points to climb the ranks!</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {topPlayers.map((user, index) => (
          <div
            key={user.user_id}
            className={`rounded-xl border p-3 flex items-center gap-3 ${getRankBg(index)}`}
          >
            <div className="w-8 flex justify-center">
              {getRankIcon(index)}
            </div>
            <Avatar className="h-10 w-10 border-2 border-border">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {user.username?.charAt(0).toUpperCase() || user.full_name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs truncate">
                {user.full_name || user.username || 'Anonymous'}
              </p>
              {user.preferred_game && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Gamepad2 className="h-2.5 w-2.5" />
                  {user.preferred_game}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-0.5">
                <Target className="h-3 w-3 text-primary" />
                <span className="font-bold text-xs text-primary">{user.stats_points}</span>
                <span className="text-[9px] text-muted-foreground">pts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout title="Leaderboard" showBack>
      {/* Header Banner - Clean text-only design */}
      <div className="bg-gradient-to-br from-primary/15 to-primary/5 p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Leaderboard</h1>
        </div>
        <p className="text-xs text-muted-foreground">Top performers on Vyuha Esport</p>
      </div>

      {/* Tab Selector */}
      <div className="px-4 py-3">
        <div className="bg-muted rounded-lg p-1 flex">
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'teams'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            Top Teams
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'players'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="h-4 w-4" />
            Best Players
          </button>
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="px-4 pb-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activeTab === 'teams' ? (
          renderTeamsList()
        ) : (
          renderPlayersList()
        )}
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
