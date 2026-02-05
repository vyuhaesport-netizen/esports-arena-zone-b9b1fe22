-- Add WhatsApp and Discord link columns to tournaments table
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS discord_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.tournaments.whatsapp_link IS 'WhatsApp group/channel link for tournament';
COMMENT ON COLUMN public.tournaments.discord_link IS 'Discord server invite link for tournament';