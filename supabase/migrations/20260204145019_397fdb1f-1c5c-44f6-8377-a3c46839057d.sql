-- Create team_requirements table for recruitment posts
CREATE TABLE public.team_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.player_teams(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  role_needed TEXT NOT NULL,
  game TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_requirements
-- Anyone can read active requirements
CREATE POLICY "Anyone can view active requirements"
ON public.team_requirements
FOR SELECT
USING (is_active = true);

-- Only team leader or acting leader can insert requirements
CREATE POLICY "Team leaders can create requirements"
ON public.team_requirements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.player_teams pt
    WHERE pt.id = team_id
    AND (pt.leader_id = auth.uid() OR pt.acting_leader_id = auth.uid())
  )
);

-- Only team leader or acting leader can update requirements
CREATE POLICY "Team leaders can update requirements"
ON public.team_requirements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.player_teams pt
    WHERE pt.id = team_id
    AND (pt.leader_id = auth.uid() OR pt.acting_leader_id = auth.uid())
  )
);

-- Only team leader or acting leader can delete requirements
CREATE POLICY "Team leaders can delete requirements"
ON public.team_requirements
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.player_teams pt
    WHERE pt.id = team_id
    AND (pt.leader_id = auth.uid() OR pt.acting_leader_id = auth.uid())
  )
);

-- Create index for faster lookups
CREATE INDEX idx_team_requirements_team_id ON public.team_requirements(team_id);
CREATE INDEX idx_team_requirements_game ON public.team_requirements(game);
CREATE INDEX idx_team_requirements_active ON public.team_requirements(is_active) WHERE is_active = true;

-- Update trigger for updated_at
CREATE TRIGGER update_team_requirements_updated_at
BEFORE UPDATE ON public.team_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add check constraint for max_members to allow 4, 6, or 8
-- First remove any existing constraint if present
ALTER TABLE public.player_teams DROP CONSTRAINT IF EXISTS player_teams_max_members_check;
-- Add new constraint
ALTER TABLE public.player_teams ADD CONSTRAINT player_teams_max_members_check CHECK (max_members IN (4, 6, 8));

-- Update default max_members to 4
ALTER TABLE public.player_teams ALTER COLUMN max_members SET DEFAULT 4;