-- Add new fields to profiles table for gaming details
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS preferred_game text,
ADD COLUMN IF NOT EXISTS in_game_name text,
ADD COLUMN IF NOT EXISTS game_uid text;