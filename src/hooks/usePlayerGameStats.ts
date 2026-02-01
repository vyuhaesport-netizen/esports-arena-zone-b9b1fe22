import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PlayerGameStats {
  id: string;
  user_id: string;
  game_uid: string | null;
  in_game_name: string | null;
  current_tier: string;
  current_level: number;
  total_kills: number;
  total_deaths: number;
  total_matches: number;
  wins: number;
  top_10_finishes: number;
  kd_ratio: number;
  win_rate: number;
  total_damage: number;
  avg_damage_per_match: number;
  highest_damage_single_match: number;
  headshot_kills: number;
  headshot_percentage: number;
  accuracy: number;
  total_survival_time_seconds: number;
  avg_survival_time_minutes: number;
  longest_kill_distance: number;
  most_kills_single_match: number;
  preferred_mode: string;
  preferred_map: string;
  last_updated_at: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatsHistoryEntry {
  id: string;
  user_id: string;
  total_kills: number;
  total_deaths: number;
  total_matches: number;
  wins: number;
  kd_ratio: number;
  win_rate: number;
  avg_damage_per_match: number;
  headshot_percentage: number;
  current_tier: string | null;
  current_level: number | null;
  recorded_at: string;
  period_type: string;
  kills_growth: number;
  kd_growth: number;
  tier_change: string | null;
}

export interface StatsFormData {
  game_uid: string;
  in_game_name: string;
  current_tier: string;
  current_level: number;
  total_kills: number;
  total_deaths: number;
  total_matches: number;
  wins: number;
  top_10_finishes: number;
  total_damage: number;
  highest_damage_single_match: number;
  headshot_kills: number;
  accuracy: number;
  total_survival_time_seconds: number;
  longest_kill_distance: number;
  most_kills_single_match: number;
  preferred_mode: string;
  preferred_map: string;
}

export const TIERS = [
  'Bronze V', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
  'Silver V', 'Silver IV', 'Silver III', 'Silver II', 'Silver I',
  'Gold V', 'Gold IV', 'Gold III', 'Gold II', 'Gold I',
  'Platinum V', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I',
  'Diamond V', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I',
  'Crown V', 'Crown IV', 'Crown III', 'Crown II', 'Crown I',
  'Ace', 'Ace Master', 'Ace Dominator', 'Conqueror'
];

export const MAPS = ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik', 'Karakin', 'Nusa'];

export const MODES = ['solo', 'duo', 'squad'];

export const usePlayerGameStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlayerGameStats | null>(null);
  const [history, setHistory] = useState<StatsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch current stats
      const { data: statsData, error: statsError } = await supabase
        .from('player_game_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (statsError) throw statsError;
      setStats(statsData);
      
      // Fetch history
      const { data: historyData, error: historyError } = await supabase
        .from('player_game_stats_history')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(12);
      
      if (historyError) throw historyError;
      setHistory(historyData || []);
      
    } catch (error) {
      console.error('Error fetching game stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveStats = async (formData: StatsFormData): Promise<boolean> => {
    if (!user) return false;
    
    try {
      setSaving(true);
      
      // Calculate previous values for growth tracking
      const previousStats = stats;
      
      if (stats) {
        // Update existing stats
        const { error } = await supabase
          .from('player_game_stats')
          .update({
            ...formData,
            last_updated_at: new Date().toISOString(),
            update_reminder_sent: false,
          })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Insert new stats
        const { error } = await supabase
          .from('player_game_stats')
          .insert({
            user_id: user.id,
            ...formData,
            last_updated_at: new Date().toISOString(),
          });
        
        if (error) throw error;
      }
      
      // Add history entry for growth tracking
      const killsGrowth = previousStats ? formData.total_kills - previousStats.total_kills : 0;
      const prevKd = previousStats?.kd_ratio || 0;
      const newKd = formData.total_deaths > 0 ? formData.total_kills / formData.total_deaths : formData.total_kills;
      const kdGrowth = Number((newKd - prevKd).toFixed(2));
      
      const tierChange = previousStats && previousStats.current_tier !== formData.current_tier
        ? `${previousStats.current_tier} → ${formData.current_tier}`
        : null;
      
      const { error: historyError } = await supabase
        .from('player_game_stats_history')
        .insert({
          user_id: user.id,
          total_kills: formData.total_kills,
          total_deaths: formData.total_deaths,
          total_matches: formData.total_matches,
          wins: formData.wins,
          kd_ratio: newKd,
          win_rate: formData.total_matches > 0 ? (formData.wins / formData.total_matches) * 100 : 0,
          avg_damage_per_match: formData.total_matches > 0 ? formData.total_damage / formData.total_matches : 0,
          headshot_percentage: formData.total_kills > 0 ? (formData.headshot_kills / formData.total_kills) * 100 : 0,
          current_tier: formData.current_tier,
          current_level: formData.current_level,
          period_type: 'weekly',
          kills_growth: killsGrowth,
          kd_growth: kdGrowth,
          tier_change: tierChange,
        });
      
      if (historyError) console.error('Error saving history:', historyError);
      
      toast.success('Stats updated successfully!');
      await fetchStats();
      return true;
      
    } catch (error) {
      console.error('Error saving stats:', error);
      toast.error('Failed to save stats');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const needsUpdate = (): boolean => {
    if (!stats) return true;
    
    const lastUpdate = new Date(stats.last_updated_at);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceUpdate >= 7; // Needs update after 7 days
  };

  const getDaysSinceUpdate = (): number => {
    if (!stats) return 0;
    
    const lastUpdate = new Date(stats.last_updated_at);
    const now = new Date();
    return Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  return {
    stats,
    history,
    loading,
    saving,
    saveStats,
    needsUpdate,
    getDaysSinceUpdate,
    refetch: fetchStats,
  };
};
