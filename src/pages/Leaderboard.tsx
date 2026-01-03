import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Medal, Crown, TrendingUp, Gamepad2, Target } from 'lucide-react';
import vyuhaLogo from '@/assets/vyuha-logo.png';

interface LeaderboardUser {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  preferred_game: string | null;
  total_earnings: number;
  total_wins: number;
  stats_points: number;
}

const Leaderboard = () => {
  const [topEarners, setTopEarners] = useState<LeaderboardUser[]>([]);
  const [topPlayers, setTopPlayers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'earners' | 'players'>('earners');

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      // Fetch profiles with earnings data from wallet_transactions
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, preferred_game');

      // Fetch completed prize earnings
      const { data: earningsData } = await supabase
        .from('wallet_transactions')
        .select('user_id, amount')
        .eq('type', 'prize')
        .eq('status', 'completed');

      // Fetch user stats for stats points calculation
      const { data: userStatsData } = await supabase
        .from('user_stats')
        .select('user_id, first_place_count, second_place_count, third_place_count, tournament_wins');

      // Calculate total earnings per user
      const earningsMap: Record<string, number> = {};
      earningsData?.forEach((txn) => {
        earningsMap[txn.user_id] = (earningsMap[txn.user_id] || 0) + Math.abs(txn.amount);
      });

      // Calculate stats points per user (1st=10, 2nd=9, 3rd=8 points)
      const statsPointsMap: Record<string, number> = {};
      const winsMap: Record<string, number> = {};
      userStatsData?.forEach((stats) => {
        const first = stats.first_place_count || 0;
        const second = stats.second_place_count || 0;
        const third = stats.third_place_count || 0;
        const points = (first * 10) + (second * 9) + (third * 8);
        statsPointsMap[stats.user_id] = points;
        winsMap[stats.user_id] = stats.tournament_wins || 0;
      });

      // Combine data
      const leaderboardData: LeaderboardUser[] = (profilesData || []).map((profile) => ({
        ...profile,
        total_earnings: earningsMap[profile.user_id] || 0,
        total_wins: winsMap[profile.user_id] || 0,
        stats_points: statsPointsMap[profile.user_id] || 0,
      }));

      // Sort by earnings
      const sortedByEarnings = [...leaderboardData]
        .filter(u => u.total_earnings > 0)
        .sort((a, b) => b.total_earnings - a.total_earnings)
        .slice(0, 50);

      // Sort by stats points (Best Players)
      const sortedByStats = [...leaderboardData]
        .filter(u => u.stats_points > 0)
        .sort((a, b) => b.stats_points - a.stats_points)
        .slice(0, 50);

      setTopEarners(sortedByEarnings);
      setTopPlayers(sortedByStats);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-500" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20';
    if (index === 1) return 'bg-gradient-to-r from-gray-300/10 to-slate-300/10 border-gray-300/20';
    if (index === 2) return 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20';
    return 'bg-card border-border';
  };

  const renderLeaderboardList = (data: LeaderboardUser[], type: 'earners' | 'players') => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <img src={vyuhaLogo} alt="Vyuha" className="h-12 w-12 mx-auto opacity-50 mb-3" />
          <p className="text-muted-foreground">No data available yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {type === 'earners' ? 'Win tournaments to appear here!' : 'Earn stats points to climb the ranks!'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {data.map((user, index) => (
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
              <p className="font-semibold text-sm truncate">
                {user.full_name || user.username || 'Anonymous'}
              </p>
              {user.preferred_game && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Gamepad2 className="h-3 w-3" />
                  {user.preferred_game}
                </p>
              )}
            </div>
            <div className="text-right">
              {type === 'earners' ? (
                <p className="font-bold text-primary">₹{user.total_earnings.toLocaleString()}</p>
              ) : (
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-bold text-primary">{user.stats_points}</span>
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout title="Leaderboard">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-primary/20 to-orange-500/10 p-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center mb-3">
          <img src={vyuhaLogo} alt="Vyuha" className="h-10 w-10 object-contain" />
        </div>
        <h1 className="font-gaming text-xl font-bold">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Top performers on Vyuha Esport</p>
      </div>

      {/* Tab Selector */}
      <div className="px-4 py-3">
        <div className="bg-muted rounded-lg p-1 flex">
          <button
            onClick={() => setActiveTab('earners')}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'earners'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Top Earners
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
        ) : activeTab === 'earners' ? (
          renderLeaderboardList(topEarners, 'earners')
        ) : (
          renderLeaderboardList(topPlayers, 'players')
        )}
      </div>
    </AppLayout>
  );
};

export default Leaderboard;