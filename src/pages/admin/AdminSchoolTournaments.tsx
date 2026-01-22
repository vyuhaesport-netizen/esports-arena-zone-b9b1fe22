import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  School,
  Users,
  Gamepad2,
  MapPin,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Loader2,
  IndianRupee,
  Trophy
} from 'lucide-react';

interface Application {
  id: string;
  user_id: string;
  school_name: string;
  school_city: string;
  school_state: string;
  school_district: string;
  school_image_url?: string;
  organizer_name: string;
  primary_phone: string;
  alternate_phone?: string;
  tournament_name: string;
  game: string;
  max_players: number;
  entry_type: string;
  entry_fee: number;
  prize_pool: number;
  tournament_date: string;
  registration_deadline: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
}

const AdminSchoolTournaments = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  
  // Dialog states
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('school_tournament_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    
    setProcessing(true);
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('school_tournament_applications')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedApp.id);

      if (updateError) throw updateError;

      // Create tournament
      const { data, error: createError } = await supabase.rpc('create_school_tournament_from_application', {
        p_application_id: selectedApp.id
      });

      if (createError) throw createError;

      toast.success('Application approved! Tournament created.');
      setDetailDialogOpen(false);
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('school_tournament_applications')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedApp.id);

      if (error) throw error;

      toast.success('Application rejected');
      setRejectDialogOpen(false);
      setDetailDialogOpen(false);
      setRejectionReason('');
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject application');
    } finally {
      setProcessing(false);
    }
  };

  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tournament_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.organizer_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' || app.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const counts = {
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const calculateStructure = (game: string, maxPlayers: number) => {
    const teamsPerRoom = game === 'BGMI' ? 25 : 12;
    const totalTeams = Math.ceil(maxPlayers / 4);
    const initialRooms = Math.ceil(totalTeams / teamsPerRoom);
    
    let currentTeams = totalTeams;
    let rounds = 0;
    while (currentTeams > teamsPerRoom) {
      currentTeams = Math.ceil(currentTeams / teamsPerRoom);
      rounds++;
    }
    rounds++;

    return { totalTeams, initialRooms, rounds };
  };

  if (loading) {
    return (
      <AdminLayout title="School Tournaments">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="School Tournaments">
      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-500">{counts.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{counts.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{counts.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by school, tournament or organizer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredApps.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <School className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No applications found</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-3">
                  {filteredApps.map((app) => {
                    const structure = calculateStructure(app.game, app.max_players);
                    return (
                      <Card key={app.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{app.tournament_name}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <School className="h-3 w-3" /> {app.school_name}
                              </p>
                            </div>
                            <Badge variant={
                              app.status === 'approved' ? 'default' :
                              app.status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {app.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Gamepad2 className="h-3 w-3" /> {app.game}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3 w-3" /> {app.max_players} players
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {app.school_city}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              <p>{structure.totalTeams} teams • {structure.initialRooms} rooms • {structure.rounds} rounds</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedApp(app);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" /> View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              {/* School Image */}
              {selectedApp.school_image_url && (
                <img 
                  src={selectedApp.school_image_url} 
                  alt={selectedApp.school_name}
                  className="w-full h-32 object-cover rounded-lg"
                />
              )}

              {/* School Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <School className="h-4 w-4" /> School Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Name:</strong> {selectedApp.school_name}</p>
                  <p><strong>City:</strong> {selectedApp.school_city}</p>
                  <p><strong>District:</strong> {selectedApp.school_district}</p>
                  <p><strong>State:</strong> {selectedApp.school_state}</p>
                </CardContent>
              </Card>

              {/* Organizer Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Organizer Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Name:</strong> {selectedApp.organizer_name}</p>
                  <p><strong>Phone:</strong> {selectedApp.primary_phone}</p>
                  {selectedApp.alternate_phone && (
                    <p><strong>Alt Phone:</strong> {selectedApp.alternate_phone}</p>
                  )}
                </CardContent>
              </Card>

              {/* Tournament Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Tournament Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Name:</strong> {selectedApp.tournament_name}</p>
                  <p><strong>Game:</strong> {selectedApp.game}</p>
                  <p><strong>Max Players:</strong> {selectedApp.max_players}</p>
                  <p><strong>Entry Type:</strong> {selectedApp.entry_type}</p>
                  {selectedApp.entry_type === 'paid' && (
                    <>
                      <p><strong>Entry Fee:</strong> ₹{selectedApp.entry_fee}</p>
                      <p><strong>Prize Pool:</strong> ₹{selectedApp.prize_pool}</p>
                    </>
                  )}
                  <p><strong>Date:</strong> {new Date(selectedApp.tournament_date).toLocaleString()}</p>
                  <p><strong>Deadline:</strong> {new Date(selectedApp.registration_deadline).toLocaleString()}</p>
                </CardContent>
              </Card>

              {/* Calculated Structure */}
              {(() => {
                const structure = calculateStructure(selectedApp.game, selectedApp.max_players);
                return (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Auto-Calculated Structure</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <p className="font-bold">{structure.totalTeams}</p>
                          <p className="text-xs text-muted-foreground">Teams</p>
                        </div>
                        <div>
                          <p className="font-bold">{structure.initialRooms}</p>
                          <p className="text-xs text-muted-foreground">Rooms</p>
                        </div>
                        <div>
                          <p className="font-bold">{structure.rounds}</p>
                          <p className="text-xs text-muted-foreground">Rounds</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Rejection Reason */}
              {selectedApp.rejection_reason && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                    <p className="text-sm">{selectedApp.rejection_reason}</p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {selectedApp.status === 'pending' && (
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => setRejectDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleApprove}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
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
              Please provide a reason for rejection. This will be shown to the applicant.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processing || !rejectionReason}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSchoolTournaments;
