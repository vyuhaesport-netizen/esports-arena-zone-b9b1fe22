-- Create friends table for friend requests and relationships
CREATE TABLE public.friends (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(requester_id, recipient_id)
);

-- Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friends
CREATE POLICY "Users can view their own friend requests"
ON public.friends FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send friend requests"
ON public.friends FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend requests they received"
ON public.friends FOR UPDATE
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own friend requests"
ON public.friends FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Create messages table for direct messaging
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  is_admin_message boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id OR (is_admin_message = true AND (public.is_super_admin(auth.uid()) OR public.has_admin_permission(auth.uid(), 'notifications:view'))));

CREATE POLICY "Users can update their own messages read status"
ON public.messages FOR UPDATE
USING (auth.uid() = recipient_id);

-- Create admin_broadcasts table for admin announcements
CREATE TABLE public.admin_broadcasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  broadcast_type text NOT NULL DEFAULT 'notification' CHECK (broadcast_type IN ('notification', 'message')),
  target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'users', 'organizers')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_broadcasts
CREATE POLICY "Anyone can view broadcasts"
ON public.admin_broadcasts FOR SELECT
USING (true);

CREATE POLICY "Admins can create broadcasts"
ON public.admin_broadcasts FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_admin_permission(auth.uid(), 'notifications:view'));

-- Add trigger for updated_at on friends
CREATE TRIGGER update_friends_updated_at
BEFORE UPDATE ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friends;