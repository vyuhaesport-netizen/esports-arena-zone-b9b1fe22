-- Add policy to allow users to create bonus transactions
CREATE POLICY "Users can create bonus transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id AND type = 'bonus');