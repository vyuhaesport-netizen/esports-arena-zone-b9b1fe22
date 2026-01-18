-- Update request_dhana_withdrawal function to use ₹10 minimum instead of ₹50
CREATE OR REPLACE FUNCTION public.request_dhana_withdrawal(p_user_id uuid, p_amount numeric, p_upi_id text, p_phone text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance RECORD;
BEGIN
  -- Validate minimum withdrawal (₹10 for organizers/creators)
  IF p_amount < 10 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal is 10 Dhana');
  END IF;

  -- Get and lock balance
  SELECT * INTO v_balance
  FROM dhana_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No Dhana balance found');
  END IF;

  IF v_balance.available_dhana < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient available Dhana');
  END IF;

  -- Deduct from available balance
  UPDATE dhana_balances
  SET available_dhana = available_dhana - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Create withdrawal request
  INSERT INTO dhana_withdrawals (user_id, amount, upi_id, phone)
  VALUES (p_user_id, p_amount, p_upi_id, p_phone);

  -- Create transaction record
  INSERT INTO dhana_transactions (
    user_id,
    amount,
    type,
    status,
    description
  )
  VALUES (
    p_user_id,
    p_amount,
    'withdrawal_request',
    'pending',
    'Withdrawal request to UPI: ' || p_upi_id
  );

  RETURN json_build_object(
    'success', true,
    'amount', p_amount,
    'new_balance', v_balance.available_dhana - p_amount
  );
END;
$function$;