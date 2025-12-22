-- Secure server-side wallet adjustment for admin user management
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  p_target_user_id uuid,
  p_action text,
  p_amount numeric,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance numeric;
  v_new_balance numeric;
  v_email text;
  v_tx_id uuid;
BEGIN
  -- Validate inputs
  IF p_target_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Target user is required');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than 0');
  END IF;

  IF p_action NOT IN ('add', 'deduct') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Reason is required');
  END IF;

  -- Authorize: only the fixed admin emails OR explicit permission
  SELECT u.email
  INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unable to resolve admin identity');
  END IF;

  IF NOT (
    public.is_admin_email(v_email)
    OR EXISTS (
      SELECT 1
      FROM public.admin_permissions ap
      WHERE ap.user_id = auth.uid()
        AND ap.permission = 'users:manage'
    )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Lock and get balance
  SELECT COALESCE(p.wallet_balance, 0)
  INTO v_current_balance
  FROM public.profiles p
  WHERE p.user_id = p_target_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Compute new balance
  IF p_action = 'add' THEN
    v_new_balance := v_current_balance + p_amount;
  ELSE
    v_new_balance := v_current_balance - p_amount;
    IF v_new_balance < 0 THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
  END IF;

  -- Update profile balance
  UPDATE public.profiles
  SET wallet_balance = v_new_balance,
      updated_at = now()
  WHERE user_id = p_target_user_id;

  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    status,
    description,
    reason,
    processed_by
  )
  VALUES (
    p_target_user_id,
    CASE WHEN p_action = 'add' THEN 'admin_credit' ELSE 'admin_debit' END,
    CASE WHEN p_action = 'add' THEN p_amount ELSE -p_amount END,
    'completed',
    'Admin ' || CASE WHEN p_action = 'add' THEN 'credit' ELSE 'debit' END,
    trim(p_reason),
    auth.uid()
  )
  RETURNING id INTO v_tx_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'old_balance', v_current_balance,
    'new_balance', v_new_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;