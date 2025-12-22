-- Drop existing restrictive policies for wallet transactions
DROP POLICY IF EXISTS "Admins manage wallet transactions" ON wallet_transactions;

-- Create new policy that allows admins to insert any transaction type
CREATE POLICY "Admins can insert any wallet transactions"
ON wallet_transactions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid())
);