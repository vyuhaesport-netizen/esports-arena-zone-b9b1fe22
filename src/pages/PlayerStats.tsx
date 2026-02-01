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
  BarChart3, PieChart, Activity, Swords, Star, Crosshair
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import { usePlayerGameStats } from '@/hooks/usePlayerGameStats';
import GameStatsForm from '@/components/GameStatsForm';
import GameStatsDisplay from '@/components/GameStatsDisplay';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [showGameStatsForm, setShowGameStatsForm] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Game stats hook
  const { 
    stats: gameStats, 
    history: gameStatsHistory, 
    loading: gameStatsLoading,
    needsUpdate,
    getDaysSinceUpdate,
    isStatsExpired,
    getStatsMonth,
    getDaysUntilExpiry,
    refetch: refetchGameStats
  } = usePlayerGameStats();

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
      const [statsResult, profileResult, registrationsResult, teamResult] = await Promise.all([
        supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('username, full_name, avatar_url, preferred_game, created_at').eq('user_id', user.id).maybeSingle(),
        supabase.from('tournament_registrations').select(`id, registered_at, status, team_members, tournaments (id, title, game, start_date, status, winner_user_id, joined_users, prize_distribution)`).eq('user_id', user.id).order('registered_at', { ascending: false }).limit(20),
        supabase.from('player_team_members').select(`team_id, player_teams (id, name, leader_id, game)`).eq('user_id', user.id)
      ]);

      if (statsResult.data) setUserStats(statsResult.data);
      if (profileResult.data) setProfile(profileResult.data);

      if (registrationsResult.data) {
        const history: MatchHistory[] = registrationsResult.data
          .filter((reg: any) => reg.tournaments?.status === 'completed')
          .map((reg: any) => {
            const tournament = reg.tournaments;
            let position: number | null = null;
            let earnings = 0;

            if (tournament?.winner_user_id === user.id) {
              position = 1;
            } else if (tournament?.joined_users?.includes(user.id)) {
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

      if (teamResult.data && teamResult.data.length > 0) {
        const teamIds = teamResult.data.map((t: any) => t.team_id);
        
        const { data: teammates } = await supabase.from('player_team_members').select('user_id').in('team_id', teamIds).neq('user_id', user.id);

        if (teammates) {
          const teammateCount: Record<string, number> = {};
          teammates.forEach((t: any) => {
            teammateCount[t.user_id] = (teammateCount[t.user_id] || 0) + 1;
          });

          const topTeammateIds = Object.entries(teammateCount).sort(([,a], [,b]) => b - a).slice(0, 5).map(([id]) => id);

          if (topTeammateIds.length > 0) {
            const { data: teammateProfiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', topTeammateIds);

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
    return (userStats.first_place_count * 10) + (userStats.second_place_count * 9) + (userStats.third_place_count * 8);
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
    { name: '1st', value: userStats.first_place_count, color: '#f59e0b' },
    { name: '2nd', value: userStats.second_place_count, color: '#9ca3af' },
    { name: '3rd', value: userStats.third_place_count, color: '#d97706' },
    { name: 'Other', value: Math.max(0, (userStats.tournament_participations || 0) - userStats.first_place_count - userStats.second_place_count - userStats.third_place_count), color: '#3b82f6' },
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

  // Glass Card Component
  const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div 
      className={`rounded-xl border border-white/10 p-3 ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {children}
    </div>
  );

  // Glass Tab Component
  const GlassTab = ({ label, value, isActive, onClick, icon: Icon }: { label: string; value: string; isActive: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }> }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium transition-all duration-300
        ${isActive ? 'bg-white/20 text-white shadow-lg border border-white/30' : 'text-muted-foreground hover:bg-white/10'}
      `}
      style={isActive ? { boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)' } : {}}
    >
      <Icon className={`h-3 w-3 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
      {label}
    </button>
  );

  return (
    <AppLayout title="Player Stats" showBack>
      <div className="px-3 py-4 space-y-3 pb-24 max-w-lg mx-auto">
        {/* Profile Hero - Glass Effect */}
        <div 
          className="relative overflow-hidden rounded-xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 50%, rgba(16, 185, 129, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-500 rounded-full blur-md opacity-50" />
              <Avatar className="h-14 w-14 border-2 border-white/20 relative">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white text-lg">
                  {profile?.username?.charAt(0).toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-white truncate">{profile?.username || 'Player'}</h1>
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                {profile?.preferred_game && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-white/10 border-white/20">
                    <Gamepad2 className="h-2 w-2 mr-0.5" />
                    {profile.preferred_game}
                  </Badge>
                )}
                <Badge className={`bg-gradient-to-r ${rank.color} text-white text-[9px] px-1.5 py-0 h-4 border-0`}>
                  {rank.name}
                </Badge>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-white">{totalPoints}</p>
              <p className="text-[9px] text-white/60">Stats Points</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid - Glass Cards */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Crown, value: userStats?.first_place_count || 0, label: '1st', color: 'text-yellow-500' },
            { icon: Medal, value: userStats?.second_place_count || 0, label: '2nd', color: 'text-gray-400' },
            { icon: Award, value: userStats?.third_place_count || 0, label: '3rd', color: 'text-amber-600' },
            { icon: Trophy, value: userStats?.tournament_participations || 0, label: 'Played', color: 'text-primary' },
          ].map((stat, idx) => (
            <GlassCard key={idx} className="text-center">
              <stat.icon className={`h-3.5 w-3.5 ${stat.color} mx-auto mb-0.5`} />
              <p className="text-sm font-bold">{stat.value}</p>
              <p className="text-[8px] text-muted-foreground">{stat.label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Claim Bonus CTA - Glass */}
        <Link to="/claim-bonus">
          <GlassCard className="hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Gift className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-xs">Claim Your Rewards</p>
                  <p className="text-[10px] text-muted-foreground">Milestone bonuses available!</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </GlassCard>
        </Link>

        {/* Glass Tabs */}
        <div 
          className="p-1 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
        <div className="flex gap-1">
            <GlassTab label="Overview" value="overview" isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={BarChart3} />
            <GlassTab label="In-Game" value="ingame" isActive={activeTab === 'ingame'} onClick={() => setActiveTab('ingame')} icon={Crosshair} />
            <GlassTab label="History" value="history" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={Calendar} />
            <GlassTab label="Team" value="team" isActive={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={Users} />
          </div>
        </div>

        {/* Tab Contents */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {/* Win Rate Card */}
              <GlassCard>
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">Win Rate</span>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl font-bold">{winRate}%</span>
                  <Badge variant={winRate >= 50 ? 'default' : 'secondary'} className="text-[9px]">
                    {winRate >= 50 ? 'Above Average' : 'Keep Going!'}
                  </Badge>
                </div>
                <Progress value={winRate} className="h-1.5" />
              </GlassCard>

              {/* Rank Distribution */}
              <GlassCard>
                <div className="flex items-center gap-1.5 mb-2">
                  <PieChart className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">Rank Distribution</span>
                </div>
                {pieData.length > 0 ? (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={pieData} cx="50%" cy="45%" innerRadius={25} outerRadius={50} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} times`, '']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '10px' }} />
                        <Legend verticalAlign="bottom" height={24} formatter={(value) => <span className="text-[9px]">{value}</span>} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-28 flex items-center justify-center text-muted-foreground text-xs">
                    Play tournaments to see stats!
                  </div>
                )}
              </GlassCard>

              {/* Performance Timeline */}
              <GlassCard>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">Performance Timeline</span>
                </div>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.5)" />
                      <YAxis tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.5)" width={30} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '10px' }} />
                      <Area type="monotone" dataKey="participated" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.3)" name="Participated" />
                      <Area type="monotone" dataKey="wins" stackId="2" stroke="#f59e0b" fill="#f59e0b33" name="Wins" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === 'ingame' && (
            <GameStatsDisplay
              stats={gameStats}
              history={gameStatsHistory}
              needsUpdate={needsUpdate()}
              daysSinceUpdate={getDaysSinceUpdate()}
              isExpired={isStatsExpired()}
              statsMonth={getStatsMonth()}
              daysUntilExpiry={getDaysUntilExpiry()}
              onEditStats={() => setShowGameStatsForm(true)}
            />
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {matchHistory.length > 0 ? (
                matchHistory.map((match) => (
                  <GlassCard key={match.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        match.position === 1 ? 'bg-yellow-500/20' :
                        match.position === 2 ? 'bg-gray-400/20' :
                        match.position === 3 ? 'bg-amber-600/20' : 'bg-white/5'
                      }`}>
                        {match.position === 1 ? <Crown className="h-3.5 w-3.5 text-yellow-500" /> :
                         match.position === 2 ? <Medal className="h-3.5 w-3.5 text-gray-400" /> :
                         match.position === 3 ? <Award className="h-3.5 w-3.5 text-amber-600" /> :
                         <Swords className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{match.tournament_title}</p>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <Gamepad2 className="h-2.5 w-2.5" />
                          <span className="truncate">{match.game}</span>
                          <span>•</span>
                          <span className="shrink-0">{new Date(match.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {match.position ? (
                          <Badge variant={match.position <= 3 ? 'default' : 'secondary'} className="text-[9px] px-1.5">
                            #{match.position}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 bg-white/5">
                            {match.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))
              ) : (
                <GlassCard className="py-6 text-center">
                  <Swords className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-xs">No match history yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Join tournaments to build your history!</p>
                </GlassCard>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-3">
              {teamMembers.length > 0 ? (
                <GlassCard>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Star className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold">Best Teammates</span>
                  </div>
                  <div className="space-y-2">
                    {teamMembers.map((member, index) => (
                      <div key={member.user_id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                        <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0">
                          {index + 1}
                        </span>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={member.avatar_url || ''} />
                          <AvatarFallback className="text-[10px]">{member.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{member.username}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {member.games_together} games together
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1.5 shrink-0 bg-white/5">
                          <Users className="h-2 w-2 mr-0.5" />
                          Mate
                        </Badge>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="py-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-xs">No team data yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Join or create a team!</p>
                  <Button variant="outline" size="sm" className="mt-3 text-[10px] h-7" asChild>
                    <Link to="/team">Browse Teams</Link>
                  </Button>
                </GlassCard>
              )}
            </div>
          )}
        </div>

        {/* Total Earnings - Glass */}
        <div 
          className="rounded-xl p-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 4px 24px rgba(16, 185, 129, 0.15)',
          }}
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-muted-foreground">Total Earnings</p>
            <p className="text-xl font-bold text-emerald-500">
              ₹{(userStats?.total_earnings || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Game Stats Form Dialog */}
      <GameStatsForm
        open={showGameStatsForm}
        onOpenChange={setShowGameStatsForm}
        existingStats={gameStats}
        onSaveSuccess={refetchGameStats}
      />
    </AppLayout>
  );
};

export default PlayerStatsPage;