
-- Drop and recreate the registration function with sequential room filling
CREATE OR REPLACE FUNCTION register_school_tournament_team(
  p_tournament_id UUID,
  p_team_name TEXT,
  p_leader_id UUID,
  p_member_1_id UUID DEFAULT NULL,
  p_member_2_id UUID DEFAULT NULL,
  p_member_3_id UUID DEFAULT NULL,
  p_registration_method TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament RECORD;
  v_team_id UUID;
  v_entry_fee NUMERIC;
  v_wallet_balance NUMERIC;
  v_teams_per_room INT;
  v_current_room RECORD;
  v_room_team_count INT;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament FROM school_tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  IF v_tournament.status != 'registration' THEN
    RAISE EXCEPTION 'Registration is closed';
  END IF;
  
  IF v_tournament.current_players >= v_tournament.max_players THEN
    RAISE EXCEPTION 'Tournament is full';
  END IF;
  
  IF NOW() > v_tournament.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;
  
  -- Check if already registered
  IF EXISTS (
    SELECT 1 FROM school_tournament_teams 
    WHERE tournament_id = p_tournament_id 
    AND (leader_id = p_leader_id OR member_1_id = p_leader_id OR member_2_id = p_leader_id OR member_3_id = p_leader_id)
  ) THEN
    RAISE EXCEPTION 'You are already registered in this tournament';
  END IF;
  
  -- Determine teams per room based on game (BGMI = 25 teams, Free Fire = 12 teams)
  IF v_tournament.game = 'BGMI' THEN
    v_teams_per_room := 25;
  ELSE
    v_teams_per_room := 12;
  END IF;
  
  -- Handle paid tournament
  IF v_tournament.entry_type = 'paid' THEN
    v_entry_fee := v_tournament.entry_fee;
    
    -- Check wallet balance
    SELECT wallet_balance INTO v_wallet_balance FROM profiles WHERE user_id = p_leader_id;
    
    IF v_wallet_balance < v_entry_fee THEN
      RAISE EXCEPTION 'Insufficient wallet balance. Need ₹%', v_entry_fee;
    END IF;
    
    -- Deduct from wallet
    UPDATE profiles SET wallet_balance = wallet_balance - v_entry_fee WHERE user_id = p_leader_id;
    
    -- Update tournament collected amount
    UPDATE school_tournaments SET total_collected = COALESCE(total_collected, 0) + v_entry_fee WHERE id = p_tournament_id;
  END IF;
  
  -- Create team
  INSERT INTO school_tournament_teams (
    tournament_id,
    team_name,
    leader_id,
    member_1_id,
    member_2_id,
    member_3_id,
    registration_method,
    current_round
  ) VALUES (
    p_tournament_id,
    p_team_name,
    p_leader_id,
    p_member_1_id,
    p_member_2_id,
    p_member_3_id,
    p_registration_method,
    1
  ) RETURNING id INTO v_team_id;
  
  -- SEQUENTIAL ROOM FILLING: Find the first room with space
  -- Loop through rooms in order and find one with < teams_per_room teams
  FOR v_current_room IN 
    SELECT r.id, r.room_number,
           (SELECT COUNT(*) FROM school_tournament_room_assignments WHERE room_id = r.id) as team_count
    FROM school_tournament_rooms r
    WHERE r.tournament_id = p_tournament_id AND r.round_number = 1
    ORDER BY r.room_number ASC
  LOOP
    IF v_current_room.team_count < v_teams_per_room THEN
      -- Assign team to this room
      INSERT INTO school_tournament_room_assignments (
        room_id, team_id, slot_number
      ) VALUES (
        v_current_room.id, v_team_id, v_current_room.team_count + 1
      );
      EXIT; -- Found room, exit loop
    END IF;
  END LOOP;
  
  -- Update player count (4 players per team)
  UPDATE school_tournaments 
  SET current_players = current_players + 4,
      updated_at = NOW()
  WHERE id = p_tournament_id;
  
  RETURN v_team_id;
END;
$$;
