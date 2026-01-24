import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  Link2,
  Users,
  Trophy,
  Search,
  Copy,
  Eye,
  UserPlus,
  CheckCircle,
  Clock,
  Plus,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

interface CreatorInvite {
  id: string;
  creator_id: string;
  invite_code: string;
  link_name: string | null;
  is_active: boolean;
  total_clicks: number;
  total_signups: number;
  total_qualified: number;
  created_at: string;
  creator_profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

interface Referral {
  id: string;
  referred_user_id: string;
  status: string;
  registered_at: string;
  qualified_at: string | null;
  user_profile?: {
    username: string | null;
    email: string;
    avatar_url: string | null;
  };
}

const AdminCreatorInvites = () => {
  const [invites, setInvites] = useState<CreatorInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvite, setSelectedInvite] = useState<CreatorInvite | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [stats, setStats] = useState({
    totalCreators: 0,
    totalLinks: 0,
    totalSignups: 0,
    totalQualified: 0
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      // Use any type since table doesn't exist in types yet
      const { data, error } = await supabase
        .from('creator_invite_links' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any;

      if (error) {
        // Table might not exist yet
        console.log('Table not created yet:', error.message);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map((i: any) => i.creator_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url, email')
          .in('user_id', creatorIds as string[]);

        const invitesWithProfiles = data.map((invite: any) => ({
          ...invite,
          creator_profile: profiles?.find(p => p.user_id === invite.creator_id)
        }));

        setInvites(invitesWithProfiles);

        const uniqueCreators = new Set(data.map((i: any) => i.creator_id)).size;
        const totalSignups = data.reduce((sum: number, i: any) => sum + (i.total_signups || 0), 0);
        const totalQualified = data.reduce((sum: number, i: any) => sum + (i.total_qualified || 0), 0);

        setStats({
          totalCreators: uniqueCreators,
          totalLinks: data.length,
          totalSignups,
          totalQualified
        });
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async (inviteLinkId: string) => {
    setLoadingReferrals(true);
    try {
      const { data, error } = await supabase
        .from('creator_referrals' as any)
        .select('*')
        .eq('invite_link_id', inviteLinkId)
        .order('registered_at', { ascending: false }) as any;

      if (error) {
        console.log('Referrals table not created yet');
        setReferrals([]);
        return;
      }

      if (data && data.length > 0) {
        const userIds = data.map((r: any) => r.referred_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, email, avatar_url')
          .in('user_id', userIds);

        const referralsWithProfiles = data.map((ref: any) => ({
          ...ref,
          user_profile: profiles?.find(p => p.user_id === ref.referred_user_id)
        }));

        setReferrals(referralsWithProfiles);
      } else {
        setReferrals([]);
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Copied!', description: 'Invite link copied to clipboard' });
  };

  const openReferralsDialog = (invite: CreatorInvite) => {
    setSelectedInvite(invite);
    fetchReferrals(invite.id);
  };

  const filteredInvites = invites.filter(invite => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invite.invite_code.toLowerCase().includes(searchLower) ||
      invite.link_name?.toLowerCase().includes(searchLower) ||
      invite.creator_profile?.username?.toLowerCase().includes(searchLower) ||
      invite.creator_profile?.email?.toLowerCase().includes(searchLower)
    );
  });

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateLink = async () => {
    if (!user) return;
    
    setCreating(true);
    try {
      const inviteCode = generateInviteCode();
      
      const { error } = await supabase
        .from('creator_invite_links' as any)
        .insert({
          creator_id: user.id,
          invite_code: inviteCode,
          link_name: newLinkName.trim() || null,
          is_active: true,
          total_clicks: 0,
          total_signups: 0,
          total_qualified: 0
        } as any);

      if (error) throw error;

      toast({ title: 'Link Created!', description: `Invite code: ${inviteCode}` });
      setCreateDialogOpen(false);
      setNewLinkName('');
      fetchInvites();
    } catch (error: any) {
      console.error('Error creating invite link:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create link', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (inviteId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('creator_invite_links' as any)
        .update({ is_active: !currentStatus } as any)
        .eq('id', inviteId);

      if (error) throw error;
      
      setInvites(prev => prev.map(i => 
        i.id === inviteId ? { ...i, is_active: !currentStatus } : i
      ));
      toast({ title: currentStatus ? 'Link Deactivated' : 'Link Activated' });
    } catch (error) {
      console.error('Error toggling link:', error);
      toast({ title: 'Error', description: 'Failed to update link', variant: 'destructive' });
    }
  };

  const handleDeleteLink = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('creator_invite_links' as any)
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
      
      setInvites(prev => prev.filter(i => i.id !== inviteId));
      toast({ title: 'Link Deleted' });
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({ title: 'Error', description: 'Failed to delete link', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Invite Links Management">
      <div className="p-4 space-y-4">
        {/* Create New Link Button */}
        <Button onClick={() => setCreateDialogOpen(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create New Invite Link
        </Button>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Active Creators</p>
                  <p className="text-lg font-bold">{stats.totalCreators}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/20">
                  <Link2 className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Total Links</p>
                  <p className="text-lg font-bold">{stats.totalLinks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <UserPlus className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Total Signups</p>
                  <p className="text-lg font-bold">{stats.totalSignups}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Trophy className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Qualified Users</p>
                  <p className="text-lg font-bold">{stats.totalQualified}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, creator name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Link2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Creator Collaboration System</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Creators can generate invite links to share with their audience. When a new user registers 
                  via a creator's link and plays at least one tournament, they count as a "qualified" referral. 
                  This page shows all creator invite links and their performance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invites List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredInvites.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Link2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No invite links found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Creators can generate invite links from their dashboard
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInvites.map((invite) => (
              <Card key={invite.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={invite.creator_profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {(invite.creator_profile?.username || 'C')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {invite.creator_profile?.username || invite.creator_profile?.full_name || 'Unknown Creator'}
                        </span>
                        <Badge variant={invite.is_active ? 'default' : 'secondary'} className="text-[9px]">
                          {invite.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{invite.creator_profile?.email}</p>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                          {invite.invite_code}
                        </code>
                        {invite.link_name && (
                          <span className="text-[10px] text-muted-foreground">({invite.link_name})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <UserPlus className="h-3 w-3" />
                          <span>{invite.total_signups} signups</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-primary" />
                          <span>{invite.total_qualified} qualified</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(invite.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Switch 
                        checked={invite.is_active}
                        onCheckedChange={() => handleToggleActive(invite.id, invite.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyInviteLink(invite.invite_code)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openReferralsDialog(invite)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteLink(invite.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Link Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Invite Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Link Name (Optional)</Label>
              <Input
                placeholder="e.g., YouTube Campaign, Instagram Bio..."
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Give this link a name to help you identify it later.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLink} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referrals Dialog */}
      <Dialog open={!!selectedInvite} onOpenChange={() => setSelectedInvite(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referrals - {selectedInvite?.invite_code}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Signups</p>
                <p className="text-xl font-bold">{selectedInvite?.total_signups || 0}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Qualified</p>
                <p className="text-xl font-bold text-primary">{selectedInvite?.total_qualified || 0}</p>
              </div>
            </div>

            <ScrollArea className="h-[300px]">
              {loadingReferrals ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No referrals yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={ref.user_profile?.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">
                          {(ref.user_profile?.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {ref.user_profile?.username || 'Unknown User'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {ref.user_profile?.email}
                        </p>
                      </div>
                      <Badge 
                        variant={ref.status === 'qualified' ? 'default' : 'secondary'}
                        className="text-[9px]"
                      >
                        {ref.status === 'qualified' ? (
                          <><CheckCircle className="h-2.5 w-2.5 mr-1" /> Qualified</>
                        ) : (
                          <><Clock className="h-2.5 w-2.5 mr-1" /> Pending</>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCreatorInvites;
