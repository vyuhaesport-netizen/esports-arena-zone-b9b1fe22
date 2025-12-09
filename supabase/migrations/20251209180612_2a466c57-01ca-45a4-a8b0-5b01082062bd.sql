-- Add new columns to wallet_transactions for deposit/withdrawal details
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS utr_number text,
ADD COLUMN IF NOT EXISTS screenshot_url text,
ADD COLUMN IF NOT EXISTS upi_id text,
ADD COLUMN IF NOT EXISTS phone text;

-- Create a storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for payment screenshots bucket
CREATE POLICY "Users can upload payment screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view payment screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment-screenshots');

-- Add policy for users to create deposit transactions
CREATE POLICY "Users can create deposit transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id AND type = 'deposit');

-- Add policy for users to create withdrawal transactions  
CREATE POLICY "Users can create withdrawal transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id AND type = 'withdrawal');

-- Insert default payment settings if they don't exist
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('admin_upi_id', 'abbishekvyuha@fam', 'Admin UPI ID for receiving payments'),
  ('payment_qr_url', '', 'QR Code image URL for payments')
ON CONFLICT (setting_key) DO NOTHING;