-- Local tournament exit + refund (for joined users)

CREATE OR REPLACE FUNCTION public.process_local_tournament_exit(p_tournament_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tournament public.local_tournaments%ROWTYPE;
  v_refund numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT *
  INTO v_tournament
  FROM public.local_tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_tournament.status <> 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'You can only exit upcoming tournaments');
  END IF;

  IF v_tournament.tournament_date <= now() THEN
    RETURN json_build_object('success', false, 'error', 'Tournament has already started');
  END IF;

  IF NOT (COALESCE(v_tournament.joined_users, '{}'::uuid[]) @> ARRAY[v_uid]) THEN
    RETURN json_build_object('success', false, 'error', 'You are not joined in this tournament');
  END IF;

  v_refund := COALESCE(v_tournament.entry_fee, 0);

  -- Remove user from tournament
  UPDATE public.local_tournaments
  SET
    joined_users = array_remove(COALESCE(joined_users, '{}'::uuid[]), v_uid),
    total_fees_collected = GREATEST(COALESCE(total_fees_collected, 0) - v_refund, 0),
    updated_at = now()
  WHERE id = p_tournament_id;

  -- Recalculate prize pool after exit
  PERFORM public.recalculate_local_tournament_prizepool(p_tournament_id);

  -- Refund to INR wallet
  UPDATE public.profiles
  SET
    wallet_balance = COALESCE(wallet_balance, 0) + v_refund,
    updated_at = now()
  WHERE user_id = v_uid;

  -- Record transaction for history
  INSERT INTO public.wallet_transactions (user_id, type, amount, status, description)
  VALUES (v_uid, 'refund', v_refund, 'completed', 'Local tournament exit refund');

  RETURN json_build_object('success', true, 'refunded_amount', v_refund);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.process_local_tournament_exit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_local_tournament_exit(uuid) TO authenticated;
