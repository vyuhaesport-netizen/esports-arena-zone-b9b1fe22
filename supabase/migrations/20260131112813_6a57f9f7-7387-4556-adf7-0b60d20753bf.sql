-- Fix: carry verification_type + full_address from application to created tournament
CREATE OR REPLACE FUNCTION public.create_school_tournament_from_application(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_app RECORD;
  v_tournament_id UUID;
  v_private_code TEXT;
  v_structure JSONB;
  v_verification_type TEXT;
  v_full_address TEXT;
BEGIN
  -- Get application
  SELECT * INTO v_app
  FROM public.school_tournament_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.status != 'approved' THEN
    RAISE EXCEPTION 'Application must be approved first';
  END IF;

  v_verification_type := COALESCE(v_app.verification_type, 'online');
  v_full_address := CASE WHEN v_verification_type = 'spot' THEN v_app.full_address ELSE NULL END;

  -- Generate unique private code
  v_private_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

  -- Calculate tournament structure
  v_structure := public.calculate_tournament_structure(v_app.game, v_app.max_players);

  -- Create tournament
  INSERT INTO public.school_tournaments (
    application_id,
    organizer_id,
    school_name,
    school_city,
    school_state,
    school_district,
    school_image_url,
    tournament_name,
    game,
    max_players,
    entry_type,
    entry_fee,
    prize_pool,
    tournament_date,
    registration_deadline,
    total_rooms,
    players_per_room,
    total_rounds,
    private_code,
    verification_type,
    full_address
  ) VALUES (
    p_application_id,
    v_app.user_id,
    v_app.school_name,
    v_app.school_city,
    v_app.school_state,
    v_app.school_district,
    v_app.school_image_url,
    v_app.tournament_name,
    v_app.game,
    v_app.max_players,
    v_app.entry_type,
    v_app.entry_fee,
    v_app.prize_pool,
    v_app.tournament_date,
    v_app.registration_deadline,
    (v_structure->>'initial_rooms')::INTEGER,
    (v_structure->>'players_per_room')::INTEGER,
    (v_structure->>'total_rounds')::INTEGER,
    v_private_code,
    v_verification_type,
    v_full_address
  ) RETURNING id INTO v_tournament_id;

  RETURN v_tournament_id;
END;
$$;