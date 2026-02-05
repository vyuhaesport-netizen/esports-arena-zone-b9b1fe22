import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  MessageSquare,
  Phone,
  Clock,
  CheckCircle,
  Send,
  Search,
  AlertTriangle,
  Inbox,
  CheckCheck,
  RotateCcw,
  User,
  Wallet,
  Gamepad2,
  Calendar,
  Mail,
  Hash,
  ArrowRight,
  Filter,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SupportTicket {
  id: string;
  user_id: string;
  topic: string;
  description: string;
  status: string;
  request_callback: boolean;
  attachments: unknown[];
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
  user_phone?: string | null;
  user_username?: string | null;
  user_ign?: string | null;
  user_uid?: string | null;
  user_wallet?: number;
  user_game?: string | null;
  user_joined?: string | null;
}

const AdminSupport = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('open');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');

  const { user, loading: authLoading, hasPermission } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('support:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('support:view')) {
      fetchTickets();
    }
  }, [hasPermission]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, phone, username, in_game_name, game_uid, wallet_balance, preferred_game, created_at')
        .in('user_id', userIds);

      const ticketsWithUsers: SupportTicket[] = (data || []).map(ticket => {
        const profile = profiles?.find(p => p.user_id === ticket.user_id);
        const attachmentsArray = Array.isArray(ticket.attachments) ? ticket.attachments : [];
        return {
          id: ticket.id,
          user_id: ticket.user_id,
          topic: ticket.topic,
          description: ticket.description,
          status: ticket.status,
          request_callback: ticket.request_callback || false,
          attachments: attachmentsArray,
          admin_response: ticket.admin_response,
          responded_by: ticket.responded_by,
          responded_at: ticket.responded_at,
          created_at: ticket.created_at,
          user_email: profile?.email || 'Unknown',
          user_name: profile?.full_name || 'Unknown',
          user_phone: profile?.phone || null,
          user_username: profile?.username || null,
          user_ign: profile?.in_game_name || null,
          user_uid: profile?.game_uid || null,
          user_wallet: profile?.wallet_balance || 0,
          user_game: profile?.preferred_game || null,
          user_joined: profile?.created_at || null,
        };
      });

      setTickets(ticketsWithUsers);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const callbackCount = tickets.filter(t => t.request_callback && t.status !== 'resolved').length;

  const getFilteredTickets = () => {
    let filtered = tickets;
    
    // Status filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(t => t.status === activeTab);
    }
    
    // Topic filter
    if (topicFilter !== 'all') {
      filtered = filtered.filter(t => t.topic === topicFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.user_name?.toLowerCase().includes(query) ||
        t.user_email?.toLowerCase().includes(query) ||
        t.user_username?.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open': 
        return { 
          color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', 
          icon: Inbox,
          label: 'Open'
        };
      case 'in_progress': 
        return { 
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', 
          icon: RotateCcw,
          label: 'In Progress'
        };
      case 'resolved': 
        return { 
          color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', 
          icon: CheckCheck,
          label: 'Resolved'
        };
      case 'closed': 
        return { 
          color: 'bg-muted text-muted-foreground border-border', 
          icon: CheckCircle,
          label: 'Closed'
        };
      default: 
        return { 
          color: 'bg-muted text-muted-foreground border-border', 
          icon: MessageSquare,
          label: status
        };
    }
  };

  const getTopicConfig = (topic: string) => {
    const configs: Record<string, { label: string; color: string; priority: number }> = {
      payment: { label: 'Payment Issue', color: 'bg-red-500/10 text-red-600', priority: 1 },
      tournament: { label: 'Tournament Bug', color: 'bg-purple-500/10 text-purple-600', priority: 2 },
      account: { label: 'Account Problem', color: 'bg-orange-500/10 text-orange-600', priority: 3 },
      organizer: { label: 'Organizer Report', color: 'bg-blue-500/10 text-blue-600', priority: 4 },
      other: { label: 'Other', color: 'bg-muted text-muted-foreground', priority: 5 },
    };
    return configs[topic] || configs.other;
  };

  const handleRespond = async (newStatus: string) => {
    if (!selectedTicket) return;
    if (!hasPermission('support:manage')) {
      toast({ title: 'Access Denied', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        responded_by: user?.id,
        responded_at: new Date().toISOString(),
      };

      if (responseText.trim()) {
        updateData.admin_response = responseText.trim();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Ticket updated successfully.' });
      setSheetOpen(false);
      setSelectedTicket(null);
      setResponseText('');
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({ title: 'Error', description: 'Failed to update ticket.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const openTicketSheet = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResponseText(ticket.admin_response || '');
    setSheetOpen(true);
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Support">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const filteredTickets = getFilteredTickets();

  return (
    <AdminLayout title="Support Center">
      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'open' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setActiveTab('open')}
          >
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-1">
                <Inbox className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-xl font-bold">{openCount}</p>
              <p className="text-[10px] text-muted-foreground">Open</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'in_progress' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('in_progress')}
          >
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center mb-1">
                <RotateCcw className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xl font-bold">{inProgressCount}</p>
              <p className="text-[10px] text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all ${activeTab === 'resolved' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setActiveTab('resolved')}
          >
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-1">
                <CheckCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold">{resolvedCount}</p>
              <p className="text-[10px] text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer" onClick={() => setActiveTab('all')}>
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-1">
                <Phone className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-xl font-bold">{callbackCount}</p>
              <p className="text-[10px] text-muted-foreground">Callbacks</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets, users, emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-32 bg-background">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="all">All Topics</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="tournament">Tournament</SelectItem>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="organizer">Organizer</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchTickets}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="open" className="text-xs data-[state=active]:bg-amber-500/20">
              Open ({openCount})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs data-[state=active]:bg-blue-500/20">
              Progress ({inProgressCount})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs data-[state=active]:bg-emerald-500/20">
              Resolved ({resolvedCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              All ({tickets.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tickets List */}
        <div className="space-y-2">
          {filteredTickets.map((ticket) => {
            const statusConfig = getStatusConfig(ticket.status);
            const topicConfig = getTopicConfig(ticket.topic);
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card 
                key={ticket.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => openTicketSheet(ticket)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {ticket.user_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">
                          {ticket.user_name}
                        </span>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${topicConfig.color}`}>
                          {topicConfig.label}
                        </Badge>
                        {ticket.request_callback && (
                          <Badge className="bg-destructive/10 text-destructive text-[9px] px-1.5 py-0">
                            <Phone className="h-2.5 w-2.5 mr-0.5" />
                            Callback
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {ticket.description}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </span>
                        <span className="truncate">{ticket.user_email}</span>
                      </div>
                    </div>
                    
                    {/* Status & Arrow */}
                    <div className="flex flex-col items-end gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-2 py-0.5 ${statusConfig.color}`}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredTickets.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No tickets found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? 'Try a different search term' : 'All caught up!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">Ticket Details</SheetTitle>
              {selectedTicket && (
                <Badge 
                  variant="outline" 
                  className={getStatusConfig(selectedTicket.status).color}
                >
                  {getStatusConfig(selectedTicket.status).label}
                </Badge>
              )}
            </div>
          </SheetHeader>
          
          {selectedTicket && (
            <ScrollArea className="h-[calc(100vh-100px)]">
              <div className="space-y-4 py-4">
                {/* Ticket ID & Topic */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {selectedTicket.id.slice(0, 8)}
                    </code>
                  </div>
                  <Badge className={getTopicConfig(selectedTicket.topic).color}>
                    {getTopicConfig(selectedTicket.topic).label}
                  </Badge>
                </div>

                {/* User Info Card */}
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/30">
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {selectedTicket.user_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{selectedTicket.user_name}</p>
                        <p className="text-xs text-muted-foreground">@{selectedTicket.user_username || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary/20">
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{selectedTicket.user_email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{selectedTicket.user_phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{selectedTicket.user_ign || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{selectedTicket.user_uid || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">₹{selectedTicket.user_wallet?.toFixed(0) || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {selectedTicket.user_joined 
                            ? format(new Date(selectedTicket.user_joined), 'MMM dd, yyyy')
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Callback Warning */}
                {selectedTicket.request_callback && selectedTicket.user_phone && (
                  <Card className="bg-destructive/5 border-destructive/30">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-destructive">Callback Requested</p>
                        <p className="text-xs text-muted-foreground">
                          User wants a call on: <span className="font-medium">{selectedTicket.user_phone}</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Description */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Issue Description</Label>
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.description}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Submitted {format(new Date(selectedTicket.created_at), 'MMMM dd, yyyy • HH:mm')}
                  </p>
                </div>

                {/* Attachments */}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Attachments</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTicket.attachments.map((url, i) => (
                        <a 
                          key={i} 
                          href={String(url)}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs hover:bg-primary/20 transition-colors"
                        >
                          Attachment {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous Response */}
                {selectedTicket.admin_response && selectedTicket.responded_at && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Previous Response</Label>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                      <p className="text-sm whitespace-pre-wrap">{selectedTicket.admin_response}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Responded {format(new Date(selectedTicket.responded_at), 'MMM dd, yyyy • HH:mm')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Admin Response */}
                {hasPermission('support:manage') && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-medium">Your Response</Label>
                    <Textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Type your response to the user..."
                      className="min-h-[120px] resize-none"
                    />
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRespond('in_progress')}
                        disabled={processing}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        In Progress
                      </Button>
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleRespond('resolved')}
                        disabled={processing}
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCheck className="h-4 w-4 mr-2" />
                        )}
                        Resolve Ticket
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default AdminSupport;
