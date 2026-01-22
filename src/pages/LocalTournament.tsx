import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Gamepad2,
  Users,
  Calendar,
  Trophy,
  Loader2,
  Plus,
  X,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  QrCode,
  Play,
  Square,
  Award,
  Wallet,
  Link as LinkIcon,
  Copy,
  User,
  Download,
  Share2,
  FileText,
  RefreshCw,
  MessageCircle,
  Ban,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LocalTournamentQRCode from '@/components/LocalTournamentQRCode';
import LocalTournamentCountdown from '@/components/LocalTournamentCountdown';
import { generatePlayersPDF, generateWinnersPDF } from '@/utils/pdfGenerator';
import PrizeDistributionInput from '@/components/PrizeDistributionInput';

interface Application {
  id: string;
  institution_name: string;
  institution_type: string;
  location_address: string;
  primary_phone: string;
  alternate_phone: string | null;
  tournament_name: string;
  game: string;
  tournament_mode: string;
  entry_fee: number;
  max_participants: number;
  tournament_date: string;
  prize_distribution: Record<string, number>;
  status: string;
  private_code: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface LocalTournament {
  id: string;
  institution_name: string;
  tournament_name: string;
  game: string;
  tournament_mode: string;
  entry_fee: number;
  max_participants: number;
  tournament_date: string;
  prize_distribution: Record<string, number>;
  private_code: string;
  status: string;
  joined_users: string[];
  total_fees_collected: number;
  current_prize_pool: number;
  organizer_earnings: number;
  platform_earnings: number;
  winner_user_id: string | null;
  room_id: string | null;
  room_password: string | null;
  started_at: string | null;
  ended_at: string | null;
}

interface PrizeEntry {
  position: number;
  amount: number;
}

interface Participant {
  user_id: string;
  username: string | null;
  full_name: string | null;
  in_game_name: string | null;
}

const LocalTournamentPage = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [tournaments, setTournaments] = useState<LocalTournament[]>([]);
  const [activeTab, setActiveTab] = useState('apply');
  const [prizeEntries, setPrizeEntries] = useState<PrizeEntry[]>([{ position: 1, amount: 0 }]);
  const [selectedTournament, setSelectedTournament] = useState<LocalTournament | null>(null);
  const [manageTournamentOpen, setManageTournamentOpen] = useState(false);
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winnerPositions, setWinnerPositions] = useState<Record<string, number>>({});
  const [roomDetails, setRoomDetails] = useState({ room_id: '', room_password: '' });
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [recalculating, setRecalculating] = useState(false);
  const [declaredWinners, setDeclaredWinners] = useState<{ position: number; username: string | null; full_name: string | null; amount: number }[]>([]);

  const [formData, setFormData] = useState({
    institution_name: '',
    institution_type: 'school',
    location_address: '',
    primary_phone: '',
    alternate_phone: '',
    tournament_name: '',
    game: '',
    tournament_mode: 'solo',
    entry_fee: '',
    max_participants: '',
    tournament_date: '',
  });
  const [cancelling, setCancelling] = useState(false);
  const [editablePrizeDistribution, setEditablePrizeDistribution] = useState<Record<string, number>>({});

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchData();
      fetchCommissionSetting();
    }
  }, [user]);

  const fetchCommissionSetting = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'local_tournament_organizer_commission')
      .maybeSingle();
    
    if (data) {
      setCommissionPercent(parseFloat(data.setting_value) || 10);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: apps } = await supabase
        .from('local_tournament_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setApplications((apps || []) as Application[]);

      const { data: tourneys } = await supabase
        .from('local_tournaments')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });
      
      setTournaments((tourneys || []) as LocalTournament[]);

      if (tourneys && tourneys.length > 0) {
        setActiveTab('tournaments');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.institution_name || !formData.location_address || !formData.primary_phone) {
      toast({ title: 'Error', description: 'Please fill all organizer details.', variant: 'destructive' });
      return;
    }
    if (!formData.tournament_name || !formData.game || !formData.entry_fee || !formData.max_participants || !formData.tournament_date) {
      toast({ title: 'Error', description: 'Please fill all tournament details.', variant: 'destructive' });
      return;
    }

    if (!/^\d{10}$/.test(formData.primary_phone)) {
      toast({ title: 'Invalid Phone', description: 'Please enter a valid 10-digit phone number.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      const prizeDistribution: Record<string, number> = {};
      prizeEntries.forEach(entry => {
        if (entry.amount > 0) {
          prizeDistribution[entry.position.toString()] = entry.amount;
        }
      });

      const { error } = await supabase
        .from('local_tournament_applications')
        .insert({
          user_id: user.id,
          institution_name: formData.institution_name,
          institution_type: formData.institution_type,
          location_address: formData.location_address,
          primary_phone: formData.primary_phone,
          alternate_phone: formData.alternate_phone || null,
          tournament_name: formData.tournament_name,
          game: formData.game,
          tournament_mode: formData.tournament_mode,
          entry_fee: parseFloat(formData.entry_fee),
          max_participants: parseInt(formData.max_participants),
          tournament_date: new Date(formData.tournament_date).toISOString(),
          prize_distribution: prizeDistribution,
        });

      if (error) throw error;

      toast({ title: 'Application Submitted!', description: 'Your local tournament application is under review.' });
      
      setFormData({
        institution_name: '',
        institution_type: 'school',
        location_address: '',
        primary_phone: '',
        alternate_phone: '',
        tournament_name: '',
        game: '',
        tournament_mode: 'solo',
        entry_fee: '',
        max_participants: '',
        tournament_date: '',
      });
      setPrizeEntries([{ position: 1, amount: 0 }]);
      
      fetchData();
      setActiveTab('applications');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to submit application.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const calculatePrizePool = () => {
    const entryFee = parseFloat(formData.entry_fee) || 0;
    const maxPlayers = parseInt(formData.max_participants) || 0;
    const totalFees = entryFee * maxPlayers;
    // 10% organizer + 10% platform = 20% total commission, 80% prize pool
    const prizePool = totalFees * 0.8;
    return prizePool.toFixed(0);
  };

  const addPrizePosition = () => {
    const newPosition = prizeEntries.length + 1;
    setPrizeEntries([...prizeEntries, { position: newPosition, amount: 0 }]);
  };

  const removePrizePosition = (index: number) => {
    if (prizeEntries.length > 1) {
      const updated = prizeEntries.filter((_, i) => i !== index);
      const renumbered = updated.map((entry, i) => ({ ...entry, position: i + 1 }));
      setPrizeEntries(renumbered);
    }
  };

  const updatePrizeAmount = (index: number, amount: string) => {
    const updated = [...prizeEntries];
    updated[index].amount = parseFloat(amount) || 0;
    setPrizeEntries(updated);
  };

  const openManageTournament = async (tournament: LocalTournament) => {
    setSelectedTournament(tournament);
    setRoomDetails({ room_id: tournament.room_id || '', room_password: tournament.room_password || '' });
    setEditablePrizeDistribution(tournament.prize_distribution || {});
    
    if (tournament.joined_users && tournament.joined_users.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, in_game_name')
        .in('user_id', tournament.joined_users);
      setParticipants((data || []) as Participant[]);
    } else {
      setParticipants([]);
    }
    
    setManageTournamentOpen(true);
  };

  const handleRecalculatePrizePool = async () => {
    if (!selectedTournament) return;
    
    setRecalculating(true);
    try {
      const { data, error } = await supabase.rpc('recalculate_local_tournament_prizepool', {
        p_tournament_id: selectedTournament.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; prize_pool?: number; organizer_earnings?: number; platform_earnings?: number };
      
      if (result.success) {
        toast({ 
          title: 'Prize Pool Updated!', 
          description: `New prize pool: ₹${result.prize_pool}` 
        });
        fetchData();
        // Update selected tournament
        setSelectedTournament({
          ...selectedTournament,
          current_prize_pool: result.prize_pool || 0,
          organizer_earnings: result.organizer_earnings || 0,
          platform_earnings: result.platform_earnings || 0,
        });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setRecalculating(false);
    }
  };

  const startTournament = async () => {
    if (!selectedTournament) return;

    if (!roomDetails.room_id || !roomDetails.room_password) {
      toast({ title: 'Room Details Required', description: 'Please enter Room ID and Password before starting.', variant: 'destructive' });
      return;
    }

    // Recalculate prize pool before starting
    await handleRecalculatePrizePool();

    const { error } = await supabase
      .from('local_tournaments')
      .update({
        status: 'ongoing',
        started_at: new Date().toISOString(),
        room_id: roomDetails.room_id,
        room_password: roomDetails.room_password,
      })
      .eq('id', selectedTournament.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to start tournament.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Tournament Started!', description: 'The tournament is now live.' });
    setManageTournamentOpen(false);
    fetchData();
  };

  const endTournament = async () => {
    if (!selectedTournament) return;

    const { error } = await supabase
      .from('local_tournaments')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', selectedTournament.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to end tournament.', variant: 'destructive' });
      return;
    }

    setManageTournamentOpen(false);
    setWinnerDialogOpen(true);
    fetchData();
  };

  const declareWinner = async () => {
    if (!selectedTournament || Object.keys(winnerPositions).length === 0) {
      toast({ title: 'Error', description: 'Please select at least one winner.', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('declare_local_winner', {
        p_tournament_id: selectedTournament.id,
        p_organizer_id: user?.id,
        p_winner_positions: winnerPositions,
        p_prize_distribution: editablePrizeDistribution,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; total_distributed?: number; organizer_earnings?: number };
      
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }

      // Build winners list for PDF
      const winners = Object.entries(winnerPositions).map(([userId, position]) => {
        const player = participants.find(p => p.user_id === userId);
        const prizeAmount = selectedTournament.prize_distribution?.[position.toString()] || 0;
        return {
          position,
          username: player?.username || null,
          full_name: player?.full_name || null,
          amount: prizeAmount,
        };
      }).sort((a, b) => a.position - b.position);

      setDeclaredWinners(winners);

      toast({
        title: '🏆 Winners Declared!',
        description: `₹${result.total_distributed} distributed. You earned ₹${result.organizer_earnings} commission!`,
      });
      setWinnerDialogOpen(false);
      setWinnerPositions({});
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Copied to clipboard.' });
  };

  const getShareLink = (code: string) => {
    return `${window.location.origin}/join-local?code=${code}`;
  };

  const handleShare = async (tournament: LocalTournament) => {
    const shareData = {
      title: tournament.tournament_name,
      text: `Join my local tournament: ${tournament.tournament_name}! Use code: ${tournament.private_code}`,
      url: getShareLink(tournament.private_code),
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(getShareLink(tournament.private_code));
        toast({ title: 'Link Copied!', description: 'Tournament link copied to clipboard.' });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(getShareLink(tournament.private_code));
        toast({ title: 'Link Copied!', description: 'Tournament link copied to clipboard.' });
      }
    }
  };

  const handleShareWhatsApp = (tournament: LocalTournament) => {
    const message = `🎮 Join my tournament: *${tournament.tournament_name}*\n\n📍 ${tournament.institution_name}\n🎯 Game: ${tournament.game}\n💰 Entry: ₹${tournament.entry_fee}\n🏆 Prize Pool: ₹${tournament.current_prize_pool}\n\n🔗 Join using code: *${tournament.private_code}*\n${getShareLink(tournament.private_code)}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCancelTournament = async () => {
    if (!selectedTournament || !user) return;
    
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc('cancel_local_tournament', {
        p_tournament_id: selectedTournament.id,
        p_organizer_id: user.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; refunded_count?: number };
      
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }

      toast({
        title: 'Tournament Cancelled',
        description: `${result.refunded_count || 0} players have been refunded.`,
      });
      setManageTournamentOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdatePrizeDistribution = async () => {
    if (!selectedTournament || !user) return;
    
    try {
      const { data, error } = await supabase.rpc('update_local_tournament_prize_distribution', {
        p_tournament_id: selectedTournament.id,
        p_organizer_id: user.id,
        p_prize_distribution: editablePrizeDistribution,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }

      setSelectedTournament({
        ...selectedTournament,
        prize_distribution: editablePrizeDistribution,
      });

      toast({ title: 'Updated!', description: 'Prize distribution updated successfully.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDownloadPlayersPDF = () => {
    if (!selectedTournament || participants.length === 0) return;
    generatePlayersPDF(
      selectedTournament.tournament_name,
      participants,
      selectedTournament.tournament_date
    );
  };

  const handleDownloadWinnersPDF = () => {
    if (!selectedTournament || declaredWinners.length === 0) return;
    generateWinnersPDF(
      selectedTournament.tournament_name,
      declaredWinners,
      selectedTournament.tournament_date,
      selectedTournament.current_prize_pool
    );
  };

  if (loading) {
    return (
      <AppLayout title="Private Tournament">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-base font-semibold">Private Tournament</span>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="apply" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Apply
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Applications
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            My Tournaments
          </TabsTrigger>
        </TabsList>

        {/* Apply Tab */}
        <TabsContent value="apply" className="p-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-primary" />
                Organizer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Institution Name *</Label>
                <Input
                  placeholder="e.g., St. Mary's School"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Institution Type *</Label>
                <Select
                  value={formData.institution_type}
                  onValueChange={(value) => setFormData({ ...formData, institution_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Location / Address *</Label>
                <Textarea
                  placeholder="Full address with city and pin code"
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Primary Phone *</Label>
                  <Input
                    type="tel"
                    placeholder="10-digit number"
                    value={formData.primary_phone}
                    onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  />
                </div>
                <div>
                  <Label>Alternate Phone</Label>
                  <Input
                    type="tel"
                    placeholder="Optional"
                    value={formData.alternate_phone}
                    onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gamepad2 className="h-5 w-5 text-primary" />
                Tournament Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tournament Name *</Label>
                <Input
                  placeholder="e.g., Inter-School BGMI Championship"
                  value={formData.tournament_name}
                  onChange={(e) => setFormData({ ...formData, tournament_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Game *</Label>
                  <Select
                    value={formData.game}
                    onValueChange={(value) => {
                      const maxPlayers = value === 'BGMI' ? '100' : value === 'Free Fire' ? '50' : '100';
                      setFormData({ ...formData, game: value, max_participants: maxPlayers });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select game" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BGMI">BGMI (Max 100)</SelectItem>
                      <SelectItem value="Free Fire">Free Fire (Max 50)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mode *</Label>
                  <Select
                    value={formData.tournament_mode}
                    onValueChange={(value) => setFormData({ ...formData, tournament_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solo">Solo</SelectItem>
                      <SelectItem value="duo">Duo</SelectItem>
                      <SelectItem value="squad">Squad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Entry Fee (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Total Players *</Label>
                  <Input
                    type="number"
                    placeholder={formData.game === 'Free Fire' ? '50' : '100'}
                    value={formData.max_participants}
                    onChange={(e) => {
                      const maxLimit = formData.game === 'BGMI' ? 100 : formData.game === 'Free Fire' ? 50 : 100;
                      let newValue = parseInt(e.target.value) || 0;
                      if (newValue > maxLimit) newValue = maxLimit;
                      setFormData({ ...formData, max_participants: newValue.toString() });
                    }}
                    max={formData.game === 'BGMI' ? 100 : formData.game === 'Free Fire' ? 50 : 100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {formData.game === 'BGMI' ? '100' : formData.game === 'Free Fire' ? '50' : '100'} players
                  </p>
                </div>
              </div>

              <div>
                <Label>Tournament Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.tournament_date}
                  onChange={(e) => setFormData({ ...formData, tournament_date: e.target.value })}
                />
              </div>

              {/* Auto Prize Pool */}
              {formData.entry_fee && formData.max_participants && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estimated Prize Pool (80%)</span>
                    <span className="text-lg font-bold text-green-600">₹{calculatePrizePool()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Your Commission (10%)</span>
                    <span>₹{((parseFloat(formData.entry_fee) || 0) * (parseInt(formData.max_participants) || 0) * 0.1).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Platform Fee (10%)</span>
                    <span>₹{((parseFloat(formData.entry_fee) || 0) * (parseInt(formData.max_participants) || 0) * 0.1).toFixed(0)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-primary" />
                Prize Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prizeEntries.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-16 text-center">
                    <Badge variant="outline">#{entry.position}</Badge>
                  </div>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={entry.amount || ''}
                    onChange={(e) => updatePrizeAmount(index, e.target.value)}
                    className="flex-1"
                  />
                  {prizeEntries.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removePrizePosition(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addPrizePosition} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Position
              </Button>
            </CardContent>
          </Card>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Application
          </Button>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="p-4 space-y-4">
          {applications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No applications yet</p>
              <Button variant="link" onClick={() => setActiveTab('apply')}>Create your first application</Button>
            </div>
          ) : (
            applications.map((app) => (
              <Card key={app.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{app.tournament_name}</h3>
                      <p className="text-sm text-muted-foreground">{app.institution_name}</p>
                    </div>
                    <Badge
                      variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}
                    >
                      {app.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                      {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {app.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Gamepad2 className="h-3 w-3" />
                      {app.game}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {app.max_participants} players
                    </span>
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      ₹{app.entry_fee}
                    </span>
                  </div>
                  {app.status === 'rejected' && app.rejection_reason && (
                    <p className="mt-2 text-sm text-destructive">Reason: {app.rejection_reason}</p>
                  )}
                  {app.status === 'approved' && app.private_code && (
                    <div className="mt-3 flex items-center gap-2">
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        Code: {app.private_code}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(app.private_code!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tournaments Tab */}
        <TabsContent value="tournaments" className="p-4 space-y-4">
          {tournaments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No approved tournaments yet</p>
              <p className="text-sm">Submit an application to get started</p>
            </div>
          ) : (
            tournaments.map((tournament) => (
              <Card key={tournament.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{tournament.tournament_name}</h3>
                      <p className="text-sm text-muted-foreground">{tournament.institution_name}</p>
                    </div>
                    <Badge
                      variant={
                        tournament.status === 'completed' ? 'default' :
                        tournament.status === 'ongoing' ? 'secondary' :
                        tournament.status === 'cancelled' ? 'destructive' : 'outline'
                      }
                      className={
                        tournament.status === 'ongoing' ? 'bg-green-500 text-white' :
                        tournament.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : ''
                      }
                    >
                      {tournament.status === 'ongoing' && <Play className="h-3 w-3 mr-1" />}
                      {tournament.status === 'cancelled' && <Ban className="h-3 w-3 mr-1" />}
                      {tournament.status}
                    </Badge>
                  </div>

                  {/* Countdown for upcoming */}
                  {tournament.status === 'upcoming' && (
                    <div className="my-3">
                      <LocalTournamentCountdown 
                        targetDate={new Date(tournament.tournament_date)}
                        showRecalculationWarning={true}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {tournament.joined_users?.length || 0}/{tournament.max_participants}
                    </span>
                    <span className="flex items-center gap-1 text-green-600">
                      <Trophy className="h-4 w-4" />
                      ₹{tournament.current_prize_pool}
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <Wallet className="h-4 w-4" />
                      ₹{tournament.organizer_earnings} commission
                    </span>
                  </div>
                  
                  {/* View Details Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => openManageTournament(tournament)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Tournament Details
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Manage Tournament Dialog */}
      <Dialog open={manageTournamentOpen} onOpenChange={setManageTournamentOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTournament?.tournament_name}</DialogTitle>
          </DialogHeader>

          {selectedTournament && (
            <div className="space-y-4">
              {/* Countdown */}
              {selectedTournament.status === 'upcoming' && (
                <Card className="bg-primary/5">
                  <CardContent className="p-4">
                    <LocalTournamentCountdown 
                      targetDate={new Date(selectedTournament.tournament_date)}
                      showRecalculationWarning={true}
                      onTimeUp={handleRecalculatePrizePool}
                    />
                  </CardContent>
                </Card>
              )}

              {/* QR Code & Sharing */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Share with Students
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <LocalTournamentQRCode
                    tournamentId={selectedTournament.id}
                    tournamentTitle={selectedTournament.tournament_name}
                    privateCode={selectedTournament.private_code}
                  />
                  <div className="text-center">
                    <Badge variant="outline" className="font-mono text-lg">
                      Code: {selectedTournament.private_code}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/30"
                    onClick={() => handleShareWhatsApp(selectedTournament)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Share on WhatsApp
                  </Button>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <Card>
                  <CardContent className="p-3 text-center">
                    <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-lg font-bold">{selectedTournament.joined_users?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Players</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Wallet className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-lg font-bold">₹{selectedTournament.total_fees_collected || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Collected</p>
                  </CardContent>
                </Card>
              </div>

              {/* Commission & Prize Breakdown */}
              <Card className="bg-gradient-to-br from-green-500/5 to-orange-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-green-600" />
                    Commission & Prize Split
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-green-600" />
                      Prize Pool (80%)
                    </span>
                    <span className="font-bold text-green-600">₹{selectedTournament.current_prize_pool}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-orange-500" />
                      Your Commission (10%)
                    </span>
                    <span className="font-bold text-orange-500">₹{selectedTournament.organizer_earnings}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-500" />
                      Platform Fee (10%)
                    </span>
                    <span className="font-bold text-purple-500">₹{selectedTournament.platform_earnings || 0}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="text-xs text-muted-foreground text-center">
                      💰 Your commission will be credited to your <strong>Wallet</strong> after declaring winners
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Recalculate Button */}
              {selectedTournament.status === 'upcoming' && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleRecalculatePrizePool}
                  disabled={recalculating}
                >
                  {recalculating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Recalculate Prize Pool
                </Button>
              )}

              {/* Players List */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Joined Players ({participants.length})</CardTitle>
                    {participants.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleDownloadPlayersPDF}>
                        <FileText className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No players yet</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {participants.map((p, i) => (
                        <div key={p.user_id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">{i + 1}</span>
                            <span>{p.full_name || p.username || 'Player'}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{p.in_game_name || `@${p.username}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Room Details (for upcoming/ongoing) */}
              {selectedTournament.status !== 'completed' && selectedTournament.status !== 'cancelled' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Room Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Room ID</Label>
                        <Input
                          value={roomDetails.room_id}
                          onChange={(e) => setRoomDetails({ ...roomDetails, room_id: e.target.value })}
                          placeholder="Enter room ID"
                        />
                      </div>
                      <div>
                        <Label>Room Password</Label>
                        <Input
                          value={roomDetails.room_password}
                          onChange={(e) => setRoomDetails({ ...roomDetails, room_password: e.target.value })}
                          placeholder="Enter password"
                        />
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={async () => {
                        if (!selectedTournament) return;
                        const { error } = await supabase
                          .from('local_tournaments')
                          .update({
                            room_id: roomDetails.room_id,
                            room_password: roomDetails.room_password,
                          })
                          .eq('id', selectedTournament.id);
                        
                        if (error) {
                          toast({ title: 'Error', description: 'Failed to update room details.', variant: 'destructive' });
                        } else {
                          toast({ title: 'Updated!', description: 'Room details saved successfully.' });
                          setSelectedTournament({
                            ...selectedTournament,
                            room_id: roomDetails.room_id,
                            room_password: roomDetails.room_password,
                          });
                          fetchData();
                        }
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update Room Details
                    </Button>
                    <p className="text-xs text-muted-foreground">Required before starting the tournament</p>
                  </CardContent>
                </Card>
              )}

              {/* Controls */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  {selectedTournament.status === 'upcoming' && (
                    <Button onClick={startTournament} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Play className="h-4 w-4 mr-2" />
                      Start Tournament
                    </Button>
                  )}
                  {selectedTournament.status === 'ongoing' && (
                    <Button onClick={endTournament} className="flex-1" variant="destructive">
                      <Square className="h-4 w-4 mr-2" />
                      End Tournament
                    </Button>
                  )}
                  {selectedTournament.status === 'completed' && !selectedTournament.winner_user_id && (
                    <Button onClick={() => { setManageTournamentOpen(false); setWinnerDialogOpen(true); }} className="flex-1">
                      <Award className="h-4 w-4 mr-2" />
                      Declare Winner
                    </Button>
                  )}
                </div>
                
                {/* Cancel Tournament Button */}
                {selectedTournament.status === 'upcoming' && (
                  <Button 
                    variant="outline" 
                    className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10"
                    onClick={handleCancelTournament}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Ban className="h-4 w-4 mr-2" />
                    )}
                    Cancel Tournament (Refund All Players)
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Winner Declaration Dialog */}
      <Dialog open={winnerDialogOpen} onOpenChange={setWinnerDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Declare Winners
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Editable Prize Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Prize Distribution (Editable)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Prize Pool Limit Display */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available Prize Pool:</span>
                    <span className="text-lg font-bold text-primary">₹{selectedTournament?.current_prize_pool || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total distribution cannot exceed this amount
                  </p>
                </div>

                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((pos) => (
                    <div key={pos} className="flex items-center gap-2">
                      <Badge variant="outline" className="w-12 justify-center">#{pos}</Badge>
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={editablePrizeDistribution[pos.toString()] || ''}
                        onChange={(e) => {
                          const newDist = { ...editablePrizeDistribution };
                          if (e.target.value) {
                            newDist[pos.toString()] = parseFloat(e.target.value);
                          } else {
                            delete newDist[pos.toString()];
                          }
                          setEditablePrizeDistribution(newDist);
                        }}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">₹</span>
                    </div>
                  ))}
                </div>

                {/* Validation Display */}
                {(() => {
                  const totalDist = Object.values(editablePrizeDistribution).reduce((a, b) => a + (b || 0), 0);
                  const prizePool = selectedTournament?.current_prize_pool || 0;
                  const isValid = totalDist <= prizePool;
                  const remaining = prizePool - totalDist;
                  
                  return (
                    <div className={`flex flex-col gap-1 pt-2 border-t ${!isValid ? 'text-destructive' : ''}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Distribution:</span>
                        <span className={`font-bold ${!isValid ? 'text-destructive' : ''}`}>
                          ₹{totalDist}
                        </span>
                      </div>
                      {!isValid ? (
                        <p className="text-xs text-destructive">
                          ⚠️ Exceeds prize pool by ₹{totalDist - prizePool}. Please reduce amounts.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Remaining: ₹{remaining}
                        </p>
                      )}
                    </div>
                  );
                })()}

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleUpdatePrizeDistribution}
                  disabled={Object.values(editablePrizeDistribution).reduce((a, b) => a + (b || 0), 0) > (selectedTournament?.current_prize_pool || 0)}
                >
                  Save Prize Distribution
                </Button>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
              Select winners for each position. Prize money will be credited to their wallets.
            </p>

            {participants.map((p) => {
              const assignedPos = winnerPositions[p.user_id];
              const prizeAmount = assignedPos ? (editablePrizeDistribution[assignedPos.toString()] || 0) : 0;
              
              return (
                <div key={p.user_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <User className="h-4 w-4" />
                    <span className="truncate">{p.full_name || p.username}</span>
                    {prizeAmount > 0 && (
                      <Badge variant="secondary" className="text-xs">₹{prizeAmount}</Badge>
                    )}
                  </div>
                  <Select
                    value={winnerPositions[p.user_id]?.toString() || ''}
                    onValueChange={(value) => {
                      if (value && value !== 'none') {
                        setWinnerPositions({ ...winnerPositions, [p.user_id]: parseInt(value) });
                      } else {
                        const updated = { ...winnerPositions };
                        delete updated[p.user_id];
                        setWinnerPositions(updated);
                      }
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {[1, 2, 3, 4, 5].map((pos) => (
                        <SelectItem key={pos} value={pos.toString()}>
                          #{pos} - ₹{editablePrizeDistribution[pos.toString()] || 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}

            {/* Winner Total Display */}
            {(() => {
              const selectedWinnerPrizes = Object.entries(winnerPositions).reduce((total, [, position]) => {
                return total + (editablePrizeDistribution[position.toString()] || 0);
              }, 0);
              const prizePool = selectedTournament?.current_prize_pool || 0;
              const isValid = selectedWinnerPrizes <= prizePool;
              
              return (
                <div className={`p-3 rounded-lg ${!isValid ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted'}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span>Prizes to distribute:</span>
                    <span className={`font-bold ${!isValid ? 'text-destructive' : ''}`}>₹{selectedWinnerPrizes} / ₹{prizePool}</span>
                  </div>
                  {!isValid && (
                    <p className="text-xs text-destructive mt-1">
                      Distribution exceeds prize pool!
                    </p>
                  )}
                </div>
              );
            })()}

            <Button 
              onClick={declareWinner} 
              className="w-full"
              disabled={(() => {
                const selectedWinnerPrizes = Object.entries(winnerPositions).reduce((total, [, position]) => {
                  return total + (editablePrizeDistribution[position.toString()] || 0);
                }, 0);
                return selectedWinnerPrizes > (selectedTournament?.current_prize_pool || 0);
              })()}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Confirm Winners & Distribute Prizes
            </Button>

            {declaredWinners.length > 0 && (
              <Button variant="outline" onClick={handleDownloadWinnersPDF} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Winners PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default LocalTournamentPage;