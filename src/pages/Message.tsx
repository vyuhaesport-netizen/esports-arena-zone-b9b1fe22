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
  Shield
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
  created_at: string;
  sender_profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface AdminBroadcast {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

const MessagePage = () => {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminBroadcasts, setAdminBroadcasts] = useState<AdminBroadcast[]>([]);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (selectedFriend && user) {
      fetchChatMessages(selectedFriend);
      
      // Set up realtime subscription for messages
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

  const fetchFriends = async () => {
    if (!user) return;
    
    try {
      // Get accepted friends where user is requester
      const { data: requesterFriends } = await supabase
        .from('friends')
        .select('id, requester_id, recipient_id, status')
        .eq('requester_id', user.id)
        .eq('status', 'accepted');

      // Get accepted friends where user is recipient
      const { data: recipientFriends } = await supabase
        .from('friends')
        .select('id, requester_id, recipient_id, status')
        .eq('recipient_id', user.id)
        .eq('status', 'accepted');

      const allFriends = [...(requesterFriends || []), ...(recipientFriends || [])];
      
      // Fetch profiles for friends
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
        .eq('broadcast_type', 'message')
        .order('created_at', { ascending: false })
        .limit(20);

      setAdminBroadcasts(data || []);
    } catch (error) {
      console.error('Error fetching admin broadcasts:', error);
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

      // Mark messages as read
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

  const handleAddFriend = async () => {
    if (!friendUsername.trim() || !user) {
      toast({ title: 'Error', description: 'Please enter a username.', variant: 'destructive' });
      return;
    }

    try {
      // Find user by username
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

      // Check if already friends or request exists
      const { data: existing } = await supabase
        .from('friends')
        .select('id')
        .or(`and(requester_id.eq.${user.id},recipient_id.eq.${profile.user_id}),and(requester_id.eq.${profile.user_id},recipient_id.eq.${user.id})`)
        .single();

      if (existing) {
        toast({ title: 'Already Exists', description: 'Friend request already exists or you are already friends.', variant: 'destructive' });
        return;
      }

      // Create friend request
      const { error } = await supabase
        .from('friends')
        .insert({
          requester_id: user.id,
          recipient_id: profile.user_id,
          status: 'pending'
        });

      if (error) throw error;

      // Create notification for recipient
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
    if (!newMessage.trim() || !selectedFriend || !user) return;

    setSending(true);
    const friendUserId = selectedFriend.requester_id === user.id 
      ? selectedFriend.recipient_id 
      : selectedFriend.requester_id;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: friendUserId,
          content: newMessage.trim()
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

  // Chat view when a friend is selected
  if (selectedFriend) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Chat Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={() => setSelectedFriend(null)} className="p-2 -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={selectedFriend.profile.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {(selectedFriend.profile.full_name || selectedFriend.profile.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm">{selectedFriend.profile.full_name || selectedFriend.profile.username || 'User'}</p>
              {selectedFriend.profile.username && (
                <p className="text-xs text-muted-foreground">@{selectedFriend.profile.username}</p>
              )}
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${message.sender_id === user?.id ? 'flex-row-reverse' : ''}`}
              >
                <div className={`max-w-[75%]`}>
                  <div
                    className={`rounded-2xl px-3 py-2 ${
                      message.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <p className={`text-[10px] text-muted-foreground mt-0.5 ${message.sender_id === user?.id ? 'text-right mr-1' : 'ml-1'}`}>
                    {format(new Date(message.created_at), 'hh:mm a')}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              variant="default"
              size="icon"
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
          <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <h1 className="font-gaming font-bold">Messages</h1>
            <p className="text-xs text-muted-foreground">{friends.length} friends</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddFriendOpen(true)}
            className="gap-1"
          >
            <UserPlus className="h-4 w-4" />
            Add
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
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="friends" className="gap-2">
              <Users className="h-4 w-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2">
              <Shield className="h-4 w-4" />
              Admin
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Friends Tab */}
        <TabsContent value="friends" className="flex-1 mt-0 p-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Friends List */}
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No friends yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add friends using their username</p>
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
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

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedFriend(friend)}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                        title="Message"
                      >
                        <MessageCircle className="h-4 w-4 text-primary" />
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend)}
                        className="p-2 rounded-full hover:bg-destructive/10 transition-colors"
                        title="Remove Friend"
                      >
                        <UserMinus className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Admin Announcements Tab */}
        <TabsContent value="announcements" className="flex-1 mt-0 p-4">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3">
              {adminBroadcasts.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No announcements yet</p>
                </div>
              ) : (
                adminBroadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="bg-card border border-primary/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{broadcast.title}</p>
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
    </div>
  );
};

export default MessagePage;