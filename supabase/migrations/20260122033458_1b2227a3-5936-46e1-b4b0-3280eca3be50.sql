-- Create push notification logs table
CREATE TABLE public.push_notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_by UUID REFERENCES auth.users(id),
  url TEXT,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage push logs
CREATE POLICY "Admins can view push logs"
ON public.push_notification_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert push logs"
ON public.push_notification_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notification_logs;