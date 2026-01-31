-- Add verification_type to school_tournament_applications
ALTER TABLE public.school_tournament_applications 
ADD COLUMN IF NOT EXISTS verification_type text NOT NULL DEFAULT 'online';

-- Add verification_type to school_tournaments
ALTER TABLE public.school_tournaments 
ADD COLUMN IF NOT EXISTS verification_type text NOT NULL DEFAULT 'online';

-- Add verification status to teams
ALTER TABLE public.school_tournament_teams 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_by uuid,
ADD COLUMN IF NOT EXISTS verification_notes text,
ADD COLUMN IF NOT EXISTS govt_id_number text,
ADD COLUMN IF NOT EXISTS contact_number text;