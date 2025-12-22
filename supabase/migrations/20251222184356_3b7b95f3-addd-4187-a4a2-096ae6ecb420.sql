-- 1) Secure admin deposit processing (credits wallet + marks tx)
CREATE OR REPLACE FUNCTION public.admin_process_deposit(
  p_deposit_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_balance numeric;
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

    RETURN json_build_object('success', true, 'status', 'failed');
  END IF;

  -- APPROVE: credit wallet
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + COALESCE(v_tx.amount, 0),
      updated_at = now()
  WHERE user_id = v_tx.user_id
  RETURNING wallet_balance INTO v_balance;

  UPDATE public.wallet_transactions
  SET status = 'completed',
      processed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_deposit_id;

  RETURN json_build_object('success', true, 'status', 'completed', 'new_balance', v_balance);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2) One-time reconciliation: make profile balances match the ledger.
--    Credits: completed deposits/prizes/commissions/refunds/admin credits
--    Debits: completed entry_fee/admin_debit (already negative amounts)
--    Withdrawals: subtract amount when pending or completed (money is put on hold immediately)
WITH balances AS (
  SELECT
    user_id,
    SUM(
      CASE
        WHEN type IN ('deposit','prize','winning','commission','refund','admin_credit')
          AND status = 'completed'
          THEN COALESCE(amount, 0)

        WHEN type IN ('entry_fee','admin_debit')
          AND status = 'completed'
          THEN COALESCE(amount, 0)

        WHEN type = 'withdrawal'
          AND status IN ('pending','completed')
          THEN -COALESCE(amount, 0)

        ELSE 0
      END
    )::numeric AS balance
  FROM public.wallet_transactions
  GROUP BY user_id
)
UPDATE public.profiles p
SET wallet_balance = COALESCE(b.balance, 0),
    updated_at = now()
FROM balances b
WHERE p.user_id = b.user_id;

-- Ensure null balances are normalized to 0
UPDATE public.profiles
SET wallet_balance = COALESCE(wallet_balance, 0),
    updated_at = now()
WHERE wallet_balance IS NULL;
