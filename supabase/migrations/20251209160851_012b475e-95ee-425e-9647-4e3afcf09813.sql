
-- Create organizer_applications table
CREATE TABLE IF NOT EXISTS public.organizer_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  govt_id_proof_url TEXT,
  experience TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.organizer_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizer_applications
CREATE POLICY "Users can view own application"
ON public.organizer_applications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own application"
ON public.organizer_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
ON public.organizer_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can update applications"
ON public.organizer_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- Create platform_settings table for commission configuration
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for platform_settings
CREATE POLICY "Anyone can view settings"
ON public.platform_settings
FOR SELECT
USING (true);

CREATE POLICY "Only super admin can update settings"
ON public.platform_settings
FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Only super admin can insert settings"
ON public.platform_settings
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Insert default commission settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('organizer_commission_percent', '10', 'Percentage of entry fee for organizer'),
  ('platform_commission_percent', '10', 'Percentage of entry fee for platform'),
  ('prize_pool_percent', '80', 'Percentage of entry fee for prize pool')
ON CONFLICT (setting_key) DO NOTHING;

-- Add organizer earnings columns to tournaments
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS organizer_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS platform_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS current_prize_pool NUMERIC DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS total_fees_collected NUMERIC DEFAULT 0;

-- Add joined_users column to tournaments for tracking participants
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS joined_users UUID[] DEFAULT '{}';

-- Add winner_user_id to tournaments
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS winner_user_id UUID;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS winner_declared_at TIMESTAMP WITH TIME ZONE;

-- Create function to check if user is organizer
CREATE OR REPLACE FUNCTION public.is_organizer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'organizer'
  )
$$;

-- Update tournaments RLS to allow organizers to create and manage their own tournaments
DROP POLICY IF EXISTS "Admins can create tournaments" ON public.tournaments;
CREATE POLICY "Admins and organizers can create tournaments"
ON public.tournaments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR is_organizer(auth.uid()));

DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
CREATE POLICY "Admins and organizers can update own tournaments"
ON public.tournaments
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  (is_organizer(auth.uid()) AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;
CREATE POLICY "Admins and organizers can delete own tournaments"
ON public.tournaments
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR 
  (is_organizer(auth.uid()) AND created_by = auth.uid())
);

-- Create trigger for updated_at on organizer_applications
CREATE TRIGGER update_organizer_applications_updated_at
BEFORE UPDATE ON public.organizer_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on platform_settings
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
