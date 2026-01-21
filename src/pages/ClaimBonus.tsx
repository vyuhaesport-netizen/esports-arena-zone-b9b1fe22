import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';
import { 
  Loader2, Gift, Check, Lock, IndianRupee, Trophy, Star, Sparkles, 
  ArrowRight, Zap, Target, Crown
} from 'lucide-react';
import vyuhaLogo from '@/assets/vyuha-logo.png';

interface BonusMilestone {
  points: number;
  bonus: number;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const ClaimBonus = () => {
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [claimedBonuses, setClaimedBonuses] = useState<number[]>([]);
  const [claimingBonus, setClaimingBonus] = useState<number | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { triggerAchievementConfetti } = useConfetti();

  // Bonus milestones configuration with enhanced visuals
  const bonusMilestones: BonusMilestone[] = [
    { points: 50, bonus: 10, name: 'Starter Bonus', icon: <Star className="h-6 w-6" />, color: 'from-blue-500 to-cyan-500' },
    { points: 100, bonus: 25, name: 'Rising Star', icon: <Zap className="h-6 w-6" />, color: 'from-purple-500 to-pink-500' },
    { points: 500, bonus: 100, name: 'Pro Player', icon: <Target className="h-6 w-6" />, color: 'from-orange-500 to-amber-500' },
    { points: 1000, bonus: 500, name: 'Legend Reward', icon: <Crown className="h-6 w-6" />, color: 'from-yellow-400 to-amber-500' },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch user stats points
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('first_place_count, second_place_count, third_place_count')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userStats) {
        const first = userStats.first_place_count || 0;
        const second = userStats.second_place_count || 0;
        const third = userStats.third_place_count || 0;
        const points = (first * 10) + (second * 9) + (third * 8);
        setTotalPoints(points);
      }

      // Fetch claimed bonuses
      const { data: transactions } = await supabase
        .from('wallet_transactions')
        .select('description')
        .eq('user_id', user.id)
        .eq('type', 'bonus')
        .like('description', 'Stats milestone bonus%');
      
      if (transactions) {
        const claimed: number[] = [];
        transactions.forEach(tx => {
          const match = tx.description?.match(/Stats milestone bonus - (\d+) points/);
          if (match) {
            claimed.push(parseInt(match[1]));
          }
        });
        setClaimedBonuses(claimed);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimBonus = async (milestone: BonusMilestone) => {
    if (!user) return;
    
    if (totalPoints < milestone.points) {
      toast({
        title: 'Not Enough Points',
        description: `You need ${milestone.points} stats points to claim this bonus.`,
        variant: 'destructive',
      });
      return;
    }
    
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
      const { data, error } = await supabase.rpc('claim_stats_bonus', {
        p_user_id: user.id,
        p_milestone_points: milestone.points,
        p_bonus_amount: milestone.bonus
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        toast({
          title: 'Cannot Claim Bonus',
          description: result.error || 'Unable to claim bonus.',
          variant: 'destructive',
        });
        return;
      }
      
      triggerAchievementConfetti();
      setClaimedBonuses(prev => [...prev, milestone.points]);
      toast({
        title: '🎉 Bonus Claimed!',
        description: `₹${milestone.bonus} has been added to your wallet!`,
      });
    } catch (error: any) {
      console.error('Error claiming bonus:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to claim bonus.',
        variant: 'destructive',
      });
    } finally {
      setClaimingBonus(null);
    }
  };

  const getBonusStatus = (milestone: BonusMilestone): 'claimed' | 'available' | 'locked' => {
    if (claimedBonuses.includes(milestone.points)) return 'claimed';
    if (totalPoints >= milestone.points) return 'available';
    return 'locked';
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Claim Bonus">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const totalClaimable = bonusMilestones
    .filter(m => totalPoints >= m.points && !claimedBonuses.includes(m.points))
    .reduce((sum, m) => sum + m.bonus, 0);

  return (
    <AppLayout title="Claim Bonus" showBack>
      <div className="px-3 py-4 space-y-4 pb-24 max-w-lg mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-orange-500/10 to-purple-500/10 p-4">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-orange-500/20 rounded-full blur-3xl" />
          
          <div className="relative text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-orange-500 p-0.5 mx-auto mb-3">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <Gift className="h-6 w-6 text-primary" />
              </div>
            </div>
            
            <h1 className="text-xl font-bold mb-1.5">Milestone Bonuses</h1>
            <p className="text-muted-foreground text-xs mb-3">
              Earn points from tournament placements and claim rewards!
            </p>

            <div className="flex items-center justify-center gap-5">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{totalPoints}</p>
                <p className="text-[10px] text-muted-foreground">Your Points</p>
              </div>
              {totalClaimable > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">₹{totalClaimable}</p>
                  <p className="text-[10px] text-muted-foreground">Ready to Claim</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* How it Works */}
        <Card className="border-dashed">
          <CardHeader className="pb-1.5 px-3 pt-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              How Points Work
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-1">
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <Trophy className="h-2.5 w-2.5 text-yellow-500" />
                </div>
                <span>1st=10</span>
              </div>
              <ArrowRight className="h-2.5 w-2.5 shrink-0" />
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-gray-400/20 flex items-center justify-center shrink-0">
                  <Trophy className="h-2.5 w-2.5 text-gray-400" />
                </div>
                <span>2nd=9</span>
              </div>
              <ArrowRight className="h-2.5 w-2.5 shrink-0" />
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-amber-600/20 flex items-center justify-center shrink-0">
                  <Trophy className="h-2.5 w-2.5 text-amber-600" />
                </div>
                <span>3rd=8</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bonus Cards */}
        <div className="space-y-3">
          <h2 className="font-semibold text-base flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-primary" />
            Available Rewards
          </h2>

          {bonusMilestones.map((milestone, index) => {
            const status = getBonusStatus(milestone);
            const progressToMilestone = Math.min((totalPoints / milestone.points) * 100, 100);
            
            return (
              <Card
                key={milestone.points}
                className={`relative overflow-hidden transition-all ${
                  status === 'claimed' 
                    ? 'bg-success/5 border-success/30' 
                    : status === 'available'
                    ? 'bg-primary/5 border-primary shadow-md shadow-primary/10'
                    : 'bg-muted/30'
                }`}
              >
                {status === 'available' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-orange-500/5 animate-pulse" />
                )}
                
                <CardContent className="relative p-3">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${milestone.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                      {status === 'claimed' ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <div className="scale-90">{milestone.icon}</div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <h3 className="font-bold text-sm">{milestone.name}</h3>
                        {status === 'claimed' && (
                          <Badge variant="outline" className="text-success border-success/30 text-[9px] px-1 py-0">
                            Claimed
                          </Badge>
                        )}
                        {status === 'available' && (
                          <Badge className="bg-primary text-[9px] px-1 py-0 animate-pulse">
                            Ready!
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        Reach {milestone.points} stats points
                      </p>

                      {status === 'locked' && (
                        <div className="space-y-0.5">
                          <Progress value={progressToMilestone} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground">
                            {milestone.points - totalPoints} more points needed
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reward & Action */}
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <div className="flex items-center gap-0.5 text-lg font-bold mb-1.5">
                        <IndianRupee className="h-4 w-4 text-success" />
                        <span className="text-success">{milestone.bonus}</span>
                      </div>
                      
                      {status === 'available' && (
                        <Button
                          size="sm"
                          onClick={() => handleClaimBonus(milestone)}
                          disabled={claimingBonus === milestone.points}
                          className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 h-7 text-xs px-2.5"
                        >
                          {claimingBonus === milestone.points ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Claim'
                          )}
                        </Button>
                      )}
                      
                      {status === 'locked' && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info */}
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              💡 Bonus money is added to your wallet and can only be used to join tournaments. 
              Win tournaments to earn withdrawable cash!
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ClaimBonus;
