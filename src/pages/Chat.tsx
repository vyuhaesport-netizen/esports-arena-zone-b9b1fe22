import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, Loader2, MessageCircle, MoreVertical, 
  Pencil, Trash2, X, Check, Reply, CornerDownRight, ArrowLeft, Users, Eye
} from 'lucide-react';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  seen_by?: string[];
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

interface PlayerTeam {
  id: string;
  name: string;
  leader_id: string;
}

interface TeamMember {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

// Helper to safely parse reactions from database JSON
const parseReactions = (reactions: unknown): Record<string, string[]> => {
  if (!reactions || typeof reactions !== 'object') return {};
  return reactions as Record<string, string[]>;
};

const parseSeenBy = (seen_by: unknown): string[] => {
  if (!seen_by || !Array.isArray(seen_by)) return [];
  return seen_by as string[];
};

const ChatPage = () => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<TeamMessage | null>(null);
  const [myTeam, setMyTeam] = useState<PlayerTeam | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcast = useRef<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch user's team
  useEffect(() => {
    const fetchTeam = async () => {
      if (!user) return;

      // Check if user is a team leader
      const { data: leaderTeam } = await supabase
        .from('player_teams')
        .select('id, name, leader_id')
        .eq('leader_id', user.id)
        .maybeSingle();

      if (leaderTeam) {
        setMyTeam(leaderTeam);
        return;
      }

      // Check if user is a team member
      const { data: membership } = await supabase
        .from('player_team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership) {
        const { data: team } = await supabase
          .from('player_teams')
          .select('id, name, leader_id')
          .eq('id', membership.team_id)
          .single();

        if (team) {
          setMyTeam(team);
        }
      }

      setLoading(false);
    };

    fetchTeam();
  }, [user]);

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!myTeam) return;

      // Get leader profile
      const { data: leaderProfile } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .eq('user_id', myTeam.leader_id)
        .single();

      // Get member profiles
      const { data: members } = await supabase
        .from('player_team_members')
        .select('user_id')
        .eq('team_id', myTeam.id);

      const memberIds = members?.map(m => m.user_id) || [];
      
      let memberProfiles: TeamMember[] = [];
      if (memberIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', memberIds);
        memberProfiles = profiles || [];
      }

      const allMembers = leaderProfile ? [leaderProfile, ...memberProfiles] : memberProfiles;
      setTeamMembers(allMembers);
    };

    fetchTeamMembers();
  }, [myTeam]);

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
    if (!user || !myTeam) return;
    
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return;
    lastTypingBroadcast.current = now;

    const channel = supabase.channel(`typing_team_${myTeam.id}`);
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone',
        avatar: user.user_metadata?.avatar_url,
      },
    });
  }, [myTeam, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      broadcastTyping();
    }
  };

  // Mark messages as seen
  const markMessagesAsSeen = useCallback(async () => {
    if (!user || !myTeam || messages.length === 0) return;

    const unseenMessages = messages.filter(
      msg => msg.sender_id !== user.id && !msg.seen_by?.includes(user.id)
    );

    for (const msg of unseenMessages) {
      const newSeenBy = [...(msg.seen_by || []), user.id];
      await supabase
        .from('team_messages')
        .update({ seen_by: newSeenBy } as any)
        .eq('id', msg.id);
    }
  }, [messages, myTeam, user]);

  useEffect(() => {
    markMessagesAsSeen();
  }, [markMessagesAsSeen]);

  useEffect(() => {
    if (!myTeam) return;

    fetchMessages();
    
    const messageChannel = supabase
      .channel(`team_chat_${myTeam.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${myTeam.id}`,
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
              seen_by: parseSeenBy(newMsg.seen_by),
              sender: profile || undefined,
            };
            setMessages((prev) => [...prev, messageWithSender]);
            setTypingUsers((prev) => prev.filter((u) => u.id !== newMsg.sender_id));
            
            if (newMsg.sender_id !== user?.id) {
              playMessageSound();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as any;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMsg.id
                  ? { ...msg, ...updatedMsg, reactions: parseReactions(updatedMsg.reactions), seen_by: parseSeenBy(updatedMsg.seen_by) }
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
      .channel(`typing_team_${myTeam.id}`)
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
  }, [myTeam?.id, user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!myTeam) return;
    
    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select('*')
        .eq('team_id', myTeam.id)
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
          seen_by: parseSeenBy(msg.seen_by),
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
    const trimmedMessage = newMessage.trim();
    if (!user || !trimmedMessage || !myTeam || sending) return;

    // Optimistic UI: Clear input immediately for faster UX
    const messageToSend = trimmedMessage;
    const replyToSend = replyingTo;
    setNewMessage('');
    setReplyingTo(null);
    setSending(true);

    try {
      const insertData: any = {
        team_id: myTeam.id,
        sender_id: user.id,
        content: messageToSend,
        seen_by: [user.id],
      };
      
      if (replyToSend) {
        insertData.reply_to = replyToSend.id;
      }

      const { error } = await supabase.from('team_messages').insert(insertData);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setNewMessage(messageToSend);
      toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
    } finally {
      setSending(false);
      // Keep focus on input for continuous typing
      inputRef.current?.focus();
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

  const getSeenCount = (msg: TeamMessage) => {
    if (!msg.seen_by) return 0;
    // Don't count the sender
    return msg.seen_by.filter(id => id !== msg.sender_id).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <header className="sticky top-0 z-40 bg-card border-b border-border px-3 py-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold">Team Chat</h1>
        </header>
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // No team - show message to join a team
  if (!myTeam) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        <header className="sticky top-0 z-40 bg-card border-b border-border px-3 py-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold">Team Chat</h1>
        </header>
        <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold mb-1">No Team Yet</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Join or create a team to start chatting with your teammates.
          </p>
          <Button size="sm" onClick={() => navigate('/team')}>
            <Users className="h-3 w-3 mr-1" />
            Go to Teams
          </Button>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="h-screen bg-background flex flex-col max-w-lg mx-auto overflow-hidden">
      {/* Header with back button - themed properly */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-3 py-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">{myTeam.name}</h1>
          <p className="text-[10px] text-muted-foreground">{teamMembers.length} members</p>
        </div>
        <MessageCircle className="h-4 w-4 text-primary" />
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0 px-3 py-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start the conversation with your team!</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium">
                    {getDateLabel(group.date)}
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
                <div className="space-y-2">
                  {group.messages.map((msg) => {
                  const isOwnMessage = msg.sender_id === user?.id;
                  const canModify = canModifyMessage(msg);
                  const isEditing = editingMessageId === msg.id;
                  const repliedMessage = getReplyMessage(msg.reply_to);
                  const seenCount = getSeenCount(msg);

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 group ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                    >
                      {!isOwnMessage && (
                        <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                          <AvatarImage src={msg.sender?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {msg.sender?.username?.charAt(0).toUpperCase() || 'P'}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        {!isOwnMessage && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[10px] font-medium text-foreground">
                              {msg.sender?.full_name || msg.sender?.username || 'Player'}
                            </span>
                          </div>
                        )}

                        {/* Reply Preview */}
                        {repliedMessage && (
                          <div className={`flex items-center gap-1 mb-0.5 text-[10px] text-muted-foreground ${isOwnMessage ? 'justify-end' : ''}`}>
                            <CornerDownRight className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[120px]">
                              {repliedMessage.sender?.full_name || repliedMessage.sender?.username}: {repliedMessage.content}
                            </span>
                          </div>
                        )}

                        <div className={`relative ${isOwnMessage ? 'flex flex-row-reverse items-start gap-0.5' : 'flex items-start gap-0.5'}`}>
                          {isEditing ? (
                            <div className="flex items-center gap-1 w-full">
                              <Input
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="flex-1 h-7 text-xs"
                                autoFocus
                              />
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEdit(msg.id)}>
                                <Check className="h-3 w-3 text-green-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                                <X className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div
                                className={`px-2.5 py-1.5 rounded-xl text-xs break-words ${
                                  isOwnMessage
                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                    : 'bg-muted/80 text-foreground rounded-bl-sm'
                                }`}
                              >
                                {msg.content}
                              </div>

                              {/* Message Actions */}
                              <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={() => handleReply(msg)}
                                >
                                  <Reply className="h-3 w-3" />
                                </Button>

                                {canModify && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-5 w-5">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isOwnMessage ? 'end' : 'start'}>
                                      <DropdownMenuItem onClick={() => handleStartEdit(msg)}>
                                        <Pencil className="h-3 w-3 mr-1.5" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1.5" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <div className={`flex items-center gap-1 mt-0.5 ${isOwnMessage ? 'justify-end' : ''}`}>
                          <p className="text-[9px] text-muted-foreground">
                            {formatMessageTime(msg.created_at)}
                            {msg.is_edited && <span className="ml-0.5">(edited)</span>}
                          </p>
                          {/* Seen count - only for own messages */}
                          {isOwnMessage && seenCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] text-primary">
                              <Eye className="h-2.5 w-2.5" />
                              {seenCount}
                            </span>
                          )}
                        </div>
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

      {/* Bottom Composer - Sticky above bottom nav */}
      <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border px-3 py-3 z-50">
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <div className="flex -space-x-1.5">
              {typingUsers.slice(0, 3).map((u) => (
                <Avatar key={u.id} className="h-5 w-5 border-2 border-background">
                  <AvatarImage src={u.avatar} />
                  <AvatarFallback className="text-[8px]">{u.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-muted/60 rounded-lg px-3 py-2 mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
              <Reply className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Replying to {replyingTo.sender?.full_name || replyingTo.sender?.username}
              </span>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelReply}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 h-12 bg-muted/50 border-border/60 rounded-2xl px-4 text-sm"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="h-12 w-12 rounded-2xl shrink-0"
            disabled={sending || !newMessage.trim()}
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
