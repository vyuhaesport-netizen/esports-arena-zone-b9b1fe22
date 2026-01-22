
-- Drop existing tables if we need fresh start for school tournaments
-- Create school_tournament_applications table for admin approval flow
CREATE TABLE public.school_tournament_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- School Details
  school_name TEXT NOT NULL,
  school_city TEXT NOT NULL,
  school_state TEXT NOT NULL,
  school_district TEXT NOT NULL,
  school_image_url TEXT,
  
  -- Organizer Info
  primary_phone TEXT NOT NULL,
  alternate_phone TEXT,
  organizer_name TEXT NOT NULL,
  
  -- Tournament Config
  tournament_name TEXT NOT NULL,
  game TEXT NOT NULL CHECK (game IN ('BGMI', 'Free Fire')),
  max_players INTEGER NOT NULL CHECK (max_players >= 100 AND max_players <= 10000),
  
  -- Entry & Prize Config
  entry_type TEXT NOT NULL DEFAULT 'free' CHECK (entry_type IN ('free', 'paid')),
  entry_fee NUMERIC DEFAULT 0,
  prize_pool NUMERIC DEFAULT 0,
  
  -- Tournament Schedule
  tournament_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status & Review
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school_tournaments table (created after admin approval)
CREATE TABLE public.school_tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.school_tournament_applications(id),
  organizer_id UUID NOT NULL,
  
  -- School Details (copied from application)
  school_name TEXT NOT NULL,
  school_city TEXT NOT NULL,
  school_state TEXT NOT NULL,
  school_district TEXT NOT NULL,
  school_image_url TEXT,
  
  -- Tournament Details
  tournament_name TEXT NOT NULL,
  game TEXT NOT NULL CHECK (game IN ('BGMI', 'Free Fire')),
  max_players INTEGER NOT NULL,
  current_players INTEGER DEFAULT 0,
  
  -- Entry & Prize
  entry_type TEXT NOT NULL DEFAULT 'free',
  entry_fee NUMERIC DEFAULT 0,
  prize_pool NUMERIC DEFAULT 0,
  total_collected NUMERIC DEFAULT 0,
  
  -- Schedule
  tournament_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Room Config (auto-calculated)
  total_rooms INTEGER NOT NULL DEFAULT 1,
  players_per_room INTEGER NOT NULL DEFAULT 100,
  
  -- Tournament Status
  status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration', 'round_1', 'round_2', 'round_3', 'round_4', 'round_5', 'finale', 'completed', 'cancelled')),
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 1,
  
  -- Access Code
  private_code TEXT NOT NULL UNIQUE,
  qr_code_url TEXT,
  
  -- Prize Distribution (winners)
  first_place_prize NUMERIC DEFAULT 0,
  second_place_prize NUMERIC DEFAULT 0,
  third_place_prize NUMERIC DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school_tournament_teams table
CREATE TABLE public.school_tournament_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.school_tournaments(id) ON DELETE CASCADE,
  
  -- Team Details
  team_name TEXT NOT NULL,
  leader_id UUID NOT NULL,
  member_1_id UUID,
  member_2_id UUID,
  member_3_id UUID,
  
  -- Registration
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  registration_method TEXT NOT NULL DEFAULT 'qr' CHECK (registration_method IN ('qr', 'manual')),
  
  -- Tournament Progress
  current_round INTEGER DEFAULT 1,
  is_eliminated BOOLEAN DEFAULT false,
  eliminated_at_round INTEGER,
  
  -- Final Placement
  final_rank INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school_tournament_rooms table (for each round)
CREATE TABLE public.school_tournament_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.school_tournaments(id) ON DELETE CASCADE,
  
  -- Room Details
  round_number INTEGER NOT NULL,
  room_number INTEGER NOT NULL,
  room_name TEXT NOT NULL,
  
  -- Room Credentials
  room_id TEXT,
  room_password TEXT,
  
  -- Schedule
  scheduled_time TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'credentials_set', 'live', 'completed')),
  
  -- Winner (Top 1 team advances)
  winner_team_id UUID REFERENCES public.school_tournament_teams(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(tournament_id, round_number, room_number)
);

-- Create school_tournament_room_assignments table (which team is in which room)
CREATE TABLE public.school_tournament_room_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.school_tournament_rooms(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.school_tournament_teams(id) ON DELETE CASCADE,
  
  -- Slot within room (1-25 for BGMI, 1-12 for Free Fire)
  slot_number INTEGER NOT NULL,
  
  -- Result
  match_rank INTEGER,
  is_winner BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(room_id, team_id),
  UNIQUE(room_id, slot_number)
);

