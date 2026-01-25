import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  Brain, 
  Activity, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Zap,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  BarChart3,
  LineChart,
  PieChart,
  ArrowLeft,
  Target,
  Cpu,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RePieChart, Pie, Cell } from 'recharts';

interface DailyStats {
  date: string;
  requests: number;
  tokens: number;
  successRate: number;
  avgResponseTime: number;
}

interface RequestTypeStats {
  type: string;
  count: number;
  tokens: number;
  percentage: number;
}

interface HourlyStats {
  hour: string;
  requests: number;
}

interface UsageLog {
  id: string;
  request_type: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  status: string;
  response_time_ms: number;
  error_message: string | null;
  created_at: string;
  model?: string;
  user_id?: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const AdminAIMonitor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('7');
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [requestTypeStats, setRequestTypeStats] = useState<RequestTypeStats[]>([]);
  const [hourlyStats, setHourlyStats] = useState<HourlyStats[]>([]);

  // Summary stats
  const [summary, setSummary] = useState({
    totalRequests: 0,
    successRate: 0,
    totalTokens: 0,
    avgResponseTime: 0,
    uniqueUsers: 0,
    peakHour: '',
    mostUsedType: '',
    errorRate: 0,
    tokensToday: 0,
    requestsToday: 0,
    trend: 0, // % change from previous period
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days));
      const previousStartDate = startOfDay(subDays(new Date(), days * 2));

