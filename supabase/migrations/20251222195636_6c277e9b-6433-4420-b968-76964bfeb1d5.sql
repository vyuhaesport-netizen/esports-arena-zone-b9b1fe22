-- Add team registration support to tournament_registrations
ALTER TABLE public.tournament_registrations 
ADD COLUMN IF NOT EXISTS team_members uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_team_leader boolean DEFAULT false;

-- Create a function to send notifications for various actions
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_related_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_related_id);
END;
$$;

-- Update process_tournament_join to send notification
CREATE OR REPLACE FUNCTION public.process_tournament_join(p_user_id uuid, p_tournament_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Send notification to user
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    p_user_id,
    'tournament_joined',
    '🎮 Tournament Joined!',
    'You have successfully joined "' || v_tournament.title || '". Entry fee ₹' || v_entry_fee || ' deducted. Good luck!',
    p_tournament_id
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

-- Update process_tournament_exit to send notification
CREATE OR REPLACE FUNCTION public.process_tournament_exit(p_user_id uuid, p_tournament_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Send notification to user
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    p_user_id,
    'tournament_exit',
    '🔙 Tournament Exited',
    'You have exited "' || v_tournament.title || '". ₹' || v_entry_fee || ' has been refunded to your wallet.',
    p_tournament_id
  );

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

-- Update admin_process_deposit to send notification
CREATE OR REPLACE FUNCTION public.admin_process_deposit(p_deposit_id uuid, p_action text, p_reason text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_balance numeric;
BEGIN
  IF p_deposit_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Deposit id is required');
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;

  -- Authorize
  IF NOT (
    public.is_super_admin(auth.uid())
    OR public.has_admin_permission(auth.uid(), 'deposits:manage')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Lock the transaction row
  SELECT * INTO v_tx
  FROM public.wallet_transactions
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF v_tx IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Deposit not found');
  END IF;

  IF v_tx.type <> 'deposit' THEN
    RETURN json_build_object('success', false, 'error', 'Transaction is not a deposit');
  END IF;

  IF v_tx.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Deposit is not pending');
  END IF;

  IF p_action = 'reject' THEN
    UPDATE public.wallet_transactions
    SET status = 'failed',
        processed_by = auth.uid(),
        reason = COALESCE(NULLIF(trim(p_reason), ''), 'Rejected by admin'),
        updated_at = now()
    WHERE id = p_deposit_id;

    -- Send notification for rejected deposit
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      v_tx.user_id,
      'deposit_rejected',
      '❌ Deposit Rejected',
      'Your deposit of ₹' || v_tx.amount || ' was rejected. Reason: ' || COALESCE(NULLIF(trim(p_reason), ''), 'Invalid payment details'),
      p_deposit_id
    );

    RETURN json_build_object('success', true, 'status', 'failed');
  END IF;

  -- APPROVE: credit wallet
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + COALESCE(v_tx.amount, 0),
      updated_at = now()
  WHERE user_id = v_tx.user_id
  RETURNING wallet_balance INTO v_balance;

  UPDATE public.wallet_transactions
  SET status = 'completed',
      processed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_deposit_id;

  -- Send notification for approved deposit
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    v_tx.user_id,
    'deposit_approved',
    '💰 Money Added Successfully!',
    '₹' || v_tx.amount || ' has been added to your wallet. New balance: ₹' || v_balance,
    p_deposit_id
  );

  RETURN json_build_object('success', true, 'status', 'completed', 'new_balance', v_balance);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update admin_process_withdrawal to send notification
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(p_withdrawal_id uuid, p_action text, p_reason text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_email TEXT;
  v_new_balance NUMERIC;
BEGIN
  -- Validate inputs
  IF p_withdrawal_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal ID is required');
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid action. Must be approve or reject');
  END IF;

  -- Authorize: only admin emails or explicit permission
  SELECT u.email
  INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unable to resolve admin identity');
  END IF;

  IF NOT (
    public.is_admin_email(v_email)
    OR public.is_super_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_admin_permission(auth.uid(), 'withdrawals:manage')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Lock the withdrawal transaction row
  SELECT * INTO v_tx
  FROM public.wallet_transactions
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF v_tx IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_tx.type <> 'withdrawal' THEN
    RETURN json_build_object('success', false, 'error', 'Transaction is not a withdrawal');
  END IF;

  IF v_tx.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal is not pending');
  END IF;

  IF p_action = 'approve' THEN
    -- Just mark as completed (money already deducted when user requested)
    UPDATE public.wallet_transactions
    SET status = 'completed',
        processed_by = auth.uid(),
        updated_at = now()
    WHERE id = p_withdrawal_id;

    -- Send notification for approved withdrawal
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      v_tx.user_id,
      'withdrawal_approved',
      '✅ Withdrawal Approved!',
      'Your withdrawal of ₹' || ABS(v_tx.amount) || ' has been approved and sent to your UPI: ' || COALESCE(v_tx.upi_id, 'N/A'),
      p_withdrawal_id
    );

    RETURN json_build_object('success', true, 'status', 'completed');
  END IF;

  -- REJECT: refund the amount back to user's wallet atomically
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + ABS(COALESCE(v_tx.amount, 0)),
      updated_at = now()
  WHERE user_id = v_tx.user_id
  RETURNING wallet_balance INTO v_new_balance;

  UPDATE public.wallet_transactions
  SET status = 'rejected',
      processed_by = auth.uid(),
      reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'Rejected by admin'),
      updated_at = now()
  WHERE id = p_withdrawal_id;

  -- Send notification for rejected withdrawal
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    v_tx.user_id,
    'withdrawal_rejected',
    '❌ Withdrawal Rejected',
    'Your withdrawal of ₹' || ABS(v_tx.amount) || ' was rejected. Amount refunded. Reason: ' || COALESCE(NULLIF(TRIM(p_reason), ''), 'Invalid details'),
    p_withdrawal_id
  );

  RETURN json_build_object('success', true, 'status', 'rejected', 'new_balance', v_new_balance);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update process_winner_declaration to send notifications
