-- Create payment retry queue table
CREATE TABLE public.payment_retry_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.payment_gateway_transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  order_id TEXT,
  payment_id TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'exhausted')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_retry_queue ENABLE ROW LEVEL SECURITY;

-- Create policies with correct enum cast
CREATE POLICY "Admins can view retry queue"
ON public.payment_retry_queue
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage retry queue"
ON public.payment_retry_queue
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create indexes
CREATE INDEX idx_payment_retry_queue_status ON public.payment_retry_queue(status);
CREATE INDEX idx_payment_retry_queue_next_retry ON public.payment_retry_queue(next_retry_at) WHERE status = 'pending';

-- Trigger for updated_at
CREATE TRIGGER update_payment_retry_queue_updated_at
BEFORE UPDATE ON public.payment_retry_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to add failed payment to retry queue
CREATE OR REPLACE FUNCTION public.add_to_retry_queue(
  p_transaction_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_order_id TEXT DEFAULT NULL,
  p_payment_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM payment_retry_queue WHERE transaction_id = p_transaction_id AND status IN ('pending', 'processing')) THEN
    RETURN json_build_object('success', false, 'message', 'Transaction already in retry queue');
  END IF;

  INSERT INTO payment_retry_queue (
    transaction_id, user_id, amount, order_id, payment_id, error_message, next_retry_at
  ) VALUES (
    p_transaction_id, p_user_id, p_amount, p_order_id, p_payment_id, p_error_message, now() + interval '5 minutes'
  );

  RETURN json_build_object('success', true, 'message', 'Added to retry queue');
END;
$$;

-- Function to process retry queue item
CREATE OR REPLACE FUNCTION public.process_retry_queue_item(p_queue_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  SELECT * INTO v_item FROM payment_retry_queue WHERE id = p_queue_id AND status = 'pending' FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Item not found or not pending');
  END IF;

  UPDATE payment_retry_queue 
  SET status = 'processing', retry_count = retry_count + 1, last_retry_at = now(), updated_at = now()
  WHERE id = p_queue_id;

  RETURN json_build_object(
    'success', true, 
    'transaction_id', v_item.transaction_id,
    'user_id', v_item.user_id,
    'amount', v_item.amount,
    'order_id', v_item.order_id,
    'retry_count', v_item.retry_count + 1
  );
END;
$$;

-- Function to update retry status
CREATE OR REPLACE FUNCTION public.update_retry_status(
  p_queue_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_item FROM payment_retry_queue WHERE id = p_queue_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Item not found');
  END IF;

  IF p_success THEN
    v_new_status := 'completed';
  ELSIF v_item.retry_count >= v_item.max_retries THEN
    v_new_status := 'exhausted';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE payment_retry_queue 
  SET status = v_new_status,
      error_message = COALESCE(p_error_message, error_message),
      next_retry_at = CASE 
        WHEN v_new_status = 'pending' THEN now() + (interval '5 minutes' * power(2, v_item.retry_count))
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = p_queue_id;

  RETURN json_build_object('success', true, 'new_status', v_new_status);
END;
$$;