      // Fetch logs for current period
      const { data: currentLogs, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch logs for previous period (for trend calculation)
      const { data: previousLogs } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      setUsageLogs(currentLogs || []);
      processStats(currentLogs || [], previousLogs || []);
    } catch (error) {
      console.error('Error fetching AI monitor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processStats = (logs: UsageLog[], previousLogs: UsageLog[]) => {
    if (logs.length === 0) {
      setDailyStats([]);
      setRequestTypeStats([]);
      setHourlyStats([]);
      setSummary({
        totalRequests: 0,
        successRate: 0,
        totalTokens: 0,
        avgResponseTime: 0,
        uniqueUsers: 0,
        peakHour: 'N/A',
        mostUsedType: 'N/A',
        errorRate: 0,
        tokensToday: 0,
        requestsToday: 0,
        trend: 0,
      });
      return;
    }

    // Calculate summary stats
    const totalRequests = logs.length;
    const successfulRequests = logs.filter(l => l.status === 'success').length;
    const successRate = (successfulRequests / totalRequests) * 100;
    const totalTokens = logs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
    const avgResponseTime = logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / totalRequests / 1000;
    const uniqueUsers = new Set(logs.filter(l => l.user_id).map(l => l.user_id)).size;
    const errorRate = ((totalRequests - successfulRequests) / totalRequests) * 100;

    // Today's stats
    const today = startOfDay(new Date());
    const todayLogs = logs.filter(l => new Date(l.created_at) >= today);
    const tokensToday = todayLogs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
    const requestsToday = todayLogs.length;

    // Trend calculation
    const previousTotalRequests = previousLogs.length;
    const trend = previousTotalRequests > 0 
      ? ((totalRequests - previousTotalRequests) / previousTotalRequests) * 100 
      : 0;

    // Daily stats
    const dailyMap = new Map<string, { requests: number; tokens: number; success: number; responseTime: number }>();
    logs.forEach(log => {
      const date = format(new Date(log.created_at), 'MMM dd');
      const existing = dailyMap.get(date) || { requests: 0, tokens: 0, success: 0, responseTime: 0 };
      dailyMap.set(date, {
        requests: existing.requests + 1,
        tokens: existing.tokens + (log.total_tokens || 0),
        success: existing.success + (log.status === 'success' ? 1 : 0),
        responseTime: existing.responseTime + (log.response_time_ms || 0),
      });
    });

    const dailyStatsArray: DailyStats[] = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        requests: stats.requests,
        tokens: stats.tokens,
        successRate: (stats.success / stats.requests) * 100,
        avgResponseTime: stats.responseTime / stats.requests / 1000,
      }))
      .reverse();

    // Request type stats
    const typeMap = new Map<string, { count: number; tokens: number }>();
    logs.forEach(log => {
      const type = log.request_type || 'unknown';
      const existing = typeMap.get(type) || { count: 0, tokens: 0 };
      typeMap.set(type, {
        count: existing.count + 1,
        tokens: existing.tokens + (log.total_tokens || 0),
      });
    });

    const requestTypeStatsArray: RequestTypeStats[] = Array.from(typeMap.entries())
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        tokens: stats.tokens,
        percentage: (stats.count / totalRequests) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Hourly distribution
    const hourlyMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) hourlyMap.set(i, 0);
    logs.forEach(log => {
      const hour = new Date(log.created_at).getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });

    const hourlyStatsArray: HourlyStats[] = Array.from(hourlyMap.entries())
      .map(([hour, requests]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        requests,
      }));

    // Find peak hour
    const peakHourEntry = hourlyStatsArray.reduce((max, curr) => 
      curr.requests > max.requests ? curr : max, { hour: 'N/A', requests: 0 });

    // Find most used type
    const mostUsedType = requestTypeStatsArray[0]?.type || 'N/A';

    setDailyStats(dailyStatsArray);
    setRequestTypeStats(requestTypeStatsArray);
    setHourlyStats(hourlyStatsArray);
    setSummary({
      totalRequests,
      successRate,
      totalTokens,
      avgResponseTime,
      uniqueUsers,
      peakHour: peakHourEntry.hour,
      mostUsedType,
      errorRate,
      tokensToday,
      requestsToday,
      trend,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <AdminLayout title="DeepSeek R1 Monitor">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="DeepSeek R1 Monitor">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/ai')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                DeepSeek R1 Monitor
                <Badge variant="outline" className="border-blue-500/50 text-blue-500">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">Performance analytics & usage insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{summary.totalRequests.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {summary.trend >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${summary.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Math.abs(summary.trend).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{summary.successRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.errorRate.toFixed(1)}% errors
                  </p>
                </div>
                <CheckCircle2 className={`h-8 w-8 ${summary.successRate >= 95 ? 'text-green-500/50' : 'text-amber-500/50'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Tokens</p>
                  <p className="text-2xl font-bold">{(summary.totalTokens / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.tokensToday.toLocaleString()} today
                  </p>
                </div>
                <Cpu className="h-8 w-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{summary.avgResponseTime.toFixed(2)}s</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Peak: {summary.peakHour}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-cyan-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">{summary.uniqueUsers}</p>
                  <p className="text-xs text-muted-foreground">Unique Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Target className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{summary.mostUsedType}</p>
                  <p className="text-xs text-muted-foreground">Most Used</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">{summary.requestsToday}</p>
                  <p className="text-xs text-muted-foreground">Requests Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Breakdown
            </TabsTrigger>
            <TabsTrigger value="hourly" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Hourly
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Request Trend
                </CardTitle>
                <CardDescription>Daily AI requests over time</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyStats}>
                      <defs>
                        <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="requests" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorRequests)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available for the selected period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-purple-500" />
                  Token Usage
                </CardTitle>
                <CardDescription>Daily token consumption</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value.toLocaleString()} tokens`, 'Tokens']}
                      />
                      <Bar dataKey="tokens" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Request Types</CardTitle>
                  <CardDescription>Distribution by type</CardDescription>
                </CardHeader>
                <CardContent>
                  {requestTypeStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RePieChart>
                        <Pie
                          data={requestTypeStats}
                          dataKey="count"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                        >
                          {requestTypeStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Type Details</CardTitle>
                  <CardDescription>Requests by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requestTypeStats.map((stat, index) => (
                      <div key={stat.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="capitalize font-medium">{stat.type}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{stat.count.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{stat.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                    {requestTypeStats.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Hourly Tab */}
          <TabsContent value="hourly">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-cyan-500" />
                  Hourly Distribution
                </CardTitle>
                <CardDescription>Request volume by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                {hourlyStats.some(h => h.requests > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourlyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="hour" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="requests" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available for hourly distribution
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Requests
                    </CardTitle>
                    <CardDescription>Latest DeepSeek R1 activity</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {usageLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No logs found for the selected period</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {usageLogs.slice(0, 100).map((log) => (
                        <div key={log.id} className="p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {log.status === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="font-medium capitalize">{log.request_type}</span>
                              <Badge variant="outline" className="text-xs">
                                <Brain className="h-3 w-3 mr-1" />
                                R1
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Cpu className="h-3 w-3" />
                              {log.total_tokens || 0} tokens
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {((log.response_time_ms || 0) / 1000).toFixed(2)}s
                            </span>
                            {log.input_tokens && (
                              <span>In: {log.input_tokens}</span>
                            )}
                            {log.output_tokens && (
                              <span>Out: {log.output_tokens}</span>
                            )}
                          </div>
                          {log.error_message && (
                            <div className="mt-2 flex items-start gap-2 text-xs text-red-500">
                              <AlertTriangle className="h-3 w-3 mt-0.5" />
                              <span className="line-clamp-2">{log.error_message}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAIMonitor;
