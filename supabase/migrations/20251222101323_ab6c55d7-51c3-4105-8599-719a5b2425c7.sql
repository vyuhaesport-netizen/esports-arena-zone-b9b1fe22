-- Update is_super_admin function to support multiple admin emails
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND (p.email = 'vyuhaesport@gmail.com' OR p.email = 'vyuhaesporthelp@gmail.com')
  )
$$;

-- Update is_admin_email function to support multiple admin emails
CREATE OR REPLACE FUNCTION public.is_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT _email IN ('vyuhaesport@gmail.com', 'vyuhaesporthelp@gmail.com')
$$;

-- Update handle_new_user function to auto-assign admin role for both emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, username)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1));
  
  -- Auto-assign admin role if email matches
  IF NEW.email IN ('vyuhaesport@gmail.com', 'vyuhaesporthelp@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;