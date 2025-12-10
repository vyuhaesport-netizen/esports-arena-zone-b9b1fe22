-- Allow users to delete their own messages
CREATE POLICY "Users can delete own messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Allow users to delete their own group messages  
CREATE POLICY "Users can delete own group messages" 
ON public.group_messages 
FOR DELETE 
USING (auth.uid() = sender_id);