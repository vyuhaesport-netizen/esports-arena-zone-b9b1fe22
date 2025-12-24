-- Drop the existing constraint and add a new one with the additional types
ALTER TABLE public.wallet_transactions 
DROP CONSTRAINT wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions 
ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type = ANY (ARRAY[
  'deposit'::text, 
  'withdrawal'::text, 
  'entry_fee'::text, 
  'refund'::text, 
  'prize'::text, 
  'commission'::text, 
  'admin_credit'::text, 
  'admin_debit'::text,
  'prize_won'::text,
  'organizer_commission'::text,
  'local_entry_fee'::text
]));