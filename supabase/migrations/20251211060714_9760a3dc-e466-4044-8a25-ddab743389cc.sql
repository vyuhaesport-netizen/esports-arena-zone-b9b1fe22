-- Create teams table for player squads
CREATE TABLE public.player_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  slogan TEXT,
  leader_id UUID NOT NULL,
  is_open_for_players BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 4,
  game TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create player team members table
CREATE TABLE public.player_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.player_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.player_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_team_members ENABLE ROW LEVEL SECURITY;

-- Player teams policies
CREATE POLICY "Anyone can view player teams"
ON public.player_teams FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create player teams"
ON public.player_teams FOR INSERT
WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Team leaders can update their teams"
ON public.player_teams FOR UPDATE
USING (auth.uid() = leader_id);

CREATE POLICY "Team leaders can delete their teams"
ON public.player_teams FOR DELETE
USING (auth.uid() = leader_id);

-- Player team members policies
CREATE POLICY "Anyone can view player team members"
ON public.player_team_members FOR SELECT
USING (true);

CREATE POLICY "Team leaders can add members"
ON public.player_team_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.player_teams 
    WHERE id = team_id AND leader_id = auth.uid()
  ) OR auth.uid() = user_id
);

CREATE POLICY "Leaders or self can remove members"
ON public.player_team_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.player_teams 
    WHERE id = team_id AND leader_id = auth.uid()
  ) OR auth.uid() = user_id
);

-- Update trigger for player_teams
CREATE TRIGGER update_player_teams_updated_at
BEFORE UPDATE ON public.player_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();