-- First, manually create missing profiles for users who signed up but don't have profiles
INSERT INTO public.profiles (user_id, email, username)
SELECT 
  u.id as user_id,
  u.email,
  SPLIT_PART(u.email, '@', 1) as username
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create or replace the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (user_id, email, username, wallet_balance)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1), 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Auto-assign admin role if email matches
  IF NEW.email IN ('vyuhaesport@gmail.com', 'vyuhaesporthelp@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update admin_process_deposit to check profile exists before crediting
CREATE OR REPLACE FUNCTION public.admin_process_deposit(p_deposit_id uuid, p_action text, p_reason text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx RECORD;
  v_balance numeric;
  v_profile_exists boolean;
BEGIN
  IF p_deposit_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Deposit id is required');
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;

  -- Authorize
  IF NOT (
    public.is_super_admin(auth.uid())
    OR public.has_admin_permission(auth.uid(), 'deposits:manage')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Lock the transaction row
  SELECT * INTO v_tx
  FROM public.wallet_transactions
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF v_tx IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Deposit not found');
  END IF;

  IF v_tx.type <> 'deposit' THEN
    RETURN json_build_object('success', false, 'error', 'Transaction is not a deposit');
  END IF;

  IF v_tx.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Deposit is not pending');
  END IF;

  IF p_action = 'reject' THEN
    UPDATE public.wallet_transactions
    SET status = 'failed',
        processed_by = auth.uid(),
        reason = COALESCE(NULLIF(trim(p_reason), ''), 'Rejected by admin'),
        updated_at = now()
    WHERE id = p_deposit_id;

    -- Send notification for rejected deposit
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      v_tx.user_id,
      'deposit_rejected',
      '❌ Deposit Rejected',
      'Your deposit of ₹' || v_tx.amount || ' was rejected. Reason: ' || COALESCE(NULLIF(trim(p_reason), ''), 'Invalid payment details'),
      p_deposit_id
    );

    RETURN json_build_object('success', true, 'status', 'failed');
  END IF;

  -- APPROVE: Check if profile exists first
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = v_tx.user_id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    -- Create profile if it doesn't exist (get email from auth.users)
    INSERT INTO public.profiles (user_id, email, username, wallet_balance)
    SELECT v_tx.user_id, u.email, SPLIT_PART(u.email, '@', 1), 0
    FROM auth.users u
    WHERE u.id = v_tx.user_id
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Credit wallet
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + COALESCE(v_tx.amount, 0),
      updated_at = now()
  WHERE user_id = v_tx.user_id
  RETURNING wallet_balance INTO v_balance;

  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Failed to update wallet - user profile not found');
  END IF;

  UPDATE public.wallet_transactions
  SET status = 'completed',
      processed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_deposit_id;

  -- Send notification for approved deposit
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    v_tx.user_id,
    'deposit_approved',
    '💰 Money Added Successfully!',
    '₹' || v_tx.amount || ' has been added to your wallet. New balance: ₹' || v_balance,
    p_deposit_id
  );

  RETURN json_build_object('success', true, 'status', 'completed', 'new_balance', v_balance);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;