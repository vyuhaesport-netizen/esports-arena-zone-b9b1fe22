-- Add full_address column for spot verification
ALTER TABLE public.school_tournament_applications 
ADD COLUMN IF NOT EXISTS full_address TEXT;

ALTER TABLE public.school_tournaments 
ADD COLUMN IF NOT EXISTS full_address TEXT;

-- Add auto_elimination_enabled field for tournaments with spot verification
-- Teams not verified by deadline will be auto-eliminated with no refund