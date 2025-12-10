import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import {
  ArrowLeft,
  Users,
  MessageCircle,
  UserMinus,
  UserPlus,
  Send,
  Search,
  Loader2,
  Check,
  X,
  Plus,
  Image as ImageIcon,
  Mic,
  Smile,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  MoreVertical,
  Camera,
  Paperclip,
  Trash2,
  Reply,
  Copy,
  MicOff,
  Play,
  Pause,
  Volume2
} from 'lucide-react';
import { format } from 'date-fns';

interface Friend {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  profile: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  is_admin_message: boolean;
  message_type?: string;
  media_url?: string;
  created_at: string;
  reactions?: string[];
}

interface AdminBroadcast {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  created_at: string;
  sender_profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  reactions?: string[];
}

interface ChatItem {
  id: string;
  type: 'friend' | 'group' | 'vyuha';
  name: string;
  avatar: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  data: Friend | ChatGroup | null;
}

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

const MessagePage = () => {
  const [chatList, setChatList] = useState<ChatItem[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [adminBroadcasts, setAdminBroadcasts] = useState<AdminBroadcast[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchPendingRequests();
      fetchAdminBroadcasts();
      fetchGroups();
    }
  }, [user]);

  useEffect(() => {
    // Build unified chat list
    const vyuhaChat: ChatItem = {
      id: 'vyuha',
      type: 'vyuha',
      name: 'Vyuha Esport',
      avatar: vyuhaLogo,
      lastMessage: adminBroadcasts[0]?.message || 'Official announcements',
      lastMessageTime: adminBroadcasts[0]?.created_at,
      unreadCount: adminBroadcasts.length > 0 ? 1 : 0,
      isOnline: true,
      data: null
    };

    const friendChats: ChatItem[] = friends.map(friend => ({
      id: friend.id,
      type: 'friend' as const,
      name: friend.profile.full_name || friend.profile.username || 'User',
      avatar: friend.profile.avatar_url,
      lastMessage: friend.lastMessage,
      lastMessageTime: friend.lastMessageTime,
      unreadCount: friend.unreadCount,
      data: friend
    }));

    const groupChats: ChatItem[] = groups.map(group => ({
      id: group.id,
      type: 'group' as const,
      name: group.name,
      avatar: group.avatar_url,
      lastMessage: group.lastMessage,
      lastMessageTime: group.lastMessageTime,
      data: group
    }));

    // Sort by last message time, Vyuha always at top
    const allChats = [...friendChats, ...groupChats].sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    setChatList([vyuhaChat, ...allChats]);
  }, [friends, groups, adminBroadcasts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, groupMessages]);

  // Realtime for direct messages
  useEffect(() => {
    if (selectedChat?.type === 'friend' && user) {
      const friend = selectedChat.data as Friend;
      fetchChatMessages(friend);
      
      const channel = supabase
        .channel('messages-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const newMsg = payload.new as Message;
            const friendUserId = friend.requester_id === user.id 
              ? friend.recipient_id 
              : friend.requester_id;
            
            if ((newMsg.sender_id === friendUserId && newMsg.recipient_id === user.id) ||
                (newMsg.sender_id === user.id && newMsg.recipient_id === friendUserId)) {
              setChatMessages(prev => [...prev, newMsg]);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            setChatMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat, user]);

  // Realtime for group messages
  useEffect(() => {
    if (selectedChat?.type === 'group' && user) {
      const group = selectedChat.data as ChatGroup;
      fetchGroupMessages(group.id);
      
      const channel = supabase
        .channel('group-messages-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'group_messages',
            filter: `group_id=eq.${group.id}`,
          },
          async (payload) => {
            const newMsg = payload.new as GroupMessage;
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('user_id', newMsg.sender_id)
              .single();
            
            setGroupMessages(prev => [...prev, { ...newMsg, sender_profile: profile || undefined }]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat, user]);

  const fetchFriends = async () => {
    if (!user) return;
    
    try {
      const { data: requesterFriends } = await supabase
        .from('friends')
        .select('id, requester_id, recipient_id, status')
        .eq('requester_id', user.id)
        .eq('status', 'accepted');

      const { data: recipientFriends } = await supabase
        .from('friends')
        .select('id, requester_id, recipient_id, status')
        .eq('recipient_id', user.id)
        .eq('status', 'accepted');

      const allFriends = [...(requesterFriends || []), ...(recipientFriends || [])];
      
      const friendsWithProfiles = await Promise.all(
        allFriends.map(async (friend) => {
          const friendUserId = friend.requester_id === user.id ? friend.recipient_id : friend.requester_id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, full_name, avatar_url')
            .eq('user_id', friendUserId)
            .single();

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', friendUserId)
            .eq('recipient_id', user.id)
            .eq('is_read', false);
          
          return { 
            ...friend, 
            profile: profile || { user_id: friendUserId, username: null, full_name: null, avatar_url: null },
            lastMessage: lastMsg?.content,
            lastMessageTime: lastMsg?.created_at,
            unreadCount: count || 0
          };
        })
      );

      setFriends(friendsWithProfiles);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('friends')
        .select('id, requester_id, recipient_id, status')
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, full_name, avatar_url')
            .eq('user_id', request.requester_id)
            .single();
          
          return { ...request, profile: profile || { user_id: request.requester_id, username: null, full_name: null, avatar_url: null } };
        })
      );

      setPendingRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const fetchAdminBroadcasts = async () => {
    try {
      const { data } = await supabase
        .from('admin_broadcasts')
        .select('id, title, message, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      setAdminBroadcasts(data || []);
    } catch (error) {
      console.error('Error fetching admin broadcasts:', error);
    }
  };

  const fetchGroups = async () => {
    if (!user) return;
    
    try {
      const { data: memberOf } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberOf && memberOf.length > 0) {
        const groupIds = memberOf.map(m => m.group_id);
        const { data: groupsData } = await supabase
          .from('chat_groups')
          .select('*')
          .in('id', groupIds);

        // Get last message for each group
        const groupsWithLastMessage = await Promise.all(
          (groupsData || []).map(async (group) => {
            const { data: lastMsg } = await supabase
              .from('group_messages')
              .select('content, created_at')
              .eq('group_id', group.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...group,
              lastMessage: lastMsg?.content,
              lastMessageTime: lastMsg?.created_at
            };
          })
        );

        setGroups(groupsWithLastMessage);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchChatMessages = async (friend: Friend) => {
    if (!user) return;
    
    const friendUserId = friend.requester_id === user.id ? friend.recipient_id : friend.requester_id;
    
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      setChatMessages(data || []);

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', friendUserId)
        .eq('recipient_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchGroupMessages = async (groupId: string) => {
    try {
      const { data } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (data) {
        const messagesWithProfiles = await Promise.all(
          data.map(async (msg) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('user_id', msg.sender_id)
              .single();
            return { ...msg, sender_profile: profile || undefined };
          })
        );
        setGroupMessages(messagesWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching group messages:', error);
    }
  };

  const handleAddFriend = async () => {
    if (!friendUsername.trim() || !user) {
      toast({ title: 'Error', description: 'Please enter a username.', variant: 'destructive' });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', friendUsername.trim())
        .single();

      if (!profile) {
        toast({ title: 'User Not Found', description: 'No user found with that username.', variant: 'destructive' });
        return;
      }

      if (profile.user_id === user.id) {
        toast({ title: 'Error', description: "You can't add yourself as a friend.", variant: 'destructive' });
        return;
      }

      const { data: existing } = await supabase
        .from('friends')
        .select('id')
        .or(`and(requester_id.eq.${user.id},recipient_id.eq.${profile.user_id}),and(requester_id.eq.${profile.user_id},recipient_id.eq.${user.id})`)
        .single();

      if (existing) {
        toast({ title: 'Already Exists', description: 'Friend request already exists or you are already friends.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('friends')
        .insert({
          requester_id: user.id,
          recipient_id: profile.user_id,
          status: 'pending'
        });

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `Someone wants to be your friend!`,
        related_id: user.id
      });

      toast({ title: 'Request Sent!', description: `Friend request sent to @${friendUsername}` });
      setFriendUsername('');
      setAddFriendOpen(false);
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({ title: 'Error', description: 'Failed to send friend request.', variant: 'destructive' });
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !user) {
      toast({ title: 'Error', description: 'Please enter a group name.', variant: 'destructive' });
      return;
    }

    try {
      const { data: group, error } = await supabase
        .from('chat_groups')
        .insert({
          name: groupName.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin'
      });

      if (selectedMembers.length > 0) {
        const members = selectedMembers.map(userId => ({
          group_id: group.id,
          user_id: userId,
          role: 'member'
        }));
        await supabase.from('group_members').insert(members);

        const notifications = selectedMembers.map(userId => ({
          user_id: userId,
          type: 'group_invite',
          title: 'Added to Group',
          message: `You were added to group "${groupName}"`,
          related_id: group.id
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast({ title: 'Group Created!', description: `${groupName} has been created.` });
      setGroupName('');
      setSelectedMembers([]);
      setCreateGroupOpen(false);
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ title: 'Error', description: 'Failed to create group.', variant: 'destructive' });
    }
  };

  const handleAcceptRequest = async (request: Friend) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (error) throw error;

      toast({ title: 'Friend Added!', description: `You are now friends with ${request.profile.full_name || request.profile.username}` });
      fetchFriends();
      fetchPendingRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({ title: 'Error', description: 'Failed to accept request.', variant: 'destructive' });
    }
  };

  const handleRejectRequest = async (request: Friend) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      toast({ title: 'Request Rejected' });
      fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedChat) return;

    setSending(true);

    if (selectedChat.type === 'friend') {
      const friend = selectedChat.data as Friend;
      const friendUserId = friend.requester_id === user.id 
        ? friend.recipient_id 
        : friend.requester_id;

      try {
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: friendUserId,
            content: newMessage.trim(),
            message_type: 'text'
          });

        if (error) throw error;
        setNewMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
        toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
      }
    } else if (selectedChat.type === 'group') {
      const group = selectedChat.data as ChatGroup;
      try {
        const { error } = await supabase
          .from('group_messages')
          .insert({
            group_id: group.id,
            sender_id: user.id,
            content: newMessage.trim(),
            message_type: 'text'
          });

        if (error) throw error;
        setNewMessage('');
      } catch (error) {
        console.error('Error sending group message:', error);
        toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
      }
    }
    
    setSending(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedChat) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      const messageType = file.type.startsWith('image/') ? 'image' : 'file';

      if (selectedChat.type === 'friend') {
        const friend = selectedChat.data as Friend;
        const friendUserId = friend.requester_id === user.id 
          ? friend.recipient_id 
          : friend.requester_id;

        await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: friendUserId,
          content: file.name,
          message_type: messageType,
          media_url: publicUrl
        });
      } else if (selectedChat.type === 'group') {
        const group = selectedChat.data as ChatGroup;
        await supabase.from('group_messages').insert({
          group_id: group.id,
          sender_id: user.id,
          content: file.name,
          message_type: messageType,
          media_url: publicUrl
        });
      }

      toast({ title: 'Sent!', description: 'Media sent successfully.' });
    } catch (error) {
      console.error('Error uploading media:', error);
      toast({ title: 'Error', description: 'Failed to upload media.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({ title: 'Error', description: 'Could not access microphone.', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!user || !selectedChat || audioChunksRef.current.length === 0) return;

    try {
      const fileName = `voice-${user.id}-${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      if (selectedChat.type === 'friend') {
        const friend = selectedChat.data as Friend;
        const friendUserId = friend.requester_id === user.id 
          ? friend.recipient_id 
          : friend.requester_id;

        await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: friendUserId,
          content: `Voice message (${recordingTime}s)`,
          message_type: 'voice',
          media_url: publicUrl
        });
      } else if (selectedChat.type === 'group') {
        const group = selectedChat.data as ChatGroup;
        await supabase.from('group_messages').insert({
          group_id: group.id,
          sender_id: user.id,
          content: `Voice message (${recordingTime}s)`,
          message_type: 'voice',
          media_url: publicUrl
        });
      }

      toast({ title: 'Sent!', description: 'Voice message sent.' });
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({ title: 'Error', description: 'Failed to send voice message.', variant: 'destructive' });
    }
  };

  const handleDeleteMessage = async (messageId: string, isGroup: boolean) => {
    try {
      if (isGroup) {
        await supabase.from('group_messages').delete().eq('id', messageId);
        setGroupMessages(prev => prev.filter(m => m.id !== messageId));
      } else {
        await supabase.from('messages').delete().eq('id', messageId);
        setChatMessages(prev => prev.filter(m => m.id !== messageId));
      }
      toast({ title: 'Deleted', description: 'Message deleted.' });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
    setContextMenu(null);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied!', description: 'Message copied to clipboard.' });
    setContextMenu(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredChats = chatList.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Vyuha Chat View
  if (selectedChat?.type === 'vyuha') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={() => setSelectedChat(null)} className="p-2 -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar className="h-10 w-10 ring-2 ring-primary/50">
              <AvatarImage src={vyuhaLogo} />
              <AvatarFallback className="bg-primary text-primary-foreground">V</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">Vyuha Esport</p>
                <Badge variant="secondary" className="text-[10px]">Official</Badge>
              </div>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {adminBroadcasts.length === 0 ? (
              <div className="text-center py-12">
                <img src={vyuhaLogo} alt="" className="h-20 w-20 mx-auto rounded-full mb-4 opacity-50" />
                <p className="text-muted-foreground">No messages from Vyuha yet</p>
                <p className="text-xs text-muted-foreground mt-1">Official announcements will appear here</p>
              </div>
            ) : (
              adminBroadcasts.map((broadcast) => (
                <div key={broadcast.id} className="flex items-end gap-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={vyuhaLogo} />
                    <AvatarFallback>V</AvatarFallback>
                  </Avatar>
                  <div className="max-w-[80%]">
                    <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl rounded-bl-md p-3 border border-primary/20">
                      <p className="font-semibold text-sm text-primary">{broadcast.title}</p>
                      <p className="text-sm mt-1">{broadcast.message}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground ml-1 mt-0.5">
                      {format(new Date(broadcast.created_at), 'MMM dd, hh:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border bg-card">
          <div className="text-center text-xs text-muted-foreground py-2">
            This is an official broadcast channel. You cannot reply here.
          </div>
        </div>
      </div>
    );
  }

  // Chat View for Friend or Group
  if (selectedChat && (selectedChat.type === 'friend' || selectedChat.type === 'group')) {
    const isGroup = selectedChat.type === 'group';
    const messages = isGroup ? groupMessages : chatMessages;

    return (
      <div className="min-h-screen bg-background flex flex-col" onClick={() => setContextMenu(null)}>
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={() => setSelectedChat(null)} className="p-2 -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedChat.avatar || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {isGroup ? <Users className="h-5 w-5" /> : selectedChat.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{selectedChat.name}</p>
              <p className="text-xs text-muted-foreground">
                {isGroup ? 'Group Chat' : 'Tap for info'}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2">
                  <MoreVertical className="h-5 w-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isGroup && (
                  <DropdownMenuItem 
                    onClick={() => {
                      const friend = selectedChat.data as Friend;
                      supabase.from('friends').delete().eq('id', friend.id);
                      setSelectedChat(null);
                      fetchFriends();
                      toast({ title: 'Friend Removed' });
                    }}
                    className="text-destructive"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove Friend
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((message: any) => {
              const isOwn = message.sender_id === user?.id;
              const senderName = isGroup && !isOwn 
                ? (message.sender_profile?.full_name || message.sender_profile?.username || 'User')
                : null;

              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                  onContextMenu={(e) => {
                    if (isOwn) {
                      e.preventDefault();
                      setContextMenu({ messageId: message.id, x: e.clientX, y: e.clientY });
                    }
                  }}
                >
                  <div className={`max-w-[75%] relative group`}>
                    {senderName && (
                      <p className="text-[10px] text-primary ml-1 mb-0.5">{senderName}</p>
                    )}
                    <div
                      className={`rounded-2xl overflow-hidden ${
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      {message.message_type === 'image' && message.media_url ? (
                        <img 
                          src={message.media_url} 
                          alt="Shared" 
                          className="max-w-full rounded-lg"
                        />
                      ) : message.message_type === 'voice' && message.media_url ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <button className="p-1.5 rounded-full bg-white/20">
                            <Play className="h-4 w-4" />
                          </button>
                          <div className="flex-1 h-1 bg-white/30 rounded-full">
                            <div className="w-1/3 h-full bg-white rounded-full" />
                          </div>
                          <Volume2 className="h-4 w-4 opacity-70" />
                        </div>
                      ) : (
                        <p className="text-sm px-3 py-2">{message.content}</p>
                      )}
                    </div>

                    {/* Quick reactions on long press for own messages */}
                    {isOwn && (
                      <button 
                        onClick={() => setShowReactions(showReactions === message.id ? null : message.id)}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Smile className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}

                    {showReactions === message.id && (
                      <div className="absolute bottom-full mb-2 left-0 bg-card rounded-full shadow-lg border border-border flex gap-1 p-1">
                        {REACTIONS.map(emoji => (
                          <button 
                            key={emoji} 
                            onClick={() => setShowReactions(null)}
                            className="hover:scale-125 transition-transform text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <p className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                      {format(new Date(message.created_at), 'hh:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Context Menu */}
        {contextMenu && (
          <div 
            className="fixed bg-card rounded-lg shadow-lg border border-border py-1 z-50"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button 
              onClick={() => handleCopyMessage(chatMessages.find(m => m.id === contextMenu.messageId)?.content || '')}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
            <button 
              onClick={() => handleDeleteMessage(contextMenu.messageId, isGroup)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 border-t border-border bg-card">
          {isRecording ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={cancelRecording}
                className="p-2 rounded-full bg-destructive/10 text-destructive"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex-1 flex items-center gap-2">
                <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive animate-pulse" 
                    style={{ width: `${Math.min(recordingTime * 3, 100)}%` }}
                  />
                </div>
              </div>
              <button 
                onClick={stopRecording}
                className="p-2 rounded-full bg-primary text-primary-foreground"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 rounded-full bg-muted border-0"
              />
              {newMessage.trim() ? (
                <Button
                  variant="default"
                  size="icon"
                  className="rounded-full"
                  onClick={handleSendMessage}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <button 
                  onClick={startRecording}
                  className="p-2.5 rounded-full bg-primary text-primary-foreground"
                >
                  <Mic className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Chat List View
  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate('/profile')} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-gaming font-bold text-lg">Chats</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCreateGroupOpen(true)}
            title="Create Group"
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAddFriendOpen(true)}
          >
            <UserPlus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full bg-muted border-0"
          />
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            FRIEND REQUESTS
            <Badge variant="destructive" className="text-[10px]">{pendingRequests.length}</Badge>
          </p>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div key={request.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.profile.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(request.profile.full_name || request.profile.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{request.profile.full_name || request.profile.username || 'User'}</p>
                  {request.profile.username && (
                    <p className="text-xs text-muted-foreground">@{request.profile.username}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => handleAcceptRequest(request)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRejectRequest(request)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="px-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No chats yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add friends to start chatting</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className={`h-12 w-12 ${chat.type === 'vyuha' ? 'ring-2 ring-primary/50' : ''}`}>
                      <AvatarImage src={chat.avatar || ''} />
                      <AvatarFallback className={`${chat.type === 'vyuha' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                        {chat.type === 'group' ? <Users className="h-5 w-5" /> : chat.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {chat.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{chat.name}</p>
                        {chat.type === 'vyuha' && (
                          <Badge variant="secondary" className="text-[10px]">Official</Badge>
                        )}
                        {chat.type === 'group' && (
                          <Badge variant="outline" className="text-[10px]">Group</Badge>
                        )}
                      </div>
                      {chat.lastMessageTime && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(chat.lastMessageTime), 'hh:mm a')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {chat.lastMessage || 'Start a conversation'}
                      </p>
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Friend Dialog */}
      <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Friend
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter Username</label>
              <Input
                placeholder="@username"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find your friend's username on their profile page
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFriendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFriend}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Create Group
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            {friends.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Members</label>
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {friends.map((friend) => {
                      const friendUserId = friend.requester_id === user?.id 
                        ? friend.recipient_id 
                        : friend.requester_id;
                      const isSelected = selectedMembers.includes(friendUserId);
                      
                      return (
                        <div 
                          key={friend.id}
                          onClick={() => toggleMemberSelection(friendUserId)}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={friend.profile.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {(friend.profile.full_name || friend.profile.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{friend.profile.full_name || friend.profile.username}</p>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                {selectedMembers.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedMembers.length} members selected</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGroupOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={!groupName.trim()}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagePage;
