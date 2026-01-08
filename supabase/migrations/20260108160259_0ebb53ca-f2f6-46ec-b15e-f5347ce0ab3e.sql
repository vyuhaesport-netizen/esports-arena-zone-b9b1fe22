-- Create team messages table
CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.player_teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_team_messages_team_id ON public.team_messages(team_id);
CREATE INDEX idx_team_messages_created_at ON public.team_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view messages in their team
CREATE POLICY "Team members can view team messages"
ON public.team_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.player_team_members
    WHERE player_team_members.team_id = team_messages.team_id
    AND player_team_members.user_id = auth.uid()
  )
);

-- Policy: Team members can send messages to their team
CREATE POLICY "Team members can send messages"
ON public.team_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.player_team_members
    WHERE player_team_members.team_id = team_messages.team_id
    AND player_team_members.user_id = auth.uid()
  )
);

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.team_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Enable realtime for team messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;