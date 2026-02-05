-- Add new columns for social links, prize distribution mode, and better address structure
-- to school_tournament_applications table

ALTER TABLE public.school_tournament_applications 
ADD COLUMN IF NOT EXISTS youtube_link TEXT,
ADD COLUMN IF NOT EXISTS instagram_link TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_link TEXT,
ADD COLUMN IF NOT EXISTS discord_link TEXT,
ADD COLUMN IF NOT EXISTS prize_distribution_mode TEXT DEFAULT 'online' CHECK (prize_distribution_mode IN ('online', 'local_venue')),
ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS winners_per_room INTEGER DEFAULT 1 CHECK (winners_per_room BETWEEN 1 AND 5);

-- Add same columns to school_tournaments table (approved tournaments)
ALTER TABLE public.school_tournaments 
ADD COLUMN IF NOT EXISTS youtube_link TEXT,
ADD COLUMN IF NOT EXISTS instagram_link TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_link TEXT,
ADD COLUMN IF NOT EXISTS discord_link TEXT,
ADD COLUMN IF NOT EXISTS prize_distribution_mode TEXT DEFAULT 'online' CHECK (prize_distribution_mode IN ('online', 'local_venue')),
ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS winners_per_room INTEGER DEFAULT 1 CHECK (winners_per_room BETWEEN 1 AND 5);

-- Add round-specific winner format to rooms
ALTER TABLE public.school_tournament_rooms
ADD COLUMN IF NOT EXISTS winners_per_room INTEGER DEFAULT 1 CHECK (winners_per_room BETWEEN 1 AND 5);

COMMENT ON COLUMN public.school_tournament_applications.prize_distribution_mode IS 'online = Vyuha Wallet credit, local_venue = physical venue payout';
COMMENT ON COLUMN public.school_tournaments.winners_per_room IS 'Default winners per room (1-5), can be overridden per room';