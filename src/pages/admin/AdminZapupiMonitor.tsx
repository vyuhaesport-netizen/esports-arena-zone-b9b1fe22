import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, AlertCircle, CheckCircle2, Clock, XCircle, Loader2, ArrowUpCircle, ArrowDownCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  user_id: string;
  order_id: string | null;
  payment_id: string | null;
  amount: number;
  status: string;
  gateway_name: string;
  transaction_type: string;
  error_code: string | null;
  error_description: string | null;
  metadata: unknown;
  created_at: string;
  completed_at: string | null;
  currency: string;
}

interface UserProfile {
  user_id: string;
  username: string | null;
  email: string;
}

const AdminZapupiMonitor = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchTransactions();
    }
  }, [isAdmin]);

  const checkAdmin = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!data) {
      navigate('/home');
      return;
    }

    setIsAdmin(true);
  };

  const fetchTransactions = async () => {
    try {
      setRefreshing(true);
      
      // Fetch ZapUPI transactions
      const { data: txData, error: txError } = await supabase
        .from('payment_gateway_transactions')
        .select('*')
        .eq('gateway_name', 'zapupi')
        .order('created_at', { ascending: false })
        .limit(100);

      if (txError) throw txError;

      // Fetch user profiles
      const userIds = [...new Set(txData?.map(t => t.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, username, email')
          .in('user_id', userIds);
        
        setUsers(profileData || []);
      }

      setTransactions(txData || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getUserName = (userId: string) => {
    const profile = users.find(u => u.user_id === userId);
    return profile?.username || profile?.email?.split('@')[0] || userId.slice(0, 8);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'created':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      failed: 'destructive',
      created: 'secondary',
      pending: 'outline',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getEventType = (tx: Transaction) => {
    if (tx.status === 'completed' && tx.completed_at) {
      return { type: 'Webhook Success', icon: <ArrowDownCircle className="h-4 w-4 text-green-500" /> };
    }
    if (tx.status === 'failed' && tx.error_code) {
      return { type: 'API Error', icon: <AlertCircle className="h-4 w-4 text-red-500" /> };
    }
    if (tx.status === 'failed') {
      return { type: 'Webhook Failed', icon: <XCircle className="h-4 w-4 text-orange-500" /> };
    }
    if (tx.status === 'created') {
      return { type: 'Order Created', icon: <ArrowUpCircle className="h-4 w-4 text-blue-500" /> };
    }
    return { type: 'Unknown', icon: <Clock className="h-4 w-4 text-muted-foreground" /> };
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.payment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getUserName(tx.user_id).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: transactions.length,
    completed: transactions.filter(t => t.status === 'completed').length,
    failed: transactions.filter(t => t.status === 'failed').length,
    pending: transactions.filter(t => t.status === 'created' || t.status === 'pending').length,
    totalAmount: transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
  };

  if (loading) {
    return (
      <AdminLayout title="ZapUPI Monitor">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="ZapUPI Monitor">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">₹{stats.totalAmount}</div>
              <div className="text-sm text-muted-foreground">Total Collected</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Order ID, Payment ID, or User..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchTransactions} disabled={refreshing} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((tx) => {
                  const event = getEventType(tx);
                  return (
                    <div
                      key={tx.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {event.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                          <span className="font-medium">{event.type}</span>
                          {getStatusBadge(tx.status)}
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(tx.created_at), 'dd MMM yyyy, hh:mm:ss a')}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">User:</span>{' '}
                            <span className="font-medium">{getUserName(tx.user_id)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>{' '}
                            <span className="font-medium text-primary">₹{tx.amount}</span>
                          </div>
                          {tx.order_id && (
                            <div className="truncate">
                              <span className="text-muted-foreground">Order:</span>{' '}
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">{tx.order_id}</code>
                            </div>
                          )}
                          {tx.payment_id && (
                            <div className="truncate">
                              <span className="text-muted-foreground">Payment:</span>{' '}
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">{tx.payment_id}</code>
                            </div>
                          )}
                        </div>
                        {tx.error_description && (
                          <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
                            <span className="font-medium">Error:</span> {tx.error_description}
                            {tx.error_code && (
                              <span className="ml-2 text-xs">({tx.error_code})</span>
                            )}
                          </div>
                        )}
                        {tx.metadata && Object.keys(tx.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View metadata
                            </summary>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(tx.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminZapupiMonitor;
