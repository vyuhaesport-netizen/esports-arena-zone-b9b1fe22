-- Fix wallet transaction type constraints so backend can log refunds/commissions
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'deposit'::text,
        'withdrawal'::text,
        'entry_fee'::text,
        'refund'::text,
        'prize'::text,
        'commission'::text,
        'admin_credit'::text,
        'admin_debit'::text
      ]
    )
  );

-- Make min amount apply only to deposits/withdrawals (entry fees, refunds, prizes can be smaller)
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS min_transaction_amount;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT min_transaction_amount
  CHECK (
    NOT (type = ANY (ARRAY['deposit'::text, 'withdrawal'::text]))
    OR (amount >= 10::numeric OR amount <= (-10)::numeric)
  );
