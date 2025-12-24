-- Drop and recreate declare_local_winner with security validation
DROP FUNCTION IF EXISTS public.declare_local_winner(uuid, uuid, jsonb);

-- Recreate declare_local_winner with prize pool validation
CREATE OR REPLACE FUNCTION public.declare_local_winner(
  p_tournament_id uuid,
  p_organizer_id uuid,
  p_winner_positions jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_winner_id uuid;
  v_position integer;
  v_prize_amount numeric;
  v_total_distributed numeric := 0;
  v_key text;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament
  FROM local_tournaments
  WHERE id = p_tournament_id AND organizer_id = p_organizer_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found or you are not the organizer');
  END IF;
  
  IF v_tournament.status <> 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Tournament must be completed first');
  END IF;
  
  IF v_tournament.winner_user_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Winners already declared');
  END IF;
  
  -- Calculate total prize amount from distribution for positions that have winners
  FOR v_key IN SELECT jsonb_object_keys(p_winner_positions)
  LOOP
    v_winner_id := v_key::uuid;
    v_position := (p_winner_positions->>v_key)::integer;
    v_prize_amount := COALESCE((v_tournament.prize_distribution->>v_position::text)::numeric, 0);
    v_total_distributed := v_total_distributed + v_prize_amount;
  END LOOP;
  
  -- SECURITY: Ensure total distribution does not exceed prize pool
  IF v_total_distributed > v_tournament.current_prize_pool THEN
    RETURN json_build_object(
      'success', false, 
      'error', format('Total prize distribution (₹%s) exceeds prize pool (₹%s). Please adjust prize amounts.', v_total_distributed, v_tournament.current_prize_pool)
    );
  END IF;
  
  -- Distribute prizes to winners
  FOR v_key IN SELECT jsonb_object_keys(p_winner_positions)
  LOOP
    v_winner_id := v_key::uuid;
    v_position := (p_winner_positions->>v_key)::integer;
    v_prize_amount := COALESCE((v_tournament.prize_distribution->>v_position::text)::numeric, 0);
    
    IF v_prize_amount > 0 THEN
      -- Credit winner's wallet directly
      UPDATE profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + v_prize_amount,
          updated_at = now()
      WHERE user_id = v_winner_id;
      
      -- Create wallet transaction record
      INSERT INTO wallet_transactions (user_id, type, amount, status, description)
      VALUES (v_winner_id, 'prize_won', v_prize_amount, 'completed', 
              format('Prize for position #%s in %s', v_position, v_tournament.tournament_name));
      
      -- Create notification
      INSERT INTO notifications (user_id, title, message, type, related_id)
      VALUES (v_winner_id, 'Prize Won!', 
              format('Congratulations! You won ₹%s for #%s position in %s', v_prize_amount, v_position, v_tournament.tournament_name),
              'prize_won', p_tournament_id);
    END IF;
  END LOOP;
  
  -- Get first place winner (position 1)
  SELECT (key)::uuid INTO v_winner_id
  FROM jsonb_each_text(p_winner_positions)
  WHERE value = '1'
  LIMIT 1;
  
  -- Credit organizer's earnings to their wallet
  IF v_tournament.organizer_earnings > 0 THEN
    UPDATE profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_tournament.organizer_earnings,
        updated_at = now()
    WHERE user_id = p_organizer_id;
    
    -- Create wallet transaction for organizer
    INSERT INTO wallet_transactions (user_id, type, amount, status, description)
    VALUES (p_organizer_id, 'organizer_commission', v_tournament.organizer_earnings, 'completed',
            format('Organizer commission for %s', v_tournament.tournament_name));
    
    -- Create notification for organizer
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (p_organizer_id, 'Commission Credited!', 
            format('₹%s commission credited for %s', v_tournament.organizer_earnings, v_tournament.tournament_name),
            'commission_earned', p_tournament_id);
  END IF;
  
  -- Update tournament with winner
  UPDATE local_tournaments
  SET 
    winner_user_id = v_winner_id,
    winner_declared_at = now(),
    updated_at = now()
  WHERE id = p_tournament_id;
  
  RETURN json_build_object(
    'success', true,
    'total_distributed', v_total_distributed,
    'organizer_earnings', v_tournament.organizer_earnings,
    'prize_pool', v_tournament.current_prize_pool
  );
END;
$function$;