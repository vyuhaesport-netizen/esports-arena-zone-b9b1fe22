-- Function to cancel local tournament and refund all joined players
CREATE OR REPLACE FUNCTION public.cancel_local_tournament(
  p_tournament_id uuid,
  p_organizer_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_user_id uuid;
  v_entry_fee numeric;
  v_refunded_count integer := 0;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament
  FROM local_tournaments
  WHERE id = p_tournament_id AND organizer_id = p_organizer_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found or you are not the organizer');
  END IF;
  
  -- Can only cancel upcoming tournaments
  IF v_tournament.status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'Can only cancel upcoming tournaments');
  END IF;
  
  v_entry_fee := v_tournament.entry_fee;
  
  -- Refund all joined users
  IF v_tournament.joined_users IS NOT NULL AND array_length(v_tournament.joined_users, 1) > 0 THEN
    FOREACH v_user_id IN ARRAY v_tournament.joined_users
    LOOP
      -- Add refund to wallet
      UPDATE profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + v_entry_fee
      WHERE user_id = v_user_id;
      
      -- Record transaction
      INSERT INTO wallet_transactions (
        user_id, 
        amount, 
        type, 
        description, 
        status
      ) VALUES (
        v_user_id,
        v_entry_fee,
        'tournament_refund',
        'Refund for cancelled local tournament: ' || v_tournament.tournament_name,
        'completed'
      );
      
      -- Send notification
      INSERT INTO notifications (user_id, title, message, type, related_id)
      VALUES (
        v_user_id,
        'Tournament Cancelled',
        'The tournament "' || v_tournament.tournament_name || '" has been cancelled. ₹' || v_entry_fee || ' has been refunded to your wallet.',
        'tournament_cancelled',
        p_tournament_id
      );
      
      v_refunded_count := v_refunded_count + 1;
    END LOOP;
  END IF;
  
  -- Update tournament status
  UPDATE local_tournaments
  SET 
    status = 'cancelled',
    joined_users = '{}',
    current_prize_pool = 0,
    total_fees_collected = 0,
    organizer_earnings = 0,
    updated_at = now()
  WHERE id = p_tournament_id;
  
  RETURN json_build_object(
    'success', true,
    'refunded_count', v_refunded_count,
    'refund_amount_per_user', v_entry_fee
  );
END;
$$;