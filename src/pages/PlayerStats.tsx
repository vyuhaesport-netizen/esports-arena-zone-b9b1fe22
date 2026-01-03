import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';
import { Loader2, Medal, Award, Star, Zap, Target, Flame, Crown, TrendingUp, Sparkles, Gift, Check, Lock, IndianRupee } from 'lucide-react';
import vyuhaLogo from '@/assets/vyuha-logo.png';

interface RankStats {
  rank: number;
  count: number;
  points: number;
  name: string;
  icon: React.ReactNode;
  color: string;
}

interface BonusMilestone {
  points: number;
  bonus: number;
  name: string;
}

const PlayerStatsPage = () => {
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [rankStats, setRankStats] = useState<RankStats[]>([]);
  const [totalWins, setTotalWins] = useState(0);
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [claimedBonuses, setClaimedBonuses] = useState<number[]>([]);
  const [claimingBonus, setClaimingBonus] = useState<number | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { triggerAchievementConfetti } = useConfetti();

  // Bonus milestones configuration
  const bonusMilestones: BonusMilestone[] = [
    { points: 50, bonus: 10, name: 'Starter Bonus' },
    { points: 100, bonus: 25, name: 'Rising Star' },
    { points: 500, bonus: 100, name: 'Pro Player' },
    { points: 1000, bonus: 500, name: 'Legend Reward' },
  ];

  // Rank configuration: position -> { points, name, icon, color }
  const rankConfig: { [key: number]: { points: number; name: string; icon: React.ReactNode; color: string } } = {
    1: { points: 10, name: 'Champion', icon: <Crown className="h-5 w-5" />, color: 'from-yellow-400 to-amber-500' },
    2: { points: 9, name: 'Elite', icon: <Medal className="h-5 w-5" />, color: 'from-gray-300 to-gray-400' },
    3: { points: 8, name: 'Veteran', icon: <Award className="h-5 w-5" />, color: 'from-amber-600 to-amber-700' },
    4: { points: 7, name: 'Master', icon: <Star className="h-5 w-5" />, color: 'from-purple-400 to-purple-500' },
    5: { points: 6, name: 'Expert', icon: <Zap className="h-5 w-5" />, color: 'from-blue-400 to-blue-500' },
    6: { points: 5, name: 'Skilled', icon: <Target className="h-5 w-5" />, color: 'from-green-400 to-green-500' },
    7: { points: 4, name: 'Adept', icon: <Flame className="h-5 w-5" />, color: 'from-orange-400 to-orange-500' },
    8: { points: 3, name: 'Rising', icon: <TrendingUp className="h-5 w-5" />, color: 'from-cyan-400 to-cyan-500' },
    9: { points: 2, name: 'Starter', icon: <Sparkles className="h-5 w-5" />, color: 'from-pink-400 to-pink-500' },
    10: { points: 1, name: 'Rookie', icon: <img src={vyuhaLogo} alt="Vyuha" className="h-5 w-5 object-contain" />, color: 'from-indigo-400 to-indigo-500' },
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPlayerStats();
      fetchClaimedBonuses();
    }
  }, [user]);

  // Animate the total points counter
  useEffect(() => {
    if (totalPoints > 0) {
      const duration = 1500;
      const steps = 60;
      const increment = totalPoints / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= totalPoints) {
          setAnimatedPoints(totalPoints);
          clearInterval(timer);
        } else {
          setAnimatedPoints(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [totalPoints]);

  const fetchClaimedBonuses = async () => {
    if (!user) return;
    
    try {
      // Check wallet_transactions for stats bonus claims
      const { data } = await supabase
        .from('wallet_transactions')
        .select('description')
        .eq('user_id', user.id)
        .eq('type', 'bonus')
        .like('description', 'Stats milestone bonus%');
      
      if (data) {
        // Extract milestone points from descriptions
        const claimed: number[] = [];
        data.forEach(tx => {
          const match = tx.description?.match(/Stats milestone bonus - (\d+) points/);
          if (match) {
            claimed.push(parseInt(match[1]));
          }
        });
        setClaimedBonuses(claimed);
      }
    } catch (error) {
      console.error('Error fetching claimed bonuses:', error);
    }
  };

  const handleClaimBonus = async (milestone: BonusMilestone) => {
    if (!user) return;
    
    // Verify user has enough points
    if (totalPoints < milestone.points) {
      toast({
        title: 'Not Enough Points',
        description: `You need ${milestone.points} stats points to claim this bonus.`,
        variant: 'destructive',
      });
      return;
    }
    
    // Check if already claimed
    if (claimedBonuses.includes(milestone.points)) {
      toast({
        title: 'Already Claimed',
        description: 'You have already claimed this bonus.',
        variant: 'destructive',
      });
      return;
    }
    
    setClaimingBonus(milestone.points);
    
    try {
      // Create bonus transaction record first (for tracking claims)
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          type: 'bonus',
          amount: milestone.bonus,
          status: 'completed',
          description: `Stats milestone bonus - ${milestone.points} points`
        });
      
      if (txError) throw txError;
      
      // Get current balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single();
      
      const currentBalance = profile?.wallet_balance || 0;
      
      // Update wallet balance (not withdrawable_balance)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: currentBalance + milestone.bonus
        })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      triggerAchievementConfetti();
      setClaimedBonuses(prev => [...prev, milestone.points]);
      toast({
        title: '🎉 Bonus Claimed!',
        description: `₹${milestone.bonus} has been added to your wallet balance!`,
      });
    } catch (error: any) {
      console.error('Error claiming bonus:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim bonus. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setClaimingBonus(null);
    }
  };

  const fetchPlayerStats = async () => {
    if (!user) return;
    
    try {
      // Fetch user stats from user_stats table
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('first_place_count, second_place_count, third_place_count, tournament_wins')
        .eq('user_id', user.id)
        .maybeSingle();

      // Initialize rank counts
      const rankCounts: { [key: number]: number } = {};
      for (let i = 1; i <= 10; i++) {
        rankCounts[i] = 0;
      }

      if (userStats) {
        rankCounts[1] = userStats.first_place_count || 0;
        rankCounts[2] = userStats.second_place_count || 0;
        rankCounts[3] = userStats.third_place_count || 0;
      }

      // Calculate stats for each rank
      const stats: RankStats[] = [];
      let points = 0;
      let wins = 0;

      for (let rank = 1; rank <= 10; rank++) {
        const count = rankCounts[rank];
        const config = rankConfig[rank];
        const rankPoints = count * config.points;
        points += rankPoints;
        wins += count;

        stats.push({
          rank,
          count,
          points: rankPoints,
          name: config.name,
          icon: config.icon,
          color: config.color,
        });
      }

      setRankStats(stats);
      setTotalPoints(points);
      setTotalWins(wins);
    } catch (error) {
      console.error('Error fetching player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerRank = (points: number): string => {
    if (points >= 500) return 'Legendary';
    if (points >= 300) return 'Grandmaster';
    if (points >= 200) return 'Diamond';
    if (points >= 100) return 'Platinum';
    if (points >= 50) return 'Gold';
    if (points >= 25) return 'Silver';
    if (points >= 10) return 'Bronze';
    return 'Unranked';
  };

  const getNextRankProgress = (points: number): { current: string; next: string; progress: number; needed: number } => {
    const ranks = [
      { name: 'Unranked', min: 0 },
      { name: 'Bronze', min: 10 },
      { name: 'Silver', min: 25 },
      { name: 'Gold', min: 50 },
      { name: 'Platinum', min: 100 },
      { name: 'Diamond', min: 200 },
      { name: 'Grandmaster', min: 300 },
      { name: 'Legendary', min: 500 },
    ];

    for (let i = ranks.length - 1; i >= 0; i--) {
      if (points >= ranks[i].min) {
        if (i === ranks.length - 1) {
          return { current: ranks[i].name, next: 'Max Rank', progress: 100, needed: 0 };
        }
        const nextRank = ranks[i + 1];
        const currentMin = ranks[i].min;
        const range = nextRank.min - currentMin;
        const progress = ((points - currentMin) / range) * 100;
        return {
          current: ranks[i].name,
          next: nextRank.name,
          progress: Math.min(progress, 100),
          needed: nextRank.min - points,
        };
      }
    }
    return { current: 'Unranked', next: 'Bronze', progress: (points / 10) * 100, needed: 10 - points };
  };

  const getBonusStatus = (milestone: BonusMilestone): 'claimed' | 'available' | 'locked' => {
    if (claimedBonuses.includes(milestone.points)) return 'claimed';
    if (totalPoints >= milestone.points) return 'available';
    return 'locked';
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Player Stats">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const rankProgress = getNextRankProgress(totalPoints);

  return (
    <AppLayout title="Player Stats" showBack>
      <div className="p-4 space-y-6 pb-24">
        {/* Hero Stats Card */}
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white p-1 mb-4 shadow-lg animate-[pulse_2s_ease-in-out_infinite]">
                <img src={vyuhaLogo} alt="Vyuha" className="w-full h-full rounded-full object-cover" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-1 animate-fade-in">
                {animatedPoints}
              </h2>
              <p className="text-white/80 text-sm">Total Stats Points</p>
              <Badge className="mt-3 bg-white/20 text-white border-white/30 text-sm px-4 py-1">
                {getPlayerRank(totalPoints)}
              </Badge>
            </div>
          </div>
          <CardContent className="p-4 bg-card">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{rankProgress.current}</span>
                <span className="text-muted-foreground">{rankProgress.next}</span>
              </div>
              <Progress value={rankProgress.progress} className="h-2" />
              {rankProgress.needed > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  {rankProgress.needed} points to {rankProgress.next}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bonus Rewards Section */}
        <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary animate-bounce" />
              Milestone Bonuses
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              Claim rewards when you reach milestones! Money goes to wallet for tournaments only.
            </p>
            <div className="space-y-3">
              {bonusMilestones.map((milestone, index) => {
                const status = getBonusStatus(milestone);
                const progressToMilestone = Math.min((totalPoints / milestone.points) * 100, 100);
                
                return (
                  <div
                    key={milestone.points}
                    className={`p-4 rounded-xl border-2 transition-all animate-fade-in ${
                      status === 'claimed' 
                        ? 'bg-success/10 border-success/30' 
                        : status === 'available'
                        ? 'bg-primary/10 border-primary animate-pulse'
                        : 'bg-muted/30 border-border'
                    }`}
                    style={{ animationDelay: `${0.1 * index}s` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          status === 'claimed'
                            ? 'bg-success text-success-foreground'
                            : status === 'available'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {status === 'claimed' ? (
                            <Check className="h-6 w-6" />
                          ) : status === 'available' ? (
                            <Gift className="h-6 w-6" />
                          ) : (
                            <Lock className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{milestone.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {milestone.points} Stats Points
                          </p>
                          {status === 'locked' && (
                            <div className="mt-1">
                              <Progress value={progressToMilestone} className="h-1 w-24" />
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {milestone.points - totalPoints} more needed
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-lg font-bold text-success">
                          <IndianRupee className="h-4 w-4" />
                          {milestone.bonus}
                        </div>
                        {status === 'available' && (
                          <Button
                            size="sm"
                            onClick={() => handleClaimBonus(milestone)}
                            disabled={claimingBonus === milestone.points}
                            className="mt-1 h-7 text-xs bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                          >
                            {claimingBonus === milestone.points ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Claim'
                            )}
                          </Button>
                        )}
                        {status === 'claimed' && (
                          <Badge variant="outline" className="mt-1 text-success border-success/30 text-[10px]">
                            Claimed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <p className="text-2xl font-bold">{totalWins}</p>
              <p className="text-xs text-muted-foreground">Total Podiums</p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                <Medal className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-2xl font-bold">{rankStats[0]?.count || 0}</p>
              <p className="text-xs text-muted-foreground">1st Place Wins</p>
            </CardContent>
          </Card>
        </div>

      </div>
    </AppLayout>
  );
};

export default PlayerStatsPage;