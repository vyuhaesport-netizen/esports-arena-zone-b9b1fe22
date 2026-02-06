-- Create local tournament rooms table (similar to school_tournament_rooms)
CREATE TABLE public.local_tournament_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.local_tournaments(id) ON DELETE CASCADE,
  room_number INTEGER NOT NULL,
  room_name TEXT NOT NULL,
  room_id TEXT, -- actual game room ID
  room_password TEXT, -- game room password
  scheduled_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, live, completed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, room_number)
);

-- Create local tournament room assignments (assign users to specific rooms)
CREATE TABLE public.local_tournament_room_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.local_tournament_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  slot_number INTEGER NOT NULL,
  match_rank INTEGER, -- rank achieved in the match
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id),
  UNIQUE(room_id, slot_number)
);

-- Enable RLS
ALTER TABLE public.local_tournament_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_tournament_room_assignments ENABLE ROW LEVEL SECURITY;

-- RLS for rooms - anyone can view, organizers can manage
CREATE POLICY "Anyone can view local tournament rooms"
ON public.local_tournament_rooms FOR SELECT
USING (true);

CREATE POLICY "Organizers can manage rooms"
ON public.local_tournament_rooms FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.local_tournaments
    WHERE local_tournaments.id = local_tournament_rooms.tournament_id
    AND local_tournaments.organizer_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all local rooms"
ON public.local_tournament_rooms FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- RLS for room assignments
CREATE POLICY "Anyone can view room assignments"
ON public.local_tournament_room_assignments FOR SELECT
USING (true);

CREATE POLICY "Organizers can manage room assignments"
ON public.local_tournament_room_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.local_tournament_rooms r
    JOIN public.local_tournaments t ON t.id = r.tournament_id
    WHERE r.id = local_tournament_room_assignments.room_id
    AND t.organizer_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all room assignments"
ON public.local_tournament_room_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.local_tournament_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.local_tournament_room_assignments;

-- Add index for faster lookups
CREATE INDEX idx_local_room_assignments_user ON public.local_tournament_room_assignments(user_id);
CREATE INDEX idx_local_room_assignments_room ON public.local_tournament_room_assignments(room_id);
CREATE INDEX idx_local_rooms_tournament ON public.local_tournament_rooms(tournament_id);