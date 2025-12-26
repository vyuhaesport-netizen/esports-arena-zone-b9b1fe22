-- Add ZapUPI gateway to payment_gateway_config
INSERT INTO public.payment_gateway_config (
  gateway_name,
  display_name,
  is_enabled,
  is_default,
  environment,
  currency,
  supports_auto_credit,
  supports_refunds,
  min_amount,
  max_amount
) VALUES (
  'zapupi',
  'ZapUPI',
  false,
  false,
  'live',
  'INR',
  true,
  false,
  10,
  50000
) ON CONFLICT (gateway_name) DO NOTHING;