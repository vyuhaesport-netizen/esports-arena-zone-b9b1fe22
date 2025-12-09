import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Bell, Send, Loader2, Users, Trophy, Shield } from 'lucide-react';
import { format } from 'date-fns';

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
  const [form, setForm] = useState({
    title: '',
    message: '',
    broadcast_type: 'notification',
    target_audience: 'all'
  });

  const { user, hasPermission, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasPermission('notifications:view') && !isSuperAdmin) {
      navigate('/admin');
      return;
    }
    fetchBroadcasts();
  }, [hasPermission, isSuperAdmin, navigate]);

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

      // If it's a notification type, send to all users
      if (form.broadcast_type === 'notification') {
        // Get target users based on audience
        let usersQuery = supabase.from('profiles').select('user_id');
        
        if (form.target_audience === 'organizers') {
          const { data: organizerRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'organizer');
          
          if (organizerRoles) {
            const organizerIds = organizerRoles.map(r => r.user_id);
            usersQuery = usersQuery.in('user_id', organizerIds);
          }
        }

        const { data: users } = await usersQuery;

        if (users && users.length > 0) {
          const notifications = users.map(u => ({
            user_id: u.user_id,
            type: 'admin_broadcast',
            title: form.title,
            message: form.message
          }));

          await supabase.from('notifications').insert(notifications);
        }
      }

      toast({ title: 'Sent!', description: `${form.broadcast_type === 'notification' ? 'Notification' : 'Message'} sent to ${form.target_audience} users.` });
      setForm({ title: '', message: '', broadcast_type: 'notification', target_audience: 'all' });
      fetchBroadcasts();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({ title: 'Error', description: 'Failed to send broadcast.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout title="Notifications">
      <div className="p-4 space-y-6">
        {/* Send New Notification/Message */}
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
                    <SelectItem value="notification">Notification (Bell Icon)</SelectItem>
                    <SelectItem value="message">Message (Message Tab)</SelectItem>
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
                    <SelectItem value="users">Regular Users Only</SelectItem>
                    <SelectItem value="organizers">Organizers Only</SelectItem>
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
              Send {form.broadcast_type === 'notification' ? 'Notification' : 'Message'}
            </Button>
          </div>
        </div>

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
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {broadcast.broadcast_type === 'notification' ? (
                          <Bell className="h-4 w-4 text-primary" />
                        ) : (
                          <Shield className="h-4 w-4 text-purple-500" />
                        )}
                        <h4 className="font-semibold text-sm">{broadcast.title}</h4>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {broadcast.broadcast_type}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {broadcast.target_audience}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{broadcast.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {format(new Date(broadcast.created_at), 'MMM dd, yyyy hh:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;