-- Create indexes for better performance
CREATE INDEX idx_school_tournaments_organizer ON public.school_tournaments(organizer_id);
CREATE INDEX idx_school_tournaments_status ON public.school_tournaments(status);
CREATE INDEX idx_school_tournaments_private_code ON public.school_tournaments(private_code);
CREATE INDEX idx_school_tournament_teams_tournament ON public.school_tournament_teams(tournament_id);
CREATE INDEX idx_school_tournament_teams_leader ON public.school_tournament_teams(leader_id);
CREATE INDEX idx_school_tournament_rooms_tournament ON public.school_tournament_rooms(tournament_id);
CREATE INDEX idx_school_tournament_rooms_round ON public.school_tournament_rooms(tournament_id, round_number);
CREATE INDEX idx_school_tournament_room_assignments_room ON public.school_tournament_room_assignments(room_id);
CREATE INDEX idx_school_tournament_room_assignments_team ON public.school_tournament_room_assignments(team_id);

-- Enable RLS on all tables
ALTER TABLE public.school_tournament_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_tournament_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_tournament_room_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_tournament_applications
CREATE POLICY "Users can create applications" ON public.school_tournament_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own applications" ON public.school_tournament_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own pending applications" ON public.school_tournament_applications
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all applications" ON public.school_tournament_applications
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can update applications" ON public.school_tournament_applications
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- RLS Policies for school_tournaments
CREATE POLICY "Anyone can view tournaments with code" ON public.school_tournaments
  FOR SELECT USING (true);

CREATE POLICY "Organizers can update own tournaments" ON public.school_tournaments
  FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "System can create tournaments" ON public.school_tournaments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all tournaments" ON public.school_tournaments
  FOR ALL USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- RLS Policies for school_tournament_teams
CREATE POLICY "Anyone can view teams" ON public.school_tournament_teams
  FOR SELECT USING (true);

CREATE POLICY "Users can create teams" ON public.school_tournament_teams
  FOR INSERT WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update own teams" ON public.school_tournament_teams
  FOR UPDATE USING (auth.uid() = leader_id);

CREATE POLICY "Organizers can manage tournament teams" ON public.school_tournament_teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM school_tournaments 
      WHERE school_tournaments.id = school_tournament_teams.tournament_id 
      AND school_tournaments.organizer_id = auth.uid()
    )
  );

-- RLS Policies for school_tournament_rooms
CREATE POLICY "Anyone can view rooms" ON public.school_tournament_rooms
  FOR SELECT USING (true);

CREATE POLICY "Organizers can manage rooms" ON public.school_tournament_rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM school_tournaments 
      WHERE school_tournaments.id = school_tournament_rooms.tournament_id 
      AND school_tournaments.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all rooms" ON public.school_tournament_rooms
  FOR ALL USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- RLS Policies for school_tournament_room_assignments
CREATE POLICY "Anyone can view assignments" ON public.school_tournament_room_assignments
  FOR SELECT USING (true);

CREATE POLICY "Organizers can manage assignments" ON public.school_tournament_room_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM school_tournament_rooms r
      JOIN school_tournaments t ON t.id = r.tournament_id
      WHERE r.id = school_tournament_room_assignments.room_id
      AND t.organizer_id = auth.uid()
    )
  );

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_tournament_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_tournament_rooms;

