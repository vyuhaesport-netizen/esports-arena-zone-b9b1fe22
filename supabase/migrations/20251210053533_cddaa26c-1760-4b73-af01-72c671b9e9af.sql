-- Add unique constraint on user_roles for upsert support
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Update RLS policy to allow admins with proper permissions to manage roles
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

CREATE POLICY "Admins and system can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  is_super_admin(auth.uid()) OR 
  has_admin_permission(auth.uid(), 'organizers:manage'::text) OR
  has_admin_permission(auth.uid(), 'users:manage'::text)
);

-- Add update policy for admins
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  is_super_admin(auth.uid()) OR
  has_admin_permission(auth.uid(), 'organizers:manage'::text) OR
  has_admin_permission(auth.uid(), 'users:manage'::text)
);

-- Allow admins to view all roles for management
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role)
);