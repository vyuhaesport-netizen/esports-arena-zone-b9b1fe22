-- Add storage policy for super admins to upload QR codes to payment-screenshots bucket
CREATE POLICY "Super admins can upload payment QR"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-screenshots' 
  AND (storage.foldername(name))[1] = 'payment-qr'
  AND public.is_super_admin(auth.uid())
);

-- Allow super admins to update/delete their QR uploads
CREATE POLICY "Super admins can manage payment QR"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'payment-screenshots' 
  AND (storage.foldername(name))[1] = 'payment-qr'
  AND public.is_super_admin(auth.uid())
);