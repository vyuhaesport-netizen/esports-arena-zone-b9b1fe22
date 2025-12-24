import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  MessageSquare,
  Eye,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Send
} from 'lucide-react';
import { format } from 'date-fns';

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
  const [viewDialog, setViewDialog] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [processing, setProcessing] = useState(false);

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

      // Fetch user details for each ticket
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

  const getFilteredTickets = () => {
    if (activeTab === 'all') return tickets;
    return tickets.filter(t => t.status === activeTab);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">Open</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500/10 text-blue-600 text-[10px]">In Progress</Badge>;
      case 'resolved': return <Badge className="bg-green-500/10 text-green-600 text-[10px]">Resolved</Badge>;
      case 'closed': return <Badge variant="secondary" className="text-[10px]">Closed</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  const getTopicLabel = (topic: string) => {
    const topics: Record<string, string> = {
      payment: 'Payment Issue',
      tournament: 'Tournament Bug',
      account: 'Account Problem',
      organizer: 'Organizer Report',
      other: 'Other',
    };
    return topics[topic] || topic;
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
      setViewDialog(false);
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

  if (authLoading || loading) {
    return (
      <AdminLayout title="Support">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Support Tickets">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">In Progress</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">Resolved</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tickets List */}
        <div className="space-y-3">
          {getFilteredTickets().map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{getTopicLabel(ticket.topic)}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.user_name} • {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>

                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                  {ticket.description}
                </p>

                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span>{ticket.user_email}</span>
                  {ticket.request_callback && ticket.user_phone && (
                    <span className="flex items-center gap-1 text-primary">
                      <Phone className="h-3 w-3" /> Callback requested
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setResponseText(ticket.admin_response || '');
                      setViewDialog(true);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" /> View & Respond
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {getFilteredTickets().length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          )}
        </div>
      </div>

      {/* View & Respond Dialog */}
      <Dialog open={viewDialog} onOpenChange={() => {
        setViewDialog(false);
        setSelectedTicket(null);
        setResponseText('');
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{getTopicLabel(selectedTicket.topic)}</Badge>
                {getStatusBadge(selectedTicket.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p className="font-medium">{selectedTicket.user_name}</p>
                  <p className="text-xs text-muted-foreground">@{selectedTicket.user_username || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{selectedTicket.user_email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="font-medium text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(selectedTicket.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {/* User Details Card */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">User Details</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Phone: </span>
                    <span className="font-medium">{selectedTicket.user_phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Game: </span>
                    <span className="font-medium">{selectedTicket.user_game || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IGN: </span>
                    <span className="font-medium">{selectedTicket.user_ign || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">UID: </span>
                    <span className="font-medium">{selectedTicket.user_uid || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Wallet: </span>
                    <span className="font-medium">₹{selectedTicket.user_wallet?.toFixed(0) || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Joined: </span>
                    <span className="font-medium">{selectedTicket.user_joined ? format(new Date(selectedTicket.user_joined), 'MMM dd, yyyy') : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                  {selectedTicket.description}
                </p>
              </div>

              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Attachments</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTicket.attachments.map((url, i) => (
                      <a 
                        key={i} 
                        href={String(url)}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {hasPermission('support:manage') && (
                <>
                  <div className="space-y-2">
                    <Label>Admin Response</Label>
                    <Textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Type your response to the user..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <DialogFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleRespond('in_progress')}
                      disabled={processing}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Mark In Progress
                    </Button>
                    <Button
                      onClick={() => handleRespond('resolved')}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Resolve
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSupport;