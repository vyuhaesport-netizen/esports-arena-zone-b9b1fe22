import { useState, useEffect, useRef } from 'react';
import { Lock, Check, Loader2, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useConfetti } from '@/hooks/useConfetti';
import { toast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

// Map reward_value to actual image imports
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
  local_tournament_wins: number;
  total_earnings: number;
}

interface UnlockableAvatarGalleryProps {
  currentAvatarUrl?: string | null;
  onSelect: (avatarUrl: string) => Promise<void>;
  disabled?: boolean;
}

export const UnlockableAvatarGallery = ({
  currentAvatarUrl,
  onSelect,
  disabled = false,
}: UnlockableAvatarGalleryProps) => {
  const { user } = useAuth();
  const { triggerAchievementConfetti } = useConfetti();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const previousUnlockedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Check for newly unlocked achievements
  useEffect(() => {
    if (previousUnlockedRef.current.size > 0 && unlockedIds.size > previousUnlockedRef.current.size) {
      // Find newly unlocked achievements
      const newUnlocks = [...unlockedIds].filter(id => !previousUnlockedRef.current.has(id));
      if (newUnlocks.length > 0) {
        const newAchievement = achievements.find(a => a.id === newUnlocks[0]);
        triggerAchievementConfetti();
        if (newAchievement) {
          toast({
            title: "🏆 Achievement Unlocked!",
            description: `You've unlocked "${newAchievement.name}" and a new avatar!`,
          });
        }
      }
    }
    previousUnlockedRef.current = new Set(unlockedIds);
  }, [unlockedIds, achievements, triggerAchievementConfetti]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch all achievements
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .eq('reward_type', 'avatar')
        .order('points', { ascending: true });

      // Fetch user's unlocked achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      // Fetch user stats
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
        local_tournament_wins: 0,
        total_earnings: 0,
      });
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (achievement: Achievement): number => {
    if (!userStats) return 0;
    
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
    
    return Math.min((currentValue / achievement.requirement_value) * 100, 100);
  };

  const handleSelect = async (achievement: Achievement) => {
    if (disabled || selecting || !unlockedIds.has(achievement.id)) return;
    
    const avatarSrc = unlockableAvatarMap[achievement.reward_value];
    if (!avatarSrc) return;
    
    setSelecting(achievement.id);
    try {
      await onSelect(avatarSrc);
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (achievements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-yellow-500" />
        <p className="text-sm font-medium">Achievement Avatars</p>
        <Badge variant="secondary" className="text-xs">
          {unlockedIds.size}/{achievements.length} Unlocked
        </Badge>
      </div>
      
      <TooltipProvider>
        <div className="grid grid-cols-5 gap-2">
          {achievements.map((achievement) => {
            const isUnlocked = unlockedIds.has(achievement.id);
            const isSelecting = selecting === achievement.id;
            const avatarSrc = unlockableAvatarMap[achievement.reward_value];
            const progress = getProgress(achievement);
            
            if (!avatarSrc) return null;
            
            return (
              <Tooltip key={achievement.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleSelect(achievement)}
                    disabled={disabled || !!selecting || !isUnlocked}
                    className={cn(
                      "relative aspect-square rounded-full overflow-hidden border-2 transition-all",
                      isUnlocked 
                        ? "hover:scale-105 hover:border-yellow-500 cursor-pointer" 
                        : "cursor-not-allowed grayscale",
                      isUnlocked ? "border-yellow-500/50" : "border-border/50",
                      (disabled || selecting) && "opacity-50"
                    )}
                  >
                    <img
                      src={avatarSrc}
                      alt={achievement.name}
                      className={cn(
                        "w-full h-full object-cover",
                        !isUnlocked && "opacity-40"
                      )}
                    />
                    
                    {/* Lock overlay for locked avatars */}
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Selected indicator */}
                    {isUnlocked && !isSelecting && (
                      <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Trophy className="w-2.5 h-2.5 text-yellow-950" />
                      </div>
                    )}
                    
                    {/* Loading overlay */}
                    {isSelecting && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    {!isUnlocked && (
                      <div className="space-y-1">
                        <Progress value={progress} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">
                          {Math.round(progress)}% complete
                        </p>
                      </div>
                    )}
                    {isUnlocked && (
                      <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">
                        <Check className="w-3 h-3 mr-1" /> Unlocked
                      </Badge>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      
      <p className="text-xs text-muted-foreground">
        Win tournaments and complete achievements to unlock special avatars!
      </p>
    </div>
  );
};
