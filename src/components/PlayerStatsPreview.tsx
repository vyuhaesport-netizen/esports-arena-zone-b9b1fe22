import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Target, 
  Skull, 
  Trophy, 
  TrendingUp, 
  Crosshair, 
  Clock,
  AlertCircle,
  CheckCircle,
  Shield
} from 'lucide-react';

interface PlayerStats {
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
}

interface PlayerStatsPreviewProps {
  stats: PlayerStats | null;
  compact?: boolean;
}

const getTierColor = (tier: string | null): string => {
  if (!tier) return 'text-muted-foreground';
  const lowerTier = tier.toLowerCase();
  if (lowerTier.includes('conqueror')) return 'text-red-500';
  if (lowerTier.includes('ace')) return 'text-purple-500';
  if (lowerTier.includes('crown')) return 'text-yellow-500';
  if (lowerTier.includes('diamond')) return 'text-cyan-500';
  if (lowerTier.includes('platinum')) return 'text-blue-400';
  if (lowerTier.includes('gold')) return 'text-yellow-400';
  if (lowerTier.includes('silver')) return 'text-gray-400';
  return 'text-orange-400';
};

const getKdBadgeColor = (kd: number | null): string => {
  if (!kd) return 'bg-muted text-muted-foreground';
  if (kd >= 5) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (kd >= 3) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  if (kd >= 2) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (kd >= 1) return 'bg-green-500/20 text-green-400 border-green-500/30';
  return 'bg-muted text-muted-foreground';
};

export const PlayerStatsPreview = ({ stats, compact = false }: PlayerStatsPreviewProps) => {
  if (!stats) {
    return (
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
        <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-[10px] text-muted-foreground">No game stats available</p>
        <p className="text-[9px] text-muted-foreground/70 mt-0.5">Player hasn't added their stats yet</p>
      </div>
    );
  }

  const isExpired = stats.is_expired || (stats.stats_valid_until && new Date(stats.stats_valid_until) < new Date());

  if (isExpired) {
    return (
      <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-center">
        <Clock className="h-5 w-5 mx-auto text-warning mb-1" />
        <p className="text-[10px] text-warning font-medium">Stats Expired</p>
        <p className="text-[9px] text-muted-foreground mt-0.5">
          Player needs to update their monthly stats
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="p-2.5 rounded-xl bg-card/50 border border-border/30" style={{ backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {stats.current_tier && (
            <Badge className={`text-[9px] ${getTierColor(stats.current_tier)} bg-transparent border`}>
              <Shield className="h-2.5 w-2.5 mr-0.5" />
              {stats.current_tier}
            </Badge>
          )}
          {stats.kd_ratio && (
            <Badge className={`text-[9px] ${getKdBadgeColor(stats.kd_ratio)}`}>
              K/D: {stats.kd_ratio.toFixed(2)}
            </Badge>
          )}
          {stats.win_rate && (
            <Badge variant="outline" className="text-[9px]">
              <Trophy className="h-2.5 w-2.5 mr-0.5" />
              {stats.win_rate.toFixed(1)}%
            </Badge>
          )}
          {stats.is_verified && (
            <Badge className="text-[9px] bg-success/20 text-success border-success/30">
              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
              Verified
            </Badge>
          )}
        </div>
      </div>
    );
  }

  // Month display
  const statsMonth = stats.stats_month ? new Date(stats.stats_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : null;

  return (
    <Card className="border-border/30 bg-card/50" style={{ backdropFilter: 'blur(8px)' }}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold flex items-center gap-1">
            <Target className="h-3 w-3 text-primary" />
            Game Stats
            {stats.is_verified && (
              <Badge className="text-[8px] bg-success/20 text-success border-success/30 ml-1">
                <CheckCircle className="h-2 w-2 mr-0.5" /> Verified
              </Badge>
            )}
          </p>
          {statsMonth && (
            <Badge variant="secondary" className="text-[8px]">{statsMonth}</Badge>
          )}
        </div>

        {/* Player Identity */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-[9px] text-muted-foreground">In-Game Name</p>
            <p className="text-[11px] font-semibold truncate">{stats.in_game_name || 'Not set'}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-[9px] text-muted-foreground">UID</p>
            <p className="text-[11px] font-semibold truncate">{stats.game_uid || 'Not set'}</p>
          </div>
        </div>

        {/* Tier & Level */}
        <div className="p-2.5 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`h-4 w-4 ${getTierColor(stats.current_tier)}`} />
              <div>
                <p className={`text-xs font-bold ${getTierColor(stats.current_tier)}`}>
                  {stats.current_tier || 'Unknown'}
                </p>
                {stats.current_level && (
                  <p className="text-[9px] text-muted-foreground">Level {stats.current_level}</p>
                )}
              </div>
            </div>
            {stats.kd_ratio && (
              <Badge className={`${getKdBadgeColor(stats.kd_ratio)}`}>
                K/D: {stats.kd_ratio.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <Skull className="h-3 w-3 mx-auto text-red-400 mb-0.5" />
            <p className="text-[10px] font-bold">{stats.total_kills?.toLocaleString() || 0}</p>
            <p className="text-[8px] text-muted-foreground">Kills</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <Trophy className="h-3 w-3 mx-auto text-yellow-400 mb-0.5" />
            <p className="text-[10px] font-bold">{stats.wins || 0}</p>
            <p className="text-[8px] text-muted-foreground">Wins</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <TrendingUp className="h-3 w-3 mx-auto text-green-400 mb-0.5" />
            <p className="text-[10px] font-bold">{stats.win_rate?.toFixed(1) || 0}%</p>
            <p className="text-[8px] text-muted-foreground">Win Rate</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <Crosshair className="h-3 w-3 mx-auto text-purple-400 mb-0.5" />
            <p className="text-[10px] font-bold">{stats.headshot_percentage?.toFixed(1) || 0}%</p>
            <p className="text-[8px] text-muted-foreground">HS%</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className="text-[8px]">
            {stats.total_matches || 0} matches
          </Badge>
          <Badge variant="outline" className="text-[8px]">
            Avg DMG: {stats.avg_damage_per_match?.toFixed(0) || 0}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
