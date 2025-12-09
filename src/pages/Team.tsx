import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  Gamepad2
} from 'lucide-react';

// Mock friends data
const mockFriends = [
  { id: '1', name: 'KRISHNA JHA2', avatar: '', status: 'online', activity: 'Playing Free Fire - Ranked', game_uid: 'FF123456' },
  { id: '2', name: 'ProGamer99', avatar: '', status: 'in_match', activity: 'In Match - BGMI Classic', game_uid: 'BG789012' },
  { id: '3', name: 'SquadLeader', avatar: '', status: 'offline', activity: 'Last seen 2h ago', game_uid: 'FF345678' },
  { id: '4', name: 'NinjaWarrior', avatar: '', status: 'online', activity: 'Playing BGMI - TDM', game_uid: 'BG901234' },
  { id: '5', name: 'FireStorm', avatar: '', status: 'offline', activity: 'Last seen 1d ago', game_uid: 'FF567890' },
];

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: Date;
  isMe: boolean;
}

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState('squad');
  const [friends, setFriends] = useState(mockFriends);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendUid, setFriendUid] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', senderId: '1', senderName: 'KRISHNA JHA2', senderAvatar: '', text: 'Hey squad! Anyone up for a match?', timestamp: new Date(Date.now() - 3600000), isMe: false },
    { id: '2', senderId: 'me', senderName: 'You', senderAvatar: '', text: 'Yeah, I\'m ready! Let\'s go 🔥', timestamp: new Date(Date.now() - 3000000), isMe: true },
    { id: '3', senderId: '2', senderName: 'ProGamer99', senderAvatar: '', text: 'Count me in! Starting in 5 mins?', timestamp: new Date(Date.now() - 1800000), isMe: false },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'in_match': return 'bg-orange-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'in_match': return 'In Match';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const handleAddFriend = () => {
    if (!friendUid.trim()) {
      toast({ title: 'Error', description: 'Please enter a Player UID.', variant: 'destructive' });
      return;
    }

    // Mock request sent
    toast({ title: 'Request Sent!', description: `Friend request sent to UID: ${friendUid}` });
    setFriendUid('');
    setAddFriendOpen(false);
  };

  const handleRemoveFriend = (friendId: string) => {
    setFriends(prev => prev.filter(f => f.id !== friendId));
    toast({ title: 'Friend Removed', description: 'Player has been removed from your squad.' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    setSending(true);
    
    const message: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      senderName: 'You',
      senderAvatar: '',
      text: newMessage,
      timestamp: new Date(),
      isMe: true,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const onlineFriendsCount = friends.filter(f => f.status === 'online' || f.status === 'in_match').length;

  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.game_uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate('/profile')} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <h1 className="font-gaming font-bold">Team Hub</h1>
            <p className="text-xs text-muted-foreground">{onlineFriendsCount} friends online</p>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-3">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="squad" className="gap-2">
              <Users className="h-4 w-4" />
              My Squad
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Team Chat
            </TabsTrigger>
          </TabsList>
        </div>

        {/* My Squad Tab */}
        <TabsContent value="squad" className="flex-1 mt-0 p-4">
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

          {/* Online Friends Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Online Friends</span>
              <Badge variant="secondary" className="text-xs">{onlineFriendsCount}</Badge>
            </div>
          </div>

          {/* Friends List */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No friends found</p>
                  <p className="text-xs text-muted-foreground mt-1">Add friends using their Player UID</p>
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
                  >
                    {/* Avatar with Status */}
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {friend.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card ${getStatusColor(friend.status)}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{friend.name}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {getStatusText(friend.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Gamepad2 className="h-3 w-3" />
                        {friend.activity}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                        title="Message"
                      >
                        <MessageCircle className="h-4 w-4 text-primary" />
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
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

        {/* Team Chat Tab */}
        <TabsContent value="chat" className="flex-1 mt-0 flex flex-col">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${message.isMe ? 'flex-row-reverse' : ''}`}
                >
                  {!message.isMe && (
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={message.senderAvatar} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {message.senderName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[75%] ${message.isMe ? 'items-end' : 'items-start'}`}>
                    {!message.isMe && (
                      <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">{message.senderName}</p>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2 ${
                        message.isMe
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                    <p className={`text-[10px] text-muted-foreground mt-0.5 ${message.isMe ? 'text-right mr-1' : 'ml-1'}`}>
                      {formatTime(message.timestamp)}
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
                variant="gaming"
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
              <label className="text-sm font-medium">Enter Player UID</label>
              <Input
                placeholder="e.g., FF123456789"
                value={friendUid}
                onChange={(e) => setFriendUid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You can find your friend's UID in their profile page
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFriendOpen(false)}>
              Cancel
            </Button>
            <Button variant="gaming" onClick={handleAddFriend}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
