-- Add stats_month to track which month the stats belong to
ALTER TABLE public.player_game_stats 
ADD COLUMN IF NOT EXISTS stats_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE;

-- Add stats_valid_until to show when stats expire
ALTER TABLE public.player_game_stats 
ADD COLUMN IF NOT EXISTS stats_valid_until DATE DEFAULT (date_trunc('month', CURRENT_DATE) + interval '1 month')::DATE;

-- Add is_expired flag for quick filtering
ALTER TABLE public.player_game_stats 
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_player_game_stats_month ON public.player_game_stats(stats_month);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_user_valid ON public.player_game_stats(user_id, is_expired);

-- Update existing stats to have current month
UPDATE public.player_game_stats 
SET stats_month = date_trunc('month', CURRENT_DATE)::DATE,
    stats_valid_until = (date_trunc('month', CURRENT_DATE) + interval '1 month')::DATE
WHERE stats_month IS NULL;

-- Function to check and mark expired stats
CREATE OR REPLACE FUNCTION check_expired_player_stats()
RETURNS trigger AS $$
BEGIN
  -- Mark stats as expired if we're past the valid_until date
  IF CURRENT_DATE >= NEW.stats_valid_until THEN
    NEW.is_expired := true;
  ELSE
    NEW.is_expired := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to check expiry on select/update
DROP TRIGGER IF EXISTS check_stats_expiry ON public.player_game_stats;
CREATE TRIGGER check_stats_expiry
  BEFORE UPDATE ON public.player_game_stats
  FOR EACH ROW
  EXECUTE FUNCTION check_expired_player_stats();

-- Function to reset stats for new month (called when user updates)
CREATE OR REPLACE FUNCTION reset_stats_for_new_month()
RETURNS trigger AS $$
DECLARE
  current_month DATE;
BEGIN
  current_month := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- If the stats are from a previous month, reset them
  IF NEW.stats_month IS NOT NULL AND NEW.stats_month < current_month THEN
    -- Archive old stats to history before reset
    INSERT INTO public.player_game_stats_history (
      user_id, total_kills, total_deaths, total_matches, wins, 
      kd_ratio, win_rate, avg_damage_per_match, headshot_percentage,
      current_tier, current_level, period_type, kills_growth, kd_growth, tier_change
    )
    SELECT 
      OLD.user_id, OLD.total_kills, OLD.total_deaths, OLD.total_matches, OLD.wins,
      OLD.kd_ratio, OLD.win_rate, OLD.avg_damage_per_match, OLD.headshot_percentage,
      OLD.current_tier, OLD.current_level, 'monthly', 0, 0, NULL
    WHERE OLD.user_id IS NOT NULL;
    
    -- Update month tracking
    NEW.stats_month := current_month;
    NEW.stats_valid_until := (current_month + interval '1 month')::DATE;
    NEW.is_expired := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS reset_monthly_stats ON public.player_game_stats;
CREATE TRIGGER reset_monthly_stats
  BEFORE UPDATE ON public.player_game_stats
  FOR EACH ROW
  EXECUTE FUNCTION reset_stats_for_new_month();