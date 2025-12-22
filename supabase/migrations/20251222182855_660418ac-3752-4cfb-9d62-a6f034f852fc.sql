-- Create function to recalculate prize pool based on actual joined players
-- This prevents organizer/creator fraud by ensuring prizes match actual collected fees
CREATE OR REPLACE FUNCTION public.recalculate_tournament_prizepool(p_tournament_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_joined_count INT;
  v_entry_fee NUMERIC;
  v_prize_pool_percent NUMERIC;
  v_actual_prize_pool NUMERIC;
  v_prize_distribution JSONB;
  v_new_distribution JSONB;
  v_total_distribution NUMERIC;
  v_scale_factor NUMERIC;
  v_position TEXT;
  v_amount NUMERIC;
BEGIN
  -- Get tournament with lock
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Only recalculate for upcoming tournaments
  IF v_tournament.status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'Can only recalculate upcoming tournaments');
  END IF;

  -- Get joined users count
  v_joined_count := COALESCE(array_length(v_tournament.joined_users, 1), 0);
  v_entry_fee := COALESCE(v_tournament.entry_fee, 0);

  -- Get prize pool percentage from settings
  SELECT COALESCE(MAX(setting_value::NUMERIC), 80)
  INTO v_prize_pool_percent
  FROM platform_settings
  WHERE setting_key = 'prize_pool_percent';

  -- Calculate actual prize pool based on joined players
  v_actual_prize_pool := (v_entry_fee * v_joined_count * v_prize_pool_percent) / 100;

  -- Get current prize distribution
  v_prize_distribution := COALESCE(v_tournament.prize_distribution, '{}'::jsonb);

  -- If there's a prize distribution, scale it proportionally
  IF v_prize_distribution != '{}'::jsonb THEN
    -- Calculate total distribution amount
    v_total_distribution := 0;
    FOR v_position, v_amount IN
      SELECT key, value::NUMERIC FROM jsonb_each_text(v_prize_distribution)
    LOOP
      v_total_distribution := v_total_distribution + v_amount;
    END LOOP;

    -- Scale distribution if total doesn't match new prize pool
    IF v_total_distribution > 0 AND v_total_distribution != v_actual_prize_pool THEN
      v_scale_factor := v_actual_prize_pool / v_total_distribution;
      v_new_distribution := '{}'::jsonb;
      
      FOR v_position, v_amount IN
        SELECT key, value::NUMERIC FROM jsonb_each_text(v_prize_distribution)
      LOOP
        v_new_distribution := v_new_distribution || jsonb_build_object(v_position, ROUND(v_amount * v_scale_factor));
      END LOOP;
      
      v_prize_distribution := v_new_distribution;
    END IF;
  END IF;

  -- Update tournament with recalculated values
  UPDATE tournaments
  SET 
    current_prize_pool = v_actual_prize_pool,
    prize_pool = '₹' || v_actual_prize_pool::TEXT,
    prize_distribution = v_prize_distribution,
    updated_at = now()
  WHERE id = p_tournament_id;

  RETURN json_build_object(
    'success', true,
    'joined_players', v_joined_count,
    'new_prize_pool', v_actual_prize_pool,
    'prize_distribution', v_prize_distribution
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Error: ' || SQLERRM);
END;
$$;

-- Update process_winner_declaration to handle amount-based distribution (not percentage)
CREATE OR REPLACE FUNCTION public.process_winner_declaration(p_tournament_id uuid, p_organizer_id uuid, p_winner_positions jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_organizer_percent NUMERIC;
  v_prize_distribution JSONB;
  v_prize_pool NUMERIC;
  v_user_id text;
  v_position int;
  v_prize_amount NUMERIC;
  v_winner_balance NUMERIC;
  v_organizer_earnings NUMERIC;
  v_organizer_balance NUMERIC;
  v_first_winner_id uuid;
  v_total_distributed NUMERIC := 0;
BEGIN
  -- Lock tournament row to prevent race conditions
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Verify the caller is the tournament creator
  IF v_tournament.created_by != p_organizer_id THEN
    RETURN json_build_object('success', false, 'error', 'You are not authorized to declare winners for this tournament');
  END IF;

  -- Check if tournament already has winner declared
  IF v_tournament.winner_user_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Winners have already been declared for this tournament');
  END IF;

  -- Check if tournament status is valid
  IF v_tournament.status = 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is already completed');
  END IF;

  -- Get platform settings
  SELECT COALESCE(MAX(CASE WHEN setting_key = 'organizer_commission_percent' THEN setting_value::NUMERIC END), 10)
  INTO v_organizer_percent
  FROM platform_settings;

  v_prize_distribution := COALESCE(v_tournament.prize_distribution, '{}'::jsonb);
  v_prize_pool := COALESCE(v_tournament.current_prize_pool, 0);

  -- Validate prize pool exists
  IF v_prize_pool <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No prize pool available to distribute');
  END IF;

  -- Validate winner positions
  IF p_winner_positions IS NULL OR jsonb_typeof(p_winner_positions) != 'object' OR p_winner_positions = '{}'::jsonb THEN
    RETURN json_build_object('success', false, 'error', 'Please assign at least one winner position');
  END IF;

  -- Process each winner
  FOR v_user_id, v_position IN
    SELECT key, value::int FROM jsonb_each_text(p_winner_positions)
  LOOP
    -- Validate user is in the tournament
    IF NOT (v_user_id::uuid = ANY(COALESCE(v_tournament.joined_users, ARRAY[]::uuid[]))) THEN
      RETURN json_build_object('success', false, 'error', 'Winner ' || v_user_id || ' is not a participant in this tournament');
    END IF;

    -- Get prize amount from distribution (now stored as amounts, not percentages)
    v_prize_amount := 0;
    
    IF v_prize_distribution ? v_position::text THEN
      v_prize_amount := (v_prize_distribution->>v_position::text)::NUMERIC;
    ELSE
      -- Default distribution if not specified (based on prize pool)
      IF v_position = 1 THEN
        v_prize_amount := v_prize_pool * 0.5;
      ELSIF v_position = 2 THEN
        v_prize_amount := v_prize_pool * 0.3;
      ELSIF v_position = 3 THEN
        v_prize_amount := v_prize_pool * 0.2;
      END IF;
    END IF;

    -- Skip if no prize for this position
    IF v_prize_amount <= 0 THEN
      CONTINUE;
    END IF;

    -- Validate total distribution doesn't exceed prize pool
    IF v_total_distributed + v_prize_amount > v_prize_pool THEN
      v_prize_amount := GREATEST(0, v_prize_pool - v_total_distributed);
    END IF;

    IF v_prize_amount > 0 THEN
      -- Get winner's current balance with lock
      SELECT wallet_balance INTO v_winner_balance
      FROM profiles
      WHERE user_id = v_user_id::uuid
      FOR UPDATE;

      IF v_winner_balance IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Winner profile not found: ' || v_user_id);
      END IF;

      -- Update winner's wallet atomically
      UPDATE profiles
      SET 
        wallet_balance = wallet_balance + v_prize_amount,
        updated_at = now()
      WHERE user_id = v_user_id::uuid;

      -- Create transaction record
      INSERT INTO wallet_transactions (
        user_id,
        type,
        amount,
        status,
        description
      )
      VALUES (
        v_user_id::uuid,
        'prize',
        v_prize_amount,
        'completed',
        'Position #' || v_position || ' prize for ' || v_tournament.title
      );

      -- Create notification
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message
      )
      VALUES (
        v_user_id::uuid,
        'prize_won',
        'Congratulations! 🎉',
        'You won position #' || v_position || ' in ' || v_tournament.title || '! ₹' || v_prize_amount || ' credited to your wallet.'
      );

      v_total_distributed := v_total_distributed + v_prize_amount;

      -- Track first place winner
      IF v_position = 1 THEN
        v_first_winner_id := v_user_id::uuid;
      END IF;
    END IF;
  END LOOP;

  -- Calculate organizer earnings from actual collected fees
  v_organizer_earnings := COALESCE(v_tournament.organizer_earnings, 0);

  -- Credit organizer earnings if any
  IF v_organizer_earnings > 0 THEN
    -- Get organizer's current balance with lock
    SELECT wallet_balance INTO v_organizer_balance
    FROM profiles
    WHERE user_id = p_organizer_id
    FOR UPDATE;

    IF v_organizer_balance IS NOT NULL THEN
      -- Update organizer's wallet atomically
      UPDATE profiles
      SET 
        wallet_balance = wallet_balance + v_organizer_earnings,
        updated_at = now()
      WHERE user_id = p_organizer_id;

      -- Create commission transaction record
      INSERT INTO wallet_transactions (
        user_id,
        type,
        amount,
        status,
        description
      )
      VALUES (
        p_organizer_id,
        'commission',
        v_organizer_earnings,
        'completed',
        'Organizer commission for ' || v_tournament.title
      );
    END IF;
  END IF;

  -- Update tournament status to completed
  UPDATE tournaments
  SET 
    winner_user_id = COALESCE(v_first_winner_id, (SELECT (jsonb_object_keys(p_winner_positions))::uuid LIMIT 1)),
    winner_declared_at = now(),
    status = 'completed',
    updated_at = now()
  WHERE id = p_tournament_id;

  RETURN json_build_object(
    'success', true,
    'total_distributed', v_total_distributed,
    'organizer_earnings', v_organizer_earnings,
    'first_winner_id', v_first_winner_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'An unexpected error occurred: ' || SQLERRM);
END;
$$;