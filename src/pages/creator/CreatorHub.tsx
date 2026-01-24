import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Trophy,
  Wallet,
  FileWarning,
  MessageCircle,
  ArrowLeft,
  Loader2,
  ChevronRight,
  ScrollText
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
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, organizer_earnings')
        .eq('created_by', user.id)
        .eq('tournament_type', 'creator');

      const totalTournaments = tournaments?.length || 0;
      const totalEarnings = tournaments?.reduce((sum, t) => sum + (t.organizer_earnings || 0), 0) || 0;

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

      const { data: reports } = await supabase
        .from('tournament_reports')
        .select('id, tournament_id')
        .eq('status', 'pending');

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
      stat: `${stats.totalTournaments} Tournaments`
    },
    {
      title: 'Wallet',
      description: 'View earnings & withdraw Dhana',
      icon: Wallet,
      path: '/creator/wallet',
      stat: `${stats.availableBalance} Dhana Available`
    },
    {
      title: 'Tournament Rules',
      description: 'Set platform or custom rules',
      icon: ScrollText,
      path: '/creator/rules',
      stat: 'Configure rules per game'
    },
    {
      title: 'Reports',
      description: 'View player reports & complaints',
      icon: FileWarning,
      path: '/creator/reports',
      stat: stats.pendingReports > 0 ? `${stats.pendingReports} Pending` : 'No pending reports',
      badge: stats.pendingReports > 0 ? stats.pendingReports : null
    },
    {
      title: 'Connect With Owner',
      description: 'Contact platform owner for support',
      icon: MessageCircle,
      path: '/creator/contact',
      stat: 'Get help & support'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Creator Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your content & tournaments</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card className="bg-card border border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Total Earnings</span>
            <p className="text-2xl font-bold text-foreground mt-1">
              ₹{stats.totalEarnings}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Available</span>
            <p className="text-2xl font-bold text-foreground mt-1">
              ₹{stats.availableBalance}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items */}
      <div className="p-4 space-y-3">
        {menuItems.map((item) => (
          <Card 
            key={item.path} 
            className="bg-card border border-border cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(item.path)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <item.icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.stat}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dhana Info */}
      <div className="p-4">
        <Card className="bg-muted/50 border border-border">
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-1">What is Dhana?</h4>
            <p className="text-sm text-muted-foreground">
              Dhana is our platform currency. <strong>1 Dhana = ₹1</strong>. 
              Your commission earnings are credited in Dhana. You can withdraw after a 15-day settlement period.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatorHub;
