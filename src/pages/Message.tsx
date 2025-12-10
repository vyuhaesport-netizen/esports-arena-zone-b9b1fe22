import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  MoreVertical,
  Camera,
  Paperclip
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
}

const MessagePage = () => {
  const [activeTab, setActiveTab] = useState('chats');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [adminBroadcasts, setAdminBroadcasts] = useState<AdminBroadcast[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, groupMessages]);

  // Realtime for direct messages
  useEffect(() => {
    if (selectedFriend && user) {
      fetchChatMessages(selectedFriend);
      
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
            const friendUserId = selectedFriend.requester_id === user.id 
              ? selectedFriend.recipient_id 
              : selectedFriend.requester_id;
            
            if ((newMsg.sender_id === friendUserId && newMsg.recipient_id === user.id) ||
                (newMsg.sender_id === user.id && newMsg.recipient_id === friendUserId)) {
              setChatMessages(prev => [...prev, newMsg]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedFriend, user]);

  // Realtime for group messages
  useEffect(() => {
    if (selectedGroup && user) {
      fetchGroupMessages(selectedGroup.id);
      
      const channel = supabase
        .channel('group-messages-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'group_messages',
            filter: `group_id=eq.${selectedGroup.id}`,
          },
          async (payload) => {
            const newMsg = payload.new as GroupMessage;
            // Fetch sender profile
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
  }, [selectedGroup, user]);

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
          
          return { ...friend, profile: profile || { user_id: friendUserId, username: null, full_name: null, avatar_url: null } };
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
        .limit(20);

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

        setGroups(groupsData || []);
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

      // Add creator as admin
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin'
      });

      // Add selected members
      if (selectedMembers.length > 0) {
        const members = selectedMembers.map(userId => ({
          group_id: group.id,
          user_id: userId,
          role: 'member'
        }));
        await supabase.from('group_members').insert(members);

        // Notify members
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

  const handleRemoveFriend = async (friend: Friend) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friend.id);

      if (error) throw error;

      setFriends(prev => prev.filter(f => f.id !== friend.id));
      if (selectedFriend?.id === friend.id) {
        setSelectedFriend(null);
        setChatMessages([]);
      }
      toast({ title: 'Friend Removed' });
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);

    if (selectedFriend) {
      const friendUserId = selectedFriend.requester_id === user.id 
        ? selectedFriend.recipient_id 
        : selectedFriend.requester_id;

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
    } else if (selectedGroup) {
      try {
        const { error } = await supabase
          .from('group_messages')
          .insert({
            group_id: selectedGroup.id,
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
    if (!file || !user) return;

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

      if (selectedFriend) {
        const friendUserId = selectedFriend.requester_id === user.id 
          ? selectedFriend.recipient_id 
          : selectedFriend.requester_id;

        await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: friendUserId,
          content: file.name,
          message_type: messageType,
          media_url: publicUrl
        });
      } else if (selectedGroup) {
        await supabase.from('group_messages').insert({
          group_id: selectedGroup.id,
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

  const filteredFriends = friends.filter(f =>
    f.profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Chat view when a friend or group is selected
  if (selectedFriend || selectedGroup) {
    const isGroup = !!selectedGroup;
    const chatName = isGroup 
      ? selectedGroup?.name 
      : (selectedFriend?.profile.full_name || selectedFriend?.profile.username || 'User');
    const chatAvatar = isGroup 
      ? selectedGroup?.avatar_url 
      : selectedFriend?.profile.avatar_url;
    const messages = isGroup ? groupMessages : chatMessages;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Chat Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={() => { setSelectedFriend(null); setSelectedGroup(null); }} className="p-2 -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={chatAvatar || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {isGroup ? <Users className="h-4 w-4" /> : chatName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm">{chatName}</p>
              {!isGroup && selectedFriend?.profile.username && (
                <p className="text-xs text-muted-foreground">@{selectedFriend.profile.username}</p>
              )}
              {isGroup && (
                <p className="text-xs text-muted-foreground">Group Chat</p>
              )}
            </div>
            <button className="p-2">
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Messages Area */}
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
                >
                  <div className={`max-w-[75%]`}>
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
                      ) : (
                        <p className="text-sm px-3 py-2">{message.content}</p>
                      )}
                    </div>
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

        {/* Input Area */}
        <div className="p-3 border-t border-border bg-card">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,video/*,audio/*"
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
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </button>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 rounded-full bg-muted border-0"
            />
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <Mic className="h-5 w-5 text-muted-foreground" />
            </button>
            <Button
              variant="default"
              size="icon"
              className="rounded-full"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate('/profile')} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-full object-cover" />
          <div className="flex-1">
            <h1 className="font-gaming font-bold">Messages</h1>
            <p className="text-xs text-muted-foreground">{friends.length} friends • {groups.length} groups</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCreateGroupOpen(true)}
            title="Create Group"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddFriendOpen(true)}
            className="gap-1"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="px-4 pt-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Friend Requests
            <Badge variant="secondary">{pendingRequests.length}</Badge>
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div key={request.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.profile.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(request.profile.full_name || request.profile.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{request.profile.full_name || request.profile.username || 'User'}</p>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-3">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="chats" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Users className="h-4 w-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="vyuha" className="gap-2">
              <img src={vyuhaLogo} alt="" className="h-4 w-4 rounded-full" />
              Vyuha
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Chats Tab */}
        <TabsContent value="chats" className="flex-1 mt-0 p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No chats yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add friends to start chatting</p>
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => setSelectedFriend(friend)}
                    className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={friend.profile.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {(friend.profile.full_name || friend.profile.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{friend.profile.full_name || friend.profile.username || 'User'}</p>
                      {friend.profile.username && (
                        <p className="text-xs text-muted-foreground">@{friend.profile.username}</p>
                      )}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend); }}
                      className="p-2 rounded-full hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove Friend"
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="flex-1 mt-0 p-4">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {groups.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No groups yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setCreateGroupOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={group.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Users className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground">Group Chat</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Vyuha Tab (Admin Broadcasts) */}
        <TabsContent value="vyuha" className="flex-1 mt-0 p-4">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3">
              {adminBroadcasts.length === 0 ? (
                <div className="text-center py-12">
                  <img src={vyuhaLogo} alt="" className="h-16 w-16 mx-auto rounded-full mb-3 opacity-30" />
                  <p className="text-muted-foreground text-sm">No messages from Vyuha yet</p>
                </div>
              ) : (
                adminBroadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="bg-card border border-primary/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <img 
                        src={vyuhaLogo} 
                        alt="Vyuha" 
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">Vyuha Esport</p>
                          <Badge variant="secondary" className="text-[10px]">Official</Badge>
                        </div>
                        <p className="font-medium text-sm">{broadcast.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{broadcast.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {format(new Date(broadcast.created_at), 'MMM dd, hh:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

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
