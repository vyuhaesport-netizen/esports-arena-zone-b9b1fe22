-- Add unique constraint on username
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Create a function to validate username format (alphanumeric lowercase only)
CREATE OR REPLACE FUNCTION public.validate_username()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if username is not null
  IF NEW.username IS NOT NULL THEN
    -- Check if username is alphanumeric lowercase only
    IF NEW.username !~ '^[a-z0-9]+$' THEN
      RAISE EXCEPTION 'Username must contain only lowercase letters and numbers';
    END IF;
    
    -- Check minimum length
    IF LENGTH(NEW.username) < 3 THEN
      RAISE EXCEPTION 'Username must be at least 3 characters';
    END IF;
    
    -- Check maximum length
    IF LENGTH(NEW.username) > 20 THEN
      RAISE EXCEPTION 'Username must be at most 20 characters';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to validate username on insert/update
CREATE TRIGGER validate_username_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_username();