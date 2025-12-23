import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  Coins,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Phone,
  CreditCard,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  History,
  Search,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

interface DhanaWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  upi_id: string;
  phone: string | null;
  status: string;
  rejection_reason: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  user_profile?: {
    username: string | null;
    full_name: string | null;
    email: string;
  };
}

interface UserDhanaInfo {
  balance: {
    pending_dhana: number;
    available_dhana: number;
    total_earned: number;
    total_withdrawn: number;
  } | null;
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    status: string;
    description: string | null;
    created_at: string;
    tournament?: { title: string };
  }>;
  withdrawals: Array<{
    id: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
}

const AdminDhanaWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<DhanaWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<DhanaWithdrawal | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [userInfo, setUserInfo] = useState<UserDhanaInfo | null>(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalPending: 0,
    totalApproved: 0
  });

  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAdmin && !isSuperAdmin) {
      navigate('/');
    }
  }, [authLoading, isAdmin, isSuperAdmin, navigate]);

  useEffect(() => {
    if ((isAdmin || isSuperAdmin) && user) {
      fetchWithdrawals();
    }
  }, [isAdmin, isSuperAdmin, user, activeTab]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);

      // Fetch all withdrawals with user profiles
      const { data: withdrawalData, error } = await supabase
        .from('dhana_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each withdrawal
      const userIds = [...new Set(withdrawalData?.map(w => w.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedWithdrawals = withdrawalData?.map(w => ({
        ...w,
        user_profile: profileMap.get(w.user_id) || null
      })) || [];

      setWithdrawals(enrichedWithdrawals);

      // Calculate stats
      const pending = enrichedWithdrawals.filter(w => w.status === 'pending');
      const approved = enrichedWithdrawals.filter(w => w.status === 'approved');
      const rejected = enrichedWithdrawals.filter(w => w.status === 'rejected');

      setStats({
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        totalPending: pending.reduce((sum, w) => sum + w.amount, 0),
        totalApproved: approved.reduce((sum, w) => sum + w.amount, 0)
      });

    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({ title: 'Error', description: 'Failed to fetch withdrawals', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async (userId: string) => {
    setLoadingUserInfo(true);
    try {
      // Fetch balance
      const { data: balanceData } = await supabase
        .from('dhana_balances')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch transactions
      const { data: txData } = await supabase
        .from('dhana_transactions')
        .select('*, tournament:tournaments(title)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch withdrawals history
      const { data: wData } = await supabase
        .from('dhana_withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      setUserInfo({
        balance: balanceData,
        transactions: txData || [],
        withdrawals: wData || []
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
    } finally {
      setLoadingUserInfo(false);
    }
  };

  const handleViewDetails = async (withdrawal: DhanaWithdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setViewDialogOpen(true);
    await fetchUserInfo(withdrawal.user_id);
  };

  const handleApprove = async (withdrawal: DhanaWithdrawal) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_process_dhana_withdrawal', {
        p_withdrawal_id: withdrawal.id,
        p_action: 'approve'
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve withdrawal');
      }

      toast({ title: 'Approved', description: `₹${withdrawal.amount} withdrawal approved successfully.` });
      setViewDialogOpen(false);
      fetchWithdrawals();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast({ title: 'Error', description: error.message || 'Failed to approve withdrawal', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_process_dhana_withdrawal', {
        p_withdrawal_id: selectedWithdrawal.id,
        p_action: 'reject',
        p_reason: rejectionReason || 'Rejected by admin'
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject withdrawal');
      }

      toast({ title: 'Rejected', description: `Withdrawal rejected. Amount refunded to user.` });
      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setRejectionReason('');
      fetchWithdrawals();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast({ title: 'Error', description: error.message || 'Failed to reject withdrawal', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesTab = activeTab === 'all' || w.status === activeTab;
    const matchesSearch = !searchQuery || 
      w.user_profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.user_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.upi_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="h-6 w-6 text-amber-500" />
            Dhana Withdrawals
          </h1>
          <p className="text-muted-foreground">Manage organizer and creator Dhana withdrawal requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">₹{stats.totalPending} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Approved</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">₹{stats.totalApproved} paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Rejected</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Total Paid</span>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-1">₹{stats.totalApproved}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Tabs */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username, email, or UPI..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Withdrawals List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Coins className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No withdrawal requests found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredWithdrawals.map((withdrawal) => (
              <Card key={withdrawal.id} className={
                withdrawal.status === 'pending' ? 'border-amber-200 dark:border-amber-800' : ''
              }>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${
                        withdrawal.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        withdrawal.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30' :
                        'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <Coins className={`h-5 w-5 ${
                          withdrawal.status === 'pending' ? 'text-amber-600' :
                          withdrawal.status === 'approved' ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{withdrawal.amount} Dhana</p>
                          <Badge className={
                            withdrawal.status === 'pending' ? 'bg-amber-500' :
                            withdrawal.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                          }>
                            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {withdrawal.user_profile?.username || withdrawal.user_profile?.email || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {withdrawal.upi_id}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(withdrawal.created_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(withdrawal)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {withdrawal.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(withdrawal)}
                            disabled={processing}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setRejectDialogOpen(true);
                            }}
                            disabled={processing}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                Withdrawal Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedWithdrawal && (
              <div className="space-y-6">
                {/* Withdrawal Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Request Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-bold text-lg">{selectedWithdrawal.amount} Dhana (₹{selectedWithdrawal.amount})</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge className={
                        selectedWithdrawal.status === 'pending' ? 'bg-amber-500' :
                        selectedWithdrawal.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                      }>
                        {selectedWithdrawal.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">UPI ID</p>
                      <p className="font-medium">{selectedWithdrawal.upi_id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedWithdrawal.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">User</p>
                      <p className="font-medium">
                        {selectedWithdrawal.user_profile?.username || selectedWithdrawal.user_profile?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedWithdrawal.user_profile?.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Requested At</p>
                      <p className="font-medium">{format(new Date(selectedWithdrawal.created_at), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* User Dhana Info */}
                {loadingUserInfo ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : userInfo && (
                  <>
                    {/* Balance Summary */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">User's Dhana Balance</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Earned</p>
                          <p className="font-bold text-green-600">{userInfo.balance?.total_earned || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Withdrawn</p>
                          <p className="font-bold text-blue-600">{userInfo.balance?.total_withdrawn || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Available</p>
                          <p className="font-bold text-green-600">{userInfo.balance?.available_dhana || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pending</p>
                          <p className="font-bold text-amber-600">{userInfo.balance?.pending_dhana || 0}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Earnings */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Recent Tournament Earnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {userInfo.transactions.filter(t => t.type === 'commission').length === 0 ? (
                          <p className="text-sm text-muted-foreground">No earnings history</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {userInfo.transactions.filter(t => t.type === 'commission').slice(0, 5).map((tx) => (
                              <div key={tx.id} className="flex items-center justify-between text-sm border-b pb-2">
                                <div>
                                  <p className="font-medium">{tx.tournament?.title || tx.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(tx.created_at), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                                <p className="font-bold text-green-600">+{tx.amount}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Action Buttons */}
                {selectedWithdrawal.status === 'pending' && (
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="destructive"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={processing}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(selectedWithdrawal)}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Approve & Pay ₹{selectedWithdrawal.amount}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Withdrawal</DialogTitle>
              <DialogDescription>
                The withdrawal amount will be refunded to user's available Dhana balance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reject Withdrawal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminDhanaWithdrawals;
