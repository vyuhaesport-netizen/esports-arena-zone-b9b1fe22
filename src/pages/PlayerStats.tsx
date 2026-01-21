import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Loader2, Medal, Award, Crown, TrendingUp, Target, 
  Gamepad2, Gift, ChevronRight, Users, Trophy, Calendar,
  BarChart3, PieChart, Activity, Swords, Star
} from 'lucide-react';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface UserStats {
  first_place_count: number;
  second_place_count: number;
  third_place_count: number;
  tournament_wins: number;
  tournament_participations: number;
  total_earnings: number;
}

interface MatchHistory {
  id: string;
  tournament_title: string;
  game: string;
  date: string;
  position: number | null;
  earnings: number;
  status: string;
}

interface TeamMember {
  user_id: string;
  username: string;
  avatar_url: string | null;
  games_together: number;
}

const COLORS = ['#f59e0b', '#9ca3af', '#d97706', '#3b82f6', '#8b5cf6', '#10b981'];

const PlayerStatsPage = () => {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;
    
    try {
      // Parallel fetch all data
      const [statsResult, profileResult, registrationsResult, teamResult] = await Promise.all([
        supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('username, full_name, avatar_url, preferred_game, created_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('tournament_registrations')
          .select(`
            id,
            registered_at,
            status,
            team_members,
            tournaments (
              id,
              title,
              game,
              start_date,
              status,
              winner_user_id,
              joined_users,
              prize_distribution
            )
          `)
          .eq('user_id', user.id)
          .order('registered_at', { ascending: false })
          .limit(20),
        supabase
          .from('player_team_members')
          .select(`
            team_id,
            player_teams (
              id,
              name,
              leader_id,
              game
            )
          `)
          .eq('user_id', user.id)
      ]);

      if (statsResult.data) {
        setUserStats(statsResult.data);
      }

      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      // Process match history
      if (registrationsResult.data) {
        const history: MatchHistory[] = registrationsResult.data.map((reg: any) => {
          const tournament = reg.tournaments;
          let position: number | null = null;
          let earnings = 0;

          if (tournament?.winner_user_id === user.id) {
            position = 1;
          } else if (tournament?.joined_users?.includes(user.id)) {
            // Could derive position from prize_distribution if available
            const joinedIndex = tournament.joined_users.indexOf(user.id);
            if (joinedIndex < 3) position = joinedIndex + 1;
          }

          return {
            id: reg.id,
            tournament_title: tournament?.title || 'Unknown Tournament',
            game: tournament?.game || 'Unknown',
            date: tournament?.start_date || reg.registered_at,
            position,
            earnings,
            status: tournament?.status || 'unknown'
          };
        });
        setMatchHistory(history);

        // Generate performance data (last 6 months)
        const monthlyData: any = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleDateString('en-US', { month: 'short' });
          monthlyData[key] = { month: key, wins: 0, participated: 0, earnings: 0 };
        }

        history.forEach((match) => {
          const matchDate = new Date(match.date);
          const monthKey = matchDate.toLocaleDateString('en-US', { month: 'short' });
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].participated++;
            if (match.position === 1) monthlyData[monthKey].wins++;
            monthlyData[monthKey].earnings += match.earnings;
          }
        });

        setPerformanceData(Object.values(monthlyData));
      }

      // Process team data - get frequent teammates
      if (teamResult.data && teamResult.data.length > 0) {
        const teamIds = teamResult.data.map((t: any) => t.team_id);
        
        const { data: teammates } = await supabase
          .from('player_team_members')
          .select('user_id')
          .in('team_id', teamIds)
          .neq('user_id', user.id);

        if (teammates) {
          // Count frequency of each teammate
          const teammateCount: Record<string, number> = {};
          teammates.forEach((t: any) => {
            teammateCount[t.user_id] = (teammateCount[t.user_id] || 0) + 1;
          });

          // Get top 5 teammates
          const topTeammateIds = Object.entries(teammateCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([id]) => id);

          if (topTeammateIds.length > 0) {
            const { data: teammateProfiles } = await supabase
              .from('profiles')
              .select('user_id, username, avatar_url')
              .in('user_id', topTeammateIds);

            if (teammateProfiles) {
              setTeamMembers(
                teammateProfiles.map((p: any) => ({
                  user_id: p.user_id,
                  username: p.username || 'Unknown',
                  avatar_url: p.avatar_url,
                  games_together: teammateCount[p.user_id] || 0
                }))
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePoints = () => {
    if (!userStats) return 0;
    return (userStats.first_place_count * 10) + 
           (userStats.second_place_count * 9) + 
           (userStats.third_place_count * 8);
  };

  const getPlayerRank = (points: number): { name: string; color: string } => {
    if (points >= 500) return { name: 'Legendary', color: 'from-yellow-400 to-amber-500' };
    if (points >= 300) return { name: 'Grandmaster', color: 'from-purple-500 to-pink-500' };
    if (points >= 200) return { name: 'Diamond', color: 'from-cyan-400 to-blue-500' };
    if (points >= 100) return { name: 'Platinum', color: 'from-emerald-400 to-teal-500' };
    if (points >= 50) return { name: 'Gold', color: 'from-yellow-500 to-orange-500' };
    if (points >= 25) return { name: 'Silver', color: 'from-gray-300 to-gray-400' };
    if (points >= 10) return { name: 'Bronze', color: 'from-amber-600 to-amber-700' };
    return { name: 'Unranked', color: 'from-gray-500 to-gray-600' };
  };

  const getWinRate = () => {
    if (!userStats || userStats.tournament_participations === 0) return 0;
    return Math.round((userStats.tournament_wins / userStats.tournament_participations) * 100);
  };

  const pieData = userStats ? [
    { name: '1st Place', value: userStats.first_place_count, color: '#f59e0b' },
    { name: '2nd Place', value: userStats.second_place_count, color: '#9ca3af' },
    { name: '3rd Place', value: userStats.third_place_count, color: '#d97706' },
    { name: 'Other', value: Math.max(0, (userStats.tournament_participations || 0) - 
      userStats.first_place_count - userStats.second_place_count - userStats.third_place_count), color: '#3b82f6' },
  ].filter(d => d.value > 0) : [];

  if (authLoading || loading) {
    return (
      <AppLayout title="Player Stats">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const totalPoints = calculatePoints();
  const rank = getPlayerRank(totalPoints);
  const winRate = getWinRate();

  return (
    <AppLayout title="Player Stats" showBack>
      <div className="p-4 space-y-6 pb-24">
        {/* Profile Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-500 rounded-full blur-md opacity-50" />
              <Avatar className="h-20 w-20 border-2 border-white/20 relative">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white text-xl">
                  {profile?.username?.charAt(0).toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{profile?.username || 'Player'}</h1>
              <div className="flex items-center gap-2 mt-1">
                {profile?.preferred_game && (
                  <Badge variant="secondary" className="text-xs">
                    <Gamepad2 className="h-3 w-3 mr-1" />
                    {profile.preferred_game}
                  </Badge>
                )}
                <Badge className={`bg-gradient-to-r ${rank.color} text-white text-xs border-0`}>
                  {rank.name}
                </Badge>
              </div>
            </div>

            <div className="text-right">
              <p className="text-3xl font-bold text-white">{totalPoints}</p>
              <p className="text-xs text-white/60">Stats Points</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="text-center p-3">
            <Crown className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{userStats?.first_place_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">1st Place</p>
          </Card>
          <Card className="text-center p-3">
            <Medal className="h-5 w-5 text-gray-400 mx-auto mb-1" />
            <p className="text-lg font-bold">{userStats?.second_place_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">2nd Place</p>
          </Card>
          <Card className="text-center p-3">
            <Award className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-lg font-bold">{userStats?.third_place_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">3rd Place</p>
          </Card>
          <Card className="text-center p-3">
            <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{userStats?.tournament_participations || 0}</p>
            <p className="text-[10px] text-muted-foreground">Played</p>
          </Card>
        </div>

        {/* Claim Bonus CTA */}
        <Link to="/claim-bonus">
          <Card className="bg-gradient-to-r from-primary/10 to-orange-500/10 border-primary/30 hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Claim Your Rewards</p>
                  <p className="text-xs text-muted-foreground">Milestone bonuses available!</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              History
            </TabsTrigger>
            <TabsTrigger value="team" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Team
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Win Rate Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold">{winRate}%</span>
                  <Badge variant={winRate >= 50 ? 'default' : 'secondary'}>
                    {winRate >= 50 ? 'Above Average' : 'Keep Going!'}
                  </Badge>
                </div>
                <Progress value={winRate} className="h-2" />
              </CardContent>
            </Card>

            {/* Rank Distribution Pie Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" />
                  Rank Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value} times`, '']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value) => <span className="text-xs">{value}</span>}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    Play tournaments to see your rank distribution!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Performance Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="participated" 
                        stackId="1"
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary)/0.3)" 
                        name="Participated"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="wins" 
                        stackId="2"
                        stroke="#f59e0b" 
                        fill="#f59e0b33" 
                        name="Wins"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-3 mt-4">
            {matchHistory.length > 0 ? (
              matchHistory.map((match) => (
                <Card key={match.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        match.position === 1 ? 'bg-yellow-500/20' :
                        match.position === 2 ? 'bg-gray-400/20' :
                        match.position === 3 ? 'bg-amber-600/20' : 'bg-muted'
                      }`}>
                        {match.position === 1 ? <Crown className="h-5 w-5 text-yellow-500" /> :
                         match.position === 2 ? <Medal className="h-5 w-5 text-gray-400" /> :
                         match.position === 3 ? <Award className="h-5 w-5 text-amber-600" /> :
                         <Swords className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{match.tournament_title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Gamepad2 className="h-3 w-3" />
                          <span>{match.game}</span>
                          <span>•</span>
                          <span>{new Date(match.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {match.position ? (
                          <Badge variant={match.position <= 3 ? 'default' : 'secondary'}>
                            #{match.position}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {match.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Swords className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No match history yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Join tournaments to build your history!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4 mt-4">
            {teamMembers.length > 0 ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Best Teammates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {teamMembers.map((member, index) => (
                      <div key={member.user_id} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-4">
                          {index + 1}
                        </span>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || ''} />
                          <AvatarFallback>{member.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{member.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.games_together} games together
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Teammate
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No team data yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Join or create a team to see your best teammates!</p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link to="/team">
                      Browse Teams
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Total Earnings */}
        <Card className="bg-gradient-to-r from-success/10 to-emerald-500/10 border-success/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-success">
                  ₹{(userStats?.total_earnings || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PlayerStatsPage;
