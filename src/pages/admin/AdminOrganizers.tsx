import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  UserCheck,
  Check,
  X,
  Eye,
  Trophy,
  Wallet,
  Users,
  Phone,
  Instagram,
  Youtube,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';

interface OrganizerApplication {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  phone: string | null;
  aadhaar_number: string | null;
  instagram_link: string | null;
  youtube_link: string | null;
  experience: string | null;
  status: string;
  created_at: string;
  email?: string;
}

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
  const [applications, setApplications] = useState<OrganizerApplication[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApplication, setSelectedApplication] = useState<OrganizerApplication | null>(null);
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | 'view' | 'view-organizer' | 'remove-organizer' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
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
      fetchApplications();
      fetchOrganizers();
    }
  }, [hasPermission]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('organizer_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch emails for each application
      const applicationsWithEmails = await Promise.all(
        (data || []).map(async (app) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', app.user_id)
            .single();
          return { ...app, email: profile?.email };
        })
      );
      
      setApplications(applicationsWithEmails);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

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
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, created_at')
        .in('user_id', organizerIds);

      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('created_by, organizer_earnings, platform_earnings, current_prize_pool, status, joined_users')
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
    }
  };

  const getFilteredApplications = () => {
    if (activeTab === 'all') return applications;
    if (activeTab === 'organizers') return [];
    return applications.filter(a => a.status === activeTab);
  };

  const handleApprove = async () => {
    if (!selectedApplication) return;
    
    if (!hasPermission('organizers:manage')) {
      toast({ title: 'Access Denied', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const { error: appError } = await supabase
        .from('organizer_applications')
        .update({ 
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedApplication.id);

      if (appError) throw appError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: selectedApplication.user_id,
          role: 'organizer',
        }, { onConflict: 'user_id,role' });

      if (roleError) throw roleError;

      // Send approval email notification
      if (selectedApplication.email) {
        try {
          await supabase.functions.invoke('send-organizer-email', {
            body: {
              email: selectedApplication.email,
              name: selectedApplication.name,
              type: 'approved',
            },
          });
          console.log('Approval email sent successfully');
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Don't fail the approval if email fails
        }
      }

      toast({ title: 'Approved!', description: `${selectedApplication.name} is now an organizer.` });
      setActionDialog(null);
      setSelectedApplication(null);
      fetchApplications();
      fetchOrganizers();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to approve application.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication) return;

    if (!hasPermission('organizers:manage')) {
      toast({ title: 'Access Denied', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('organizer_applications')
        .update({ 
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectReason || null,
        })
        .eq('id', selectedApplication.id);

      if (error) throw error;

      // Send rejection email notification
      if (selectedApplication.email) {
        try {
          await supabase.functions.invoke('send-organizer-email', {
            body: {
              email: selectedApplication.email,
              name: selectedApplication.name,
              type: 'rejected',
              reason: rejectReason || undefined,
            },
          });
          console.log('Rejection email sent successfully');
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }

      toast({ title: 'Rejected', description: 'Application has been rejected.' });
      setActionDialog(null);
      setSelectedApplication(null);
      setRejectReason('');
      fetchApplications();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to reject application.', variant: 'destructive' });
    } finally {
      setProcessing(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500/10 text-green-600 text-[10px]">Approved</Badge>;
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">Pending</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
      case 'removed': return <Badge variant="secondary" className="text-[10px]">Removed</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  const maskAadhaar = (aadhaar: string | null) => {
    if (!aadhaar) return 'N/A';
    return `XXXX XXXX ${aadhaar.slice(-4)}`;
  };

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
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
            <TabsTrigger value="organizers" className="text-xs">All Organizers</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Applications List */}
        {activeTab !== 'organizers' && (
          <div className="space-y-3">
            {getFilteredApplications().map((app) => (
              <Card key={app.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {app.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{app.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Age: {app.age || 'N/A'} • Applied {format(new Date(app.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>

                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    {app.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {app.phone}
                      </span>
                    )}
                    {app.instagram_link && (
                      <a href={app.instagram_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-500 hover:underline">
                        <Instagram className="h-3 w-3" />
                      </a>
                    )}
                    {app.youtube_link && (
                      <a href={app.youtube_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-red-500 hover:underline">
                        <Youtube className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {app.status === 'pending' && hasPermission('organizers:manage') && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedApplication(app);
                          setActionDialog('view');
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-green-600 border-green-600"
                        onClick={() => {
                          setSelectedApplication(app);
                          setActionDialog('approve');
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive border-destructive"
                        onClick={() => {
                          setSelectedApplication(app);
                          setActionDialog('reject');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {getFilteredApplications().length === 0 && (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No applications found</p>
              </div>
            )}
          </div>
        )}

        {/* All Organizers - Detailed Cards */}
        {activeTab === 'organizers' && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-primary/10 to-transparent">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Organizers</p>
                      <p className="text-lg font-bold">{organizers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-transparent">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Platform Revenue</p>
                      <p className="text-lg font-bold text-green-600">₹{organizers.reduce((s, o) => s + o.platform_revenue, 0).toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Organizer Cards */}
            {organizers.map((org) => (
              <Card key={org.user_id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {org.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.email}</p>
                        {org.joined_at && (
                          <p className="text-[10px] text-muted-foreground">
                            Joined: {format(new Date(org.joined_at), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 text-[10px]">Active</Badge>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <Trophy className="h-3 w-3 mx-auto text-primary mb-1" />
                      <p className="text-sm font-bold">{org.total_tournaments}</p>
                      <p className="text-[10px] text-muted-foreground">Tournaments</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <Users className="h-3 w-3 mx-auto text-blue-500 mb-1" />
                      <p className="text-sm font-bold">{org.total_participants}</p>
                      <p className="text-[10px] text-muted-foreground">Participants</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <Wallet className="h-3 w-3 mx-auto text-green-500 mb-1" />
                      <p className="text-sm font-bold text-green-600">₹{org.total_earnings.toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground">Earnings</p>
                    </div>
                  </div>

                  {/* Detailed Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active:</span>
                      <span className="font-medium">{org.active_tournaments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="font-medium">{org.completed_tournaments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prize Pool:</span>
                      <span className="font-medium text-primary">₹{org.total_prize_pool.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Rev:</span>
                      <span className="font-medium text-green-600">₹{org.platform_revenue.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {hasPermission('organizers:manage') && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedOrganizer(org);
                          setActionDialog('view-organizer');
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive border-destructive"
                        onClick={() => {
                          setSelectedOrganizer(org);
                          setActionDialog('remove-organizer');
                        }}
                      >
                        <X className="h-3 w-3 mr-1" /> Remove
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {organizers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No organizers yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Application Dialog - Updated with all KYC details */}
      <Dialog open={actionDialog === 'view'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{selectedApplication.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Age</Label>
                  <p className="font-medium">{selectedApplication.age || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                <p className="font-medium">{selectedApplication.phone || 'N/A'}</p>
              </div>

              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Aadhaar (Masked)
                </Label>
                <p className="font-medium">{maskAadhaar(selectedApplication.aadhaar_number)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Instagram className="h-3 w-3" /> Instagram
                  </Label>
                  {selectedApplication.instagram_link ? (
                    <a href={selectedApplication.instagram_link} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline text-sm break-all">
                      View Profile
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not provided</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Youtube className="h-3 w-3" /> YouTube
                  </Label>
                  {selectedApplication.youtube_link ? (
                    <a href={selectedApplication.youtube_link} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline text-sm break-all">
                      View Channel
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not provided</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Experience</Label>
                <p className="text-sm">{selectedApplication.experience || 'Not provided'}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Applied On</Label>
                <p className="text-sm">{format(new Date(selectedApplication.created_at), 'MMM dd, yyyy hh:mm a')}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={actionDialog === 'approve'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Organizer</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedApplication?.name} as an organizer?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionDialog === 'reject'} onOpenChange={() => { setActionDialog(null); setRejectReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this application (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Organizer Details Dialog */}
      <Dialog open={actionDialog === 'view-organizer'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Organizer Details</DialogTitle>
          </DialogHeader>
          {selectedOrganizer && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {selectedOrganizer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedOrganizer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrganizer.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedOrganizer.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Joined Date</Label>
                  <p className="font-medium">
                    {selectedOrganizer.joined_at ? format(new Date(selectedOrganizer.joined_at), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" /> Tournament Stats
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{selectedOrganizer.total_tournaments}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{selectedOrganizer.active_tournaments}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{selectedOrganizer.completed_tournaments}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-500" /> Financial Stats
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organizer Earnings:</span>
                    <span className="font-bold text-green-600">₹{selectedOrganizer.total_earnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Revenue:</span>
                    <span className="font-bold text-primary">₹{selectedOrganizer.platform_revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Prize Pools:</span>
                    <span className="font-bold">₹{selectedOrganizer.total_prize_pool.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Total Participants:</span>
                    <span className="font-bold">{selectedOrganizer.total_participants}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Close</Button>
            {hasPermission('organizers:manage') && (
              <Button 
                variant="destructive" 
                onClick={() => setActionDialog('remove-organizer')}
              >
                Remove Organizer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Organizer Dialog */}
      <Dialog open={actionDialog === 'remove-organizer'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Organizer</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{selectedOrganizer?.name}</strong> as an organizer? 
              This will revoke their tournament creation privileges. Their existing tournaments will remain.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 bg-destructive/10 rounded-lg p-3 text-sm">
            <p className="text-destructive font-medium">Warning:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
              <li>Organizer will lose tournament creation access</li>
              <li>Existing tournaments will not be affected</li>
              <li>They can reapply to become an organizer</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveOrganizer} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove Organizer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrganizers;
