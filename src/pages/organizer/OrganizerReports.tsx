import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import {
  ArrowLeft,
  Loader2,
  FileWarning,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Trophy,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

interface Report {
  id: string;
  tournament_id: string;
  reporter_id: string;
  reported_player_id: string;
  report_type: string;
  description: string;
  attachments: any;
  status: string;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  tournament?: {
    title: string;
  };
  reporter?: {
    username: string | null;
    avatar_url: string | null;
  };
  reported_player?: {
    username: string | null;
    avatar_url: string | null;
  };
}

const OrganizerReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

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
      fetchReports();
    }
  }, [isOrganizer, user]);

  const fetchReports = async () => {
    if (!user) return;

    try {
      // First get user's tournaments
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id')
        .eq('created_by', user.id);

      if (!tournaments || tournaments.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      const tournamentIds = tournaments.map(t => t.id);

      // Fetch reports for user's tournaments
      const { data: reportsData, error } = await supabase
        .from('tournament_reports')
        .select('*')
        .in('tournament_id', tournamentIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch additional details
      const enrichedReports = await Promise.all(
        (reportsData || []).map(async (report) => {
          // Get tournament title
          const { data: tournament } = await supabase
            .from('tournaments')
            .select('title')
            .eq('id', report.tournament_id)
            .single();

          // Get reporter profile
          const { data: reporter } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', report.reporter_id)
            .single();

          // Get reported player profile
          const { data: reportedPlayer } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', report.reported_player_id)
            .single();

          return {
            ...report,
            tournament,
            reporter,
            reported_player: reportedPlayer
          };
        })
      );

      setReports(enrichedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setDetailsDialogOpen(true);
  };

  const handleTakeAction = (report: Report) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setActionDialogOpen(true);
  };

  const handleUpdateReport = async (newStatus: string) => {
    if (!selectedReport || !user) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('tournament_reports')
        .update({
          status: newStatus,
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast({ title: 'Report Updated', description: `Report marked as ${newStatus}.` });
      setActionDialogOpen(false);
      fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast({ title: 'Error', description: 'Failed to update report.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'reviewed':
        return <Badge className="bg-blue-500"><Eye className="h-3 w-3 mr-1" />Reviewed</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'dismissed':
        return <Badge className="bg-gray-500"><XCircle className="h-3 w-3 mr-1" />Dismissed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getReportTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      hack: '🎮 Hacking/Cheating',
      exploit: '⚠️ Exploit Abuse',
      toxic: '💬 Toxic Behavior',
      teaming: '🤝 Illegal Teaming',
      other: '📝 Other'
    };
    return types[type] || type;
  };

  const filteredReports = reports.filter(r => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

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
      <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/organizer')} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <FileWarning className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">Player Reports</h1>
            <p className="text-sm text-white/80">Review complaints from players</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4">
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700 dark:text-amber-400 text-sm">30-Minute Report Window</h4>
                <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">
                  Players can submit reports within 30 minutes after tournament ends. Review reports before declaring winners.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3 pb-20">
            {filteredReports.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileWarning className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">No reports found</p>
                  <p className="text-sm text-muted-foreground/70">Reports will appear here when players submit them</p>
                </CardContent>
              </Card>
            ) : (
              filteredReports.map((report) => (
                <Card key={report.id} className="overflow-hidden">
                  <div className={`h-1 ${report.status === 'pending' ? 'bg-amber-500' : report.status === 'resolved' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{report.tournament?.title || 'Unknown Tournament'}</span>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-muted-foreground mb-2">{getReportTypeLabel(report.report_type)}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={report.reporter?.avatar_url || ''} />
                            <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                          </Avatar>
                          <span className="text-xs">By: {report.reporter?.username || 'Unknown'}</span>
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 ring-2 ring-red-500">
                            <AvatarImage src={report.reported_player?.avatar_url || ''} />
                            <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-red-600">{report.reported_player?.username || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{report.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewDetails(report)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {report.status === 'pending' && (
                          <Button size="sm" onClick={() => handleTakeAction(report)}>
                            Take Action
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Tournament</Label>
                  <p className="font-medium">{selectedReport.tournament?.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Report Type</Label>
                  <p className="font-medium">{getReportTypeLabel(selectedReport.report_type)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reported By</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedReport.reporter?.avatar_url || ''} />
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <span>{selectedReport.reporter?.username || 'Unknown'}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Accused Player</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-8 w-8 ring-2 ring-red-500">
                      <AvatarImage src={selectedReport.reported_player?.avatar_url || ''} />
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <span className="text-red-600">{selectedReport.reported_player?.username || 'Unknown'}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedReport.description}</p>
                </div>
                {selectedReport.admin_notes && (
                  <div>
                    <Label className="text-muted-foreground">Review Notes</Label>
                    <p className="text-sm mt-1 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">{selectedReport.admin_notes}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Take Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Action on Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Your Notes</Label>
              <Textarea
                placeholder="Add notes about your decision..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleUpdateReport('dismissed')}
              disabled={processing}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => handleUpdateReport('reviewed')}
              disabled={processing}
            >
              <Eye className="h-4 w-4 mr-1" />
              Mark Reviewed
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleUpdateReport('resolved')}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerReports;
