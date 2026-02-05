-- Add columns for school tournament prize distribution
ALTER TABLE public.school_tournaments 
ADD COLUMN IF NOT EXISTS prizes_distributed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS prizes_distributed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS prizes_distributed_by UUID,
ADD COLUMN IF NOT EXISTS organizer_earnings NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_earnings NUMERIC DEFAULT 0;

-- Create table for school tournament prize distributions
CREATE TABLE IF NOT EXISTS public.school_tournament_prize_distributions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES public.school_tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.school_tournament_teams(id) ON DELETE CASCADE,
    rank INTEGER,
    award_type TEXT NOT NULL, -- 'rank' or 'special' (like best_sniper, best_runner_up)
    award_name TEXT, -- for special awards like "Best Sniper"
    amount NUMERIC NOT NULL DEFAULT 0,
    distributed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    distributed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.school_tournament_prize_distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view prize distributions"
ON public.school_tournament_prize_distributions
FOR SELECT USING (true);

CREATE POLICY "Tournament organizers can insert prize distributions"
ON public.school_tournament_prize_distributions
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.school_tournaments st
        WHERE st.id = tournament_id AND st.organizer_id = auth.uid()
    )
);

-- Add platform settings for withdrawal rules
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
    ('min_deposit_amount', '10', 'Minimum deposit amount in rupees'),
    ('max_withdrawal_per_day', '10000', 'Maximum withdrawal per day in rupees'),
    ('withdrawal_fee_threshold', '1000', 'Amount above which withdrawal fee applies'),
    ('withdrawal_fee_percent', '2', 'Withdrawal fee percentage above threshold'),
    ('local_tournament_organizer_percent', '10', 'Local tournament organizer commission'),
    ('local_tournament_platform_percent', '10', 'Local tournament platform commission'),
    ('local_tournament_prize_percent', '80', 'Local tournament prize pool percentage')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_school_tournament_prize_distributions_tournament 
ON public.school_tournament_prize_distributions(tournament_id);

CREATE INDEX IF NOT EXISTS idx_school_tournament_prize_distributions_team 
ON public.school_tournament_prize_distributions(team_id);

-- Add realtime for prize distributions
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_tournament_prize_distributions;