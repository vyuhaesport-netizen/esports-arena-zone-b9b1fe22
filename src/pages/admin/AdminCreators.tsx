import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Loader2, 
  Users,
  Trophy,
  IndianRupee,
  Trash2,
  Eye,
  Calendar,
  Palette,
  Download,
  TrendingUp,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { generateCreatorsReportPDF } from '@/utils/pdfGenerator';

interface Creator {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  joined_at: string;
  total_tournaments: number;
  active_tournaments: number;
  completed_tournaments: number;
  total_participants: number;
  total_earnings: number;
  platform_revenue: number;
  total_prize_pool: number;
}

const AdminCreators = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [actionDialog, setActionDialog] = useState<'view-creator' | 'remove-creator' | null>(null);
  const [processing, setProcessing] = useState(false);

  const { user, hasPermission, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('creators:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('creators:view')) {
      fetchCreators();
    }
  }, [hasPermission]);

  const fetchCreators = async () => {
    try {
      // Get all users with creator role
      const { data: creatorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'creator');

      if (rolesError) throw rolesError;

      if (!creatorRoles || creatorRoles.length === 0) {
        setCreators([]);
        setLoading(false);
        return;
      }

      const creatorUserIds = creatorRoles.map(r => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', creatorUserIds);

      if (profilesError) throw profilesError;

      // Get tournament stats for each creator
      const creatorsWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: tournaments } = await supabase
            .from('tournaments')
            .select('id, status, joined_users, current_prize_pool, organizer_earnings, platform_earnings')
            .eq('created_by', profile.user_id)
            .eq('tournament_type', 'creator');

          const total = tournaments?.length || 0;
          const active = tournaments?.filter(t => t.status === 'upcoming' || t.status === 'ongoing').length || 0;
          const completed = tournaments?.filter(t => t.status === 'completed').length || 0;
          const participants = tournaments?.reduce((sum, t) => sum + (t.joined_users?.length || 0), 0) || 0;
          const earnings = tournaments?.reduce((sum, t) => sum + (t.organizer_earnings || 0), 0) || 0;
          const platformRevenue = tournaments?.reduce((sum, t) => sum + (t.platform_earnings || 0), 0) || 0;
          const prizePool = tournaments?.reduce((sum, t) => sum + (t.current_prize_pool || 0), 0) || 0;

          return {
            id: profile.id,
            user_id: profile.user_id,
            email: profile.email,
            username: profile.username,
            full_name: profile.full_name,
            phone: profile.phone,
            joined_at: profile.created_at,
            total_tournaments: total,
            active_tournaments: active,
            completed_tournaments: completed,
            total_participants: participants,
            total_earnings: earnings,
            platform_revenue: platformRevenue,
            total_prize_pool: prizePool,
          };
        })
      );

      setCreators(creatorsWithStats);
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast({ title: 'Error', description: 'Failed to load creators', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCreator = async () => {
    if (!selectedCreator) return;

    setProcessing(true);
    try {
      // Remove creator role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedCreator.user_id)
        .eq('role', 'creator');

      if (error) throw error;

      toast({ title: 'Success', description: 'Creator role removed successfully' });
      setActionDialog(null);
      setSelectedCreator(null);
      fetchCreators();
    } catch (error) {
      console.error('Error removing creator:', error);
      toast({ title: 'Error', description: 'Failed to remove creator', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPDF = () => {
    const pdfData = creators.map(creator => ({
      name: creator.full_name || creator.username || 'Creator',
      email: creator.email,
      phone: creator.phone,
      total_tournaments: creator.total_tournaments,
      active_tournaments: creator.active_tournaments,
      completed_tournaments: creator.completed_tournaments,
      total_earnings: creator.total_earnings,
      platform_revenue: creator.platform_revenue,
      total_participants: creator.total_participants,
    }));
    
    const totalPlatformRevenue = creators.reduce((sum, c) => sum + c.platform_revenue, 0);
    generateCreatorsReportPDF(pdfData, totalPlatformRevenue);
  };

  const totalPlatformRevenue = creators.reduce((sum, c) => sum + c.platform_revenue, 0);
  const totalCreatorEarnings = creators.reduce((sum, c) => sum + c.total_earnings, 0);
  const totalTournaments = creators.reduce((sum, c) => sum + c.total_tournaments, 0);

  if (authLoading || loading) {
    return (
      <AdminLayout title="Creator Management">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Creator Management">
      <div className="p-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="h-4 w-4 text-pink-500" />
                <span className="text-xs text-muted-foreground">Total Creators</span>
              </div>
              <p className="text-2xl font-bold">{creators.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Total Tournaments</span>
              </div>
              <p className="text-2xl font-bold">{totalTournaments}</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Cards */}
        <Card className="bg-gradient-to-br from-pink-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90">Platform Revenue from Creators</p>
                <p className="text-2xl font-bold mt-1">₹{totalPlatformRevenue.toFixed(0)}</p>
              </div>
              <TrendingUp className="h-10 w-10 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <IndianRupee className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Creator Earnings</span>
              </div>
              <p className="text-xl font-bold text-green-600">₹{totalCreatorEarnings.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Button 
                variant="outline" 
                className="w-full h-full flex flex-col gap-1"
                onClick={handleDownloadPDF}
                disabled={creators.length === 0}
              >
                <Download className="h-5 w-5" />
                <span className="text-xs">Download PDF</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Creators List */}
        {creators.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Palette className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No creators yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Appoint creators from User Management
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {creators.map((creator) => (
              <Card key={creator.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-border bg-gradient-to-r from-pink-500/5 to-purple-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {creator.username?.charAt(0).toUpperCase() || creator.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{creator.full_name || creator.username || 'Creator'}</p>
                          <p className="text-xs text-muted-foreground">{creator.email}</p>
                        </div>
                      </div>
                      <Badge className="bg-pink-500/10 text-pink-600 text-[10px]">Creator</Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2 text-center mb-4">
                      <div>
                        <p className="text-lg font-bold text-pink-500">{creator.total_tournaments}</p>
                        <p className="text-[10px] text-muted-foreground">Tournaments</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-purple-500">{creator.total_participants}</p>
                        <p className="text-[10px] text-muted-foreground">Participants</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-500">₹{creator.total_earnings.toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground">Earnings</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-primary">₹{creator.platform_revenue.toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground">Platform</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedCreator(creator);
                          setActionDialog('view-creator');
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Details
                      </Button>
                      {hasPermission('creators:manage') && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedCreator(creator);
                            setActionDialog('remove-creator');
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Creator Dialog */}
      <Dialog open={actionDialog === 'view-creator'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Creator Details</DialogTitle>
            <DialogDescription>
              View creator information and statistics
            </DialogDescription>
          </DialogHeader>

          {selectedCreator && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-lg">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                  <span className="text-xl font-semibold text-white">
                    {selectedCreator.username?.charAt(0).toUpperCase() || selectedCreator.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{selectedCreator.full_name || selectedCreator.username || 'Creator'}</p>
                  <p className="text-sm text-muted-foreground">{selectedCreator.email}</p>
                  {selectedCreator.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selectedCreator.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Trophy className="h-4 w-4 text-pink-500" />
                    <span className="text-xs">Total Tournaments</span>
                  </div>
                  <p className="text-lg font-bold">{selectedCreator.total_tournaments}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Trophy className="h-4 w-4 text-green-500" />
                    <span className="text-xs">Active</span>
                  </div>
                  <p className="text-lg font-bold">{selectedCreator.active_tournaments}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Trophy className="h-4 w-4 text-blue-500" />
                    <span className="text-xs">Completed</span>
                  </div>
                  <p className="text-lg font-bold">{selectedCreator.completed_tournaments}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-xs">Total Participants</span>
                  </div>
                  <p className="text-lg font-bold">{selectedCreator.total_participants}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <IndianRupee className="h-4 w-4 text-green-500" />
                    <span className="text-xs">Their Earnings</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">₹{selectedCreator.total_earnings.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    <span className="text-xs">Platform Revenue</span>
                  </div>
                  <p className="text-lg font-bold text-primary">₹{selectedCreator.platform_revenue.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <IndianRupee className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs">Total Prize Pool Distributed</span>
                  </div>
                  <p className="text-lg font-bold text-yellow-600">₹{selectedCreator.total_prize_pool.toFixed(0)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Creator since {format(new Date(selectedCreator.joined_at), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Creator Dialog */}
      <Dialog open={actionDialog === 'remove-creator'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Creator</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove creator access from {selectedCreator?.full_name || selectedCreator?.username || selectedCreator?.email}?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              <p className="font-medium mb-1">Warning:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>This user will no longer be able to create tournaments</li>
                <li>Existing tournaments will remain but cannot be managed</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveCreator}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove Creator'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCreators;