import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  Loader2,
  UserCheck,
  IndianRupee,
  Palette,
  School,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Wallet,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Clock
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, parseISO, formatDistanceToNow } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  totalTournaments: number;
  activeTournaments: number;
  totalRevenue: number;
  platformEarnings: number;
  organizerRevenue: number;
  creatorRevenue: number;
  totalOrganizers: number;
  totalCreators: number;
  pendingWithdrawals: number;
  pendingSupport: number;
  schoolTournaments: number;
}

interface RevenueDataPoint {
  date: string;
  displayDate: string;
  organizer: number;
  creator: number;
  total: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'tournament' | 'withdrawal' | 'support';
  title: string;
  description: string;
  time: string;
}

const chartConfig = {
  organizer: {
    label: "Organizers",
    color: "hsl(25, 95%, 53%)",
  },
  creator: {
    label: "Creators", 
    color: "hsl(330, 81%, 60%)",
  },
  total: {
    label: "Total",
    color: "hsl(var(--primary))",
  },
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsersToday: 0,
    newUsersWeek: 0,
    totalTournaments: 0,
    activeTournaments: 0,
    totalRevenue: 0,
    platformEarnings: 0,
    organizerRevenue: 0,
    creatorRevenue: 0,
    totalOrganizers: 0,
    totalCreators: 0,
    pendingWithdrawals: 0,
    pendingSupport: 0,
    schoolTournaments: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<{ date: string; users: number }[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user, isAdmin, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isAdmin && !hasPermission('dashboard:view')) {
        navigate('/home');
      }
    }
  }, [user, isAdmin, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (isAdmin || hasPermission('dashboard:view')) {
      fetchStats();
    }
  }, [isAdmin]);

  // Realtime subscriptions
  useEffect(() => {
    const channels = [
      supabase.channel('dashboard-profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchStats())
        .subscribe(),
      supabase.channel('dashboard-tournaments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => fetchStats())
        .subscribe(),
      supabase.channel('dashboard-school')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'school_tournaments' }, () => fetchStats())
        .subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const weekAgo = format(subDays(today, 7), 'yyyy-MM-dd');
      const monthAgo = format(subDays(today, 30), 'yyyy-MM-dd');

      // Parallel fetches
      const [
        { count: userCount },
        { data: recentUsers },
        { count: organizerCount },
        { count: creatorCount },
        { data: tournaments },
        { data: schoolTournaments },
        { count: pendingWithdrawals },
        { count: pendingSupport },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('created_at').gte('created_at', monthAgo),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'organizer'),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'creator'),
        supabase.from('tournaments').select('tournament_type, total_fees_collected, platform_earnings, organizer_earnings, created_at, status').gte('created_at', monthAgo),
        supabase.from('school_tournaments').select('id, status'),
        supabase.from('wallet_transactions').select('*', { count: 'exact', head: true }).eq('type', 'withdrawal').eq('status', 'pending'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      // Calculate user growth
      const newUsersToday = recentUsers?.filter(u => u.created_at.startsWith(todayStr)).length || 0;
      const newUsersWeek = recentUsers?.filter(u => u.created_at >= weekAgo).length || 0;

      // Calculate revenue
      const organizerTournaments = tournaments?.filter(t => t.tournament_type === 'organizer') || [];
      const creatorTournaments = tournaments?.filter(t => t.tournament_type === 'creator') || [];
      const organizerRevenue = organizerTournaments.reduce((sum, t) => sum + (t.platform_earnings || 0), 0);
      const creatorRevenue = creatorTournaments.reduce((sum, t) => sum + (t.platform_earnings || 0), 0);
      const totalRevenue = tournaments?.reduce((sum, t) => sum + (t.total_fees_collected || 0), 0) || 0;
      const activeTournaments = tournaments?.filter(t => t.status === 'upcoming' || t.status === 'ongoing').length || 0;

      // User growth chart data
      const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });
      const growthData = last7Days.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = recentUsers?.filter(u => u.created_at.startsWith(dateStr)).length || 0;
        return { date: format(date, 'EEE'), users: count };
      });
      setUserGrowthData(growthData);

      // Revenue chart data
      const revenueChartData = last7Days.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOrg = organizerTournaments.filter(t => t.created_at.startsWith(dateStr)).reduce((s, t) => s + (t.platform_earnings || 0), 0);
        const dayCreator = creatorTournaments.filter(t => t.created_at.startsWith(dateStr)).reduce((s, t) => s + (t.platform_earnings || 0), 0);
        return {
          date: dateStr,
          displayDate: format(date, 'EEE'),
          organizer: dayOrg,
          creator: dayCreator,
          total: dayOrg + dayCreator,
        };
      });
      setRevenueData(revenueChartData);

      setStats({
        totalUsers: userCount || 0,
        newUsersToday,
        newUsersWeek,
        totalTournaments: tournaments?.length || 0,
        activeTournaments,
        totalRevenue,
        platformEarnings: organizerRevenue + creatorRevenue,
        organizerRevenue,
        creatorRevenue,
        totalOrganizers: organizerCount || 0,
        totalCreators: creatorCount || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        pendingSupport: pendingSupport || 0,
        schoolTournaments: schoolTournaments?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Command Center">
      <div className="p-4 space-y-4">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Welcome back!</h2>
            <p className="text-xs text-muted-foreground">Here's what's happening today</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Platform Earnings Hero Card */}
        <Card className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Platform Earnings (30d)
                </p>
                <p className="text-4xl font-bold mt-2">
                  ₹{stats.platformEarnings.toLocaleString()}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs opacity-80">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    Org: ₹{stats.organizerRevenue}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-pink-400" />
                    Creator: ₹{stats.creatorRevenue}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <IndianRupee className="h-16 w-16 opacity-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/admin/users')}>
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-xl font-bold">{stats.totalUsers}</p>
              <p className="text-[9px] text-muted-foreground">Users</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/admin/tournaments')}>
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center mb-1">
                <Trophy className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold">{stats.totalTournaments}</p>
              <p className="text-[9px] text-muted-foreground">Tournaments</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/admin/organizers')}>
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center mb-1">
                <UserCheck className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-xl font-bold">{stats.totalOrganizers}</p>
              <p className="text-[9px] text-muted-foreground">Organizers</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/admin/creators')}>
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-pink-500/10 flex items-center justify-center mb-1">
                <Palette className="h-4 w-4 text-pink-500" />
              </div>
              <p className="text-xl font-bold">{stats.totalCreators}</p>
              <p className="text-[9px] text-muted-foreground">Creators</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Highlights */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.newUsersToday}</p>
                    <p className="text-[10px] text-muted-foreground">New Today</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.activeTournaments}</p>
                    <p className="text-[10px] text-muted-foreground">Active Events</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Actions */}
        {(stats.pendingWithdrawals > 0 || stats.pendingSupport > 0) && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.pendingWithdrawals > 0 && (
                <div 
                  className="flex items-center justify-between p-2 rounded-lg bg-background cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate('/admin/withdrawals')}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">{stats.pendingWithdrawals} pending withdrawals</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {stats.pendingSupport > 0 && (
                <div 
                  className="flex items-center justify-between p-2 rounded-lg bg-background cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate('/admin/support')}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">{stats.pendingSupport} open tickets</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Growth Mini Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                User Growth (7 days)
              </span>
              <Badge variant="secondary" className="text-xs">
                +{stats.newUsersWeek} this week
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowthData}>
                  <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Revenue Trend (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[150px] w-full">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrganizer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCreator" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(330, 81%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(330, 81%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="organizer" stroke="hsl(25, 95%, 53%)" strokeWidth={2} fillOpacity={1} fill="url(#colorOrganizer)" stackId="1" />
                <Area type="monotone" dataKey="creator" stroke="hsl(330, 81%, 60%)" strokeWidth={2} fillOpacity={1} fill="url(#colorCreator)" stackId="1" />
              </AreaChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-[10px] text-muted-foreground">Organizers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <span className="text-[10px] text-muted-foreground">Creators</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-1"
            onClick={() => navigate('/admin/school-tournaments')}
          >
            <School className="h-5 w-5" />
            <span className="text-[10px]">School ({stats.schoolTournaments})</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-1"
            onClick={() => navigate('/admin/deposits')}
          >
            <IndianRupee className="h-5 w-5" />
            <span className="text-[10px]">Deposits</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-1"
            onClick={() => navigate('/admin/settings')}
          >
            <Activity className="h-5 w-5" />
            <span className="text-[10px]">Settings</span>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
