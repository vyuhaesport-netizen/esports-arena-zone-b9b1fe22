-- Create team join requests table
CREATE TABLE public.player_team_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.player_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Create unique constraint to prevent duplicate pending requests
CREATE UNIQUE INDEX idx_unique_pending_request ON public.player_team_requests(team_id, user_id) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.player_team_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.player_team_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Team leaders can view requests for their team
CREATE POLICY "Leaders can view team requests"
ON public.player_team_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.player_teams 
    WHERE id = player_team_requests.team_id 
    AND leader_id = auth.uid()
  )
);

-- Policy: Users can create requests (when not in a team)
CREATE POLICY "Users can create join requests"
ON public.player_team_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Team leaders can update (approve/reject) requests
CREATE POLICY "Leaders can update requests"
ON public.player_team_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.player_teams 
    WHERE id = player_team_requests.team_id 
    AND leader_id = auth.uid()
  )
);

-- Policy: Users can delete their own pending requests
CREATE POLICY "Users can cancel their requests"
ON public.player_team_requests
FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');

-- Add requires_approval column to player_teams
ALTER TABLE public.player_teams 
ADD COLUMN requires_approval BOOLEAN DEFAULT true;