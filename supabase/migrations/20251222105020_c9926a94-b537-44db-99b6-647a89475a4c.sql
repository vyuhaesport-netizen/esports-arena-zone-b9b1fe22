-- Create atomic secure function for tournament exit with full validation
CREATE OR REPLACE FUNCTION public.process_tournament_exit(
  p_user_id uuid,
  p_tournament_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_registration RECORD;
  v_entry_fee NUMERIC;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_time_diff INTERVAL;
  v_joined_users uuid[];
  v_new_joined_users uuid[];
  v_transaction_id UUID;
  v_settings RECORD;
  v_prize_pool_percent NUMERIC;
  v_prize_pool_deduction NUMERIC;
BEGIN
  -- Lock tournament row to prevent race conditions
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Check if tournament is still upcoming
  IF v_tournament.status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot exit a tournament that has already started or ended');
  END IF;

  -- Verify user is actually in the tournament
  v_joined_users := COALESCE(v_tournament.joined_users, ARRAY[]::uuid[]);
  IF NOT (p_user_id = ANY(v_joined_users)) THEN
    RETURN json_build_object('success', false, 'error', 'You are not registered in this tournament');
  END IF;

  -- Check time restriction (30 minutes before start)
  v_time_diff := v_tournament.start_date - now();
  IF v_time_diff < interval '30 minutes' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot exit less than 30 minutes before tournament starts');
  END IF;

  -- Get the exact entry fee from tournament (not from client)
  v_entry_fee := COALESCE(v_tournament.entry_fee, 0);

  -- Verify registration exists
  SELECT * INTO v_registration
  FROM tournament_registrations
  WHERE user_id = p_user_id AND tournament_id = p_tournament_id
  FOR UPDATE;

  IF v_registration IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Registration not found');
  END IF;

  -- Get current wallet balance with lock
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Calculate refund amount (exactly the entry fee, no more)
  v_new_balance := v_current_balance + v_entry_fee;

  -- Get platform settings for prize pool calculation
  SELECT 
    COALESCE(MAX(CASE WHEN setting_key = 'prize_pool_percent' THEN setting_value::NUMERIC END), 80)
  INTO v_prize_pool_percent
  FROM platform_settings
  WHERE setting_key = 'prize_pool_percent';

  v_prize_pool_deduction := (v_entry_fee * v_prize_pool_percent) / 100;

  -- Remove user from joined_users array
  v_new_joined_users := array_remove(v_joined_users, p_user_id);

  -- Update tournament atomically
  UPDATE tournaments
  SET 
    joined_users = v_new_joined_users,
    current_prize_pool = GREATEST(0, COALESCE(current_prize_pool, 0) - v_prize_pool_deduction),
    updated_at = now()
  WHERE id = p_tournament_id;

  -- Update wallet balance atomically
  UPDATE profiles
  SET 
    wallet_balance = v_new_balance,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Record refund transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    status,
    description
  )
  VALUES (
    p_user_id,
    'refund',
    v_entry_fee,
    'completed',
    'Tournament exit refund: ' || v_tournament.title
  )
  RETURNING id INTO v_transaction_id;

  -- Delete registration
  DELETE FROM tournament_registrations
  WHERE user_id = p_user_id AND tournament_id = p_tournament_id;

  RETURN json_build_object(
    'success', true,
    'refunded_amount', v_entry_fee,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'An unexpected error occurred: ' || SQLERRM);
END;
$$;

