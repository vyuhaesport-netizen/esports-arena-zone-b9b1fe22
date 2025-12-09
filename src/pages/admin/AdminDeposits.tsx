import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ArrowDownLeft,
  Check,
  X,
  User,
  Image,
  Hash,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  utr_number: string | null;
  screenshot_url: string | null;
  user_email?: string;
  user_name?: string;
}

const AdminDeposits = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; deposit: Deposit | null; action: 'approve' | 'reject' | null }>({ open: false, deposit: null, action: null });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { user, loading: authLoading, hasPermission } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('deposits:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('deposits:view')) {
      fetchDeposits();
    }
  }, [hasPermission]);

  const fetchDeposits = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('type', 'deposit')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each deposit
      const userIds = [...new Set(data?.map(d => d.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const depositsWithUsers = (data || []).map(deposit => {
        const profile = profiles?.find(p => p.user_id === deposit.user_id);
        return {
          ...deposit,
          user_email: profile?.email,
          user_name: profile?.full_name,
        };
      });

      setDeposits(depositsWithUsers);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (deposit: Deposit) => {
    if (!hasPermission('deposits:manage')) {
      toast({ title: 'Access Denied', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }

    setProcessing(deposit.id);
    
    try {
      // Get user's current wallet balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', deposit.user_id)
        .single();

      const currentBalance = profile?.wallet_balance || 0;
      const newBalance = currentBalance + deposit.amount;

      // Update user's wallet balance
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('user_id', deposit.user_id);

      if (walletError) throw walletError;

      // Update deposit status
      const { error: depositError } = await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'completed',
          processed_by: user?.id,
        })
        .eq('id', deposit.id);

      if (depositError) throw depositError;

      toast({ title: 'Deposit Approved', description: `₹${deposit.amount} added to user wallet.` });
      setConfirmDialog({ open: false, deposit: null, action: null });
      fetchDeposits();
    } catch (error) {
      console.error('Error approving deposit:', error);
      toast({ title: 'Error', description: 'Failed to approve deposit.', variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (deposit: Deposit) => {
    if (!hasPermission('deposits:manage')) {
      toast({ title: 'Access Denied', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }

    setProcessing(deposit.id);

    try {
      const { error } = await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'failed',
          processed_by: user?.id,
          reason: 'Rejected by admin',
        })
        .eq('id', deposit.id);

      if (error) throw error;

      toast({ title: 'Deposit Rejected', description: 'Deposit request has been rejected.' });
      setConfirmDialog({ open: false, deposit: null, action: null });
      fetchDeposits();
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      toast({ title: 'Error', description: 'Failed to reject deposit.', variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const getFilteredDeposits = () => {
    if (activeTab === 'all') return deposits;
    return deposits.filter(d => d.status === activeTab);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/10 text-green-600 text-[10px]">Approved</Badge>;
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">Pending</Badge>;
      case 'failed': return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Deposits">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Deposit Requests">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Approved</TabsTrigger>
            <TabsTrigger value="failed" className="text-xs">Rejected</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Deposits List */}
        <div className="space-y-3">
          {getFilteredDeposits().map((deposit) => (
            <Card key={deposit.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <ArrowDownLeft className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-600">+₹{deposit.amount}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {deposit.user_name || deposit.user_email || 'Unknown User'}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(deposit.status)}
                </div>

                {/* UTR Number */}
                {deposit.utr_number && (
                  <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2 mb-2">
                    <Hash className="h-4 w-4 text-primary" />
                    <span className="font-mono">{deposit.utr_number}</span>
                  </div>
                )}

                {/* Screenshot */}
                {deposit.screenshot_url && (
                  <button
                    onClick={() => setImagePreview(deposit.screenshot_url)}
                    className="flex items-center gap-2 text-sm text-primary hover:underline mb-2"
                  >
                    <Image className="h-4 w-4" />
                    View Screenshot
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}

                <p className="text-xs text-muted-foreground">
                  {format(new Date(deposit.created_at), 'MMM dd, yyyy hh:mm a')}
                </p>

                {deposit.status === 'pending' && hasPermission('deposits:manage') && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-green-600 border-green-600"
                      onClick={() => setConfirmDialog({ open: true, deposit, action: 'approve' })}
                      disabled={processing === deposit.id}
                    >
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-destructive border-destructive"
                      onClick={() => setConfirmDialog({ open: true, deposit, action: 'reject' })}
                      disabled={processing === deposit.id}
                    >
                      <X className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {getFilteredDeposits().length === 0 && (
            <div className="text-center py-12">
              <ArrowDownLeft className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No deposits found</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, deposit: null, action: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'approve' ? 'Approve Deposit' : 'Reject Deposit'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === 'approve' 
                ? `This will add ₹${confirmDialog.deposit?.amount} to the user's wallet balance.`
                : 'This will reject the deposit request. The user will not receive any funds.'}
            </DialogDescription>
          </DialogHeader>
          {confirmDialog.deposit?.utr_number && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm">
                <span className="text-muted-foreground">UTR:</span>{' '}
                <span className="font-mono font-medium">{confirmDialog.deposit.utr_number}</span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, deposit: null, action: null })}>
              Cancel
            </Button>
            <Button 
              variant={confirmDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={() => {
                if (confirmDialog.deposit && confirmDialog.action === 'approve') {
                  handleApprove(confirmDialog.deposit);
                } else if (confirmDialog.deposit && confirmDialog.action === 'reject') {
                  handleReject(confirmDialog.deposit);
                }
              }}
              disabled={processing !== null}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : (confirmDialog.action === 'approve' ? 'Approve' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {imagePreview && (
            <img src={imagePreview} alt="Payment Screenshot" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDeposits;
