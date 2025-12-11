-- Add constraints for wallet transaction validation
ALTER TABLE wallet_transactions
ADD CONSTRAINT min_transaction_amount 
CHECK (amount >= 10 OR amount <= -10);

ALTER TABLE wallet_transactions
ADD CONSTRAINT valid_phone 
CHECK (phone IS NULL OR LENGTH(phone) >= 10);

-- Create atomic withdrawal function to prevent race conditions
CREATE OR REPLACE FUNCTION process_withdrawal(
  p_user_id UUID,
  p_amount NUMERIC,
  p_upi_id TEXT,
  p_phone TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Validate inputs
  IF p_amount < 10 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal is ₹10');
  END IF;
  
  IF p_phone IS NULL OR LENGTH(p_phone) < 10 THEN
    RETURN json_build_object('success', false, 'error', 'Valid phone number required');
  END IF;
  
  IF p_upi_id IS NULL OR LENGTH(p_upi_id) < 5 THEN
    RETURN json_build_object('success', false, 'error', 'Valid UPI ID required');
  END IF;

  -- Lock the row and get current balance
  SELECT wallet_balance INTO v_balance
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Atomic update - deduct from wallet
  UPDATE profiles 
  SET wallet_balance = wallet_balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create pending withdrawal transaction
  INSERT INTO wallet_transactions (
    user_id, 
    type, 
    amount, 
    status, 
    description, 
    upi_id, 
    phone
  )
  VALUES (
    p_user_id,
    'withdrawal',
    p_amount,
    'pending',
    'Withdrawal request',
    p_upi_id,
    p_phone
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN json_build_object(
    'success', true, 
    'transaction_id', v_transaction_id,
    'new_balance', v_balance - p_amount
  );
END;
$$;