import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, MessageCircle, Crown } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface TeamMessage {
  id: string;
  team_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TeamChatProps {
  teamId: string;
  leaderId: string;
}

const TeamChat = ({ teamId, leaderId }: TeamChatProps) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Play notification sound
  const playMessageSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play message sound:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
    
    // Set up realtime subscription
    const channel = supabase
      .channel(`team_chat_${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          const newMsg = payload.new as TeamMessage;
          // Fetch sender info
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('user_id', newMsg.sender_id)
            .single();
          
          const messageWithSender = { ...newMsg, sender: profile || undefined };
          setMessages((prev) => [...prev, messageWithSender]);
          
          // Show toast and play sound for messages from others
          if (newMsg.sender_id !== user?.id) {
            playMessageSound();
            toast({
              title: `💬 ${profile?.full_name || profile?.username || 'Teammate'}`,
              description: newMsg.content.length > 50 ? newMsg.content.slice(0, 50) + '...' : newMsg.content,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, user?.id, toast]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      // Fetch sender profiles
      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((m) => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', senderIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, { username: p.username, full_name: p.full_name, avatar_url: p.avatar_url }])
        );

        const messagesWithSenders = data.map((msg) => ({
          ...msg,
          sender: profileMap.get(msg.sender_id),
        }));

        setMessages(messagesWithSenders);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from('team_messages').insert({
        team_id: teamId,
        sender_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const groupMessagesByDate = (msgs: TeamMessage[]) => {
    const groups: { date: string; messages: TeamMessage[] }[] = [];
    let currentDate = '';

    msgs.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="fixed inset-0 top-16 bottom-16 z-30 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-card border-b border-border/60 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Team Chat</span>
        <span className="text-xs text-muted-foreground">({messages.length} messages)</span>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start the conversation with your team!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    {getDateLabel(group.date)}
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
                <div className="space-y-3">
                  {group.messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user?.id;
                    const isLeaderMessage = msg.sender_id === leaderId;

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                      >
                        {!isOwnMessage && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={msg.sender?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {msg.sender?.username?.charAt(0).toUpperCase() || 'P'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[75%] ${isOwnMessage ? 'text-right' : ''}`}>
                          {!isOwnMessage && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-medium">
                                {msg.sender?.full_name || msg.sender?.username || 'Player'}
                              </span>
                              {isLeaderMessage && (
                                <Crown className="h-3 w-3 text-yellow-500" />
                              )}
                            </div>
                          )}
                          <div
                            className={`inline-block px-3 py-2 rounded-2xl text-sm ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground rounded-tr-md'
                                : 'bg-card border border-border/60 rounded-tl-md'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatMessageTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-card border-t border-border/60">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-muted/30 border-border/60 h-10"
            maxLength={500}
            disabled={sending}
          />
          <Button
            type="submit"
            variant="gaming"
            size="icon"
            className="h-10 w-10 rounded-full shadow-sm"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TeamChat;
