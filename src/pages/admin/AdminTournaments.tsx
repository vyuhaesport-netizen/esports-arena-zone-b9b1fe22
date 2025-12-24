import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Trophy,
  Gamepad2,
  Users,
  Wallet,
  FileText,
  Building2,
  Palette,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { generateTournamentDetailPDF, TournamentReportData } from '@/utils/pdfGenerator';

interface UnifiedTournament {
  id: string;
  title: string;
  game: string;
  status: string | null;
  type: 'organizer' | 'creator' | 'local';
  creator_id: string;
  creator_name: string;
  prize_pool: number;
  entry_fee: number;
  participants: number;
  max_participants: number;
  organizer_commission: number;
  platform_commission: number;
  start_date: string;
}

interface CommissionSettings {
  organizer_percent: number;
  platform_percent: number;
  prize_pool_percent: number;
  local_organizer_percent: number;
  local_platform_percent: number;
}

const AdminTournaments = () => {
  const [tournaments, setTournaments] = useState<UnifiedTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'organizer' | 'creator' | 'local'>('all');
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>({
    organizer_percent: 10,
    platform_percent: 10,
    prize_pool_percent: 80,
    local_organizer_percent: 20,
    local_platform_percent: 10,
  });

  const { user, hasPermission, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('tournaments:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('tournaments:view')) {
      fetchAllTournaments();
      fetchCommissionSettings();
    }
  }, [hasPermission]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-tournaments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => {
        fetchAllTournaments();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'local_tournaments' }, () => {
        fetchAllTournaments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCommissionSettings = async () => {
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value');
      
      if (data) {
        const settings: Partial<CommissionSettings> = {};
        data.forEach((s) => {
          if (s.setting_key === 'organizer_commission_percent') settings.organizer_percent = parseFloat(s.setting_value);
          if (s.setting_key === 'platform_commission_percent') settings.platform_percent = parseFloat(s.setting_value);
          if (s.setting_key === 'prize_pool_percent') settings.prize_pool_percent = parseFloat(s.setting_value);
          if (s.setting_key === 'local_organizer_commission_percent') settings.local_organizer_percent = parseFloat(s.setting_value);
          if (s.setting_key === 'local_platform_commission_percent') settings.local_platform_percent = parseFloat(s.setting_value);
        });
        if (Object.keys(settings).length > 0) {
          setCommissionSettings(prev => ({ ...prev, ...settings }));
        }
      }
    } catch (error) {
      console.error('Error fetching commission settings:', error);
    }
  };

  const fetchAllTournaments = async () => {
    try {
      // Fetch regular tournaments (organizer/creator)
      const { data: regularTournaments, error: regularError } = await supabase
        .from('tournaments')
        .select('*, profiles!tournaments_created_by_fkey(full_name, username)')
        .order('created_at', { ascending: false });

      // Fetch local tournaments
      const { data: localTournaments, error: localError } = await supabase
        .from('local_tournaments')
        .select('*, profiles!local_tournaments_organizer_id_fkey(full_name, username)')
        .order('created_at', { ascending: false });

      if (regularError) console.error('Error fetching regular tournaments:', regularError);
      if (localError) console.error('Error fetching local tournaments:', localError);

      // Get creator roles to determine tournament type
      const creatorIds = regularTournaments?.map(t => t.created_by).filter(Boolean) || [];
      const { data: creatorRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', creatorIds)
        .in('role', ['organizer', 'creator']);

      const roleMap = new Map<string, string>();
      creatorRoles?.forEach(r => {
        // Prefer 'organizer' if both exist
        if (!roleMap.has(r.user_id) || r.role === 'organizer') {
          roleMap.set(r.user_id, r.role);
        }
      });

      // Transform regular tournaments
      const transformedRegular: UnifiedTournament[] = (regularTournaments || []).map(t => {
        const creatorRole = roleMap.get(t.created_by || '') || 'organizer';
        const type = creatorRole === 'creator' ? 'creator' : 'organizer';
        const profile = (t as any).profiles;
        
        return {
          id: t.id,
          title: t.title,
          game: t.game,
          status: t.status,
          type: type as 'organizer' | 'creator',
          creator_id: t.created_by || '',
          creator_name: profile?.full_name || profile?.username || 'Unknown',
          prize_pool: t.current_prize_pool || 0,
          entry_fee: t.entry_fee || 0,
          participants: t.joined_users?.length || 0,
          max_participants: t.max_participants || 100,
          organizer_commission: t.organizer_earnings || 0,
          platform_commission: t.platform_earnings || 0,
          start_date: t.start_date,
        };
      });

      // Transform local tournaments
      const transformedLocal: UnifiedTournament[] = (localTournaments || []).map(t => {
        const profile = (t as any).profiles;
        
        return {
          id: t.id,
          title: t.tournament_name,
          game: t.game,
          status: t.status,
          type: 'local' as const,
          creator_id: t.organizer_id,
          creator_name: profile?.full_name || profile?.username || 'Unknown',
          prize_pool: t.current_prize_pool || 0,
          entry_fee: t.entry_fee || 0,
          participants: t.joined_users?.length || 0,
          max_participants: t.max_participants || 50,
          organizer_commission: t.organizer_earnings || 0,
          platform_commission: t.platform_earnings || 0,
          start_date: t.tournament_date,
        };
      });

      setTournaments([...transformedRegular, ...transformedLocal]);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTournaments = () => {
    let filtered = tournaments;
    
    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    // Filter by status
    if (activeTab !== 'all') {
      filtered = filtered.filter(t => t.status === activeTab);
    }
    
    return filtered.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-600';
      case 'ongoing': return 'bg-green-500/10 text-green-600';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted';
    }
  };

  const getTypeColor = (type: 'organizer' | 'creator' | 'local') => {
    switch (type) {
      case 'organizer': return 'bg-orange-500/10 text-orange-600';
      case 'creator': return 'bg-pink-500/10 text-pink-600';
      case 'local': return 'bg-blue-500/10 text-blue-600';
    }
  };

  const getTypeIcon = (type: 'organizer' | 'creator' | 'local') => {
    switch (type) {
      case 'organizer': return <Building2 className="h-4 w-4" />;
      case 'creator': return <Palette className="h-4 w-4" />;
      case 'local': return <MapPin className="h-4 w-4" />;
    }
  };

  const handleDownloadPDF = (tournament: UnifiedTournament) => {
    const reportData: TournamentReportData = {
      id: tournament.id,
      title: tournament.title,
      game: tournament.game,
      status: tournament.status,
      type: tournament.type,
      creator_name: tournament.creator_name,
      prize_pool: tournament.prize_pool,
      entry_fee: tournament.entry_fee,
      participants: tournament.participants,
      max_participants: tournament.max_participants,
      organizer_commission: tournament.organizer_commission,
      platform_commission: tournament.platform_commission,
      start_date: tournament.start_date,
    };
    generateTournamentDetailPDF(reportData);
    toast({ title: 'PDF Generated', description: 'Tournament details PDF is ready to print.' });
  };

  // Calculate stats
  const totalPlatformRevenue = tournaments.reduce((sum, t) => sum + t.platform_commission, 0);
  const organizerCount = new Set(tournaments.filter(t => t.type === 'organizer').map(t => t.creator_id)).size;
  const creatorCount = new Set(tournaments.filter(t => t.type === 'creator').map(t => t.creator_id)).size;

  if (authLoading || loading) {
    return (
      <AdminLayout title="Tournaments">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="All Tournaments">
      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold">{tournaments.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Tournaments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-lg font-bold">₹{totalPlatformRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Platform Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Type Filter Slider */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'organizer', 'creator', 'local'] as const).map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(type)}
              className="flex-shrink-0 gap-2"
            >
              {type === 'organizer' && <Building2 className="h-3 w-3" />}
              {type === 'creator' && <Palette className="h-3 w-3" />}
              {type === 'local' && <MapPin className="h-3 w-3" />}
              {type === 'all' && <Trophy className="h-3 w-3" />}
              {type.charAt(0).toUpperCase() + type.slice(1)}
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                {type === 'all' 
                  ? tournaments.length 
                  : tournaments.filter(t => t.type === type).length}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Status Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
            <TabsTrigger value="ongoing" className="text-xs">Live</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Done</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tournament List */}
        <div className="space-y-3">
          {getFilteredTournaments().map((tournament) => (
            <Card key={`${tournament.type}-${tournament.id}`} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(tournament.type)}`}>
                    {getTypeIcon(tournament.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold line-clamp-1">{tournament.title}</h3>
                        <p className="text-xs text-muted-foreground">{tournament.game}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`text-[10px] ${getStatusColor(tournament.status)}`}>
                          {tournament.status}
                        </Badge>
                        <Badge className={`text-[10px] ${getTypeColor(tournament.type)}`}>
                          {tournament.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 p-2 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        Created by: <span className="font-medium text-foreground">{tournament.creator_name}</span>
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-yellow-500" />
                          <span>₹{tournament.prize_pool.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Wallet className="h-3 w-3 text-green-500" />
                          <span>₹{tournament.entry_fee}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-500" />
                          <span>{tournament.participants}/{tournament.max_participants}</span>
                        </div>
                      </div>
                    </div>

                    {/* Commission Details */}
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-orange-500/5 rounded border border-orange-500/10">
                        <p className="text-muted-foreground">
                          {tournament.type === 'local' ? 'Organizer' : tournament.type.charAt(0).toUpperCase() + tournament.type.slice(1)} Commission
                        </p>
                        <p className="font-bold text-orange-600">₹{tournament.organizer_commission.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-primary/5 rounded border border-primary/10">
                        <p className="text-muted-foreground">Platform Commission</p>
                        <p className="font-bold text-primary">₹{tournament.platform_commission.toLocaleString()}</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(tournament.start_date), 'MMM dd, yyyy hh:mm a')}
                    </p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => handleDownloadPDF(tournament)}
                >
                  <FileText className="h-3 w-3 mr-2" />
                  Download PDF
                </Button>
              </CardContent>
            </Card>
          ))}

          {getFilteredTournaments().length === 0 && (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No tournaments found</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTournaments;