-- Update join_local_tournament to properly split: 80% prize, 10% organizer, 10% platform
CREATE OR REPLACE FUNCTION public.join_local_tournament(p_private_code text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_user_balance NUMERIC;
  v_entry_fee NUMERIC;
  v_prize_pool_share NUMERIC;
  v_organizer_share NUMERIC;
  v_platform_share NUMERIC;
BEGIN
  -- Get tournament by private code
  SELECT * INTO v_tournament
  FROM local_tournaments
  WHERE private_code = UPPER(p_private_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid tournament code');
  END IF;

  IF v_tournament.status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is not open for registration');
  END IF;

  IF p_user_id = ANY(COALESCE(v_tournament.joined_users, ARRAY[]::uuid[])) THEN
    RETURN json_build_object('success', false, 'error', 'You have already joined this tournament');
  END IF;

  IF array_length(v_tournament.joined_users, 1) >= v_tournament.max_participants THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is full');
  END IF;

  v_entry_fee := COALESCE(v_tournament.entry_fee, 0);

  -- Get user balance
  SELECT wallet_balance INTO v_user_balance
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_user_balance IS NULL OR v_user_balance < v_entry_fee THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  -- Calculate shares: 80% prize pool, 10% organizer, 10% platform
  v_prize_pool_share := v_entry_fee * 0.8;
  v_organizer_share := v_entry_fee * 0.1;
  v_platform_share := v_entry_fee * 0.1;

  -- Deduct from user wallet
  UPDATE profiles
  SET wallet_balance = wallet_balance - v_entry_fee,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Update tournament with proper commission split
  UPDATE local_tournaments
  SET joined_users = array_append(COALESCE(joined_users, ARRAY[]::uuid[]), p_user_id),
      total_fees_collected = COALESCE(total_fees_collected, 0) + v_entry_fee,
      current_prize_pool = COALESCE(current_prize_pool, 0) + v_prize_pool_share,
      organizer_earnings = COALESCE(organizer_earnings, 0) + v_organizer_share,
      platform_earnings = COALESCE(platform_earnings, 0) + v_platform_share,
      updated_at = now()
  WHERE id = v_tournament.id;

  -- Create transaction record
  INSERT INTO wallet_transactions (user_id, type, amount, status, description)
  VALUES (p_user_id, 'entry_fee', v_entry_fee, 'completed',
          'Local tournament entry: ' || v_tournament.tournament_name);

  -- Send notification
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    p_user_id,
    'local_tournament_joined',
    '🎮 Joined Local Tournament!',
    'You joined "' || v_tournament.tournament_name || '" at ' || v_tournament.institution_name || '. Entry fee ₹' || v_entry_fee || ' deducted.',
    v_tournament.id
  );

  RETURN json_build_object(
    'success', true,
    'tournament', row_to_json(v_tournament),
    'entry_fee', v_entry_fee
  );
END;
$$;