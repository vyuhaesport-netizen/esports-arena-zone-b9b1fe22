-- Fix infinite recursion in group_members RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Group admins can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

-- Create fixed policies that don't cause recursion
CREATE POLICY "Users can view their group memberships"
ON public.group_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can join groups they're invited to"
ON public.group_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
ON public.group_members
FOR DELETE
USING (auth.uid() = user_id);