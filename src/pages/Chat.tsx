 import { useState, useEffect, useRef, useCallback } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { Button } from '@/components/ui/button';
 import { useToast } from '@/hooks/use-toast';
 import { Loader2, MessageCircle, Users, ArrowLeft } from 'lucide-react';
 import { format, differenceInMinutes } from 'date-fns';
 import ChatHeader from '@/components/chat/ChatHeader';
 import MessageBubble from '@/components/chat/MessageBubble';
import ChatComposer from '@/components/chat/ChatComposer';
import TypingIndicator from '@/components/chat/TypingIndicator';
import DateDivider from '@/components/chat/DateDivider';
import SeenByDialog from '@/components/chat/SeenByDialog';
import BackgroundPicker, { BACKGROUNDS } from '@/components/chat/BackgroundPicker';
 
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
    in_game_name?: string | null;
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
  in_game_name?: string | null;
   avatar_url: string | null;
 }
 
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
  const [seenByDialogOpen, setSeenByDialogOpen] = useState(false);
  const [selectedMessageForSeenBy, setSelectedMessageForSeenBy] = useState<TeamMessage | null>(null);
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const [chatBackground, setChatBackground] = useState('default');
  const [mockMode, setMockMode] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);
   const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
   const lastTypingBroadcast = useRef<number>(0);
   const { user } = useAuth();
   const { toast } = useToast();
   const navigate = useNavigate();
 
   // Fetch user's team
   useEffect(() => {
     const fetchTeam = async () => {
       if (!user) return;
 
       const { data: leaderTeam } = await supabase
         .from('player_teams')
         .select('id, name, leader_id')
         .eq('leader_id', user.id)
         .maybeSingle();
 
       if (leaderTeam) {
         setMyTeam(leaderTeam);
         return;
       }
 
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
 
       const { data: leaderProfile } = await supabase
         .from('profiles')
        .select('user_id, username, full_name, in_game_name, avatar_url')
         .eq('user_id', myTeam.leader_id)
         .single();
 
       const { data: members } = await supabase
         .from('player_team_members')
         .select('user_id')
         .eq('team_id', myTeam.id);
 
       // Filter out leader from members to avoid duplication
       const memberIds = (members?.map(m => m.user_id) || []).filter(id => id !== myTeam.leader_id);
       
       let memberProfiles: TeamMember[] = [];
       if (memberIds.length > 0) {
         const { data: profiles } = await supabase
           .from('profiles')
          .select('user_id, username, full_name, in_game_name, avatar_url')
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
       const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
 
   const handleInputChange = (value: string) => {
     setNewMessage(value);
     if (value.trim()) {
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
         .update({ seen_by: newSeenBy } as Record<string, unknown>)
         .eq('id', msg.id);
     }
   }, [messages, myTeam, user]);
 
   // Add reaction to message
   const handleReaction = async (msgId: string, emoji: string) => {
     if (!user) return;
     
     const message = messages.find(m => m.id === msgId);
     if (!message) return;
 
     const currentReactions = message.reactions || {};
     const emojiReactions = currentReactions[emoji] || [];
     
     let newEmojiReactions: string[];
     if (emojiReactions.includes(user.id)) {
       newEmojiReactions = emojiReactions.filter(id => id !== user.id);
     } else {
       newEmojiReactions = [...emojiReactions, user.id];
     }
 
     const newReactions: Record<string, string[]> = {
       ...currentReactions,
       [emoji]: newEmojiReactions,
     };
 
     Object.keys(newReactions).forEach(key => {
       if (newReactions[key].length === 0) {
         delete newReactions[key];
       }
     });
 
     try {
       await supabase
         .from('team_messages')
         .update({ reactions: newReactions } as Record<string, unknown>)
         .eq('id', msgId);
     } catch (error) {
       console.error('Error adding reaction:', error);
     }
   };
 
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
             const newMsg = payload.new as Record<string, unknown>;
             const { data: profile } = await supabase
               .from('profiles')
               .select('username, full_name, avatar_url')
               .eq('user_id', newMsg.sender_id as string)
               .single();
             
             const messageWithSender: TeamMessage = {
               id: newMsg.id as string,
               team_id: newMsg.team_id as string,
               sender_id: newMsg.sender_id as string,
               content: newMsg.content as string,
               created_at: newMsg.created_at as string,
               reactions: parseReactions(newMsg.reactions),
               is_edited: newMsg.is_edited as boolean | undefined,
               edited_at: newMsg.edited_at as string | undefined,
               reply_to: newMsg.reply_to as string | null | undefined,
               seen_by: parseSeenBy(newMsg.seen_by),
               sender: profile || undefined,
             };
             setMessages((prev) => [...prev, messageWithSender]);
             setTypingUsers((prev) => prev.filter((u) => u.id !== newMsg.sender_id));
             
             if (newMsg.sender_id !== user?.id) {
               playMessageSound();
             }
           } else if (payload.eventType === 'UPDATE') {
             const updatedMsg = payload.new as Record<string, unknown>;
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
          .select('user_id, username, full_name, in_game_name, avatar_url')
           .in('user_id', senderIds);
 
         const profileMap = new Map(
          profiles?.map((p) => [p.user_id, { username: p.username, full_name: p.full_name, in_game_name: p.in_game_name, avatar_url: p.avatar_url }])
         );
 
         const messagesWithSenders: TeamMessage[] = data.map((msg: Record<string, unknown>) => ({
           id: msg.id as string,
           team_id: msg.team_id as string,
           sender_id: msg.sender_id as string,
           content: msg.content as string,
           created_at: msg.created_at as string,
           reactions: parseReactions(msg.reactions),
           is_edited: msg.is_edited as boolean | undefined,
           edited_at: msg.edited_at as string | undefined,
           reply_to: msg.reply_to as string | null | undefined,
           seen_by: parseSeenBy(msg.seen_by),
           sender: profileMap.get(msg.sender_id as string),
         }));
 
         setMessages(messagesWithSenders);
       }
     } catch (error) {
       console.error('Error fetching messages:', error);
     } finally {
       setLoading(false);
     }
   };
 
   const handleSendMessage = async (e?: React.FormEvent) => {
     e?.preventDefault();
     const trimmedMessage = newMessage.trim();
     if (!user || !trimmedMessage || !myTeam || sending) return;
 
     const messageToSend = trimmedMessage;
     const replyToSend = replyingTo;
    
    // Optimistic update - add message to UI immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: TeamMessage = {
      id: tempId,
      team_id: myTeam.id,
      sender_id: user.id,
      content: messageToSend,
      created_at: new Date().toISOString(),
      reactions: {},
      seen_by: [user.id],
      reply_to: replyToSend?.id || null,
      sender: {
        username: user.user_metadata?.username || null,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      },
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
     setNewMessage('');
     setReplyingTo(null);
     setSending(true);
 
    // Scroll immediately
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);

     try {
      const insertData = {
         team_id: myTeam.id,
         sender_id: user.id,
         content: messageToSend,
         seen_by: [user.id],
        reply_to: replyToSend?.id || null,
       };
 
     const { data, error } = await supabase.from('team_messages').insert([insertData]).select().single();
 
       if (error) throw error;
      
      // Replace temp message with real one
      if (data) {
        setMessages((prev) => prev.map(msg => 
          msg.id === tempId ? { ...msg, id: data.id } : msg
        ));
      }
     } catch (error) {
       console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageToSend); // Restore message
       toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
     } finally {
       setSending(false);
     }
   };
 
  const handleViewSeenBy = (msg: TeamMessage) => {
    setSelectedMessageForSeenBy(msg);
    setSeenByDialogOpen(true);
  };

  const getBackgroundStyle = () => {
    const bg = BACKGROUNDS.find(b => b.id === chatBackground);
    return bg ? bg.style : 'bg-background';
  };

  // Load mock data for testing
  const loadMockData = async () => {
    try {
      const response = await supabase.functions.invoke('mock-chat-data', {
        body: { teamId: myTeam?.id || 'mock-team', messageCount: 50 },
      });
      
      if (response.data) {
        setMessages(response.data.messages);
        setTeamMembers(response.data.members);
        setMockMode(true);
        toast({ title: 'Mock Data Loaded', description: '50 messages with 6 members loaded for preview' });
      }
    } catch (error) {
      console.error('Error loading mock data:', error);
      toast({ title: 'Error', description: 'Failed to load mock data', variant: 'destructive' });
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
         } as Record<string, unknown>)
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
   };
 
   const cancelReply = () => {
     setReplyingTo(null);
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
 
   const getReplyMessage = (replyToId: string | undefined | null) => {
     if (!replyToId) return null;
     return messages.find((m) => m.id === replyToId);
   };
 
   const getSeenCount = (msg: TeamMessage) => {
     if (!msg.seen_by) return 0;
     return msg.seen_by.filter(id => id !== msg.sender_id).length;
   };
 
   const teamAvatars = teamMembers.map(m => m.avatar_url || '').filter(Boolean);
 
   if (loading) {
     return (
       <div className="h-screen bg-background flex flex-col max-w-lg mx-auto overflow-hidden">
         <header className="sticky top-0 z-50 bg-background border-b border-border px-3 py-3 flex items-center gap-2">
           <Button
             variant="ghost"
             size="icon"
             className="h-8 w-8 shrink-0 text-foreground hover:bg-muted"
             onClick={() => navigate(-1)}
           >
             <ArrowLeft className="h-4 w-4" />
           </Button>
           <h1 className="text-base font-bold text-foreground">Team Chat</h1>
         </header>
         <div className="flex items-center justify-center flex-1">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       </div>
     );
   }
 
   if (!myTeam) {
     return (
       <div className="h-screen bg-background flex flex-col max-w-lg mx-auto overflow-hidden">
         <header className="sticky top-0 z-50 bg-background border-b border-border px-3 py-3 flex items-center gap-2">
           <Button
             variant="ghost"
             size="icon"
             className="h-8 w-8 shrink-0 text-foreground hover:bg-muted"
             onClick={() => navigate(-1)}
           >
             <ArrowLeft className="h-4 w-4" />
           </Button>
           <h1 className="text-base font-bold text-foreground">Team Chat</h1>
         </header>
         <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
           <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
             <Users className="h-10 w-10 text-primary" />
           </div>
           <h2 className="text-xl font-bold mb-2">No Team Yet</h2>
           <p className="text-sm text-muted-foreground mb-6 max-w-xs">
             Join or create a team to start chatting with your teammates
           </p>
           <Button onClick={() => navigate('/team')} className="rounded-full px-6">
             <Users className="h-4 w-4 mr-2" />
             Find a Team
           </Button>
         </div>
       </div>
     );
   }
 
   const groupedMessages = groupMessagesByDate(messages);
 
   return (
     <div className="h-screen bg-background flex flex-col max-w-lg mx-auto overflow-hidden">
       {/* WhatsApp-style Header */}
       <ChatHeader
         teamName={myTeam.name}
         memberCount={teamMembers.length}
         teamAvatars={teamAvatars}
         onBack={() => navigate(-1)}
        onViewMembers={() => navigate('/team')}
        onChangeBackground={() => setBackgroundPickerOpen(true)}
        onLoadMockData={loadMockData}
      />
 
      {/* Messages Area with selected background */}
      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto ${getBackgroundStyle()}`}
      >
         {messages.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
             <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
               <MessageCircle className="h-12 w-12 text-primary/50" />
             </div>
             <h3 className="text-lg font-semibold mb-2">Start the conversation!</h3>
             <p className="text-sm text-muted-foreground max-w-xs">
               Send a message to your teammates and get the chat going
             </p>
           </div>
         ) : (
           <div className="py-2">
             {groupedMessages.map((group) => (
               <div key={group.date}>
                 <DateDivider date={group.date} />
                 <div className="space-y-1">
                   {group.messages.map((msg) => {
                     const isOwnMessage = msg.sender_id === user?.id;
                     const canModify = canModifyMessage(msg);
                     const isEditing = editingMessageId === msg.id;
                     const repliedMessage = getReplyMessage(msg.reply_to);
                     const seenCount = getSeenCount(msg);
 
                     return (
                       <MessageBubble
                         key={msg.id}
                         id={msg.id}
                         content={msg.content}
                         senderId={msg.sender_id}
                        senderName={msg.sender?.in_game_name || msg.sender?.username || 'Player'}
                         senderAvatar={msg.sender?.avatar_url || undefined}
                         timestamp={msg.created_at}
                         isOwn={isOwnMessage}
                         isEdited={msg.is_edited}
                         seenCount={seenCount}
                         totalMembers={teamMembers.length}
                         replyTo={repliedMessage ? {
                          senderName: repliedMessage.sender?.in_game_name || repliedMessage.sender?.username || 'Player',
                           content: repliedMessage.content,
                         } : null}
                         reactions={msg.reactions}
                         canModify={canModify}
                         onReply={() => handleReply(msg)}
                         onEdit={() => handleStartEdit(msg)}
                         onDelete={() => handleDeleteMessage(msg.id)}
                         onReact={(emoji) => handleReaction(msg.id, emoji)}
                         onViewSeenBy={() => handleViewSeenBy(msg)}
                         isEditing={isEditing}
                         editContent={editContent}
                         onEditChange={setEditContent}
                         onEditSave={() => handleSaveEdit(msg.id)}
                         onEditCancel={handleCancelEdit}
                       />
                     );
                   })}
                 </div>
               </div>
             ))}
           </div>
         )}
 
         {/* Typing indicator */}
         <TypingIndicator typingUsers={typingUsers} />
       </div>
 
       {/* WhatsApp-style Composer */}
       <ChatComposer
         value={newMessage}
         onChange={handleInputChange}
         onSend={handleSendMessage}
         onTyping={broadcastTyping}
         disabled={sending}
         replyingTo={replyingTo ? {
           id: replyingTo.id,
          senderName: replyingTo.sender?.in_game_name || replyingTo.sender?.username || 'Player',
           content: replyingTo.content,
         } : null}
         onCancelReply={cancelReply}
         placeholder="Type a message..."
       />

      {/* Seen By Dialog */}
      <SeenByDialog
        open={seenByDialogOpen}
        onOpenChange={setSeenByDialogOpen}
        seenBy={selectedMessageForSeenBy?.seen_by || []}
        teamMembers={teamMembers}
        senderId={selectedMessageForSeenBy?.sender_id || ''}
      />

      {/* Background Picker */}
      <BackgroundPicker
        open={backgroundPickerOpen}
        onOpenChange={setBackgroundPickerOpen}
        currentBackground={chatBackground}
        onSelectBackground={setChatBackground}
      />
     </div>
   );
 };
 
 export default ChatPage;