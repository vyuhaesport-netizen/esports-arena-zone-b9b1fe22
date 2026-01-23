import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, Loader2, MessageCircle, Crown, MoreVertical, 
  Pencil, Trash2, SmilePlus, X, Check, Reply, CornerDownRight
} from 'lucide-react';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TeamMessage {
  id: string;
  team_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reactions?: Record<string, string[]>;
  is_edited?: boolean;
  edited_at?: string;
  reply_to?: string | null;
  sender?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

interface TeamChatProps {
  teamId: string;
  leaderId: string;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '😮'];

// Helper to safely parse reactions from database JSON
const parseReactions = (reactions: unknown): Record<string, string[]> => {
  if (!reactions || typeof reactions !== 'object') return {};
  return reactions as Record<string, string[]>;
};

const TeamChat = ({ teamId, leaderId }: TeamChatProps) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<TeamMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcast = useRef<number>(0);
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

  // Broadcast typing status
  const broadcastTyping = useCallback(async () => {
    if (!user) return;
    
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return;
    lastTypingBroadcast.current = now;

    const channel = supabase.channel(`typing_${teamId}`);
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone',
        avatar: user.user_metadata?.avatar_url,
      },
    });
  }, [teamId, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      broadcastTyping();
    }
  };

  useEffect(() => {
    fetchMessages();
    
    const messageChannel = supabase
      .channel(`team_chat_${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('user_id', newMsg.sender_id)
              .single();
            
            const messageWithSender: TeamMessage = {
              ...newMsg,
              reactions: parseReactions(newMsg.reactions),
              sender: profile || undefined,
            };
            setMessages((prev) => [...prev, messageWithSender]);
            setTypingUsers((prev) => prev.filter((u) => u.id !== newMsg.sender_id));
            
            if (newMsg.sender_id !== user?.id) {
              playMessageSound();
              toast({
                title: `💬 ${profile?.full_name || profile?.username || 'Teammate'}`,
                description: newMsg.content.length > 50 ? newMsg.content.slice(0, 50) + '...' : newMsg.content,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as any;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMsg.id
                  ? { ...msg, ...updatedMsg, reactions: parseReactions(updatedMsg.reactions) }
                  : msg
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedMsg = payload.old as { id: string };
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedMsg.id));
          }
        }
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`typing_${teamId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === user?.id) return;
        
        setTypingUsers((prev) => {
          const exists = prev.find((u) => u.id === payload.userId);
          if (exists) return prev;
          return [...prev, { id: payload.userId, name: payload.name, avatar: payload.avatar }];
        });

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== payload.userId));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [teamId, user?.id, toast]);

  useEffect(() => {
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

      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((m) => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', senderIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, { username: p.username, full_name: p.full_name, avatar_url: p.avatar_url }])
        );

        const messagesWithSenders: TeamMessage[] = data.map((msg: any) => ({
          ...msg,
          reactions: parseReactions(msg.reactions),
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
      const insertData: any = {
        team_id: teamId,
        sender_id: user.id,
        content: newMessage.trim(),
      };
      
      if (replyingTo) {
        insertData.reply_to = replyingTo.id;
      }

      const { error } = await supabase.from('team_messages').insert(insertData);

      if (error) throw error;
      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const canModifyMessage = (msg: TeamMessage) => {
    if (msg.sender_id !== user?.id) return false;
    const minutesDiff = differenceInMinutes(new Date(), new Date(msg.created_at));
    return minutesDiff <= 5;
  };

  const handleStartEdit = (msg: TeamMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('team_messages')
        .update({
          content: editContent.trim(),
          is_edited: true,
          edited_at: new Date().toISOString(),
        } as any)
        .eq('id', msgId)
        .eq('sender_id', user?.id);

      if (error) throw error;
      
      setEditingMessageId(null);
      setEditContent('');
      toast({ title: 'Message edited' });
    } catch (error) {
      console.error('Error editing message:', error);
      toast({ title: 'Error', description: 'Failed to edit message.', variant: 'destructive' });
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      const { error } = await supabase
        .from('team_messages')
        .delete()
        .eq('id', msgId)
        .eq('sender_id', user?.id);

      if (error) throw error;
      toast({ title: 'Message deleted' });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({ title: 'Error', description: 'Failed to delete message.', variant: 'destructive' });
    }
  };

  const handleReply = (msg: TeamMessage) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;

    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    const currentReactions = msg.reactions || {};
    const emojiUsers = currentReactions[emoji] || [];
    
    let newReactions: Record<string, string[]>;
    
    if (emojiUsers.includes(user.id)) {
      const filtered = emojiUsers.filter((id) => id !== user.id);
      if (filtered.length === 0) {
        const { [emoji]: _, ...rest } = currentReactions;
        newReactions = rest;
      } else {
        newReactions = { ...currentReactions, [emoji]: filtered };
      }
    } else {
      newReactions = { ...currentReactions, [emoji]: [...emojiUsers, user.id] };
    }

    // Optimistically update UI
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, reactions: newReactions } : m
      )
    );

    try {
      const { error } = await supabase
        .from('team_messages')
        .update({ reactions: newReactions } as any)
        .eq('id', msgId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating reaction:', error);
      // Revert on error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, reactions: currentReactions } : m
        )
      );
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

  const getReplyMessage = (replyToId: string | undefined | null) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId);
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
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* Chat Header */}
      <div className="px-4 py-2.5 bg-card border-b border-border/60 flex items-center gap-2 shrink-0">
        <MessageCircle className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Team Chat</span>
        <span className="text-xs text-muted-foreground">({messages.length} messages)</span>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0 px-3 py-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start the conversation with your team!</p>
          </div>
        ) : (
          <div className="space-y-4 pb-2">
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
                    const canModify = canModifyMessage(msg);
                    const isEditing = editingMessageId === msg.id;
                    const reactions = msg.reactions || {};
                    const hasReactions = Object.keys(reactions).length > 0;
                    const repliedMessage = getReplyMessage(msg.reply_to);

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 group ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                      >
                        {!isOwnMessage && (
                          <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
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
                          
                          <div className="relative">
                            {/* Reply preview */}
                            {repliedMessage && (
                              <div className={`flex items-start gap-1.5 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                                <CornerDownRight className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md max-w-[200px] truncate">
                                  <span className="font-medium">{repliedMessage.sender?.full_name || 'Player'}: </span>
                                  {repliedMessage.content.slice(0, 40)}{repliedMessage.content.length > 40 ? '...' : ''}
                                </div>
                              </div>
                            )}

                            {/* Message bubble */}
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="text-sm"
                                  autoFocus
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveEdit(msg.id)}>
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-start gap-1">
                                <div
                                  className={`inline-block px-3 py-2 rounded-2xl text-sm ${
                                    isOwnMessage
                                      ? 'bg-primary text-primary-foreground rounded-tr-md'
                                      : 'bg-card border border-border/60 rounded-tl-md'
                                  }`}
                                >
                                  {msg.content}
                                  {msg.is_edited && (
                                    <span className="text-[9px] opacity-70 ml-1">(edited)</span>
                                  )}
                                </div>
                                
                                {/* Actions */}
                                <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isOwnMessage ? 'order-first' : ''}`}>
                                  {/* Reply button */}
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => handleReply(msg)}
                                  >
                                    <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>

                                  {/* Reaction picker */}
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" side="top">
                                      <div className="flex gap-1">
                                        {EMOJI_REACTIONS.map((emoji) => (
                                          <button
                                            key={emoji}
                                            onClick={() => handleReaction(msg.id, emoji)}
                                            className="text-lg hover:scale-125 transition-transform p-1"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  
                                  {/* Edit/Delete menu */}
                                  {isOwnMessage && canModify && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align={isOwnMessage ? 'end' : 'start'}>
                                        <DropdownMenuItem onClick={() => handleStartEdit(msg)}>
                                          <Pencil className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleDeleteMessage(msg.id)}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Reactions display */}
                            {hasReactions && !isEditing && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                                {Object.entries(reactions).map(([emoji, userIds]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                      userIds.includes(user?.id || '')
                                        ? 'bg-primary/20 border-primary/40'
                                        : 'bg-muted/50 border-border/60 hover:bg-muted'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span className="text-[10px] text-muted-foreground">{userIds.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}
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

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 bg-card/50 border-t border-border/30 flex items-center gap-2 animate-fade-in">
          <div className="flex -space-x-2">
            {typingUsers.slice(0, 3).map((typingUser) => (
              <Avatar key={typingUser.id} className="h-5 w-5 border-2 border-card">
                <AvatarImage src={typingUser.avatar || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-[8px]">
                  {typingUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing`
                : typingUsers.length === 2
                ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing`
                : `${typingUsers.length} people are typing`}
            </span>
            <div className="flex gap-0.5">
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-3 py-2 bg-muted/50 border-t border-border/60 flex items-center gap-2 animate-fade-in">
          <Reply className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">
              Replying to {replyingTo.sender?.full_name || replyingTo.sender?.username || 'Player'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyingTo.content}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={cancelReply}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message Input - Fixed at bottom */}
      <form onSubmit={handleSendMessage} className="shrink-0 bg-card border-t border-border/60 pb-16">
        <div className="flex gap-2 px-3 py-2.5">
          <Input
            ref={inputRef}
            placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
            value={newMessage}
            onChange={handleInputChange}
            className="flex-1 bg-muted/30 border-border/60 h-10"
            maxLength={500}
            disabled={sending}
          />
          <Button
            type="submit"
            variant="gaming"
            size="icon"
            className="h-10 w-10 rounded-full shadow-md shrink-0"
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