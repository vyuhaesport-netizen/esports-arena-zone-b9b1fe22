import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Wallet as WalletIcon, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  History,
  Loader2,
  AlertCircle,
  TrendingUp,
  Trophy,
  Award,
  ChevronDown,
  ChevronUp,
  Filter
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

interface EarningBreakdown {
  tournamentName: string;
  amount: number;
  date: string;
  type: string;
  position?: string;
}

const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [earningsBreakdown, setEarningsBreakdown] = useState<EarningBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [addMoneyDialog, setAddMoneyDialog] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [showEarningsBreakdown, setShowEarningsBreakdown] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<string>('all');
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

  useEffect(() => {
    filterTransactions();
  }, [transactions, transactionFilter]);

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      // Fetch wallet balance (deposits go here)
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance, withdrawable_balance')
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

      // Total Earned (withdrawable)
      // Source of truth is profiles.withdrawable_balance.
      // Fallback to transaction aggregation if it's missing for any reason.
      const isEarnedType = (type: string) =>
        ['winning', 'prize', 'prize_won', 'bonus'].includes(type) || type.includes('commission');

      const earningTxns = (txns || []).filter(
        (t) => isEarnedType(t.type) && t.status === 'completed'
      );

      const computedEarned = earningTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const computedWithdrawn = (txns || [])
        .filter((t) => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const computedWithdrawable = Math.max(0, computedEarned - computedWithdrawn);

      const withdrawableBalance =
        typeof profile?.withdrawable_balance === 'number'
          ? profile.withdrawable_balance
          : computedWithdrawable;

      setTotalEarned(withdrawableBalance || 0);

      // Create earnings breakdown
      const breakdown: EarningBreakdown[] = earningTxns.map((t) => {
        let tournamentName = 'Earning';
        let position = '';

        if (t.description) {
          const match = t.description.match(
            /(?:Prize|Won|Winning).*?(?:for|from|in)\s+(.+?)(?:\s*-\s*Rank\s*(\d+))?$/i
          );
          if (match) {
            tournamentName = match[1] || t.description;
            position = match[2] ? `Rank ${match[2]}` : '';
          } else {
            tournamentName = t.description;
          }
        }

        return {
          tournamentName,
          amount: Math.abs(t.amount),
          date: t.created_at,
          type: t.type,
          position,
        };
      });
      setEarningsBreakdown(breakdown);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    if (transactionFilter === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(t => t.type === transactionFilter));
    }
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

    if (amount > totalEarned) {
      toast({
        title: 'Insufficient Earnings',
        description: `You can only withdraw from Total Earned (₹${totalEarned}). Deposited money cannot be withdrawn.`,
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
        description: 'Your withdrawal is being processed.',
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
        return <Badge className="bg-success/10 text-success text-[10px]">Success</Badge>;
      case 'pending':
        return <Badge className="bg-muted/60 text-foreground text-[10px]">Pending</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  const getTransactionTypes = () => {
    const types = [...new Set(transactions.map(t => t.type))];
    return types;
  };

  if (loading) {
    return (
      <AppLayout title="Wallet" showBack>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Wallet" showBack>
      <div className="p-3">
        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div className="glass-card bg-success/5 border-2 border-success/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <WalletIcon className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Total Balance</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-sm text-success">₹</span>
              <span className="text-xl font-bold text-success">{balance.toFixed(0)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEarningsBreakdown(!showEarningsBreakdown)}
            className="glass-card bg-success/5 border-2 border-success/30 rounded-xl p-3 text-left hover:bg-success/10 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Total Earned</span>
              {showEarningsBreakdown ? (
                <ChevronUp className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
              )}
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-sm text-success">₹</span>
              <span className="text-xl font-bold text-success">{totalEarned.toFixed(0)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Withdrawable</p>
          </button>
        </div>

        {/* Info Banner */}
        <div className="glass-card bg-muted/20 rounded-xl p-2.5 mb-3 border-2 border-white/30">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Deposits → Balance (tournaments). Winnings → Earned (withdraw).
          </p>
        </div>

        {/* Earnings Breakdown Section */}
        {showEarningsBreakdown && (
          <div className="glass-card rounded-xl p-3 mb-3 animate-in slide-in-from-top-2 border-2 border-white/30">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-foreground" />
              <h3 className="font-semibold text-sm text-foreground">Earnings Breakdown</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {earningsBreakdown.length} entries
              </Badge>
            </div>

            {earningsBreakdown.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/60 flex items-center justify-center">
                  <Award className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-xs font-medium">No prize earnings yet</p>
                <p className="text-muted-foreground text-[10px] mt-1">Win tournaments to earn prizes!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {earningsBreakdown.map((earning, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg border-2 border-white/20"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                        <Trophy className="h-4 w-4 text-warning" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{earning.tournamentName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(earning.date), 'MMM dd, yyyy')}
                          </p>
                          {earning.position && (
                            <Badge variant="secondary" className="text-[9px] px-1.5">
                              {earning.position}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-success font-bold text-xs flex-shrink-0 ml-2">
                      +₹{earning.amount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <Button 
            variant="outline" 
            className="h-10 flex-col gap-0.5 rounded-xl border-2"
            onClick={() => setAddMoneyDialog(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs font-medium">Add Money</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-10 flex-col gap-0.5 rounded-xl border-2"
            onClick={() => setWithdrawDialog(true)}
            disabled={totalEarned < 10}
          >
            <ArrowUpRight className="h-4 w-4" />
            <span className="text-xs font-medium">Withdraw</span>
          </Button>
        </div>

        {/* Transaction History */}
        <div className="glass-card rounded-xl p-3 border-2 border-white/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-foreground" />
              <h3 className="font-semibold text-sm text-foreground">Transaction History</h3>
            </div>
            <Select value={transactionFilter} onValueChange={setTransactionFilter}>
              <SelectTrigger className="w-28 h-8 text-xs rounded-lg">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {getTransactionTypes().map(type => (
                  <SelectItem key={type} value={type} className="capitalize text-xs">
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
                <ArrowDownLeft className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-xs font-medium">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((txn) => {
                const isCreditType = ['deposit', 'prize', 'prize_won', 'winning', 'admin_credit', 'commission', 'refund', 'bonus'].includes(txn.type);
                return (
                  <div key={txn.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCreditType ? 'bg-success/15' : 'bg-destructive/15'
                        }`}
                      >
                        {isCreditType ? (
                          <ArrowDownLeft className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground capitalize">{txn.type.replace('_', ' ')}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(txn.created_at), 'MMM dd, hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold text-xs ${
                          isCreditType ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {isCreditType ? '+' : '-'}₹{Math.abs(txn.amount)}
                      </p>
                      {getStatusBadge(txn.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Money Dialog */}
      <Dialog open={addMoneyDialog} onOpenChange={setAddMoneyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
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
                      : 'bg-muted hover:bg-accent'
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
              Withdraw from your earnings. Only prize winnings can be withdrawn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-foreground" />
              <span className="text-sm text-foreground">Available to withdraw: <strong>₹{totalEarned.toFixed(2)}</strong></span>
            </div>

            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                max={totalEarned}
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

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border rounded-lg">
              <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Important:</strong> Please double-check your UPI ID before submitting. If the UPI ID is incorrect, we are not responsible for any failed or misdirected payments.
              </p>
            </div>

            {parseFloat(withdrawForm.amount) > totalEarned && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">Amount exceeds available earnings</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleWithdraw}
              disabled={processing || parseFloat(withdrawForm.amount) > totalEarned || !withdrawForm.upiId.trim() || !withdrawForm.amount}
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
