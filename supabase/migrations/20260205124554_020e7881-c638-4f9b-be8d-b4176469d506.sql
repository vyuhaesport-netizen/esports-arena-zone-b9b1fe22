-- Fix the trigger function to handle both 'prize' and 'prize_won' transaction types
-- This ensures user_stats gets updated correctly after tournament completion

CREATE OR REPLACE FUNCTION update_user_stats_on_win()
RETURNS TRIGGER AS $$
DECLARE
  v_position integer;
  v_user_id uuid;
  v_description text;
BEGIN
  -- This trigger runs after wallet_transactions insert for prize/prize_won
  IF (NEW.type = 'prize' OR NEW.type = 'prize_won') AND NEW.status = 'completed' THEN
    v_user_id := NEW.user_id;
    v_description := COALESCE(NEW.description, '');
    
    -- Determine position from description (e.g., "Position #1 prize for...")
    IF v_description LIKE 'Position #1%' THEN
      -- First place
      INSERT INTO user_stats (user_id, tournament_wins, first_place_count, total_earnings)
      VALUES (v_user_id, 1, 1, NEW.amount)
      ON CONFLICT (user_id) DO UPDATE SET
        tournament_wins = user_stats.tournament_wins + 1,
        first_place_count = user_stats.first_place_count + 1,
        total_earnings = user_stats.total_earnings + NEW.amount,
        updated_at = now();
    ELSIF v_description LIKE 'Position #2%' THEN
      -- Second place
      INSERT INTO user_stats (user_id, tournament_wins, second_place_count, total_earnings)
      VALUES (v_user_id, 1, 1, NEW.amount)
      ON CONFLICT (user_id) DO UPDATE SET
        tournament_wins = user_stats.tournament_wins + 1,
        second_place_count = user_stats.second_place_count + 1,
        total_earnings = user_stats.total_earnings + NEW.amount,
        updated_at = now();
    ELSIF v_description LIKE 'Position #3%' THEN
      -- Third place
      INSERT INTO user_stats (user_id, tournament_wins, third_place_count, total_earnings)
      VALUES (v_user_id, 1, 1, NEW.amount)
      ON CONFLICT (user_id) DO UPDATE SET
        tournament_wins = user_stats.tournament_wins + 1,
        third_place_count = user_stats.third_place_count + 1,
        total_earnings = user_stats.total_earnings + NEW.amount,
        updated_at = now();
    ELSE
      -- Other positions (4-10) - count as win but not top 3
      INSERT INTO user_stats (user_id, tournament_wins, total_earnings)
      VALUES (v_user_id, 1, NEW.amount)
      ON CONFLICT (user_id) DO UPDATE SET
        tournament_wins = user_stats.tournament_wins + 1,
        total_earnings = user_stats.total_earnings + NEW.amount,
        updated_at = now();
    END IF;
    
    -- Check for achievements
    PERFORM check_and_award_achievements(v_user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;