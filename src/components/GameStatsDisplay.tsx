import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Crosshair, Swords, Target, Trophy, Shield, Timer, TrendingUp, TrendingDown,
  MapPin, Gamepad2, Crown, Skull, Heart, Zap, AlertCircle, Edit2, Clock
} from 'lucide-react';
import { PlayerGameStats, StatsHistoryEntry } from '@/hooks/usePlayerGameStats';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

interface GameStatsDisplayProps {
  stats: PlayerGameStats | null;
  history: StatsHistoryEntry[];
  needsUpdate: boolean;
  daysSinceUpdate: number;
  isExpired?: boolean;
  statsMonth?: string | null;
  daysUntilExpiry?: number;
  onEditStats: () => void;
}

const GameStatsDisplay = ({ stats, history, needsUpdate, daysSinceUpdate, isExpired, statsMonth, daysUntilExpiry, onEditStats }: GameStatsDisplayProps) => {
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

  // Get tier color
  const getTierColor = (tier: string) => {
    if (tier.includes('Conqueror')) return 'from-red-500 to-orange-500';
    if (tier.includes('Ace')) return 'from-purple-500 to-pink-500';
    if (tier.includes('Crown')) return 'from-yellow-400 to-amber-500';
    if (tier.includes('Diamond')) return 'from-cyan-400 to-blue-500';
    if (tier.includes('Platinum')) return 'from-emerald-400 to-teal-500';
    if (tier.includes('Gold')) return 'from-yellow-500 to-orange-500';
    if (tier.includes('Silver')) return 'from-gray-300 to-gray-400';
    return 'from-amber-600 to-amber-700';
  };

  // Prepare history chart data
  const chartData = history.slice().reverse().map((entry, index) => ({
    week: `W${index + 1}`,
    kd: entry.kd_ratio,
    kills: entry.total_kills,
    winRate: entry.win_rate,
    damage: entry.avg_damage_per_match,
  }));

  if (!stats) {
    return (
      <GlassCard className="py-8 text-center">
        <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <h3 className="font-semibold text-sm mb-1">No Game Stats Yet</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add your BGMI stats to create your player resume
        </p>
        <Button onClick={onEditStats} size="sm" className="gap-2">
          <Edit2 className="h-4 w-4" />
          Add Game Stats
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats Expired Banner */}
      {isExpired && (
        <div 
          className="rounded-xl p-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <Clock className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-destructive">Stats Expired - New Month!</p>
            <p className="text-[10px] text-muted-foreground">
              Update your stats to keep your player resume active
            </p>
          </div>
          <Button size="sm" variant="destructive" onClick={onEditStats} className="shrink-0 h-7 text-xs gap-1">
            <Edit2 className="h-3 w-3" />
            Update Now
          </Button>
        </div>
      )}

      {/* Update Reminder Banner (only if not expired) */}
      {!isExpired && needsUpdate && (
        <div 
          className="rounded-xl p-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
          }}
        >
          <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Stats Update Needed</p>
            <p className="text-[10px] text-muted-foreground">
              Last updated {daysSinceUpdate} days ago
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onEditStats} className="shrink-0 h-7 text-xs gap-1">
            <Edit2 className="h-3 w-3" />
            Update
          </Button>
        </div>
      )}

      {/* Stats Month & Expiry Info */}
      {statsMonth && !isExpired && (
        <div className="flex items-center justify-between text-[10px] px-1">
          <span className="text-muted-foreground">
            Stats for: <span className="font-medium text-foreground">{statsMonth}</span>
          </span>
          {daysUntilExpiry !== undefined && daysUntilExpiry <= 7 && (
            <Badge variant="outline" className="text-[9px] border-warning/30 text-warning bg-warning/10">
              Expires in {daysUntilExpiry} days
            </Badge>
          )}
        </div>
      )}

      {/* Player ID Card */}
      <GlassCard>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Player ID</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEditStats}>
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">{stats.in_game_name || 'Not Set'}</p>
            <p className="text-[10px] text-muted-foreground">UID: {stats.game_uid || 'Not Set'}</p>
          </div>
          <div className="text-right">
            <Badge className={`bg-gradient-to-r ${getTierColor(stats.current_tier)} text-white text-[9px] px-2 border-0`}>
              {stats.current_tier}
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-0.5">Level {stats.current_level}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-white/10 capitalize">
            {stats.preferred_mode}
          </Badge>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-white/10">
            <MapPin className="h-2 w-2 mr-0.5" />
            {stats.preferred_map}
          </Badge>
          <div className="flex-1" />
          <span className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {new Date(stats.last_updated_at).toLocaleDateString()}
          </span>
        </div>
      </GlassCard>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        <GlassCard className="text-center">
          <Swords className="h-3.5 w-3.5 text-red-500 mx-auto mb-0.5" />
          <p className="text-sm font-bold">{stats.total_kills.toLocaleString()}</p>
          <p className="text-[8px] text-muted-foreground">Kills</p>
        </GlassCard>
        <GlassCard className="text-center">
          <Target className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
          <p className="text-sm font-bold">{stats.kd_ratio.toFixed(2)}</p>
          <p className="text-[8px] text-muted-foreground">K/D</p>
        </GlassCard>
        <GlassCard className="text-center">
          <Trophy className="h-3.5 w-3.5 text-yellow-500 mx-auto mb-0.5" />
          <p className="text-sm font-bold">{stats.wins}</p>
          <p className="text-[8px] text-muted-foreground">Wins</p>
        </GlassCard>
        <GlassCard className="text-center">
          <Crown className="h-3.5 w-3.5 text-amber-500 mx-auto mb-0.5" />
          <p className="text-sm font-bold">{stats.win_rate.toFixed(1)}%</p>
          <p className="text-[8px] text-muted-foreground">Win Rate</p>
        </GlassCard>
      </div>

      {/* Combat Stats */}
      <GlassCard>
        <div className="flex items-center gap-1.5 mb-3">
          <Crosshair className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">Combat Stats</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-muted-foreground">Headshot %</span>
              <span className="text-xs font-semibold">{stats.headshot_percentage.toFixed(1)}%</span>
            </div>
            <Progress value={stats.headshot_percentage} className="h-1.5" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-muted-foreground">Accuracy</span>
              <span className="text-xs font-semibold">{stats.accuracy.toFixed(1)}%</span>
            </div>
            <Progress value={stats.accuracy} className="h-1.5" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
          <div className="text-center">
            <p className="text-xs font-bold">{stats.avg_damage_per_match.toFixed(0)}</p>
            <p className="text-[8px] text-muted-foreground">Avg Damage</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold">{stats.headshot_kills.toLocaleString()}</p>
            <p className="text-[8px] text-muted-foreground">HS Kills</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold">{stats.top_10_finishes}</p>
            <p className="text-[8px] text-muted-foreground">Top 10</p>
          </div>
        </div>
      </GlassCard>

      {/* Record Stats */}
      <GlassCard>
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className="h-3.5 w-3.5 text-yellow-500" />
          <span className="text-xs font-semibold">Personal Records</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-white/5">
            <Swords className="h-3 w-3 text-red-500 mx-auto mb-0.5" />
            <p className="text-sm font-bold">{stats.most_kills_single_match}</p>
            <p className="text-[8px] text-muted-foreground">Most Kills</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <Target className="h-3 w-3 text-primary mx-auto mb-0.5" />
            <p className="text-sm font-bold">{stats.longest_kill_distance}m</p>
            <p className="text-[8px] text-muted-foreground">Longest Kill</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <Shield className="h-3 w-3 text-emerald-500 mx-auto mb-0.5" />
            <p className="text-sm font-bold">{stats.highest_damage_single_match}</p>
            <p className="text-[8px] text-muted-foreground">Max Damage</p>
          </div>
        </div>
      </GlassCard>

      {/* Survival Stats */}
      <GlassCard>
        <div className="flex items-center gap-1.5 mb-3">
          <Timer className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-semibold">Match Stats</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-sm font-bold">{stats.total_matches.toLocaleString()}</p>
            <p className="text-[8px] text-muted-foreground">Total Matches</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold">{stats.avg_survival_time_minutes.toFixed(1)}m</p>
            <p className="text-[8px] text-muted-foreground">Avg Survival</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold">{stats.total_deaths.toLocaleString()}</p>
            <p className="text-[8px] text-muted-foreground">Deaths</p>
          </div>
        </div>
      </GlassCard>

      {/* Growth Chart */}
      {chartData.length > 1 && (
        <GlassCard>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">K/D Growth</span>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.5)" />
                <YAxis tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.5)" width={30} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    fontSize: '10px',
                    borderRadius: '8px',
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="kd" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                  name="K/D Ratio"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      {/* Recent Growth */}
      {history.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-semibold">Recent Growth</span>
          </div>
          
          <div className="space-y-2">
            {history.slice(0, 3).map((entry, index) => (
              <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-12">
                    {new Date(entry.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {entry.tier_change && (
                    <Badge variant="outline" className="text-[8px] px-1 h-4 bg-primary/10 text-primary border-primary/30">
                      {entry.tier_change}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-muted-foreground">K/D:</span>
                    <span className="text-xs font-semibold">{entry.kd_ratio.toFixed(2)}</span>
                    {entry.kd_growth !== 0 && (
                      <span className={`text-[9px] flex items-center ${entry.kd_growth > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {entry.kd_growth > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {entry.kd_growth > 0 ? '+' : ''}{entry.kd_growth.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default GameStatsDisplay;
