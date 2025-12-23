-- Create a function to cancel tournament and refund all players
CREATE OR REPLACE FUNCTION public.process_tournament_cancellation(
  p_tournament_id UUID,
  p_organizer_id UUID,
  p_cancellation_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_user_id UUID;
  v_entry_fee NUMERIC;
  v_refunded_count INTEGER := 0;
  v_total_refunded NUMERIC := 0;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Check if organizer owns this tournament
  IF v_tournament.created_by != p_organizer_id THEN
    RETURN json_build_object('success', false, 'error', 'You do not own this tournament');
  END IF;

  -- Check if tournament can be cancelled (only upcoming or ongoing)
  IF v_tournament.status NOT IN ('upcoming', 'ongoing') THEN
    RETURN json_build_object('success', false, 'error', 'Only upcoming or ongoing tournaments can be cancelled');
  END IF;

  -- Get entry fee
  v_entry_fee := COALESCE(v_tournament.entry_fee, 0);

  -- Refund all joined players
  IF v_tournament.joined_users IS NOT NULL AND array_length(v_tournament.joined_users, 1) > 0 THEN
    FOREACH v_user_id IN ARRAY v_tournament.joined_users
    LOOP
      -- Only refund if entry fee was paid
      IF v_entry_fee > 0 THEN
        -- Add refund to player's wallet
        UPDATE profiles
        SET wallet_balance = COALESCE(wallet_balance, 0) + v_entry_fee
        WHERE user_id = v_user_id;

        -- Record the refund transaction
        INSERT INTO wallet_transactions (
          user_id,
          type,
          amount,
          status,
          description
        ) VALUES (
          v_user_id,
          'refund',
          v_entry_fee,
          'completed',
          'Tournament cancelled: ' || v_tournament.title || '. Reason: ' || COALESCE(p_cancellation_reason, 'No reason provided')
        );

        v_total_refunded := v_total_refunded + v_entry_fee;
      END IF;

      -- Send notification to player
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        related_id
      ) VALUES (
        v_user_id,
        'tournament_cancelled',
        'Tournament Cancelled',
        'Tournament "' || v_tournament.title || '" has been cancelled. ' || 
        CASE WHEN v_entry_fee > 0 THEN 'Your entry fee of ₹' || v_entry_fee || ' has been refunded to your wallet. ' ELSE '' END ||
        'Reason: ' || COALESCE(p_cancellation_reason, 'No reason provided'),
        p_tournament_id
      );

      v_refunded_count := v_refunded_count + 1;
    END LOOP;
  END IF;

  -- Delete tournament registrations
  DELETE FROM tournament_registrations
  WHERE tournament_id = p_tournament_id;

  -- Update tournament status to cancelled
  UPDATE tournaments
  SET 
    status = 'cancelled',
    description = COALESCE(description, '') || E'\n\n[CANCELLED] Reason: ' || COALESCE(p_cancellation_reason, 'No reason provided'),
    joined_users = '{}',
    current_prize_pool = 0,
    organizer_earnings = 0,
    platform_earnings = 0,
    total_fees_collected = 0,
    updated_at = NOW()
  WHERE id = p_tournament_id;

  RETURN json_build_object(
    'success', true,
    'refunded_players', v_refunded_count,
    'total_refunded', v_total_refunded,
    'message', 'Tournament cancelled successfully. ' || v_refunded_count || ' players refunded.'
  );
END;
$$;