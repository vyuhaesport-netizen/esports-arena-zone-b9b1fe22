-- Create tournament reports table for player complaints during 30-minute window
CREATE TABLE public.tournament_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reported_player_id UUID NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'hack',
  description TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournament_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports for tournaments they participated in
CREATE POLICY "Users can create reports for tournaments they joined"
ON public.tournament_reports
FOR INSERT
WITH CHECK (
  auth.uid() = reporter_id AND
  EXISTS (
    SELECT 1 FROM tournaments t 
    WHERE t.id = tournament_id 
    AND auth.uid() = ANY(t.joined_users)
    AND t.status = 'completed'
    AND t.end_date IS NOT NULL
    AND now() <= (t.end_date + interval '30 minutes')
  )
);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.tournament_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Organizers can view reports for their tournaments
CREATE POLICY "Organizers can view reports for their tournaments"
ON public.tournament_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tournaments t 
    WHERE t.id = tournament_id 
    AND t.created_by = auth.uid()
  )
);

-- Organizers can update reports for their tournaments
CREATE POLICY "Organizers can update reports for their tournaments"
ON public.tournament_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tournaments t 
    WHERE t.id = tournament_id 
    AND t.created_by = auth.uid()
  )
);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.tournament_reports
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid())
);

-- Admins can update all reports
CREATE POLICY "Admins can update all reports"
ON public.tournament_reports
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid())
);

-- Create organizer_earnings table for tracking Dhana with settlement period
CREATE TABLE public.organizer_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'dhana',
  status TEXT NOT NULL DEFAULT 'pending',
  credited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  settlement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 days'),
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for organizer_earnings
ALTER TABLE public.organizer_earnings ENABLE ROW LEVEL SECURITY;

-- Users can view their own earnings
CREATE POLICY "Users can view own earnings"
ON public.organizer_earnings
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert earnings (via tournament completion)
CREATE POLICY "System can insert earnings"
ON public.organizer_earnings
FOR INSERT
WITH CHECK (true);

-- Users can update their own earnings (for withdrawal)
CREATE POLICY "Users can update own earnings"
ON public.organizer_earnings
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all earnings
CREATE POLICY "Admins can view all earnings"
ON public.organizer_earnings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Add owner contact settings to platform_settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('owner_whatsapp', '', 'Owner WhatsApp number for organizers/creators'),
  ('owner_instagram', '', 'Owner Instagram link for organizers/creators'),
  ('owner_contact_note', '', 'Note for organizers/creators from owner')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable realtime for reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_reports;