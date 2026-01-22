import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Bell, Send, Users, Target, History, Settings, Loader2, CheckCircle, XCircle, Smartphone, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PushLog {
  id: string;
  title: string;
  message: string;
  target_type: string;
  target_count: number;
  sent_at: string;
  status: 'success' | 'failed' | 'pending';
}

const AdminPushNotifications = () => {
  const { isSuperAdmin, hasPermission } = useAuth();
  const [sending, setSending] = useState(false);
  const [pushLogs, setPushLogs] = useState<PushLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [userCount, setUserCount] = useState(0);
  
  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'segment' | 'users'>('all');
  const [segment, setSegment] = useState('Subscribed Users');
  const [selectedUserIds, setSelectedUserIds] = useState('');
  const [url, setUrl] = useState('');

  const canView = isSuperAdmin || hasPermission('notifications:view');
  const canManage = isSuperAdmin || hasPermission('notifications:manage');

  useEffect(() => {
    fetchPushLogs();
    fetchUserCount();
  }, []);

  const fetchUserCount = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    setUserCount(count || 0);
  };

  const fetchPushLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('push_notification_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error && error.code !== '42P01') {
        console.error('Error fetching logs:', error);
      }
      setPushLogs(data || []);
    } catch (error) {
      console.log('Push logs table may not exist yet');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSendPush = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title aur message required hai');
      return;
    }

    if (!canManage) {
      toast.error('Aapko push notifications bhejne ki permission nahi hai');
      return;
    }

    setSending(true);
    
    try {
      const payload: Record<string, unknown> = {
        title,
        message,
      };

      if (url.trim()) {
        payload.url = url;
      }

      if (targetType === 'all') {
        payload.segment = 'Subscribed Users';
      } else if (targetType === 'segment') {
        payload.segment = segment;
      } else if (targetType === 'users' && selectedUserIds.trim()) {
        payload.user_ids = selectedUserIds.split(',').map(id => id.trim());
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: payload,
      });

      if (error) throw error;

      // Log the notification
      await supabase.from('push_notification_logs').insert({
        title,
        message,
        target_type: targetType,
        target_count: targetType === 'all' ? userCount : (targetType === 'users' ? selectedUserIds.split(',').length : 0),
        status: 'success',
      }).catch(() => {
        // Table might not exist, ignore error
      });

      toast.success('Push notification bhej diya gaya!');
      
      // Reset form
      setTitle('');
      setMessage('');
      setUrl('');
      setSelectedUserIds('');
      
      // Refresh logs
      fetchPushLogs();
    } catch (error) {
      console.error('Error sending push:', error);
      toast.error('Push notification bhejne mein error aaya');
      
      // Log failure
      await supabase.from('push_notification_logs').insert({
        title,
        message,
        target_type: targetType,
        target_count: 0,
        status: 'failed',
      }).catch(() => {});
    } finally {
      setSending(false);
    }
  };

  const quickTemplates = [
    { title: 'New Tournament! 🎮', message: 'Naya tournament shuru ho gaya hai. Abhi join karo aur prizes jeeto!' },
    { title: 'Match Starting Soon ⏰', message: 'Aapka match 15 minutes mein start hone wala hai. Ready ho jao!' },
    { title: 'Winner Announcement 🏆', message: 'Congratulations! Tournament results aa gaye hain. Check karo apna rank!' },
    { title: 'Special Offer 🎁', message: 'Limited time offer! Deposit karo aur bonus pao.' },
  ];

  const applyTemplate = (template: typeof quickTemplates[0]) => {
    setTitle(template.title);
    setMessage(template.message);
  };

  if (!canView) {
    return (
      <AdminLayout title="Push Notifications">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Aapko is page ko dekhne ki permission nahi hai.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Push Notifications">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userCount}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Bell className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pushLogs.filter(l => l.status === 'success').length}</p>
                  <p className="text-xs text-muted-foreground">Sent Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Smartphone className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">Subscribed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Globe className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Active</p>
                  <p className="text-xs text-muted-foreground">OneSignal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="send" className="gap-2">
              <Send className="h-4 w-4" />
              Send Push
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Settings className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Send Push Tab */}
          <TabsContent value="send" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Send Push Notification
                </CardTitle>
                <CardDescription>
                  Sabhi users ya specific users ko push notification bhejo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Target Selection */}
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={targetType} onValueChange={(v: 'all' | 'segment' | 'users') => setTargetType(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Subscribed Users
                        </div>
                      </SelectItem>
                      <SelectItem value="segment">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          By Segment
                        </div>
                      </SelectItem>
                      <SelectItem value="users">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Specific Users
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Segment Selection */}
                {targetType === 'segment' && (
                  <div className="space-y-2">
                    <Label>Segment</Label>
                    <Select value={segment} onValueChange={setSegment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Subscribed Users">Subscribed Users</SelectItem>
                        <SelectItem value="Active Users">Active Users</SelectItem>
                        <SelectItem value="Inactive Users">Inactive Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* User IDs */}
                {targetType === 'users' && (
                  <div className="space-y-2">
                    <Label>User IDs (comma separated)</Label>
                    <Textarea
                      placeholder="user-id-1, user-id-2, user-id-3"
                      value={selectedUserIds}
                      onChange={(e) => setSelectedUserIds(e.target.value)}
                      rows={2}
                    />
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="Notification title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">{title.length}/50</p>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea
                    placeholder="Notification message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">{message.length}/200</p>
                </div>

                {/* URL */}
                <div className="space-y-2">
                  <Label>Click URL (optional)</Label>
                  <Input
                    placeholder="/home or https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleSendPush} 
                  disabled={sending || !canManage}
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Push Notification
                    </>
                  )}
                </Button>

                {!canManage && (
                  <p className="text-xs text-destructive text-center">
                    Aapko push notifications bhejne ki permission nahi hai
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Push Notification History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pushLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Abhi tak koi push notification nahi bheja gaya</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {pushLogs.map((log) => (
                        <div key={log.id} className="p-3 rounded-lg border bg-card/50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm truncate">{log.title}</p>
                                {log.status === 'success' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{log.message}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              {log.target_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{new Date(log.sent_at).toLocaleString('en-IN')}</span>
                            {log.target_count > 0 && (
                              <span>• {log.target_count} users</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Quick Templates
                </CardTitle>
                <CardDescription>
                  Pre-made templates for common notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {quickTemplates.map((template, index) => (
                    <div 
                      key={index}
                      className="p-3 rounded-lg border bg-card/50 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => applyTemplate(template)}
                    >
                      <p className="font-medium text-sm">{template.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{template.message}</p>
                      <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs">
                        Use Template
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPushNotifications;
