import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Loader2,
  Coins,
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Sparkles,
  History,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CreditCard
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface DhanaBalance {
  pending_dhana: number;
  available_dhana: number;
  total_earned: number;
  total_withdrawn: number;
}

interface DhanaTransaction {
  id: string;
  tournament_id: string | null;
  amount: number;
  type: string;
  status: string;
  available_at: string | null;
  description: string | null;
  created_at: string;
  tournament?: {
    title: string;
  };
}

interface DhanaWithdrawal {
  id: string;
  amount: number;
  status: string;
  upi_id: string;
  phone: string | null;
  rejection_reason: string | null;
  created_at: string;
  processed_at: string | null;
}

interface WithdrawRequest {
  amount: number;
  upi_id: string;
  phone: string;
}

const OrganizerWallet = () => {
  const [balance, setBalance] = useState<DhanaBalance | null>(null);
  const [transactions, setTransactions] = useState<DhanaTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<DhanaWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawRequest, setWithdrawRequest] = useState<WithdrawRequest>({ amount: 0, upi_id: '', phone: '' });
  const [showAllWithdrawals, setShowAllWithdrawals] = useState(false);
  
  const { user, isOrganizer, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isOrganizer) {
        navigate('/profile');
        toast({ title: 'Access Denied', description: 'You are not an approved organizer.', variant: 'destructive' });
      }
    }
  }, [user, isOrganizer, authLoading, navigate, toast]);

  useEffect(() => {
    if (isOrganizer && user) {
      fetchDhanaData();
    }
  }, [isOrganizer, user]);

  const fetchDhanaData = async () => {
    if (!user) return;

    try {
      // First, process any matured transactions
      await supabase.rpc('process_dhana_maturation');

      // Fetch balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('dhana_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (balanceError) throw balanceError;

      setBalance(balanceData || {
        pending_dhana: 0,
        available_dhana: 0,
        total_earned: 0,
        total_withdrawn: 0
      });

      // Fetch transactions with tournament details
      const { data: txData, error: txError } = await supabase
        .from('dhana_transactions')
        .select(`
          *,
          tournament:tournaments(title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) throw txError;
      setTransactions(txData || []);

      // Fetch recent withdrawals
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('dhana_withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (withdrawalError) throw withdrawalError;
      setWithdrawals(withdrawalData || []);

    } catch (error) {
      console.error('Error fetching Dhana data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleWithdraw = async () => {
    if (!user) return;

    if (withdrawRequest.amount < 10) {
      toast({ title: 'Minimum ₹10', description: 'Minimum withdrawal amount is 10 Dhana.', variant: 'destructive' });
      return;
    }

    if (withdrawRequest.amount > (balance?.available_dhana || 0)) {
      toast({ title: 'Insufficient Balance', description: 'You don\'t have enough available Dhana.', variant: 'destructive' });
      return;
    }

    if (!withdrawRequest.upi_id.trim()) {
      toast({ title: 'UPI Required', description: 'Please enter your UPI ID.', variant: 'destructive' });
      return;
    }


    setWithdrawing(true);
    try {
      const { data, error } = await supabase.rpc('request_dhana_withdrawal', {
        p_user_id: user.id,
        p_amount: withdrawRequest.amount,
        p_upi_id: withdrawRequest.upi_id,
        p_phone: withdrawRequest.phone || null
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to process withdrawal');
      }

      toast({ title: 'Withdrawal Requested', description: `${withdrawRequest.amount} Dhana (₹${withdrawRequest.amount}) withdrawal request submitted.` });
      setWithdrawDialogOpen(false);
      setWithdrawRequest({ amount: 0, upi_id: '', phone: '' });
      fetchDhanaData();
    } catch (error: any) {
      console.error('Error withdrawing:', error);
      toast({ title: 'Error', description: error.message || 'Failed to process withdrawal.', variant: 'destructive' });
    } finally {
      setWithdrawing(false);
    }
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'commission') {
      if (status === 'pending') return { icon: Clock, color: 'text-amber-500' };
      return { icon: CheckCircle, color: 'text-green-500' };
    }
    if (type === 'withdrawal_approved') return { icon: CheckCircle, color: 'text-blue-500' };
    if (type === 'withdrawal_rejected') return { icon: Clock, color: 'text-red-500' };
    return { icon: Coins, color: 'text-muted-foreground' };
  };

  const getTransactionBadge = (type: string, status: string, availableAt: string | null) => {
    if (type === 'commission' && status === 'pending' && availableAt) {
      const daysLeft = differenceInDays(new Date(availableAt), new Date());
      if (daysLeft > 0) {
        return { label: `${daysLeft} days left`, color: 'bg-amber-500' };
      }
      return { label: 'Maturing...', color: 'bg-amber-500' };
    }
    if (type === 'commission' && status === 'available') return { label: 'Available', color: 'bg-green-500' };
    if (type === 'withdrawal_request') return { label: 'Pending', color: 'bg-blue-500' };
    if (type === 'withdrawal_approved') return { label: 'Approved', color: 'bg-green-600' };
    if (type === 'withdrawal_rejected') return { label: 'Rejected', color: 'bg-red-500' };
    return { label: status, color: 'bg-gray-500' };
  };

  const getWithdrawalStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10', label: 'Pending', description: 'Awaiting review' };
      case 'processing':
        return { icon: Loader2, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Processing', description: 'Being processed' };
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Completed', description: 'Payment sent' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Rejected', description: 'Request denied' };
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Failed', description: 'Payment failed' };
      default:
        return { icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted', label: status, description: '' };
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/organizer')} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Wallet className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">Dhana Wallet</h1>
            <p className="text-sm text-white/80">Your organizer earnings</p>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="p-4 space-y-3">
        {/* Total Earnings Card */}
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Earnings (Approved)</p>
                <div className="flex items-center gap-2 mt-1">
                  <Coins className="h-8 w-8" />
                  <span className="text-4xl font-bold">{balance?.total_withdrawn || 0}</span>
                  <span className="text-lg">Dhana</span>
                </div>
                <p className="text-white/70 text-sm mt-2">= ₹{balance?.total_withdrawn || 0}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-white/30" />
            </div>
          </CardContent>
        </Card>

        {/* Available & Pending */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Withdrawable</span>
              </div>
              <p className="text-xl font-bold text-green-600 mt-1">{balance?.available_dhana || 0} Dhana</p>
              <p className="text-xs text-muted-foreground">Ready to withdraw</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/20 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="text-xl font-bold text-amber-600 mt-1">{balance?.pending_dhana || 0} Dhana</p>
              <p className="text-xs text-muted-foreground">In settlement</p>
            </CardContent>
          </Card>
        </div>

        {/* Withdraw Button - Always visible */}
        <Button 
          className="w-full bg-green-600 hover:bg-green-700 text-white h-12 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setWithdrawDialogOpen(true)}
          disabled={(balance?.available_dhana || 0) < 10}
        >
          <ArrowUpRight className="h-5 w-5 mr-2" />
          {(balance?.available_dhana || 0) < 10 
            ? `Withdraw (Need ${10 - (balance?.available_dhana || 0)} more Dhana)` 
            : 'Withdraw Dhana (Min ₹10)'
          }
        </Button>
      </div>

      {/* Settlement Info */}
      <div className="px-4 pb-4">
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700 dark:text-amber-400 text-sm">15-Day Settlement Period</h4>
                <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">
                  Commission earnings become withdrawable after 15 days. 1 Dhana = ₹1.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal History - Enhanced */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Withdrawal History
          </h3>
          {withdrawals.length > 3 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAllWithdrawals(!showAllWithdrawals)}
              className="text-xs h-7"
            >
              {showAllWithdrawals ? (
                <>Show Less <ChevronUp className="h-3 w-3 ml-1" /></>
              ) : (
                <>View All ({withdrawals.length}) <ChevronDown className="h-3 w-3 ml-1" /></>
              )}
            </Button>
          )}
        </div>
        
        {withdrawals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-sm">No withdrawals yet</p>
              <p className="text-xs text-muted-foreground/70">Your withdrawal history will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(showAllWithdrawals ? withdrawals : withdrawals.slice(0, 3)).map((w) => {
              const statusInfo = getWithdrawalStatusInfo(w.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Card key={w.id} className={`border-l-4 ${
                  w.status === 'approved' ? 'border-l-green-500' :
                  w.status === 'rejected' ? 'border-l-red-500' :
                  w.status === 'processing' ? 'border-l-blue-500' :
                  'border-l-amber-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
                          <StatusIcon className={`h-4 w-4 ${statusInfo.color} ${w.status === 'processing' ? 'animate-spin' : ''}`} />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{w.amount} Dhana</p>
                          <p className="text-xs text-muted-foreground">= ₹{w.amount}</p>
                        </div>
                      </div>
                      <Badge className={`${
                        w.status === 'approved' ? 'bg-green-500' :
                        w.status === 'rejected' ? 'bg-red-500' :
                        w.status === 'processing' ? 'bg-blue-500' :
                        'bg-amber-500'
                      } text-white`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    
                    {/* Timeline */}
                    <div className="border-t border-border/50 pt-3 mt-2">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Requested</p>
                          <p className="font-medium">{format(new Date(w.created_at), 'MMM dd, yyyy h:mm a')}</p>
                        </div>
                        {w.processed_at && (
                          <div>
                            <p className="text-muted-foreground">Processed</p>
                            <p className="font-medium">{format(new Date(w.processed_at), 'MMM dd, yyyy h:mm a')}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* UPI Info */}
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <p className="text-xs text-muted-foreground">UPI: <span className="font-medium text-foreground">{w.upi_id}</span></p>
                      </div>
                      
                      {/* Rejection Reason */}
                      {w.status === 'rejected' && w.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-500/10 rounded-lg">
                          <p className="text-xs text-red-600 dark:text-red-400">
                            <strong>Reason:</strong> {w.rejection_reason}
                          </p>
                        </div>
                      )}
                      
                      {/* Processing Note */}
                      {w.status === 'pending' && (
                        <div className="mt-2 p-2 bg-amber-500/10 rounded-lg">
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Usually processed within 24-48 hours
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="px-4 pb-20">
        <h3 className="font-semibold text-foreground mb-3">Earnings History</h3>
        <div className="space-y-3">
          {transactions.filter(t => t.type === 'commission').length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Coins className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No earnings yet</p>
                <p className="text-sm text-muted-foreground/70">Complete tournaments to earn Dhana</p>
              </CardContent>
            </Card>
          ) : (
            transactions.filter(t => t.type === 'commission').map((tx) => {
              const iconData = getTransactionIcon(tx.type, tx.status);
              const badgeData = getTransactionBadge(tx.type, tx.status, tx.available_at);
              const IconComponent = iconData.icon;
              
              return (
                <Card key={tx.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full bg-muted ${iconData.color}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {tx.tournament?.title || tx.description || 'Tournament Commission'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+{tx.amount} Dhana</p>
                        <Badge className={`${badgeData.color} text-white text-xs mt-1`}>
                          {badgeData.label}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-600" />
              Withdraw Dhana
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">
                Available: <strong>{balance?.available_dhana || 0} Dhana (₹{balance?.available_dhana || 0})</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Minimum withdrawal: 10 Dhana</p>
            </div>
            <div className="space-y-2">
              <Label>Withdrawal Amount (Dhana)</Label>
              <Input
                type="number"
                placeholder="Min 10"
                value={withdrawRequest.amount || ''}
                onChange={(e) => setWithdrawRequest(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                max={balance?.available_dhana || 0}
                min={10}
              />
            </div>
            <div className="space-y-2">
              <Label>UPI ID *</Label>
              <Input
                placeholder="yourname@upi"
                value={withdrawRequest.upi_id}
                onChange={(e) => setWithdrawRequest(prev => ({ ...prev, upi_id: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Money will be sent to this UPI ID</p>
            </div>
            <div className="space-y-2">
              <Label>Phone Number (Optional)</Label>
              <Input
                placeholder="9876543210"
                value={withdrawRequest.phone}
                onChange={(e) => setWithdrawRequest(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Important:</strong> Please double-check your UPI ID before submitting. If the UPI ID is incorrect, we are not responsible for any failed or misdirected payments.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleWithdraw}
              disabled={withdrawing || withdrawRequest.amount < 10 || withdrawRequest.amount > (balance?.available_dhana || 0) || !withdrawRequest.upi_id.trim()}
            >
              {withdrawing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Withdraw ₹{withdrawRequest.amount || 0}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerWallet;
