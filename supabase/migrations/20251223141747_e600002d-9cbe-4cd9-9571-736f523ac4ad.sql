-- Create dhana_balances table for tracking Dhana currency
CREATE TABLE public.dhana_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  pending_dhana NUMERIC NOT NULL DEFAULT 0,
  available_dhana NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dhana_transactions table for tracking all Dhana movements
CREATE TABLE public.dhana_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tournament_id UUID REFERENCES public.tournaments(id),
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('commission', 'matured', 'withdrawal_request', 'withdrawal_approved', 'withdrawal_rejected')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'withdrawn', 'approved', 'rejected')),
  available_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dhana_withdrawals table for withdrawal requests
CREATE TABLE public.dhana_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  upi_id TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.dhana_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dhana_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dhana_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS policies for dhana_balances
CREATE POLICY "Users can view own dhana balance"
  ON public.dhana_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert dhana balance"
  ON public.dhana_balances FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update dhana balance"
  ON public.dhana_balances FOR UPDATE
  USING (true);

CREATE POLICY "Admins can view all dhana balances"
  ON public.dhana_balances FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- RLS policies for dhana_transactions
CREATE POLICY "Users can view own dhana transactions"
  ON public.dhana_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert dhana transactions"
  ON public.dhana_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update dhana transactions"
  ON public.dhana_transactions FOR UPDATE
  USING (true);

CREATE POLICY "Admins can view all dhana transactions"
  ON public.dhana_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- RLS policies for dhana_withdrawals
CREATE POLICY "Users can view own dhana withdrawals"
  ON public.dhana_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create dhana withdrawal requests"
  ON public.dhana_withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all dhana withdrawals"
  ON public.dhana_withdrawals FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can update dhana withdrawals"
  ON public.dhana_withdrawals FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- Function to credit Dhana commission when tournament is completed
