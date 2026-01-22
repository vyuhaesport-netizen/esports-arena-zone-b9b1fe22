import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  MapPin
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, parseISO, startOfDay } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  activeToday: number;
  totalTournaments: number;
  localTournaments: number;
  totalRevenue: number;
  platformEarnings: number;
  organizerRevenue: number;
  creatorRevenue: number;
  localTournamentRevenue: number;
  totalOrganizers: number;
  totalCreators: number;
}

interface RevenueDataPoint {
  date: string;
  displayDate: string;
  organizer: number;
  creator: number;
  local: number;
  total: number;
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
  local: {
    label: "Local",
    color: "hsl(187, 85%, 43%)",
  },
  total: {
    label: "Total",
    color: "hsl(var(--primary))",
  },
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeToday: 0,
    totalTournaments: 0,
    localTournaments: 0,
    totalRevenue: 0,
    platformEarnings: 0,
    organizerRevenue: 0,
    creatorRevenue: 0,
    localTournamentRevenue: 0,
    totalOrganizers: 0,
    totalCreators: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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
  }, [isAdmin, fromDate, toDate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch organizers count
      const { count: organizerCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'organizer');

      // Fetch creators count
      const { count: creatorCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'creator');

      // Fetch all tournaments with revenue data
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('tournament_type, total_fees_collected, platform_earnings, organizer_earnings, created_by, created_at')
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59');

      // Fetch local tournaments with revenue data
      const { data: localTournaments } = await supabase
        .from('local_tournaments')
        .select('total_fees_collected, platform_earnings, organizer_earnings, created_at')
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59');

      // Calculate revenue from organizer tournaments
      const organizerTournaments = tournaments?.filter(t => t.tournament_type === 'organizer') || [];
      const organizerRevenue = organizerTournaments.reduce((sum, t) => sum + (t.platform_earnings || 0), 0);

      // Calculate revenue from creator tournaments
      const creatorTournaments = tournaments?.filter(t => t.tournament_type === 'creator') || [];
      const creatorRevenue = creatorTournaments.reduce((sum, t) => sum + (t.platform_earnings || 0), 0);

      // Calculate revenue from local tournaments
      const localTournamentRevenue = localTournaments?.reduce((sum, t) => sum + (t.platform_earnings || 0), 0) || 0;

      // Total platform earnings
      const totalPlatformEarnings = organizerRevenue + creatorRevenue + localTournamentRevenue;

      // Total fees collected (overall revenue)
      const totalFeesFromTournaments = tournaments?.reduce((sum, t) => sum + (t.total_fees_collected || 0), 0) || 0;
      const totalFeesFromLocal = localTournaments?.reduce((sum, t) => sum + (t.total_fees_collected || 0), 0) || 0;
      const totalRevenue = totalFeesFromTournaments + totalFeesFromLocal;

      // Generate revenue data for chart
      const dateRange = eachDayOfInterval({
        start: parseISO(fromDate),
        end: parseISO(toDate),
      });

      const chartData: RevenueDataPoint[] = dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayStart = startOfDay(date);
        
        const dayOrganizerRevenue = organizerTournaments
          .filter(t => format(parseISO(t.created_at), 'yyyy-MM-dd') === dateStr)
          .reduce((sum, t) => sum + (t.platform_earnings || 0), 0);
        
        const dayCreatorRevenue = creatorTournaments
          .filter(t => format(parseISO(t.created_at), 'yyyy-MM-dd') === dateStr)
          .reduce((sum, t) => sum + (t.platform_earnings || 0), 0);
        
        const dayLocalRevenue = (localTournaments || [])
          .filter(t => format(parseISO(t.created_at), 'yyyy-MM-dd') === dateStr)
          .reduce((sum, t) => sum + (t.platform_earnings || 0), 0);

        return {
          date: dateStr,
          displayDate: format(date, 'MMM dd'),
          organizer: dayOrganizerRevenue,
          creator: dayCreatorRevenue,
          local: dayLocalRevenue,
          total: dayOrganizerRevenue + dayCreatorRevenue + dayLocalRevenue,
        };
      });

      setRevenueData(chartData);

      setStats({
        totalUsers: userCount || 0,
        activeToday: Math.floor((userCount || 0) * 0.3),
        totalTournaments: tournaments?.length || 0,
        localTournaments: localTournaments?.length || 0,
        totalRevenue,
        platformEarnings: totalPlatformEarnings,
        organizerRevenue,
        creatorRevenue,
        localTournamentRevenue,
        totalOrganizers: organizerCount || 0,
        totalCreators: creatorCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
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
    <AdminLayout title="Dashboard">
      <div className="p-4 space-y-4">
        {/* Date Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button variant="gaming" size="sm" onClick={fetchStats}>
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalTournaments}</p>
                  <p className="text-xs text-muted-foreground">Tournaments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalOrganizers}</p>
                  <p className="text-xs text-muted-foreground">Organizers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalCreators}</p>
                  <p className="text-xs text-muted-foreground">Creators</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.localTournaments}</p>
                  <p className="text-xs text-muted-foreground">Local Tournaments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Earnings Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Platform Earnings</p>
                <p className="text-3xl font-bold mt-1">
                  ₹{stats.platformEarnings.toFixed(0)}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trends Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
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
                  <linearGradient id="colorLocal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(187, 85%, 43%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(187, 85%, 43%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${value}`}
                  className="text-muted-foreground"
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`₹${value}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="organizer"
                  name="Organizers"
                  stroke="hsl(25, 95%, 53%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOrganizer)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="creator"
                  name="Creators"
                  stroke="hsl(330, 81%, 60%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCreator)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="local"
                  name="Local"
                  stroke="hsl(187, 85%, 43%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLocal)"
                  stackId="1"
                />
              </AreaChart>
            </ChartContainer>
            
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-xs text-muted-foreground">Organizers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <span className="text-xs text-muted-foreground">Creators</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-xs text-muted-foreground">Local</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-orange-500" />
                <span className="text-sm">From Organizers</span>
              </div>
              <span className="font-bold text-orange-600">₹{stats.organizerRevenue.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-pink-500/10">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-pink-500" />
                <span className="text-sm">From Creators</span>
              </div>
              <span className="font-bold text-pink-600">₹{stats.creatorRevenue.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-500/10">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-500" />
                <span className="text-sm">From Local Tournaments</span>
              </div>
              <span className="font-bold text-cyan-600">₹{stats.localTournamentRevenue.toFixed(0)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin/users')}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Manage Users</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin/tournaments')}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-xs">Tournaments</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin/organizers')}
          >
            <UserCheck className="h-5 w-5" />
            <span className="text-xs">Organizers</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/admin/creators')}
          >
            <Palette className="h-5 w-5" />
            <span className="text-xs">Creators</span>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;