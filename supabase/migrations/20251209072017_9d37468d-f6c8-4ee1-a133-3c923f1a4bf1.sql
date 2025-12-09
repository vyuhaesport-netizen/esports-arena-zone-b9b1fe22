-- Fix function search path for is_admin_email
CREATE OR REPLACE FUNCTION public.is_admin_email(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT _email = 'vyuhaesport@gmail.com'
$$;