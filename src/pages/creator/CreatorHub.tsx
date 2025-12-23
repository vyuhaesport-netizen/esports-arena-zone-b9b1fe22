import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import {
  Trophy,
  Wallet,
  FileWarning,
  MessageCircle,
  ArrowLeft,
  Loader2,
  Coins,
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface DashboardStats {
  totalTournaments: number;
  totalEarnings: number;
  availableBalance: number;
  pendingReports: number;
}

const CreatorHub = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTournaments: 0,
    totalEarnings: 0,
    availableBalance: 0,
    pendingReports: 0
  });
  const [loading, setLoading] = useState(true);
  const { user, isCreator, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isCreator) {
        navigate('/profile');
        toast({ title: 'Access Denied', description: 'You are not an approved creator.', variant: 'destructive' });
      }
    }
  }, [user, isCreator, authLoading, navigate, toast]);

  useEffect(() => {
    if (isCreator && user) {
      fetchStats();
    }
  }, [isCreator, user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Fetch tournaments count
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, organizer_earnings')
        .eq('created_by', user.id)
        .eq('tournament_type', 'creator');

      const totalTournaments = tournaments?.length || 0;
      const totalEarnings = tournaments?.reduce((sum, t) => sum + (t.organizer_earnings || 0), 0) || 0;

      // Fetch available balance (settled earnings)
      const { data: earnings } = await supabase
        .from('organizer_earnings')
        .select('amount, status, settlement_date')
        .eq('user_id', user.id);

      const now = new Date();
      const availableBalance = earnings?.reduce((sum, e) => {
        if (e.status === 'available' || (e.status === 'pending' && new Date(e.settlement_date) <= now)) {
          return sum + (e.amount || 0);
        }
        return sum;
      }, 0) || 0;

      // Fetch pending reports count
      const { data: reports } = await supabase
        .from('tournament_reports')
        .select('id, tournament_id')
        .eq('status', 'pending');

      // Filter reports for user's tournaments
      const { data: userTournaments } = await supabase
        .from('tournaments')
        .select('id')
        .eq('created_by', user.id);

      const userTournamentIds = userTournaments?.map(t => t.id) || [];
      const pendingReports = reports?.filter(r => userTournamentIds.includes(r.tournament_id)).length || 0;

      setStats({
        totalTournaments,
        totalEarnings,
        availableBalance,
        pendingReports
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const menuItems = [
    {
      title: 'Tournament Management',
      description: 'Create and manage your tournaments',
      icon: Trophy,
      path: '/creator/dashboard',
      color: 'from-purple-500 to-pink-600',
      stat: `${stats.totalTournaments} Tournaments`
    },
    {
      title: 'Wallet',
      description: 'View earnings & withdraw Dhana',
      icon: Wallet,
      path: '/creator/wallet',
      color: 'from-green-500 to-emerald-600',
      stat: `${stats.availableBalance} Dhana Available`
    },
    {
      title: 'Reports',
      description: 'View player reports & complaints',
      icon: FileWarning,
      path: '/creator/reports',
      color: 'from-red-500 to-rose-600',
      stat: stats.pendingReports > 0 ? `${stats.pendingReports} Pending` : 'No pending reports'
    },
    {
      title: 'Connect With Owner',
      description: 'Contact platform owner for support',
      icon: MessageCircle,
      path: '/creator/contact',
      color: 'from-blue-500 to-indigo-600',
      stat: 'Get help & support'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Sparkles className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">Creator Dashboard</h1>
            <p className="text-sm text-white/80">Manage your content & tournaments</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Total Earnings</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              <Coins className="h-5 w-5 inline mr-1" />
              {stats.totalEarnings} Dhana
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Available</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">
              <Coins className="h-5 w-5 inline mr-1" />
              {stats.availableBalance} Dhana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items */}
      <div className="p-4 space-y-4">
        {menuItems.map((item) => (
          <Card 
            key={item.path} 
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50"
            onClick={() => navigate(item.path)}
          >
            <div className={`h-2 bg-gradient-to-r ${item.color}`} />
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} text-white`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <p className="text-xs text-primary mt-1 font-medium">{item.stat}</p>
                </div>
                {item.title === 'Reports' && stats.pendingReports > 0 && (
                  <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {stats.pendingReports}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dhana Info */}
      <div className="p-4">
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Coins className="h-8 w-8 text-amber-500 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-700 dark:text-amber-400">What is Dhana?</h4>
                <p className="text-sm text-amber-600/80 dark:text-amber-500/80 mt-1">
                  Dhana is our platform currency. <strong>1 Dhana = ₹1</strong>. 
                  Your commission earnings are credited in Dhana. You can withdraw after a 15-day settlement period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatorHub;
