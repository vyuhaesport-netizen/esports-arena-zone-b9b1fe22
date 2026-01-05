import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send, Loader2, MessageCircle, Trash2, Info } from 'lucide-react';
import { format } from 'date-fns';
import vyuhaLogo from '@/assets/vyuha-logo.png';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  broadcast_type: string;
  target_audience: string;
  created_at: string;
}

const AdminNotifications = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; broadcast: Broadcast | null }>({
    open: false,
    broadcast: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    broadcast_type: 'notification',
    target_audience: 'all'
  });

  const { user, hasPermission, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const canView = hasPermission('notifications:view') || isSuperAdmin;
  const canManage = hasPermission('notifications:manage') || isSuperAdmin;

  useEffect(() => {
    if (!canView) {
      navigate('/admin');
      return;
    }
    fetchBroadcasts();
  }, [canView, navigate]);

  const fetchBroadcasts = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBroadcasts(data || []);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!canManage) {
      toast({ 
        title: 'Permission Denied', 
        description: 'You do not have permission to send broadcasts.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: 'Error', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    setSending(true);

    try {
      // Create broadcast record
      const { error: broadcastError } = await supabase
        .from('admin_broadcasts')
        .insert({
          admin_id: user?.id,
          title: form.title,
          message: form.message,
          broadcast_type: form.broadcast_type,
          target_audience: form.target_audience
        });

      if (broadcastError) throw broadcastError;

      // Get target users based on audience
      let targetUsers: string[] = [];
      
      if (form.target_audience === 'organizers') {
        const { data: organizerRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'organizer');
        
        targetUsers = organizerRoles?.map(r => r.user_id) || [];
      } else if (form.target_audience === 'creators') {
        // Get users who have created tournaments
        const { data: creators } = await supabase
          .from('tournaments')
          .select('created_by')
          .not('created_by', 'is', null);
        
        targetUsers = [...new Set(creators?.map(c => c.created_by).filter(Boolean) as string[])];
      } else {
        // All users
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('user_id');
        
        targetUsers = allUsers?.map(u => u.user_id) || [];
      }

      if (targetUsers.length > 0) {
        // Always create notifications for bell icon
        const notifications = targetUsers.map(userId => ({
          user_id: userId,
          type: 'admin_broadcast',
          title: form.title,
          message: form.message
        }));

        const { error: notifError } = await supabase.from('notifications').insert(notifications);
        
        if (notifError) {
          console.error('Error creating notifications:', notifError);
        }
      }

      toast({ 
        title: 'Sent!', 
        description: `${form.broadcast_type === 'notification' ? 'Notification' : 'Message'} sent to ${targetUsers.length} ${form.target_audience} users.` 
      });
      setForm({ title: '', message: '', broadcast_type: 'notification', target_audience: 'all' });
      fetchBroadcasts();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({ title: 'Error', description: 'Failed to send broadcast.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.broadcast) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('admin_broadcasts')
        .delete()
        .eq('id', deleteDialog.broadcast.id);

      if (error) throw error;

      toast({ title: 'Deleted', description: 'Broadcast deleted successfully.' });
      setDeleteDialog({ open: false, broadcast: null });
      fetchBroadcasts();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      toast({ title: 'Error', description: 'Failed to delete broadcast.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout title="Notifications">
      <div className="p-4 space-y-6">
        {/* Permission Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {canManage 
              ? 'You have full access to send notifications and manage broadcasts.' 
              : 'You have view-only access. Contact Super Admin for send permissions.'}
          </AlertDescription>
        </Alert>

        {/* Header with Vyuha branding */}
        <div className="flex items-center gap-3 mb-4">
          <img src={vyuhaLogo} alt="Vyuha" className="w-10 h-10 rounded-full" />
          <div>
            <h2 className="font-bold">Vyuha Broadcasts</h2>
            <p className="text-xs text-muted-foreground">Send notifications to all users</p>
          </div>
        </div>

        {/* Send New Notification/Message - Only show if can manage */}
        {canManage ? (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Send Broadcast
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.broadcast_type} onValueChange={(v) => setForm({ ...form, broadcast_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notification">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Notification
                        </div>
                      </SelectItem>
                      <SelectItem value="message">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Message (Vyuha Tab)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select value={form.target_audience} onValueChange={(v) => setForm({ ...form, target_audience: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="organizers">Organizers Only</SelectItem>
                      <SelectItem value="creators">Tournament Creators</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Notification title..."
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Write your message..."
                  rows={4}
                />
              </div>

              <Button onClick={handleSend} disabled={sending} className="w-full">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send as Vyuha Esport
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 border border-border rounded-xl p-6 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground text-sm">You do not have permission to send broadcasts.</p>
            <p className="text-xs text-muted-foreground mt-1">Contact Super Admin for access.</p>
          </div>
        )}

        {/* Previous Broadcasts */}
        <div>
          <h3 className="font-semibold mb-3">Previous Broadcasts</h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-sm">No broadcasts sent yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {broadcast.broadcast_type === 'notification' ? (
                              <Bell className="h-4 w-4 text-primary" />
                            ) : (
                              <MessageCircle className="h-4 w-4 text-purple-500" />
                            )}
                            <h4 className="font-semibold text-sm">{broadcast.title}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {broadcast.broadcast_type}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {broadcast.target_audience}
                            </Badge>
                            {isSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialog({ open: true, broadcast })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{broadcast.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {format(new Date(broadcast.created_at), 'MMM dd, yyyy hh:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, broadcast: open ? deleteDialog.broadcast : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Broadcast</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.broadcast?.title}"? This action cannot be undone.
              Note: This will not remove notifications already sent to users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminNotifications;
