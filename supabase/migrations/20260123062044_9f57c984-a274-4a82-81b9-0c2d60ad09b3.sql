CREATE OR REPLACE FUNCTION public.generate_tournament_round_rooms(p_tournament_id uuid, p_round_number integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_teams_per_room INTEGER;
  v_active_teams INTEGER;
  v_rooms_needed INTEGER;
  v_room_number INTEGER;
  v_team RECORD;
  v_room_id UUID;
  v_slot_number INTEGER;
  v_current_room INTEGER;
  v_existing_rooms INTEGER;
BEGIN
  -- If rooms already exist for this round, treat as already-started (idempotent)
  SELECT COUNT(*) INTO v_existing_rooms
  FROM school_tournament_rooms
  WHERE tournament_id = p_tournament_id
    AND round_number = p_round_number;

  IF v_existing_rooms > 0 THEN
    RETURN v_existing_rooms;
  END IF;

  -- Get tournament
  SELECT * INTO v_tournament FROM school_tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  -- Set teams per room based on game
  IF v_tournament.game = 'BGMI' THEN
    v_teams_per_room := 25;
  ELSE
    v_teams_per_room := 12;
  END IF;
  
  -- Count active teams for this round
  SELECT COUNT(*) INTO v_active_teams 
  FROM school_tournament_teams 
  WHERE tournament_id = p_tournament_id 
    AND is_eliminated = false
    AND current_round = p_round_number;
  
  IF v_active_teams = 0 THEN
    RAISE EXCEPTION 'No active teams for round %', p_round_number;
  END IF;
  
  -- Calculate rooms needed
  v_rooms_needed := CEIL(v_active_teams::NUMERIC / v_teams_per_room);
  
  -- Create rooms (ignore duplicates if concurrent call)
  FOR v_room_number IN 1..v_rooms_needed LOOP
    INSERT INTO school_tournament_rooms (
      tournament_id,
      round_number,
      room_number,
      room_name
    ) VALUES (
      p_tournament_id,
      p_round_number,
      v_room_number,
      'Round ' || p_round_number || ' - Room ' || v_room_number
    )
    ON CONFLICT (tournament_id, round_number, room_number) DO NOTHING;
  END LOOP;
  
  -- Assign teams to rooms (random shuffle)
  v_current_room := 1;
  v_slot_number := 1;
  
  FOR v_team IN (
    SELECT id FROM school_tournament_teams 
    WHERE tournament_id = p_tournament_id 
      AND is_eliminated = false
      AND current_round = p_round_number
    ORDER BY RANDOM()
  ) LOOP
    -- Get current room id
    SELECT id INTO v_room_id 
    FROM school_tournament_rooms 
    WHERE tournament_id = p_tournament_id 
      AND round_number = p_round_number 
      AND room_number = v_current_room;
    
    -- Assign team to room
    INSERT INTO school_tournament_room_assignments (
      room_id,
      team_id,
      slot_number
    ) VALUES (
      v_room_id,
      v_team.id,
      v_slot_number
    );
    
    v_slot_number := v_slot_number + 1;
    
    -- Move to next room if current is full
    IF v_slot_number > v_teams_per_room THEN
      v_current_room := v_current_room + 1;
      v_slot_number := 1;
    END IF;
  END LOOP;
  
  RETURN v_rooms_needed;
END;
$function$;