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
  UserCheck,
  Trophy,
  Wallet,
  Users,
  Phone,
  IndianRupee,
  Eye,
  Trash2,
  Download,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { generateOrganizersReportPDF } from '@/utils/pdfGenerator';

interface Organizer {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  total_tournaments: number;
  active_tournaments: number;
  completed_tournaments: number;
  total_earnings: number;
  platform_revenue: number;
  total_prize_pool: number;
  total_participants: number;
  joined_at: string;
}

const AdminOrganizers = () => {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);
  const [actionDialog, setActionDialog] = useState<'view-organizer' | 'remove-organizer' | null>(null);
  const [processing, setProcessing] = useState(false);

  const { user, loading: authLoading, hasPermission } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('organizers:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('organizers:view')) {
      fetchOrganizers();
    }
  }, [hasPermission]);

  const fetchOrganizers = async () => {
    try {
      const { data: organizerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'organizer');

      if (rolesError) throw rolesError;

      const organizerIds = organizerRoles?.map(r => r.user_id) || [];
      
      if (organizerIds.length === 0) {
        setOrganizers([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, created_at')
        .in('user_id', organizerIds);

      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('created_by, organizer_earnings, platform_earnings, current_prize_pool, status, joined_users')
        .eq('tournament_type', 'organizer')
        .in('created_by', organizerIds);

      // Get application approval dates
      const { data: applications } = await supabase
        .from('organizer_applications')
        .select('user_id, reviewed_at')
        .in('user_id', organizerIds)
        .eq('status', 'approved');

      const organizerData: Organizer[] = organizerIds.map(userId => {
        const profile = profiles?.find(p => p.user_id === userId);
        const application = applications?.find(a => a.user_id === userId);
        const orgTournaments = tournaments?.filter(t => t.created_by === userId) || [];
        
        const activeTournaments = orgTournaments.filter(t => t.status === 'upcoming' || t.status === 'ongoing').length;
        const completedTournaments = orgTournaments.filter(t => t.status === 'completed').length;
        const totalParticipants = orgTournaments.reduce((sum, t) => sum + (t.joined_users?.length || 0), 0);
        const totalPrizePool = orgTournaments.reduce((sum, t) => sum + (t.current_prize_pool || 0), 0);

        return {
          user_id: userId,
          name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          phone: profile?.phone || null,
          total_tournaments: orgTournaments.length,
          active_tournaments: activeTournaments,
          completed_tournaments: completedTournaments,
          total_earnings: orgTournaments.reduce((sum, t) => sum + (t.organizer_earnings || 0), 0),
          platform_revenue: orgTournaments.reduce((sum, t) => sum + (t.platform_earnings || 0), 0),
          total_prize_pool: totalPrizePool,
          total_participants: totalParticipants,
          joined_at: application?.reviewed_at || profile?.created_at || '',
        };
      });

      setOrganizers(organizerData);
    } catch (error) {
      console.error('Error fetching organizers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOrganizer = async () => {
    if (!selectedOrganizer) return;

    if (!hasPermission('organizers:manage')) {
      toast({ title: 'Access Denied', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      // Remove organizer role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedOrganizer.user_id)
        .eq('role', 'organizer');

      if (roleError) throw roleError;

      // Update their application status if exists
      await supabase
        .from('organizer_applications')
        .update({ status: 'removed' })
        .eq('user_id', selectedOrganizer.user_id);

      toast({ title: 'Organizer Removed', description: `${selectedOrganizer.name} has been removed as an organizer.` });
      setActionDialog(null);
      setSelectedOrganizer(null);
      fetchOrganizers();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to remove organizer.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPDF = () => {
    const pdfData = organizers.map(org => ({
      name: org.name,
      email: org.email,
      phone: org.phone,
      total_tournaments: org.total_tournaments,
      active_tournaments: org.active_tournaments,
      completed_tournaments: org.completed_tournaments,
      total_earnings: org.total_earnings,
      platform_revenue: org.platform_revenue,
      total_participants: org.total_participants,
    }));
    
    const totalPlatformRevenue = organizers.reduce((sum, org) => sum + org.platform_revenue, 0);
    generateOrganizersReportPDF(pdfData, totalPlatformRevenue);
  };

  const totalPlatformRevenue = organizers.reduce((sum, org) => sum + org.platform_revenue, 0);
  const totalOrganizerEarnings = organizers.reduce((sum, org) => sum + org.total_earnings, 0);
  const totalTournaments = organizers.reduce((sum, org) => sum + org.total_tournaments, 0);

  if (authLoading || loading) {
    return (
      <AdminLayout title="Organizers">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Organizer Management">
      <div className="p-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Total Organizers</span>
              </div>
              <p className="text-2xl font-bold">{organizers.length}</p>
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
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90">Platform Revenue from Organizers</p>
                <p className="text-2xl font-bold mt-1">₹{totalPlatformRevenue.toFixed(0)}</p>
              </div>
              <TrendingUp className="h-10 w-10 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Organizer Earnings</span>
              </div>
              <p className="text-xl font-bold text-green-600">₹{totalOrganizerEarnings.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Button 
                variant="outline" 
                className="w-full h-full flex flex-col gap-1"
                onClick={handleDownloadPDF}
                disabled={organizers.length === 0}
              >
                <Download className="h-5 w-5" />
                <span className="text-xs">Download PDF</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Organizers List */}
        {organizers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No organizers yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {organizers.map((organizer) => (
              <Card key={organizer.user_id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-border bg-gradient-to-r from-orange-500/5 to-primary/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-primary flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {organizer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{organizer.name}</p>
                          <p className="text-xs text-muted-foreground">{organizer.email}</p>
                        </div>
                      </div>
                      <Badge className="bg-orange-500/10 text-orange-600 text-[10px]">Organizer</Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2 text-center mb-4">
                      <div>
                        <p className="text-lg font-bold text-purple-500">{organizer.total_tournaments}</p>
                        <p className="text-[10px] text-muted-foreground">Tournaments</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-500">{organizer.total_participants}</p>
                        <p className="text-[10px] text-muted-foreground">Participants</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-500">₹{organizer.total_earnings.toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground">Earnings</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-primary">₹{organizer.platform_revenue.toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground">Platform</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedOrganizer(organizer);
                          setActionDialog('view-organizer');
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Details
                      </Button>
                      {hasPermission('organizers:manage') && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedOrganizer(organizer);
                            setActionDialog('remove-organizer');
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

      {/* View Organizer Dialog */}
      <Dialog open={actionDialog === 'view-organizer'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Organizer Details</DialogTitle>
            <DialogDescription>
              View organizer information and statistics
            </DialogDescription>
          </DialogHeader>

          {selectedOrganizer && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-500/10 to-primary/10 rounded-lg">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-primary flex items-center justify-center">
                  <span className="text-xl font-semibold text-white">
                    {selectedOrganizer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{selectedOrganizer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrganizer.email}</p>
                  {selectedOrganizer.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selectedOrganizer.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Trophy className="h-4 w-4 text-purple-500" />
                    <span className="text-xs">Total Tournaments</span>
                  </div>
                  <p className="text-lg font-bold">{selectedOrganizer.total_tournaments}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Trophy className="h-4 w-4 text-green-500" />
                    <span className="text-xs">Active</span>
                  </div>
                  <p className="text-lg font-bold">{selectedOrganizer.active_tournaments}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Trophy className="h-4 w-4 text-blue-500" />
                    <span className="text-xs">Completed</span>
                  </div>
                  <p className="text-lg font-bold">{selectedOrganizer.completed_tournaments}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-xs">Total Participants</span>
                  </div>
                  <p className="text-lg font-bold">{selectedOrganizer.total_participants}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <IndianRupee className="h-4 w-4 text-green-500" />
                    <span className="text-xs">Their Earnings</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">₹{selectedOrganizer.total_earnings.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    <span className="text-xs">Platform Revenue</span>
                  </div>
                  <p className="text-lg font-bold text-primary">₹{selectedOrganizer.platform_revenue.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <IndianRupee className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs">Total Prize Pool Distributed</span>
                  </div>
                  <p className="text-lg font-bold text-yellow-600">₹{selectedOrganizer.total_prize_pool.toFixed(0)}</p>
                </div>
              </div>

              {selectedOrganizer.joined_at && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Organizer since {format(new Date(selectedOrganizer.joined_at), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Organizer Dialog */}
      <Dialog open={actionDialog === 'remove-organizer'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Organizer</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove organizer access from {selectedOrganizer?.name}?
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
              onClick={handleRemoveOrganizer}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove Organizer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrganizers;