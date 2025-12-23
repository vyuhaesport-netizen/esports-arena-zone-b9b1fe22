-- Add platform_earnings column to local_tournaments
ALTER TABLE public.local_tournaments 
ADD COLUMN IF NOT EXISTS platform_earnings NUMERIC DEFAULT 0;

-- Update the recalculate function to properly split: 80% prize, 10% organizer, 10% platform
CREATE OR REPLACE FUNCTION public.recalculate_local_tournament_prizepool(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_organizer_commission_percent NUMERIC := 10;
  v_platform_commission_percent NUMERIC := 10;
  v_new_prize_pool NUMERIC;
  v_new_organizer_earnings NUMERIC;
  v_new_platform_earnings NUMERIC;
BEGIN
  SELECT * INTO v_tournament FROM local_tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  -- Get organizer commission from settings (default 10%)
  SELECT COALESCE(setting_value::NUMERIC, 10) INTO v_organizer_commission_percent
  FROM platform_settings WHERE setting_key = 'local_tournament_organizer_commission';
  
  -- Get platform commission from settings (default 10%)
  SELECT COALESCE(setting_value::NUMERIC, 10) INTO v_platform_commission_percent
  FROM platform_settings WHERE setting_key = 'local_tournament_platform_commission';
  
  -- Calculate splits: Organizer gets 10%, Platform gets 10%, Prize pool gets 80%
  v_new_organizer_earnings := v_tournament.total_fees_collected * (v_organizer_commission_percent / 100);
  v_new_platform_earnings := v_tournament.total_fees_collected * (v_platform_commission_percent / 100);
  v_new_prize_pool := v_tournament.total_fees_collected - v_new_organizer_earnings - v_new_platform_earnings;
  
  UPDATE local_tournaments SET
    current_prize_pool = v_new_prize_pool,
    organizer_earnings = v_new_organizer_earnings,
    platform_earnings = v_new_platform_earnings
  WHERE id = p_tournament_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'prize_pool', v_new_prize_pool,
    'organizer_earnings', v_new_organizer_earnings,
    'platform_earnings', v_new_platform_earnings,
    'total_fees', v_tournament.total_fees_collected
  );
END;
$$;

-- Insert platform commission setting if not exists
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES ('local_tournament_platform_commission', '10', 'Platform commission percentage for local tournaments')
ON CONFLICT (setting_key) DO NOTHING;

-- Update declare_local_winner to credit organizer commission to wallet (not dhana)
CREATE OR REPLACE FUNCTION public.declare_local_winner(
  p_tournament_id uuid,
  p_organizer_id uuid,
  p_winner_positions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_winner_id text;
  v_position integer;
  v_prize_amount numeric;
  v_total_distributed numeric := 0;
  v_organizer_earnings numeric := 0;
BEGIN
  -- Validate tournament
  SELECT * INTO v_tournament FROM local_tournaments 
  WHERE id = p_tournament_id AND organizer_id = p_organizer_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found or unauthorized');
  END IF;
  
  IF v_tournament.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament must be completed first');
  END IF;
  
  IF v_tournament.winner_declared_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Winners already declared');
  END IF;
  
  -- Process each winner
  FOR v_winner_id, v_position IN SELECT * FROM jsonb_each_text(p_winner_positions)
  LOOP
    -- Get prize amount for this position
    v_prize_amount := COALESCE((v_tournament.prize_distribution->>v_position::text)::numeric, 0);
    
    IF v_prize_amount > 0 THEN
      -- Credit winner's wallet
      UPDATE profiles SET wallet_balance = COALESCE(wallet_balance, 0) + v_prize_amount
      WHERE user_id = v_winner_id::uuid;
      
      -- Record transaction
      INSERT INTO wallet_transactions (user_id, amount, type, status, description)
      VALUES (v_winner_id::uuid, v_prize_amount, 'prize', 'approved', 
              'Prize for position #' || v_position || ' in ' || v_tournament.tournament_name);
      
      -- Create notification
      PERFORM create_notification(
        v_winner_id::uuid,
        'prize',
        '🏆 You won!',
        'Congratulations! You won ₹' || v_prize_amount || ' for position #' || v_position || ' in ' || v_tournament.tournament_name,
        p_tournament_id
      );
      
      v_total_distributed := v_total_distributed + v_prize_amount;
    END IF;
  END LOOP;
  
  -- Get organizer earnings
  v_organizer_earnings := COALESCE(v_tournament.organizer_earnings, 0);
  
  -- Credit organizer's WALLET (not dhana)
  IF v_organizer_earnings > 0 THEN
    UPDATE profiles SET wallet_balance = COALESCE(wallet_balance, 0) + v_organizer_earnings
    WHERE user_id = p_organizer_id;
    
    -- Record wallet transaction for organizer
    INSERT INTO wallet_transactions (user_id, amount, type, status, description)
    VALUES (p_organizer_id, v_organizer_earnings, 'commission', 'approved', 
            'Organizer commission for ' || v_tournament.tournament_name);
    
    -- Notify organizer
    PERFORM create_notification(
      p_organizer_id,
      'wallet',
      '💰 Commission Credited!',
      'Your organizer commission of ₹' || v_organizer_earnings || ' has been added to your wallet.',
      p_tournament_id
    );
  END IF;
  
  -- Mark winners declared
  UPDATE local_tournaments SET
    winner_declared_at = NOW()
  WHERE id = p_tournament_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_distributed', v_total_distributed,
    'organizer_earnings', v_organizer_earnings
  );
END;
$$;