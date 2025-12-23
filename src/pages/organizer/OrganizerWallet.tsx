import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import {
  ArrowLeft,
  Loader2,
  Coins,
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Earning {
  id: string;
  tournament_id: string | null;
  amount: number;
  status: string;
  credited_at: string;
  settlement_date: string;
  withdrawn_at: string | null;
  tournament?: {
    title: string;
  };
}

interface WithdrawRequest {
  amount: number;
  upi_id: string;
}

const OrganizerWallet = () => {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawRequest, setWithdrawRequest] = useState<WithdrawRequest>({ amount: 0, upi_id: '' });
  
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
      fetchEarnings();
    }
  }, [isOrganizer, user]);

  const fetchEarnings = async () => {
    if (!user) return;

    try {
      // Fetch earnings with tournament details
      const { data: earningsData, error } = await supabase
        .from('organizer_earnings')
        .select(`
          *,
          tournament:tournaments(title)
        `)
        .eq('user_id', user.id)
        .order('credited_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      let total = 0;
      let available = 0;
      let pending = 0;

      earningsData?.forEach(e => {
        total += e.amount || 0;
        const settlementDate = new Date(e.settlement_date);
        if (e.status === 'withdrawn') {
          // Already withdrawn
        } else if (settlementDate <= now) {
          available += e.amount || 0;
        } else {
          pending += e.amount || 0;
        }
      });

      setEarnings(earningsData || []);
      setTotalEarnings(total);
      setAvailableBalance(available);
      setPendingBalance(pending);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;

    if (withdrawRequest.amount <= 0 || withdrawRequest.amount > availableBalance) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid withdrawal amount.', variant: 'destructive' });
      return;
    }

    if (!withdrawRequest.upi_id.trim()) {
      toast({ title: 'UPI Required', description: 'Please enter your UPI ID.', variant: 'destructive' });
      return;
    }

    setWithdrawing(true);
    try {
      // Create withdrawal request in wallet_transactions
      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          type: 'withdrawal',
          amount: -withdrawRequest.amount,
          status: 'pending',
          upi_id: withdrawRequest.upi_id,
          description: 'Organizer Dhana withdrawal'
        });

      if (error) throw error;

      // Update earnings status to withdrawn for available ones
      const now = new Date();
      let remainingToWithdraw = withdrawRequest.amount;

      for (const earning of earnings) {
        if (remainingToWithdraw <= 0) break;
        const settlementDate = new Date(earning.settlement_date);
        if (earning.status !== 'withdrawn' && settlementDate <= now) {
          const withdrawAmount = Math.min(earning.amount, remainingToWithdraw);
          await supabase
            .from('organizer_earnings')
            .update({ 
              status: 'withdrawn', 
              withdrawn_at: new Date().toISOString() 
            })
            .eq('id', earning.id);
          remainingToWithdraw -= withdrawAmount;
        }
      }

      toast({ title: 'Withdrawal Requested', description: `₹${withdrawRequest.amount} withdrawal request submitted.` });
      setWithdrawDialogOpen(false);
      setWithdrawRequest({ amount: 0, upi_id: '' });
      fetchEarnings();
    } catch (error) {
      console.error('Error withdrawing:', error);
      toast({ title: 'Error', description: 'Failed to process withdrawal.', variant: 'destructive' });
    } finally {
      setWithdrawing(false);
    }
  };

  const getSettlementStatus = (earning: Earning) => {
    if (earning.status === 'withdrawn') {
      return { label: 'Withdrawn', color: 'bg-gray-500', icon: CheckCircle };
    }
    
    const now = new Date();
    const settlementDate = new Date(earning.settlement_date);
    const daysRemaining = differenceInDays(settlementDate, now);
    
    if (daysRemaining <= 0) {
      return { label: 'Available', color: 'bg-green-500', icon: CheckCircle };
    }
    return { label: `${daysRemaining} days left`, color: 'bg-amber-500', icon: Clock };
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
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 sticky top-0 z-50">
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
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Earnings</p>
                <div className="flex items-center gap-2 mt-1">
                  <Coins className="h-8 w-8" />
                  <span className="text-4xl font-bold">{totalEarnings}</span>
                  <span className="text-lg">Dhana</span>
                </div>
                <p className="text-white/70 text-sm mt-2">= ₹{totalEarnings}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-white/30" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
              <p className="text-xl font-bold text-green-600 mt-1">{availableBalance} Dhana</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/20 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="text-xl font-bold text-amber-600 mt-1">{pendingBalance} Dhana</p>
            </CardContent>
          </Card>
        </div>

        {/* Withdraw Button */}
        {availableBalance > 0 && (
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
            onClick={() => setWithdrawDialogOpen(true)}
          >
            <ArrowUpRight className="h-5 w-5 mr-2" />
            Withdraw Dhana
          </Button>
        )}
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
                  Commission earnings become available for withdrawal after 15 days from credit date.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings History */}
      <div className="px-4 pb-20">
        <h3 className="font-semibold text-foreground mb-3">Earnings History</h3>
        <div className="space-y-3">
          {earnings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Coins className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No earnings yet</p>
                <p className="text-sm text-muted-foreground/70">Complete tournaments to earn Dhana</p>
              </CardContent>
            </Card>
          ) : (
            earnings.map((earning) => {
              const status = getSettlementStatus(earning);
              return (
                <Card key={earning.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {earning.tournament?.title || 'Tournament Commission'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(earning.credited_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+{earning.amount} Dhana</p>
                        <Badge className={`${status.color} text-white text-xs mt-1`}>
                          <status.icon className="h-3 w-3 mr-1" />
                          {status.label}
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
                Available: <strong>{availableBalance} Dhana (₹{availableBalance})</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Withdrawal Amount (Dhana)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={withdrawRequest.amount || ''}
                onChange={(e) => setWithdrawRequest(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                max={availableBalance}
              />
            </div>
            <div className="space-y-2">
              <Label>UPI ID</Label>
              <Input
                placeholder="yourname@upi"
                value={withdrawRequest.upi_id}
                onChange={(e) => setWithdrawRequest(prev => ({ ...prev, upi_id: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleWithdraw}
              disabled={withdrawing || withdrawRequest.amount <= 0 || !withdrawRequest.upi_id.trim()}
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