CREATE OR REPLACE FUNCTION public.process_winner_declaration(p_tournament_id uuid, p_organizer_id uuid, p_winner_positions jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

      -- Create enhanced notification for winner
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        related_id
      )
      VALUES (
        v_user_id::uuid,
        'prize_won',
        '🏆 Congratulations! You Won!',
        'You secured Position #' || v_position || ' in "' || v_tournament.title || '"! ₹' || v_prize_amount || ' has been credited to your wallet. Keep playing!',
        p_tournament_id
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

      -- Send notification to organizer
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (
        p_organizer_id,
        'commission_earned',
        '💵 Commission Earned!',
        'You earned ₹' || v_organizer_earnings || ' commission from "' || v_tournament.title || '".',
        p_tournament_id
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

-- Create team tournament join function for duo/squad
CREATE OR REPLACE FUNCTION public.process_team_tournament_join(
  p_leader_id uuid,
  p_tournament_id uuid,
  p_team_member_ids uuid[],
  p_team_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_entry_fee NUMERIC;
  v_total_fee NUMERIC;
  v_member_id uuid;
  v_member_balance NUMERIC;
  v_joined_users uuid[];
  v_new_joined_users uuid[];
  v_required_members INT;
  v_organizer_percent NUMERIC;
  v_platform_percent NUMERIC;
  v_prize_pool_percent NUMERIC;
  v_organizer_share NUMERIC;
  v_platform_share NUMERIC;
  v_prize_pool_share NUMERIC;
  v_all_members uuid[];
BEGIN
  -- Lock tournament row
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_tournament.status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is no longer accepting registrations');
  END IF;

  -- Check tournament mode
  IF v_tournament.tournament_mode = 'solo' THEN
    RETURN json_build_object('success', false, 'error', 'This is a solo tournament. Use regular join.');
  END IF;

  -- Validate team size
  IF v_tournament.tournament_mode = 'duo' THEN
    v_required_members := 2;
  ELSIF v_tournament.tournament_mode = 'squad' THEN
    v_required_members := 4;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid tournament mode');
  END IF;

  -- All members including leader
  v_all_members := array_prepend(p_leader_id, p_team_member_ids);

  IF array_length(v_all_members, 1) != v_required_members THEN
    RETURN json_build_object('success', false, 'error', 'Team must have exactly ' || v_required_members || ' members');
  END IF;

  -- Check for duplicate members
  IF array_length(v_all_members, 1) != (SELECT COUNT(DISTINCT m) FROM unnest(v_all_members) m) THEN
    RETURN json_build_object('success', false, 'error', 'Duplicate team members not allowed');
  END IF;

  v_joined_users := COALESCE(v_tournament.joined_users, ARRAY[]::uuid[]);
  v_entry_fee := COALESCE(v_tournament.entry_fee, 0);

  -- Check if any member already joined
  FOREACH v_member_id IN ARRAY v_all_members
  LOOP
    IF v_member_id = ANY(v_joined_users) THEN
      RETURN json_build_object('success', false, 'error', 'One or more team members have already joined this tournament');
    END IF;
  END LOOP;

  -- Check max participants
  IF v_tournament.max_participants IS NOT NULL AND 
     (array_length(v_joined_users, 1) IS NULL AND v_required_members > v_tournament.max_participants) OR
     (array_length(v_joined_users, 1) IS NOT NULL AND array_length(v_joined_users, 1) + v_required_members > v_tournament.max_participants) THEN
    RETURN json_build_object('success', false, 'error', 'Not enough spots available');
  END IF;

  -- Verify all members have sufficient balance
  FOREACH v_member_id IN ARRAY v_all_members
  LOOP
    SELECT wallet_balance INTO v_member_balance
    FROM profiles
    WHERE user_id = v_member_id
    FOR UPDATE;

    IF v_member_balance IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Team member profile not found');
    END IF;

    IF v_member_balance < v_entry_fee THEN
      RETURN json_build_object('success', false, 'error', 'One or more team members have insufficient balance');
    END IF;
  END LOOP;

  -- Get platform settings
  SELECT 
    COALESCE(MAX(CASE WHEN setting_key = 'organizer_commission_percent' THEN setting_value::NUMERIC END), 10),
    COALESCE(MAX(CASE WHEN setting_key = 'platform_commission_percent' THEN setting_value::NUMERIC END), 10),
    COALESCE(MAX(CASE WHEN setting_key = 'prize_pool_percent' THEN setting_value::NUMERIC END), 80)
  INTO v_organizer_percent, v_platform_percent, v_prize_pool_percent
  FROM platform_settings;

  v_total_fee := v_entry_fee * v_required_members;
  v_organizer_share := (v_total_fee * v_organizer_percent) / 100;
  v_platform_share := (v_total_fee * v_platform_percent) / 100;
  v_prize_pool_share := (v_total_fee * v_prize_pool_percent) / 100;

  v_new_joined_users := v_joined_users;

  -- Deduct from each member's wallet and add to joined_users
  FOREACH v_member_id IN ARRAY v_all_members
  LOOP
    -- Deduct entry fee
    UPDATE profiles
    SET wallet_balance = wallet_balance - v_entry_fee,
        updated_at = now()
    WHERE user_id = v_member_id;

    -- Create transaction
    INSERT INTO wallet_transactions (user_id, type, amount, status, description)
    VALUES (v_member_id, 'entry_fee', -v_entry_fee, 'completed', 
            'Team entry for: ' || v_tournament.title || ' (Team: ' || p_team_name || ')');

    -- Add to joined_users
    v_new_joined_users := array_append(v_new_joined_users, v_member_id);

    -- Create registration (leader has is_team_leader = true)
    INSERT INTO tournament_registrations (user_id, tournament_id, team_name, team_members, is_team_leader, status)
    VALUES (v_member_id, p_tournament_id, p_team_name, v_all_members, v_member_id = p_leader_id, 'registered');

    -- Send notification
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      v_member_id,
      'tournament_joined',
      '🎮 Team Tournament Joined!',
      'You joined "' || v_tournament.title || '" with team "' || p_team_name || '". Entry fee ₹' || v_entry_fee || ' deducted. Good luck!',
      p_tournament_id
    );
  END LOOP;

  -- Update tournament
  UPDATE tournaments
  SET 
    joined_users = v_new_joined_users,
    total_fees_collected = COALESCE(total_fees_collected, 0) + v_total_fee,
    organizer_earnings = COALESCE(organizer_earnings, 0) + v_organizer_share,
    platform_earnings = COALESCE(platform_earnings, 0) + v_platform_share,
    current_prize_pool = COALESCE(current_prize_pool, 0) + v_prize_pool_share,
    updated_at = now()
  WHERE id = p_tournament_id;

  RETURN json_build_object(
    'success', true,
    'total_fee', v_total_fee,
    'team_name', p_team_name,
    'member_count', v_required_members
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'An unexpected error occurred: ' || SQLERRM);
END;
$$;

-- Create function to distribute team prize equally
CREATE OR REPLACE FUNCTION public.process_team_winner_declaration(
  p_tournament_id uuid,
  p_organizer_id uuid,
  p_team_positions jsonb -- { "team_name": position }
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_prize_distribution JSONB;
  v_prize_pool NUMERIC;
  v_team_name text;
  v_position int;
  v_prize_amount NUMERIC;
  v_prize_per_member NUMERIC;
  v_team_members uuid[];
  v_member_id uuid;
  v_organizer_earnings NUMERIC;
  v_first_winner_id uuid;
  v_total_distributed NUMERIC := 0;
BEGIN
  -- Lock tournament
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_tournament.created_by != p_organizer_id THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_tournament.winner_user_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Winners already declared');
  END IF;

  v_prize_distribution := COALESCE(v_tournament.prize_distribution, '{}'::jsonb);
  v_prize_pool := COALESCE(v_tournament.current_prize_pool, 0);

  IF v_prize_pool <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No prize pool available');
  END IF;

  -- Process each team
  FOR v_team_name, v_position IN
    SELECT key, value::int FROM jsonb_each_text(p_team_positions)
  LOOP
    -- Get team members
    SELECT team_members INTO v_team_members
    FROM tournament_registrations
    WHERE tournament_id = p_tournament_id AND team_name = v_team_name AND is_team_leader = true
    LIMIT 1;

    IF v_team_members IS NULL OR array_length(v_team_members, 1) = 0 THEN
      CONTINUE; -- Skip if team not found
    END IF;

    -- Get prize for position
    IF v_prize_distribution ? v_position::text THEN
      v_prize_amount := (v_prize_distribution->>v_position::text)::NUMERIC;
    ELSE
      IF v_position = 1 THEN v_prize_amount := v_prize_pool * 0.5;
      ELSIF v_position = 2 THEN v_prize_amount := v_prize_pool * 0.3;
      ELSIF v_position = 3 THEN v_prize_amount := v_prize_pool * 0.2;
      ELSE v_prize_amount := 0;
      END IF;
    END IF;

    IF v_prize_amount <= 0 THEN CONTINUE; END IF;

    -- Validate don't exceed pool
    IF v_total_distributed + v_prize_amount > v_prize_pool THEN
      v_prize_amount := GREATEST(0, v_prize_pool - v_total_distributed);
    END IF;

    -- Split equally among team members
    v_prize_per_member := v_prize_amount / array_length(v_team_members, 1);

    -- Credit each team member
    FOREACH v_member_id IN ARRAY v_team_members
    LOOP
      UPDATE profiles
      SET wallet_balance = wallet_balance + v_prize_per_member,
          updated_at = now()
      WHERE user_id = v_member_id;

      INSERT INTO wallet_transactions (user_id, type, amount, status, description)
      VALUES (v_member_id, 'prize', v_prize_per_member, 'completed',
              'Team #' || v_position || ' prize for ' || v_tournament.title || ' (Team: ' || v_team_name || ')');

      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (v_member_id, 'prize_won', '🏆 Team Victory!',
              'Your team "' || v_team_name || '" secured Position #' || v_position || '! ₹' || v_prize_per_member || ' credited to your wallet.',
              p_tournament_id);

      IF v_position = 1 AND v_first_winner_id IS NULL THEN
        v_first_winner_id := v_member_id;
      END IF;
    END LOOP;

    v_total_distributed := v_total_distributed + v_prize_amount;
  END LOOP;

  -- Credit organizer earnings
  v_organizer_earnings := COALESCE(v_tournament.organizer_earnings, 0);
  IF v_organizer_earnings > 0 THEN
    UPDATE profiles
    SET wallet_balance = wallet_balance + v_organizer_earnings,
        updated_at = now()
    WHERE user_id = p_organizer_id;

    INSERT INTO wallet_transactions (user_id, type, amount, status, description)
    VALUES (p_organizer_id, 'commission', v_organizer_earnings, 'completed',
            'Organizer commission for ' || v_tournament.title);

    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (p_organizer_id, 'commission_earned', '💵 Commission Earned!',
            'You earned ₹' || v_organizer_earnings || ' from "' || v_tournament.title || '".',
            p_tournament_id);
  END IF;

  -- Mark completed
  UPDATE tournaments
  SET winner_user_id = v_first_winner_id,
      winner_declared_at = now(),
      status = 'completed',
      updated_at = now()
  WHERE id = p_tournament_id;

  RETURN json_build_object(
    'success', true,
    'total_distributed', v_total_distributed,
    'organizer_earnings', v_organizer_earnings
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;