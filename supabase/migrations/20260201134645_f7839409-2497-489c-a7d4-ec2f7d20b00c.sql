-- Create table for player in-game stats (BGMI/PUBG specific)
CREATE TABLE public.player_game_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Basic Info
  game_uid VARCHAR(50),
  in_game_name VARCHAR(100),
  current_tier VARCHAR(50) DEFAULT 'Bronze', -- Bronze, Silver, Gold, Platinum, Diamond, Crown, Ace, Conqueror
  current_level INTEGER DEFAULT 1,
  
  -- Core Combat Stats
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0, -- Chicken Dinners
  top_10_finishes INTEGER DEFAULT 0,
  
  -- Calculated Stats (stored for performance)
  kd_ratio DECIMAL(5,2) DEFAULT 0.00,
  win_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Damage Stats
  total_damage BIGINT DEFAULT 0,
  avg_damage_per_match DECIMAL(8,2) DEFAULT 0.00,
  highest_damage_single_match INTEGER DEFAULT 0,
  
  -- Accuracy Stats
  headshot_kills INTEGER DEFAULT 0,
  headshot_percentage DECIMAL(5,2) DEFAULT 0.00,
  accuracy DECIMAL(5,2) DEFAULT 0.00,
  
  -- Survival Stats
  total_survival_time_seconds BIGINT DEFAULT 0, -- in seconds
  avg_survival_time_minutes DECIMAL(6,2) DEFAULT 0.00,
  
  -- Achievement Stats
  longest_kill_distance INTEGER DEFAULT 0, -- in meters
  most_kills_single_match INTEGER DEFAULT 0,
  
  -- Mode-specific stats (can be extended)
  preferred_mode VARCHAR(20) DEFAULT 'squad', -- solo, duo, squad
  preferred_map VARCHAR(50) DEFAULT 'Erangel',
  
  -- Last update tracking
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  update_reminder_sent BOOLEAN DEFAULT FALSE,
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_game_stats UNIQUE (user_id)
);

-- Create table for tracking stat history (for growth pattern analysis)
CREATE TABLE public.player_game_stats_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Snapshot of key stats
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  kd_ratio DECIMAL(5,2) DEFAULT 0.00,
  win_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_damage_per_match DECIMAL(8,2) DEFAULT 0.00,
  headshot_percentage DECIMAL(5,2) DEFAULT 0.00,
  current_tier VARCHAR(50),
  current_level INTEGER,
  
  -- Time tracking
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_type VARCHAR(20) DEFAULT 'weekly', -- weekly, monthly
  
  -- Growth metrics (calculated from previous record)
  kills_growth INTEGER DEFAULT 0,
  kd_growth DECIMAL(5,2) DEFAULT 0.00,
  tier_change VARCHAR(50)
);

-- Create indexes for better query performance
CREATE INDEX idx_player_game_stats_user_id ON public.player_game_stats(user_id);
CREATE INDEX idx_player_game_stats_tier ON public.player_game_stats(current_tier);
CREATE INDEX idx_player_game_stats_kd ON public.player_game_stats(kd_ratio DESC);
CREATE INDEX idx_player_game_stats_last_updated ON public.player_game_stats(last_updated_at);
CREATE INDEX idx_player_game_stats_history_user_id ON public.player_game_stats_history(user_id);
CREATE INDEX idx_player_game_stats_history_recorded_at ON public.player_game_stats_history(recorded_at);

-- Enable Row Level Security
ALTER TABLE public.player_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_game_stats_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_game_stats
-- Anyone can view player stats (for team seeking)
CREATE POLICY "Player game stats are viewable by everyone" 
ON public.player_game_stats 
FOR SELECT 
USING (true);

-- Users can insert their own stats
CREATE POLICY "Users can create their own game stats" 
ON public.player_game_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own stats
CREATE POLICY "Users can update their own game stats" 
ON public.player_game_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for player_game_stats_history
-- Users can view their own history
CREATE POLICY "Users can view their own stats history" 
ON public.player_game_stats_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own history records
CREATE POLICY "Users can insert their own stats history" 
ON public.player_game_stats_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Function to auto-calculate derived stats on insert/update
CREATE OR REPLACE FUNCTION public.calculate_player_game_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate K/D ratio (avoid division by zero)
  IF NEW.total_deaths > 0 THEN
    NEW.kd_ratio := ROUND((NEW.total_kills::DECIMAL / NEW.total_deaths::DECIMAL), 2);
  ELSE
    NEW.kd_ratio := NEW.total_kills::DECIMAL;
  END IF;
  
  -- Calculate win rate
  IF NEW.total_matches > 0 THEN
    NEW.win_rate := ROUND((NEW.wins::DECIMAL / NEW.total_matches::DECIMAL * 100), 2);
  ELSE
    NEW.win_rate := 0;
  END IF;
  
  -- Calculate average damage
  IF NEW.total_matches > 0 THEN
    NEW.avg_damage_per_match := ROUND((NEW.total_damage::DECIMAL / NEW.total_matches::DECIMAL), 2);
  ELSE
    NEW.avg_damage_per_match := 0;
  END IF;
  
  -- Calculate headshot percentage
  IF NEW.total_kills > 0 THEN
    NEW.headshot_percentage := ROUND((NEW.headshot_kills::DECIMAL / NEW.total_kills::DECIMAL * 100), 2);
  ELSE
    NEW.headshot_percentage := 0;
  END IF;
  
  -- Calculate average survival time in minutes
  IF NEW.total_matches > 0 THEN
    NEW.avg_survival_time_minutes := ROUND((NEW.total_survival_time_seconds::DECIMAL / NEW.total_matches::DECIMAL / 60), 2);
  ELSE
    NEW.avg_survival_time_minutes := 0;
  END IF;
  
  -- Update timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-calculation
CREATE TRIGGER trigger_calculate_player_game_stats
BEFORE INSERT OR UPDATE ON public.player_game_stats
FOR EACH ROW
EXECUTE FUNCTION public.calculate_player_game_stats();

-- Function to update updated_at timestamp on history
CREATE TRIGGER update_player_game_stats_updated_at
BEFORE UPDATE ON public.player_game_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();