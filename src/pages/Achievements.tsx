import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Star, 
  Crown, 
  Zap, 
  Gamepad2, 
  Target, 
  Flame, 
  Medal, 
  Award, 
  MapPin,
  Lock,
  Check,
  Loader2,
  Sparkles
} from 'lucide-react';

// Import unlockable avatars
import championGold from '@/assets/avatars/unlockable/champion-gold.png';
import legendaryPhoenix from '@/assets/avatars/unlockable/legendary-phoenix.png';
import eliteDragon from '@/assets/avatars/unlockable/elite-dragon.png';
import masterTitan from '@/assets/avatars/unlockable/master-titan.png';
import starterWarrior from '@/assets/avatars/unlockable/starter-warrior.png';
import veteranSoldier from '@/assets/avatars/unlockable/veteran-soldier.png';
import dedicatedLegend from '@/assets/avatars/unlockable/dedicated-legend.png';
import goldChampion from '@/assets/avatars/unlockable/gold-champion.png';
import silverKnight from '@/assets/avatars/unlockable/silver-knight.png';
import localHero from '@/assets/avatars/unlockable/local-hero.png';

const unlockableAvatarMap: Record<string, string> = {
  'champion-gold': championGold,
  'legendary-phoenix': legendaryPhoenix,
  'elite-dragon': eliteDragon,
  'master-titan': masterTitan,
  'starter-warrior': starterWarrior,
  'veteran-soldier': veteranSoldier,
  'dedicated-legend': dedicatedLegend,
  'gold-champion': goldChampion,
  'silver-knight': silverKnight,
  'local-hero': localHero,
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'trophy': Trophy,
  'crown': Crown,
  'star': Star,
  'zap': Zap,
  'gamepad-2': Gamepad2,
  'target': Target,
  'flame': Flame,
  'medal': Medal,
  'award': Award,
  'map-pin': MapPin,
};

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  reward_value: string;
  points: number;
}

interface UserStats {
  tournament_wins: number;
  tournament_participations: number;
  first_place_count: number;
  second_place_count: number;
  third_place_count: number;
  local_tournament_wins: number;
  total_earnings: number;
}

const AchievementsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

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
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: true });

      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setAchievements(achievementsData || []);
      setUnlockedIds(new Set(userAchievements?.map(ua => ua.achievement_id) || []));
      setUserStats(statsData || {
        tournament_wins: 0,
        tournament_participations: 0,
        first_place_count: 0,
        second_place_count: 0,
        third_place_count: 0,
        local_tournament_wins: 0,
        total_earnings: 0,
      });
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (achievement: Achievement): { current: number; required: number; percent: number } => {
    if (!userStats) return { current: 0, required: achievement.requirement_value, percent: 0 };
    
    let currentValue = 0;
    switch (achievement.requirement_type) {
      case 'tournament_wins':
        currentValue = userStats.tournament_wins;
        break;
      case 'tournament_participations':
        currentValue = userStats.tournament_participations;
        break;
      case 'first_place_count':
        currentValue = userStats.first_place_count;
        break;
      case 'local_tournament_wins':
        currentValue = userStats.local_tournament_wins;
        break;
      case 'total_earnings':
        currentValue = userStats.total_earnings;
        break;
    }
    
    return {
      current: currentValue,
      required: achievement.requirement_value,
      percent: Math.min((currentValue / achievement.requirement_value) * 100, 100),
    };
  };

  const getFilteredAchievements = () => {
    if (activeTab === 'all') return achievements;
    if (activeTab === 'unlocked') return achievements.filter(a => unlockedIds.has(a.id));
    if (activeTab === 'locked') return achievements.filter(a => !unlockedIds.has(a.id));
    return achievements.filter(a => a.category === activeTab);
  };

  const totalPoints = achievements
    .filter(a => unlockedIds.has(a.id))
    .reduce((sum, a) => sum + a.points, 0);

  if (authLoading || loading) {
    return (
      <AppLayout title="Achievements">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Achievements">
      <div className="p-4 space-y-6">
        {/* Stats Overview */}
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPoints}</p>
                  <p className="text-sm text-muted-foreground">Achievement Points</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">{unlockedIds.size}/{achievements.length}</p>
                <p className="text-sm text-muted-foreground">Unlocked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Your Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tournament Wins</span>
                <span className="font-semibold">{userStats?.tournament_wins || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Participations</span>
                <span className="font-semibold">{userStats?.tournament_participations || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">1st Place Finishes</span>
                <span className="font-semibold">{userStats?.first_place_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Local Wins</span>
                <span className="font-semibold">{userStats?.local_tournament_wins || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unlocked">
              Unlocked ({unlockedIds.size})
            </TabsTrigger>
            <TabsTrigger value="locked">
              Locked ({achievements.length - unlockedIds.size})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {getFilteredAchievements().map((achievement) => {
              const isUnlocked = unlockedIds.has(achievement.id);
              const progress = getProgress(achievement);
              const IconComponent = iconMap[achievement.icon] || Trophy;
              const avatarSrc = unlockableAvatarMap[achievement.reward_value];

              return (
                <Card 
                  key={achievement.id} 
                  className={`transition-all ${isUnlocked ? 'border-yellow-500/30 bg-yellow-500/5' : 'opacity-75'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Avatar Reward Preview */}
                      <div className="relative shrink-0">
                        <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${isUnlocked ? 'border-yellow-500' : 'border-border grayscale'}`}>
                          {avatarSrc ? (
                            <img src={avatarSrc} alt={achievement.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <IconComponent className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        {isUnlocked ? (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-yellow-950" />
                          </div>
                        ) : (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-muted rounded-full flex items-center justify-center border">
                            <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-sm">{achievement.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
                          </div>
                          <Badge variant={isUnlocked ? "default" : "secondary"} className="shrink-0 text-xs">
                            {achievement.points} pts
                          </Badge>
                        </div>

                        {/* Progress */}
                        {!isUnlocked && (
                          <div className="mt-3 space-y-1.5">
                            <Progress value={progress.percent} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {progress.current} / {progress.required} ({Math.round(progress.percent)}%)
                            </p>
                          </div>
                        )}

                        {isUnlocked && (
                          <p className="text-xs text-yellow-600 mt-2 font-medium">
                            ✓ Avatar unlocked! Use it in your profile.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {getFilteredAchievements().length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No achievements found in this category</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AchievementsPage;