CREATE OR REPLACE FUNCTION public.credit_dhana_commission(
  p_user_id UUID,
  p_tournament_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available_at TIMESTAMP WITH TIME ZONE;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than 0');
  END IF;

  -- Set available date to 15 days from now
  v_available_at := now() + interval '15 days';

  -- Insert or update dhana_balances
  INSERT INTO dhana_balances (user_id, pending_dhana, total_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    pending_dhana = dhana_balances.pending_dhana + p_amount,
    total_earned = dhana_balances.total_earned + p_amount,
    updated_at = now();

  -- Create transaction record
  INSERT INTO dhana_transactions (
    user_id,
    tournament_id,
    amount,
    type,
    status,
    available_at,
    description
  )
  VALUES (
    p_user_id,
    p_tournament_id,
    p_amount,
    'commission',
    'pending',
    v_available_at,
    COALESCE(p_description, 'Tournament commission')
  );

  RETURN json_build_object(
    'success', true,
    'amount', p_amount,
    'available_at', v_available_at
  );
END;
$$;

-- Function to process dhana maturation (move from pending to available)
CREATE OR REPLACE FUNCTION public.process_dhana_maturation()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction RECORD;
  v_processed_count INTEGER := 0;
  v_total_matured NUMERIC := 0;
BEGIN
  -- Find all pending transactions that have matured
  FOR v_transaction IN
    SELECT * FROM dhana_transactions
    WHERE type = 'commission'
      AND status = 'pending'
      AND available_at <= now()
    FOR UPDATE
  LOOP
    -- Update transaction status
    UPDATE dhana_transactions
    SET status = 'available',
        updated_at = now()
    WHERE id = v_transaction.id;

    -- Update balance: move from pending to available
    UPDATE dhana_balances
    SET pending_dhana = pending_dhana - v_transaction.amount,
        available_dhana = available_dhana + v_transaction.amount,
        updated_at = now()
    WHERE user_id = v_transaction.user_id;

    v_processed_count := v_processed_count + 1;
    v_total_matured := v_total_matured + v_transaction.amount;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'total_matured', v_total_matured
  );
END;
$$;

-- Function to request Dhana withdrawal
CREATE OR REPLACE FUNCTION public.request_dhana_withdrawal(
  p_user_id UUID,
  p_amount NUMERIC,
  p_upi_id TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance RECORD;
BEGIN
  -- Validate minimum withdrawal
  IF p_amount < 50 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal is 50 Dhana');
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
$$;

-- Function for admin to process dhana withdrawal
CREATE OR REPLACE FUNCTION public.admin_process_dhana_withdrawal(
  p_withdrawal_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;

  -- Get and lock withdrawal
  SELECT * INTO v_withdrawal
  FROM dhana_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_withdrawal.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal already processed');
  END IF;

  IF p_action = 'approve' THEN
    -- Update withdrawal status
    UPDATE dhana_withdrawals
    SET status = 'approved',
        processed_by = auth.uid(),
        processed_at = now(),
        updated_at = now()
    WHERE id = p_withdrawal_id;

    -- Update total_withdrawn in balance
    UPDATE dhana_balances
    SET total_withdrawn = total_withdrawn + v_withdrawal.amount,
        updated_at = now()
    WHERE user_id = v_withdrawal.user_id;

    -- Create approved transaction record
    INSERT INTO dhana_transactions (
      user_id,
      amount,
      type,
      status,
      description
    )
    VALUES (
      v_withdrawal.user_id,
      v_withdrawal.amount,
      'withdrawal_approved',
      'approved',
      'Withdrawal approved - ₹' || v_withdrawal.amount || ' to ' || v_withdrawal.upi_id
    );

    -- Send notification
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      v_withdrawal.user_id,
      'dhana_withdrawal_approved',
      '✅ Dhana Withdrawal Approved!',
      'Your withdrawal of ' || v_withdrawal.amount || ' Dhana (₹' || v_withdrawal.amount || ') has been approved and sent to ' || v_withdrawal.upi_id,
      p_withdrawal_id
    );

    RETURN json_build_object('success', true, 'status', 'approved');

  ELSE
    -- Reject: refund the amount back
    UPDATE dhana_withdrawals
    SET status = 'rejected',
        rejection_reason = COALESCE(p_reason, 'Rejected by admin'),
        processed_by = auth.uid(),
        processed_at = now(),
        updated_at = now()
    WHERE id = p_withdrawal_id;

    -- Refund to available balance
    UPDATE dhana_balances
    SET available_dhana = available_dhana + v_withdrawal.amount,
        updated_at = now()
    WHERE user_id = v_withdrawal.user_id;

    -- Create rejected transaction record
    INSERT INTO dhana_transactions (
      user_id,
      amount,
      type,
      status,
      description
    )
    VALUES (
      v_withdrawal.user_id,
      v_withdrawal.amount,
      'withdrawal_rejected',
      'rejected',
      'Withdrawal rejected - Reason: ' || COALESCE(p_reason, 'No reason provided')
    );

    -- Send notification
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      v_withdrawal.user_id,
      'dhana_withdrawal_rejected',
      '❌ Dhana Withdrawal Rejected',
      'Your withdrawal of ' || v_withdrawal.amount || ' Dhana was rejected. Amount refunded. Reason: ' || COALESCE(p_reason, 'No reason provided'),
      p_withdrawal_id
    );

    RETURN json_build_object('success', true, 'status', 'rejected');
  END IF;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_dhana_balances_user_id ON dhana_balances(user_id);
CREATE INDEX idx_dhana_transactions_user_id ON dhana_transactions(user_id);
CREATE INDEX idx_dhana_transactions_status ON dhana_transactions(status);
CREATE INDEX idx_dhana_transactions_available_at ON dhana_transactions(available_at) WHERE status = 'pending';
CREATE INDEX idx_dhana_withdrawals_user_id ON dhana_withdrawals(user_id);
CREATE INDEX idx_dhana_withdrawals_status ON dhana_withdrawals(status);