-- Function to calculate rooms and rounds
CREATE OR REPLACE FUNCTION calculate_tournament_structure(
  p_game TEXT,
  p_max_players INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_players_per_room INTEGER;
  v_teams_per_room INTEGER;
  v_total_teams INTEGER;
  v_current_teams INTEGER;
  v_rooms_needed INTEGER;
  v_total_rounds INTEGER;
  v_finale_teams INTEGER;
BEGIN
  -- Set game-specific values
  IF p_game = 'BGMI' THEN
    v_players_per_room := 100;
    v_teams_per_room := 25;
    v_finale_teams := 25;
  ELSE -- Free Fire
    v_players_per_room := 50;
    v_teams_per_room := 12;
    v_finale_teams := 12;
  END IF;
  
  -- Calculate total teams (squad mode = 4 players per team)
  v_total_teams := CEIL(p_max_players::NUMERIC / 4);
  v_current_teams := v_total_teams;
  v_total_rounds := 0;
  
  -- Calculate rounds needed
  WHILE v_current_teams > v_finale_teams LOOP
    v_rooms_needed := CEIL(v_current_teams::NUMERIC / v_teams_per_room);
    v_current_teams := v_rooms_needed; -- Top 1 from each room
    v_total_rounds := v_total_rounds + 1;
  END LOOP;
  
  -- Add 1 for finale round
  v_total_rounds := v_total_rounds + 1;
  
  RETURN jsonb_build_object(
    'players_per_room', v_players_per_room,
    'teams_per_room', v_teams_per_room,
    'total_teams', v_total_teams,
    'initial_rooms', CEIL(v_total_teams::NUMERIC / v_teams_per_room),
    'total_rounds', v_total_rounds,
    'finale_max_teams', v_finale_teams
  );
END;
$$;

-- Function to create tournament from approved application
CREATE OR REPLACE FUNCTION create_school_tournament_from_application(
  p_application_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_tournament_id UUID;
  v_private_code TEXT;
  v_structure JSONB;
BEGIN
  -- Get application
  SELECT * INTO v_app FROM school_tournament_applications WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  IF v_app.status != 'approved' THEN
    RAISE EXCEPTION 'Application must be approved first';
  END IF;
  
  -- Generate unique private code
  v_private_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  
  -- Calculate tournament structure
  v_structure := calculate_tournament_structure(v_app.game, v_app.max_players);
  
  -- Create tournament
  INSERT INTO school_tournaments (
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
    private_code
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
    v_private_code
  ) RETURNING id INTO v_tournament_id;
  
  RETURN v_tournament_id;
END;
$$;

-- Function to register team
CREATE OR REPLACE FUNCTION register_school_tournament_team(
  p_tournament_id UUID,
  p_team_name TEXT,
  p_leader_id UUID,
  p_member_1_id UUID DEFAULT NULL,
  p_member_2_id UUID DEFAULT NULL,
  p_member_3_id UUID DEFAULT NULL,
  p_registration_method TEXT DEFAULT 'qr'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_team_id UUID;
  v_entry_fee NUMERIC;
  v_wallet_balance NUMERIC;
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
    UPDATE school_tournaments SET total_collected = total_collected + v_entry_fee WHERE id = p_tournament_id;
  END IF;
  
  -- Create team
  INSERT INTO school_tournament_teams (
    tournament_id,
    team_name,
    leader_id,
    member_1_id,
    member_2_id,
    member_3_id,
    registration_method
  ) VALUES (
    p_tournament_id,
    p_team_name,
    p_leader_id,
    p_member_1_id,
    p_member_2_id,
    p_member_3_id,
    p_registration_method
  ) RETURNING id INTO v_team_id;
  
  -- Update player count (4 players per team)
  UPDATE school_tournaments 
  SET current_players = current_players + 4,
      updated_at = NOW()
  WHERE id = p_tournament_id;
  
  RETURN v_team_id;
END;
$$;

-- Function to generate rooms for a round
CREATE OR REPLACE FUNCTION generate_tournament_round_rooms(
  p_tournament_id UUID,
  p_round_number INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
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
  
  -- Create rooms
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
    );
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
$$;

-- Function to declare room winner and advance team
CREATE OR REPLACE FUNCTION declare_room_winner(
  p_room_id UUID,
  p_winner_team_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room RECORD;
  v_tournament RECORD;
  v_finale_teams INTEGER;
  v_remaining_teams INTEGER;
BEGIN
  -- Get room and tournament
  SELECT r.*, t.game, t.id as tournament_id, t.total_rounds, t.current_round
  INTO v_room
  FROM school_tournament_rooms r
  JOIN school_tournaments t ON t.id = r.tournament_id
  WHERE r.id = p_room_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  
  -- Set finale teams based on game
  IF v_room.game = 'BGMI' THEN
    v_finale_teams := 25;
  ELSE
    v_finale_teams := 12;
  END IF;
  
  -- Mark winner in room
  UPDATE school_tournament_rooms 
  SET winner_team_id = p_winner_team_id, status = 'completed'
  WHERE id = p_room_id;
  
  -- Mark winner in assignments
  UPDATE school_tournament_room_assignments 
  SET is_winner = true, match_rank = 1
  WHERE room_id = p_room_id AND team_id = p_winner_team_id;
  
  -- Advance winner to next round
  UPDATE school_tournament_teams 
  SET current_round = current_round + 1
  WHERE id = p_winner_team_id;
  
  -- Eliminate all other teams in this room
  UPDATE school_tournament_teams 
  SET is_eliminated = true, eliminated_at_round = v_room.round_number
  WHERE id IN (
    SELECT team_id FROM school_tournament_room_assignments 
    WHERE room_id = p_room_id AND team_id != p_winner_team_id
  );
  
  -- Check if all rooms in this round are completed
  IF NOT EXISTS (
    SELECT 1 FROM school_tournament_rooms 
    WHERE tournament_id = v_room.tournament_id 
    AND round_number = v_room.round_number 
    AND status != 'completed'
  ) THEN
    -- Count remaining teams
    SELECT COUNT(*) INTO v_remaining_teams 
    FROM school_tournament_teams 
    WHERE tournament_id = v_room.tournament_id 
    AND is_eliminated = false;
    
    -- Check if ready for finale
    IF v_remaining_teams <= v_finale_teams THEN
      UPDATE school_tournaments SET status = 'finale', current_round = v_room.round_number + 1 WHERE id = v_room.tournament_id;
    ELSE
      -- Move to next round
      UPDATE school_tournaments SET current_round = v_room.round_number + 1 WHERE id = v_room.tournament_id;
      UPDATE school_tournaments SET status = 'round_' || (v_room.round_number + 1) WHERE id = v_room.tournament_id;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;
