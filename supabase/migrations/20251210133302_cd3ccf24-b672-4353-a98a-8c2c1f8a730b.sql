-- Create function to check if user is a creator
CREATE OR REPLACE FUNCTION public.is_creator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'creator'
  )
$$;

-- Update tournaments RLS to allow creators to create tournaments
DROP POLICY IF EXISTS "Admins and organizers can create tournaments" ON public.tournaments;
CREATE POLICY "Admins organizers and creators can create tournaments"
ON public.tournaments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  is_organizer(auth.uid()) OR 
  is_creator(auth.uid())
);

-- Update tournaments RLS for update
DROP POLICY IF EXISTS "Admins and organizers can update own tournaments" ON public.tournaments;
CREATE POLICY "Admins organizers and creators can update own tournaments"
ON public.tournaments
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (is_organizer(auth.uid()) AND created_by = auth.uid()) OR
  (is_creator(auth.uid()) AND created_by = auth.uid())
);

-- Update tournaments RLS for delete
DROP POLICY IF EXISTS "Admins and organizers can delete own tournaments" ON public.tournaments;
CREATE POLICY "Admins organizers and creators can delete own tournaments"
ON public.tournaments
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (is_organizer(auth.uid()) AND created_by = auth.uid()) OR
  (is_creator(auth.uid()) AND created_by = auth.uid())
);