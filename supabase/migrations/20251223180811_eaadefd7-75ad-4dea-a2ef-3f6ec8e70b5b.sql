-- Function to update prize distribution for a local tournament
CREATE OR REPLACE FUNCTION public.update_local_tournament_prize_distribution(
  p_tournament_id uuid,
  p_organizer_id uuid,
  p_prize_distribution jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament
  FROM local_tournaments
  WHERE id = p_tournament_id AND organizer_id = p_organizer_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found or you are not the organizer');
  END IF;
  
  -- Can only update before winner declaration
  IF v_tournament.winner_user_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cannot update prize distribution after winners are declared');
  END IF;
  
  -- Update prize distribution
  UPDATE local_tournaments
  SET 
    prize_distribution = p_prize_distribution,
    updated_at = now()
  WHERE id = p_tournament_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Prize distribution updated successfully'
  );
END;
$$;