-- Create atomic secure function for tournament join with full validation
CREATE OR REPLACE FUNCTION public.process_tournament_join(
  p_user_id uuid,
  p_tournament_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_entry_fee NUMERIC;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_joined_users uuid[];
  v_new_joined_users uuid[];
  v_current_participants INT;
  v_transaction_id UUID;
  v_organizer_percent NUMERIC;
  v_platform_percent NUMERIC;
  v_prize_pool_percent NUMERIC;
  v_organizer_share NUMERIC;
  v_platform_share NUMERIC;
  v_prize_pool_share NUMERIC;
  v_existing_registration RECORD;
BEGIN
  -- Lock tournament row to prevent race conditions
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Check if tournament is still upcoming
  IF v_tournament.status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'This tournament is no longer accepting registrations');
  END IF;

  -- Get joined users array
  v_joined_users := COALESCE(v_tournament.joined_users, ARRAY[]::uuid[]);
  v_current_participants := array_length(v_joined_users, 1);
  IF v_current_participants IS NULL THEN
    v_current_participants := 0;
  END IF;

  -- Check if user already joined
  IF p_user_id = ANY(v_joined_users) THEN
    RETURN json_build_object('success', false, 'error', 'You have already joined this tournament');
  END IF;

  -- Check max participants
  IF v_tournament.max_participants IS NOT NULL AND v_current_participants >= v_tournament.max_participants THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is full');
  END IF;

  -- Check for existing registration
  SELECT * INTO v_existing_registration
  FROM tournament_registrations
  WHERE user_id = p_user_id AND tournament_id = p_tournament_id;

  IF v_existing_registration IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already have a registration for this tournament');
  END IF;

  -- Get entry fee from tournament (not from client!)
  v_entry_fee := COALESCE(v_tournament.entry_fee, 0);

  -- Get current wallet balance with lock
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Check sufficient balance
  IF v_current_balance < v_entry_fee THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient balance. Required: ₹' || v_entry_fee || ', Available: ₹' || v_current_balance
    );
  END IF;

  -- Get platform settings
  SELECT 
    COALESCE(MAX(CASE WHEN setting_key = 'organizer_commission_percent' THEN setting_value::NUMERIC END), 10),
    COALESCE(MAX(CASE WHEN setting_key = 'platform_commission_percent' THEN setting_value::NUMERIC END), 10),
    COALESCE(MAX(CASE WHEN setting_key = 'prize_pool_percent' THEN setting_value::NUMERIC END), 80)
  INTO v_organizer_percent, v_platform_percent, v_prize_pool_percent
  FROM platform_settings;

  -- Calculate shares
  v_organizer_share := (v_entry_fee * v_organizer_percent) / 100;
  v_platform_share := (v_entry_fee * v_platform_percent) / 100;
  v_prize_pool_share := (v_entry_fee * v_prize_pool_percent) / 100;

  -- Calculate new balance
  v_new_balance := v_current_balance - v_entry_fee;

  -- Add user to joined_users array
  v_new_joined_users := array_append(v_joined_users, p_user_id);

  -- Update tournament atomically
  UPDATE tournaments
  SET 
    joined_users = v_new_joined_users,
    total_fees_collected = COALESCE(total_fees_collected, 0) + v_entry_fee,
    organizer_earnings = COALESCE(organizer_earnings, 0) + v_organizer_share,
    platform_earnings = COALESCE(platform_earnings, 0) + v_platform_share,
    current_prize_pool = COALESCE(current_prize_pool, 0) + v_prize_pool_share,
    updated_at = now()
  WHERE id = p_tournament_id;

  -- Deduct from wallet atomically
  UPDATE profiles
  SET 
    wallet_balance = v_new_balance,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Record entry fee transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    status,
    description
  )
  VALUES (
    p_user_id,
    'entry_fee',
    -v_entry_fee,
    'completed',
    'Entry fee for: ' || v_tournament.title
  )
  RETURNING id INTO v_transaction_id;

  -- Create registration
  INSERT INTO tournament_registrations (
    user_id,
    tournament_id,
    status
  )
  VALUES (
    p_user_id,
    p_tournament_id,
    'registered'
  );

  RETURN json_build_object(
    'success', true,
    'entry_fee', v_entry_fee,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id,
    'participants', array_length(v_new_joined_users, 1)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'An unexpected error occurred: ' || SQLERRM);
END;
$$;