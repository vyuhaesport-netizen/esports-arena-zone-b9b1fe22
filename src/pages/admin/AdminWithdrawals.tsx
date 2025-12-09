import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ArrowUpRight,
  Check,
  X,
  User,
  Phone,
  CreditCard,
  Copy
} from 'lucide-react';
import { format } from 'date-fns';

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  description: string | null;
  reason: string | null;
  created_at: string;
  upi_id: string | null;
  phone: string | null;
  user_email?: string;
  user_name?: string;
}

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const { user, loading: authLoading, hasPermission } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('withdrawals:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('withdrawals:view')) {
      fetchWithdrawals();
    }
  }, [hasPermission]);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('type', 'withdrawal')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(data?.map(d => d.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const withdrawalsWithUsers = (data || []).map(withdrawal => {
        const profile = profiles?.find(p => p.user_id === withdrawal.user_id);
        return {
          ...withdrawal,
          user_email: profile?.email,
          user_name: profile?.full_name,
        };
      });

      setWithdrawals(withdrawalsWithUsers);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredWithdrawals = () => {
    if (activeTab === 'all') return withdrawals;
    return withdrawals.filter(w => w.status === activeTab);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/10 text-green-600 text-[10px]">Approved</Badge>;
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">Pending</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard.` });
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    
    if (!hasPermission('withdrawals:manage')) {
      toast({ title: 'Access Denied', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'completed',
          processed_by: user?.id 
        })
        .eq('id', selectedWithdrawal.id);

      if (error) throw error;

      toast({ title: 'Approved', description: 'Withdrawal marked as completed. Please send the money manually.' });
      setActionDialog(null);
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to approve withdrawal.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectReason) {
      toast({ title: 'Error', description: 'Please provide a reason.', variant: 'destructive' });
      return;
    }

    if (!hasPermission('withdrawals:manage')) {
      toast({ title: 'Access Denied', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      // Refund the amount back to user's wallet
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', selectedWithdrawal.user_id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ 
            wallet_balance: (profile.wallet_balance || 0) + Math.abs(selectedWithdrawal.amount)
          })
          .eq('user_id', selectedWithdrawal.user_id);
      }

      const { error } = await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'rejected',
          reason: rejectReason,
          processed_by: user?.id 
        })
        .eq('id', selectedWithdrawal.id);

      if (error) throw error;

      toast({ title: 'Rejected', description: 'Withdrawal rejected and amount refunded to user.' });
      setActionDialog(null);
      setSelectedWithdrawal(null);
      setRejectReason('');
      fetchWithdrawals();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to reject withdrawal.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Withdrawals">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Withdrawal Requests">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Withdrawals List */}
        <div className="space-y-3">
          {getFilteredWithdrawals().map((withdrawal) => (
            <Card key={withdrawal.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-600">₹{Math.abs(withdrawal.amount)}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {withdrawal.user_name || withdrawal.user_email || 'Unknown User'}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(withdrawal.status)}
                </div>

                {/* UPI ID */}
                {withdrawal.upi_id && (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2 mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="font-mono">{withdrawal.upi_id}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyToClipboard(withdrawal.upi_id!, 'UPI ID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Phone */}
                {withdrawal.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Phone className="h-4 w-4" />
                    <span>{withdrawal.phone}</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {format(new Date(withdrawal.created_at), 'MMM dd, yyyy hh:mm a')}
                </p>

                {withdrawal.status === 'pending' && hasPermission('withdrawals:manage') && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-green-600 border-green-600 hover:bg-green-500/10"
                      onClick={() => {
                        setSelectedWithdrawal(withdrawal);
                        setActionDialog('approve');
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setSelectedWithdrawal(withdrawal);
                        setActionDialog('reject');
                      }}
                    >
                      <X className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}

                {withdrawal.status === 'rejected' && withdrawal.reason && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Reason:</span> {withdrawal.reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {getFilteredWithdrawals().length === 0 && (
            <div className="text-center py-12">
              <ArrowUpRight className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No withdrawal requests found</p>
            </div>
          )}
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={actionDialog === 'approve'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>
              Confirm that you have manually sent ₹{selectedWithdrawal && Math.abs(selectedWithdrawal.amount)} to the user.
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal?.upi_id && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">UPI ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{selectedWithdrawal.upi_id}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => copyToClipboard(selectedWithdrawal.upi_id!, 'UPI ID')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="font-medium">₹{Math.abs(selectedWithdrawal.amount)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Payment Sent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionDialog === 'reject'} onOpenChange={() => {
        setActionDialog(null);
        setRejectReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Please provide a reason. The amount ₹{selectedWithdrawal && Math.abs(selectedWithdrawal.amount)} will be refunded to the user's wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectReason}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject & Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminWithdrawals;
