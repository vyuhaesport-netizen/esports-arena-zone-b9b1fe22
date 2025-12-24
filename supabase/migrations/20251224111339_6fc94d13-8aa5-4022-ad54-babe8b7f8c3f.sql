-- Add YouTube and Instagram link columns to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN youtube_link TEXT,
ADD COLUMN instagram_link TEXT;

-- Add columns to local_tournaments as well
ALTER TABLE public.local_tournaments 
ADD COLUMN youtube_link TEXT,
ADD COLUMN instagram_link TEXT;