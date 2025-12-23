import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  MapPin,
  Phone,
  Gamepad2,
  Users,
  Calendar,
  Trophy,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface Application {
  id: string;
  user_id: string;
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
  profiles?: {
    full_name: string | null;
    username: string | null;
    email: string;
  };
}

const AdminLocalTournamentsPage = () => {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchQuery, activeTab]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data: appsData, error } = await supabase
        .from('local_tournament_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set((appsData || []).map(a => a.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, email')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      const appsWithProfiles = (appsData || []).map(app => ({
        ...app,
        profiles: profilesMap.get(app.user_id) || { full_name: null, username: null, email: '' }
      }));

      setApplications(appsWithProfiles as Application[]);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    // Filter by status
    if (activeTab !== 'all') {
      filtered = filtered.filter(app => app.status === activeTab);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app =>
        app.institution_name.toLowerCase().includes(query) ||
        app.tournament_name.toLowerCase().includes(query) ||
        app.profiles?.full_name?.toLowerCase().includes(query) ||
        app.profiles?.email.toLowerCase().includes(query)
      );
    }

    setFilteredApplications(filtered);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('approve_local_tournament', {
        p_application_id: selectedApp.id,
        p_admin_notes: null,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; private_code?: string };

      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }

      toast({ title: 'Approved!', description: `Private code: ${result.private_code}` });
      setViewDialogOpen(false);
      fetchApplications();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectReason) {
      toast({ title: 'Error', description: 'Please provide a rejection reason.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_local_tournament', {
        p_application_id: selectedApp.id,
        p_reason: rejectReason,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }

      toast({ title: 'Rejected', description: 'Application has been rejected.' });
      setRejectDialogOpen(false);
      setRejectReason('');
      fetchApplications();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusCounts = () => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    applications.forEach(app => {
      if (app.status in counts) {
        counts[app.status as keyof typeof counts]++;
      }
    });
    return counts;
  };

  const counts = getStatusCounts();

  if (loading) {
    return (
      <AdminLayout title="Local Tournaments">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Local Tournaments">
      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
              <p className="text-2xl font-bold">{counts.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-1" />
              <p className="text-2xl font-bold">{counts.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="h-6 w-6 mx-auto text-red-500 mb-1" />
              <p className="text-2xl font-bold">{counts.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, tournament, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3 mt-4">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No {activeTab} applications</p>
              </div>
            ) : (
              filteredApplications.map((app) => (
                <Card key={app.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => { setSelectedApp(app); setViewDialogOpen(true); }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{app.tournament_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {app.institution_name} ({app.institution_type})
                        </p>
                      </div>
                      <Badge
                        variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}
                      >
                        {app.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(app.tournament_date), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="text-muted-foreground">Applicant: </span>
                      <span>{app.profiles?.full_name || app.profiles?.email}</span>
                    </div>
                    {app.private_code && (
                      <Badge className="mt-2 font-mono" variant="outline">
                        Code: {app.private_code}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Application Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              {/* Organizer Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Organizer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Applicant</span>
                    <span>{selectedApp.profiles?.full_name || selectedApp.profiles?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Institution</span>
                    <span>{selectedApp.institution_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize">{selectedApp.institution_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="text-right max-w-[200px]">{selectedApp.location_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primary Phone</span>
                    <span>{selectedApp.primary_phone}</span>
                  </div>
                  {selectedApp.alternate_phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alternate Phone</span>
                      <span>{selectedApp.alternate_phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tournament Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tournament Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span>{selectedApp.tournament_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Game</span>
                    <span>{selectedApp.game}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode</span>
                    <span className="capitalize">{selectedApp.tournament_mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entry Fee</span>
                    <span>₹{selectedApp.entry_fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Players</span>
                    <span>{selectedApp.max_participants}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{format(new Date(selectedApp.tournament_date), 'dd MMM yyyy, hh:mm a')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Prize Pool</span>
                    <span className="text-green-600 font-semibold">
                      ₹{(selectedApp.entry_fee * selectedApp.max_participants * 0.8).toFixed(0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Prize Distribution */}
              {Object.keys(selectedApp.prize_distribution || {}).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Prize Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {Object.entries(selectedApp.prize_distribution).map(([position, amount]) => (
                        <div key={position} className="flex justify-between text-sm">
                          <span>Position #{position}</span>
                          <span className="font-semibold">₹{amount}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {selectedApp.status === 'pending' && (
                <div className="flex gap-2">
                  <Button onClick={handleApprove} disabled={processing} className="flex-1 bg-green-600 hover:bg-green-700">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => { setViewDialogOpen(false); setRejectDialogOpen(true); }}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}

              {selectedApp.status === 'approved' && selectedApp.private_code && (
                <div className="text-center">
                  <Badge className="font-mono text-lg px-4 py-2">
                    Private Code: {selectedApp.private_code}
                  </Badge>
                </div>
              )}

              {selectedApp.status === 'rejected' && selectedApp.rejection_reason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                  <p className="text-sm mt-1">{selectedApp.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Invalid institution details, incomplete information..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectReason} className="flex-1">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminLocalTournamentsPage;
