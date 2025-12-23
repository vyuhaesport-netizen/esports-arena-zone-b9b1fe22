import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Ban, 
  ShieldOff, 
  RefreshCw, 
  Search,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle,
  User
} from "lucide-react";
import { format } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";

interface PlayerBan {
  id: string;
  user_id: string;
  banned_by: string;
  ban_reason: string;
  report_id: string | null;
  ban_type: string;
  ban_number: number;
  ban_duration_hours: number | null;
  banned_at: string;
  expires_at: string | null;
  is_active: boolean;
  lifted_by: string | null;
  lifted_at: string | null;
  lift_reason: string | null;
  user_profile?: {
    username: string | null;
    email: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  banned_by_profile?: {
    username: string | null;
    email: string;
  };
}

interface UserProfile {
  user_id: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  full_name: string | null;
}

const AdminBanManagement = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [bans, setBans] = useState<PlayerBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  // Dialog states
  const [liftBanDialog, setLiftBanDialog] = useState(false);
  const [terminateDialog, setTerminateDialog] = useState(false);
  const [selectedBan, setSelectedBan] = useState<PlayerBan | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Manual termination
  const [manualTerminateDialog, setManualTerminateDialog] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [terminationReason, setTerminationReason] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/admin");
      return;
    }
    fetchBans();
  }, [isAdmin, navigate]);

  const fetchBans = async () => {
    setLoading(true);
    try {
      const { data: bansData, error } = await supabase
        .from("player_bans")
        .select("*")
        .order("banned_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each ban
      const enrichedBans = await Promise.all(
        (bansData || []).map(async (ban) => {
          const [userProfile, bannedByProfile] = await Promise.all([
            supabase.from("profiles").select("username, email, avatar_url, full_name").eq("user_id", ban.user_id).single(),
            supabase.from("profiles").select("username, email").eq("user_id", ban.banned_by).single()
          ]);

          return {
            ...ban,
            user_profile: userProfile.data || undefined,
            banned_by_profile: bannedByProfile.data || undefined
          };
        })
      );

      setBans(enrichedBans);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLiftBan = async () => {
    if (!selectedBan || !actionReason.trim()) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_lift_ban", {
        p_ban_id: selectedBan.id,
        p_lift_reason: actionReason
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Failed to lift ban");

      toast({ title: "Ban lifted successfully" });
      setLiftBanDialog(false);
      setSelectedBan(null);
      setActionReason("");
      fetchBans();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreAccount = async (userId: string) => {
    if (!actionReason.trim()) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_restore_account", {
        p_user_id: userId,
        p_reason: actionReason
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Failed to restore account");

      toast({ title: "Account restored successfully" });
      setTerminateDialog(false);
      setSelectedBan(null);
      setActionReason("");
      fetchBans();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchedUsers([]);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, email, avatar_url, full_name")
      .or(`username.ilike.%${query}%,email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    if (!error && data) {
      setSearchedUsers(data);
    }
  };

  const handleManualTerminate = async () => {
    if (!selectedUser || !terminationReason.trim()) {
      toast({ title: "Please select a user and provide a reason", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_terminate_account", {
        p_user_id: selectedUser.user_id,
        p_reason: terminationReason
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Failed to terminate account");

      toast({ title: "Account terminated successfully" });
      setManualTerminateDialog(false);
      setSelectedUser(null);
      setTerminationReason("");
      setSearchedUsers([]);
      fetchBans();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const getBanTypeBadge = (ban: PlayerBan) => {
    if (ban.ban_type === "terminated" || ban.ban_type === "manual_termination") {
      return <Badge variant="destructive">Terminated</Badge>;
    }
    if (!ban.is_active) {
      return <Badge variant="secondary">Lifted</Badge>;
    }
    if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
      return <Badge variant="outline">Expired</Badge>;
    }
    return <Badge className="bg-amber-500">Active</Badge>;
  };

  const filteredBans = bans.filter(ban => {
    const matchesSearch = 
      ban.user_profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ban.user_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ban.ban_reason.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "active") {
      return matchesSearch && ban.is_active && (ban.ban_type === "temporary" ? (ban.expires_at && new Date(ban.expires_at) > new Date()) : true);
    }
    if (activeTab === "terminated") {
      return matchesSearch && ban.is_active && (ban.ban_type === "terminated" || ban.ban_type === "manual_termination");
    }
    if (activeTab === "lifted") {
      return matchesSearch && !ban.is_active;
    }
    return matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Ban Management</h1>
              <p className="text-muted-foreground">Manage player bans and account terminations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchBans}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="destructive" onClick={() => setManualTerminateDialog(true)}>
              <Ban className="h-4 w-4 mr-2" />
              Manual Termination
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {bans.filter(b => b.is_active && b.ban_type === "temporary" && b.expires_at && new Date(b.expires_at) > new Date()).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Suspensions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/20 rounded-lg">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {bans.filter(b => b.is_active && (b.ban_type === "terminated" || b.ban_type === "manual_termination")).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Terminated Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {bans.filter(b => !b.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Lifted Bans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bans.length}</p>
                  <p className="text-sm text-muted-foreground">Total Bans</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Tabs */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>All Bans</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="terminated">Terminated</TabsTrigger>
                <TabsTrigger value="lifted">Lifted</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredBans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No bans found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Player</TableHead>
                          <TableHead>Ban Type</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Banned By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBans.map((ban) => (
                          <TableRow key={ban.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={ban.user_profile?.avatar_url || ""} />
                                  <AvatarFallback>
                                    <User className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{ban.user_profile?.username || "Unknown"}</p>
                                  <p className="text-xs text-muted-foreground">{ban.user_profile?.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="capitalize">{ban.ban_type.replace("_", " ")}</p>
                                {ban.ban_duration_hours && (
                                  <p className="text-xs text-muted-foreground">
                                    {ban.ban_duration_hours === 24 ? "24 hours" : "7 days"} (Ban #{ban.ban_number})
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{ban.ban_reason}</TableCell>
                            <TableCell>
                              <p className="text-sm">{ban.banned_by_profile?.username || ban.banned_by_profile?.email || "Admin"}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{format(new Date(ban.banned_at), "dd MMM yyyy")}</p>
                              {ban.expires_at && (
                                <p className="text-xs text-muted-foreground">
                                  Expires: {format(new Date(ban.expires_at), "dd MMM HH:mm")}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>{getBanTypeBadge(ban)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {ban.is_active && ban.ban_type === "temporary" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBan(ban);
                                      setLiftBanDialog(true);
                                    }}
                                  >
                                    <ShieldOff className="h-3 w-3 mr-1" />
                                    Lift
                                  </Button>
                                )}
                                {ban.is_active && (ban.ban_type === "terminated" || ban.ban_type === "manual_termination") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600"
                                    onClick={() => {
                                      setSelectedBan(ban);
                                      setTerminateDialog(true);
                                    }}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Restore
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Lift Ban Dialog */}
        <Dialog open={liftBanDialog} onOpenChange={setLiftBanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lift Ban</DialogTitle>
              <DialogDescription>
                Remove the ban from {selectedBan?.user_profile?.username || "this user"}'s account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason for lifting ban</Label>
                <Textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLiftBanDialog(false)}>Cancel</Button>
              <Button onClick={handleLiftBan} disabled={actionLoading}>
                {actionLoading ? "Processing..." : "Lift Ban"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Account Dialog */}
        <Dialog open={terminateDialog} onOpenChange={setTerminateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Terminated Account</DialogTitle>
              <DialogDescription>
                This will restore {selectedBan?.user_profile?.username || "this user"}'s account access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason for restoring account</Label>
                <Textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTerminateDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => selectedBan && handleRestoreAccount(selectedBan.user_id)} 
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? "Processing..." : "Restore Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Termination Dialog */}
        <Dialog open={manualTerminateDialog} onOpenChange={setManualTerminateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">Manual Account Termination</DialogTitle>
              <DialogDescription>
                Search for a user and permanently terminate their account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Search User</Label>
                <Input
                  placeholder="Search by username or email..."
                  onChange={(e) => searchUsers(e.target.value)}
                />
                {searchedUsers.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                    {searchedUsers.map((u) => (
                      <div
                        key={u.user_id}
                        className={`p-2 flex items-center gap-2 cursor-pointer hover:bg-accent ${selectedUser?.user_id === u.user_id ? "bg-accent" : ""}`}
                        onClick={() => setSelectedUser(u)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar_url || ""} />
                          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{u.username || u.full_name || "No name"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedUser && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium">Selected User:</p>
                  <p className="text-sm">{selectedUser.username || selectedUser.email}</p>
                </div>
              )}

              <div>
                <Label>Termination Reason</Label>
                <Textarea
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder="Enter detailed reason for termination..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setManualTerminateDialog(false);
                setSelectedUser(null);
                setSearchedUsers([]);
                setTerminationReason("");
              }}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleManualTerminate} 
                disabled={actionLoading || !selectedUser}
              >
                {actionLoading ? "Processing..." : "Terminate Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminBanManagement;
