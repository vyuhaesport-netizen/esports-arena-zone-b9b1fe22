-- Create function to claim stats bonus securely
CREATE OR REPLACE FUNCTION public.claim_stats_bonus(
  p_user_id UUID,
  p_milestone_points INTEGER,
  p_bonus_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_user_stats user_stats%ROWTYPE;
  v_total_points INTEGER;
  v_already_claimed BOOLEAN;
  v_current_balance NUMERIC;
BEGIN
  -- Get user stats
  SELECT * INTO v_user_stats FROM user_stats WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User stats not found. Participate in tournaments to earn stats points.');
  END IF;
  
  -- Calculate total points
  v_total_points := (v_user_stats.first_place_count * 10) + 
                    (v_user_stats.second_place_count * 9) + 
                    (v_user_stats.third_place_count * 8);
  
  -- Check if user has enough points
  IF v_total_points < p_milestone_points THEN
    RETURN json_build_object('success', false, 'error', 'Not enough stats points');
  END IF;
  
  -- Check if already claimed
  SELECT EXISTS(
    SELECT 1 FROM wallet_transactions 
    WHERE user_id = p_user_id 
    AND type = 'bonus' 
    AND description = 'Stats milestone bonus - ' || p_milestone_points || ' points'
  ) INTO v_already_claimed;
  
  IF v_already_claimed THEN
    RETURN json_build_object('success', false, 'error', 'This bonus has already been claimed');
  END IF;
  
  -- Get current wallet balance
  SELECT wallet_balance INTO v_current_balance FROM profiles WHERE user_id = p_user_id;
  
  -- Insert bonus transaction
  INSERT INTO wallet_transactions (user_id, type, amount, status, description)
  VALUES (p_user_id, 'bonus', p_bonus_amount, 'completed', 'Stats milestone bonus - ' || p_milestone_points || ' points');
  
  -- Update wallet balance
  UPDATE profiles 
  SET wallet_balance = COALESCE(v_current_balance, 0) + p_bonus_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN json_build_object('success', true, 'bonus_amount', p_bonus_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;