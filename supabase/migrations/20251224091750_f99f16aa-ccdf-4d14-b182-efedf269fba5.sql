-- Create achievements table
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  category text NOT NULL DEFAULT 'general',
  requirement_type text NOT NULL, -- 'tournament_wins', 'tournament_participations', 'total_earnings', 'first_place_count', etc.
  requirement_value integer NOT NULL DEFAULT 1,
  reward_type text NOT NULL DEFAULT 'avatar', -- 'avatar', 'badge', 'title'
  reward_value text, -- avatar URL or badge name
  points integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_achievements table to track unlocked achievements
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create user_stats table to track user statistics for achievements
CREATE TABLE public.user_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  tournament_wins integer NOT NULL DEFAULT 0,
  tournament_participations integer NOT NULL DEFAULT 0,
  first_place_count integer NOT NULL DEFAULT 0,
  second_place_count integer NOT NULL DEFAULT 0,
  third_place_count integer NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0,
  local_tournament_wins integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Achievements policies (anyone can view, only admins can manage)
CREATE POLICY "Anyone can view achievements"
ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Admins can manage achievements"
ON public.achievements FOR ALL
USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- User achievements policies
CREATE POLICY "Users can view own achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view user achievements"
ON public.user_achievements FOR SELECT
USING (true);

CREATE POLICY "System can insert user achievements"
ON public.user_achievements FOR INSERT
WITH CHECK (true);

-- User stats policies
CREATE POLICY "Users can view own stats"
ON public.user_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view user stats"
ON public.user_stats FOR SELECT
USING (true);

CREATE POLICY "System can manage user stats"
ON public.user_stats FOR ALL
USING (true);

-- Insert default achievements with unlockable avatars
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, reward_type, reward_value, points) VALUES
('First Victory', 'Win your first tournament', 'trophy', 'wins', 'tournament_wins', 1, 'avatar', 'champion-gold', 50),
('Triple Threat', 'Win 3 tournaments', 'crown', 'wins', 'tournament_wins', 3, 'avatar', 'legendary-phoenix', 100),
('Champion Elite', 'Win 10 tournaments', 'star', 'wins', 'tournament_wins', 10, 'avatar', 'elite-dragon', 250),
('Tournament Master', 'Win 25 tournaments', 'zap', 'wins', 'tournament_wins', 25, 'avatar', 'master-titan', 500),
('Getting Started', 'Participate in your first tournament', 'gamepad-2', 'participation', 'tournament_participations', 1, 'avatar', 'starter-warrior', 10),
('Regular Player', 'Participate in 10 tournaments', 'target', 'participation', 'tournament_participations', 10, 'avatar', 'veteran-soldier', 50),
('Dedicated Gamer', 'Participate in 50 tournaments', 'flame', 'participation', 'tournament_participations', 50, 'avatar', 'dedicated-legend', 150),
('First Place Glory', 'Get 1st place in a tournament', 'medal', 'placement', 'first_place_count', 1, 'avatar', 'gold-champion', 75),
('Podium Regular', 'Get 1st place 5 times', 'award', 'placement', 'first_place_count', 5, 'avatar', 'silver-knight', 200),
('Local Hero', 'Win a local tournament', 'map-pin', 'local', 'local_tournament_wins', 1, 'avatar', 'local-hero', 60);

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats RECORD;
  v_achievement RECORD;
  v_newly_unlocked text[] := '{}';
  v_requirement_met boolean;
BEGIN
  -- Get or create user stats
  INSERT INTO user_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  
  -- Check each active achievement
  FOR v_achievement IN 
    SELECT a.* FROM achievements a
    WHERE a.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_achievements ua 
      WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
    )
  LOOP
    v_requirement_met := false;
    
    -- Check requirement based on type
    CASE v_achievement.requirement_type
      WHEN 'tournament_wins' THEN
        v_requirement_met := v_stats.tournament_wins >= v_achievement.requirement_value;
      WHEN 'tournament_participations' THEN
        v_requirement_met := v_stats.tournament_participations >= v_achievement.requirement_value;
      WHEN 'first_place_count' THEN
        v_requirement_met := v_stats.first_place_count >= v_achievement.requirement_value;
      WHEN 'local_tournament_wins' THEN
        v_requirement_met := v_stats.local_tournament_wins >= v_achievement.requirement_value;
      WHEN 'total_earnings' THEN
        v_requirement_met := v_stats.total_earnings >= v_achievement.requirement_value;
      ELSE
        v_requirement_met := false;
    END CASE;
    
    -- Award achievement if requirement met
    IF v_requirement_met THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_achievement.id);
      
      v_newly_unlocked := array_append(v_newly_unlocked, v_achievement.name);
      
      -- Create notification
      INSERT INTO notifications (user_id, title, message, type, related_id)
      VALUES (p_user_id, 'Achievement Unlocked!', 
              format('Congratulations! You unlocked "%s" and earned a special avatar!', v_achievement.name),
              'achievement', v_achievement.id);
    END IF;
  END LOOP;
  
  RETURN json_build_object('success', true, 'newly_unlocked', v_newly_unlocked);
END;
$$;

-- Function to update user stats after tournament completion
CREATE OR REPLACE FUNCTION public.update_user_stats_on_win()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position integer;
  v_user_id uuid;
BEGIN
  -- This trigger runs after wallet_transactions insert for prize_won
  IF NEW.type = 'prize_won' AND NEW.status = 'completed' THEN
    v_user_id := NEW.user_id;
    
    -- Update stats
    INSERT INTO user_stats (user_id, tournament_wins, total_earnings)
    VALUES (v_user_id, 1, NEW.amount)
    ON CONFLICT (user_id) DO UPDATE SET
      tournament_wins = user_stats.tournament_wins + 1,
      total_earnings = user_stats.total_earnings + NEW.amount,
      updated_at = now();
    
    -- Check for achievements
    PERFORM check_and_award_achievements(v_user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic stats update
CREATE TRIGGER trigger_update_stats_on_prize
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_stats_on_win();