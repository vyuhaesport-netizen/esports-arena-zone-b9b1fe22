-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Only super admins can modify payment gateway config" ON public.payment_gateway_config;

-- Create a new policy that allows both super admins (team_members) and admins (user_roles) to modify
CREATE POLICY "Admins can modify payment gateway config" 
ON public.payment_gateway_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role = 'super_admin' 
    AND team_members.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role = 'super_admin' 
    AND team_members.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);