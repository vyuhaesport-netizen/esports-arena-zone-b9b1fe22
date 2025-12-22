import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  Wallet as WalletIcon, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  History,
  IndianRupee,
  Loader2,
  AlertCircle,
  TrendingUp,
  ArrowDownFromLine
} from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  reason: string | null;
}

const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [addMoneyDialog, setAddMoneyDialog] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    phone: '',
    upiId: '',
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      // Fetch wallet balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single();

      setBalance(profile?.wallet_balance || 0);

      // Fetch transactions
      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(txns || []);

      // Calculate total earned (completed deposits + winnings)
      const earned = (txns || [])
        .filter(t => (t.type === 'deposit' || t.type === 'winning' || t.type === 'prize') && t.status === 'completed')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      setTotalEarned(earned);

      // Calculate total withdrawn (completed withdrawals)
      const withdrawn = (txns || [])
        .filter(t => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      setTotalWithdrawn(withdrawn);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = (amount: number) => {
    setDepositAmount(amount.toString());
  };

  const handleAddMoney = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 10) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum deposit amount is ₹10',
        variant: 'destructive',
      });
      return;
    }
    setAddMoneyDialog(false);
    navigate(`/payment?amount=${amount}`);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawForm.amount);
    
    if (!amount || amount < 10) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum withdrawal amount is ₹10',
        variant: 'destructive',
      });
      return;
    }

    if (amount > balance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You cannot withdraw more than your available balance',
        variant: 'destructive',
      });
      return;
    }

    if (!withdrawForm.upiId.trim() || withdrawForm.upiId.length < 5) {
      toast({
        title: 'UPI ID Required',
        description: 'Please enter a valid UPI ID',
        variant: 'destructive',
      });
      return;
    }

    if (!withdrawForm.phone.trim() || withdrawForm.phone.length < 10) {
      toast({
        title: 'Phone Required',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    setProcessing(true);

    try {
      // Use atomic database function for withdrawal to prevent race conditions
      const { data, error } = await supabase.rpc('process_withdrawal', {
        p_user_id: user.id,
        p_amount: amount,
        p_upi_id: withdrawForm.upiId.trim(),
        p_phone: withdrawForm.phone.trim(),
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; new_balance?: number };

      if (!result.success) {
        toast({
          title: 'Withdrawal Failed',
          description: result.error || 'Failed to process withdrawal',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Withdrawal Request Sent',
        description: 'Your withdrawal is being processed. Amount has been put on hold.',
      });

      setWithdrawDialog(false);
      setWithdrawForm({ amount: '', phone: '', upiId: '' });
      fetchWalletData();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: 'Error',
        description: 'Failed to process withdrawal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 text-[10px]">Success</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">Pending</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AppLayout title="Wallet">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Wallet">
      <div className="p-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-primary to-orange-400 rounded-xl p-5 text-primary-foreground mb-4">
          <div className="flex items-center gap-2 mb-1">
            <WalletIcon className="h-4 w-4" />
            <span className="text-xs opacity-90">Available Balance</span>
          </div>
          <div className="flex items-baseline gap-1">
            <IndianRupee className="h-5 w-5" />
            <span className="text-3xl font-gaming font-bold">{balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Stats Cards - Total Earned & Withdrawn */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-3 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] opacity-90">Total Earned</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs">₹</span>
              <span className="text-xl font-bold">{totalEarned.toFixed(0)}</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownFromLine className="h-3.5 w-3.5" />
              <span className="text-[10px] opacity-90">Withdrawn</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs">₹</span>
              <span className="text-xl font-bold">{totalWithdrawn.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button 
            variant="outline" 
            className="h-14 flex-col gap-1"
            onClick={() => setAddMoneyDialog(true)}
          >
            <Plus className="h-5 w-5 text-primary" />
            <span className="text-xs">Add Money</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-14 flex-col gap-1"
            onClick={() => setWithdrawDialog(true)}
          >
            <ArrowUpRight className="h-5 w-5 text-primary" />
            <span className="text-xs">Withdraw</span>
          </Button>
        </div>

        {/* Transaction History */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Transaction History</h3>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <ArrowDownLeft className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">No transactions yet</p>
              <p className="text-muted-foreground text-xs mt-1">Add money to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      txn.type === 'deposit' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {txn.type === 'deposit' ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{txn.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(txn.created_at), 'MMM dd, hh:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${
                      txn.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.type === 'deposit' ? '+' : ''}₹{Math.abs(txn.amount)}
                    </p>
                    {getStatusBadge(txn.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Money Dialog */}
      <Dialog open={addMoneyDialog} onOpenChange={setAddMoneyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Money
            </DialogTitle>
            <DialogDescription>
              Enter the amount you want to add to your wallet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(amt.toString())}
                  className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    depositAmount === amt.toString()
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Enter Amount</Label>
              <Input
                type="number"
                placeholder="₹ Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="10"
                className="text-lg h-12"
              />
              <p className="text-xs text-muted-foreground">Minimum: ₹10</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMoneyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddMoney}
              disabled={!depositAmount || parseFloat(depositAmount) < 10}
            >
              Proceed to Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Enter your withdrawal details. Amount will be put on hold until approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <WalletIcon className="h-4 w-4 text-primary" />
              <span className="text-sm">Available: <strong>₹{balance.toFixed(2)}</strong></span>
            </div>

            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                max={balance}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                type="tel"
                placeholder="Enter your phone number"
                value={withdrawForm.phone}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>UPI ID *</Label>
              <Input
                type="text"
                placeholder="yourname@upi"
                value={withdrawForm.upiId}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, upiId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Money will be sent to this UPI ID</p>
            </div>

            {parseFloat(withdrawForm.amount) > balance && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">Insufficient balance</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleWithdraw}
              disabled={processing || parseFloat(withdrawForm.amount) > balance}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Wallet;
