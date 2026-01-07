import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bot, 
  Send, 
  RefreshCw, 
  Clock, 
  Calendar, 
  Zap,
  Activity,
  MessageSquare,
  Users,
  TrendingUp,
  Settings,
  History,
  PlayCircle,
  Pause,
  Trash2,
  Eye,
  BarChart3,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";

interface AIBroadcast {
  id: string;
  title: string;
  message: string;
  created_at: string;
  target_audience: string;
  is_published: boolean;
}

interface BroadcastStats {
  totalBroadcasts: number;
  todayBroadcasts: number;
  weeklyBroadcasts: number;
  totalNotificationsSent: number;
}

interface CronJob {
  jobid: number;
  schedule: string;
  command: string;
  nodename: string;
  active: boolean;
}

const AdminAIBroadcast = () => {
  const { user, isAdmin, isSuperAdmin, hasPermission, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [broadcasts, setBroadcasts] = useState<AIBroadcast[]>([]);
  const [stats, setStats] = useState<BroadcastStats>({
    totalBroadcasts: 0,
    todayBroadcasts: 0,
    weeklyBroadcasts: 0,
    totalNotificationsSent: 0
  });
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [cronEnabled, setCronEnabled] = useState(true);
  const [cronSchedule, setCronSchedule] = useState("30 3 * * *");
  const [selectedContentType, setSelectedContentType] = useState("random");
  const [customPrompt, setCustomPrompt] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin && !isSuperAdmin && !hasPermission('ai:manage')) {
      navigate('/admin');
    }
  }, [authLoading, isAdmin, isSuperAdmin, hasPermission, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch AI broadcasts (those with 🤖 prefix)
      const { data: broadcastData, error: broadcastError } = await supabase
        .from('admin_broadcasts')
        .select('*')
        .ilike('title', '%🤖%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (broadcastError) throw broadcastError;
      setBroadcasts(broadcastData || []);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const todayCount = (broadcastData || []).filter(b => 
        new Date(b.created_at) >= todayStart
      ).length;

      const weeklyCount = (broadcastData || []).filter(b => 
        new Date(b.created_at) >= weekStart
      ).length;

      // Get notification count for AI broadcasts
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'broadcast')
        .ilike('title', '%🤖%');

      setStats({
        totalBroadcasts: broadcastData?.length || 0,
        todayBroadcasts: todayCount,
        weeklyBroadcasts: weeklyCount,
        totalNotificationsSent: notifCount || 0
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI broadcast data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerBroadcast = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-daily-broadcast', {
        body: { contentType: selectedContentType !== 'random' ? selectedContentType : undefined }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "🤖 AI Broadcast Sent!",
          description: `Generated ${data.content_type} content: "${data.title}"`,
        });
        fetchData();
      } else {
        throw new Error(data?.error || 'Failed to generate broadcast');
      }
    } catch (error) {
      console.error('Error triggering broadcast:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to trigger AI broadcast",
        variant: "destructive"
      });
    } finally {
      setTriggering(false);
    }
  };

  const deleteBroadcast = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_broadcasts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "AI broadcast deleted successfully",
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      toast({
        title: "Error",
        description: "Failed to delete broadcast",
        variant: "destructive"
      });
    }
  };

  const getContentTypeColor = (title: string) => {
    if (title.toLowerCase().includes('tournament') || title.toLowerCase().includes('match')) {
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
    if (title.toLowerCase().includes('tip') || title.toLowerCase().includes('guide')) {
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
    if (title.toLowerCase().includes('motivation') || title.toLowerCase().includes('inspire')) {
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
    return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  };

  const getContentTypeLabel = (title: string) => {
    if (title.toLowerCase().includes('tournament') || title.toLowerCase().includes('match')) {
      return 'Tournament';
    }
    if (title.toLowerCase().includes('tip') || title.toLowerCase().includes('guide')) {
      return 'Gaming Tips';
    }
    if (title.toLowerCase().includes('motivation') || title.toLowerCase().includes('inspire')) {
      return 'Motivation';
    }
    return 'Platform News';
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="AI Broadcast Control">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="AI Broadcast Control">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Vyuha AI Broadcast</h1>
              <p className="text-muted-foreground">Automated daily content generation & delivery</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
            <Activity className="w-3 h-3 mr-1" />
            System Active
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total AI Broadcasts</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalBroadcasts}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold text-green-400">{stats.todayBroadcasts}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.weeklyBroadcasts}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Notifications Sent</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.totalNotificationsSent}</p>
                </div>
                <Users className="w-8 h-8 text-purple-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="control" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="control" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Control
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Control Tab */}
          <TabsContent value="control" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Manual Trigger
                </CardTitle>
                <CardDescription>
                  Generate and send an AI broadcast immediately
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">🎲 Random (Auto-select)</SelectItem>
                      <SelectItem value="tournament_update">🏆 Tournament Update</SelectItem>
                      <SelectItem value="motivation">💪 Motivation</SelectItem>
                      <SelectItem value="game_tips">🎮 Gaming Tips</SelectItem>
                      <SelectItem value="platform_news">📢 Platform News</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={triggerBroadcast} 
                  disabled={triggering}
                  className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                >
                  {triggering ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Generate & Send AI Broadcast
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Schedule Info */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Automated Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-500/20">
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Daily at 9:00 AM IST</p>
                      <p className="text-sm text-muted-foreground">Cron: {cronSchedule}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <PlayCircle className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Broadcast History
                  </CardTitle>
                  <CardDescription>
                    Recent AI-generated broadcasts
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {broadcasts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No AI broadcasts yet</p>
                      <p className="text-sm text-muted-foreground">Trigger one manually or wait for the scheduled run</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {broadcasts.map((broadcast) => (
                        <div 
                          key={broadcast.id}
                          className="p-4 rounded-lg bg-background/50 border border-border hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className={getContentTypeColor(broadcast.title)}>
                                  {getContentTypeLabel(broadcast.title)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(broadcast.created_at), 'MMM dd, yyyy HH:mm')}
                                </span>
                              </div>
                              <h4 className="font-medium text-foreground truncate">
                                {broadcast.title}
                              </h4>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {broadcast.message}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteBroadcast(broadcast.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  AI Broadcast Settings
                </CardTitle>
                <CardDescription>
                  Configure automated broadcast behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Daily Broadcast</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send AI broadcast every day at 9 AM IST
                    </p>
                  </div>
                  <Switch checked={cronEnabled} onCheckedChange={setCronEnabled} />
                </div>

                <div className="space-y-2">
                  <Label>Schedule (Cron Expression)</Label>
                  <Input 
                    value={cronSchedule} 
                    onChange={(e) => setCronSchedule(e.target.value)}
                    placeholder="30 3 * * *"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: Daily at 9:00 AM IST (3:30 AM UTC)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Input value="google/gemini-2.5-flash" disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Powered by Lovable AI Gateway
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">Content Types</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-muted-foreground">Tournament Updates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="text-muted-foreground">Motivation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-muted-foreground">Gaming Tips</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400" />
                      <span className="text-muted-foreground">Platform News</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAIBroadcast;
