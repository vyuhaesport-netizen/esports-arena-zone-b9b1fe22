import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Search, 
  Loader2, 
  User,
  Ban,
  Plus,
  Minus,
  Eye,
  UserPlus,
  Palette,
  Users,
  TrendingUp,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { generateUsersPDF, generateUsersCSV, UserData } from '@/utils/pdfGenerator';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  wallet_balance: number | null;
  is_banned: boolean | null;
  is_frozen: boolean | null;
  created_at: string;
}

interface UserGrowthDataPoint {
  date: string;
  displayDate: string;
  newUsers: number;
  cumulativeUsers: number;
}

const chartConfig = {
  newUsers: {
    label: "New Users",
    color: "hsl(var(--primary))",
  },
  cumulativeUsers: {
    label: "Total Users",
    color: "hsl(210, 100%, 50%)",
  },
};

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [walletAction, setWalletAction] = useState<'add' | 'deduct'>('add');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthDataPoint[]>([]);

  const { user, isAdmin, isSuperAdmin, loading: authLoading, hasPermission } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('users:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('users:view')) {
      fetchUsers();
      
      // Subscribe to realtime updates for new users
      const channel = supabase
        .channel('admin-users-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => {
            fetchUsers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [hasPermission]);

  useEffect(() => {
    const filtered = users.filter(u => 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);

      // Calculate user growth data for the last 30 days
      if (data) {
        const last30Days = eachDayOfInterval({
          start: subDays(new Date(), 29),
          end: new Date(),
        });

        let cumulativeCount = 0;
        // Count users before the 30 day period
        const usersBeforePeriod = data.filter(u => 
          new Date(u.created_at) < last30Days[0]
        ).length;
        cumulativeCount = usersBeforePeriod;

        const growthData: UserGrowthDataPoint[] = last30Days.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const newUsersOnDay = data.filter(u => 
            format(parseISO(u.created_at), 'yyyy-MM-dd') === dateStr
          ).length;
          cumulativeCount += newUsersOnDay;

          return {
            date: dateStr,
            displayDate: format(date, 'MMM dd'),
            newUsers: newUsersOnDay,
            cumulativeUsers: cumulativeCount,
          };
        });

        setUserGrowthData(growthData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can perform this action.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: ban })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast({ title: 'Success', description: `User ${ban ? 'banned' : 'unbanned'} successfully.` });
      fetchUsers();
      setDetailOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to update user status.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleFreezeAccount = async (userId: string, freeze: boolean) => {
    if (!isSuperAdmin) {
      toast({ title: 'Access Denied', description: 'Only Super Admin can perform this action.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_frozen: freeze })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast({ title: 'Success', description: `Account ${freeze ? 'frozen' : 'unfrozen'} successfully.` });
      fetchUsers();
      setDetailOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to update account status.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      setUserRoles(data?.map(r => r.role) || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setUserRoles([]);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    setProcessing(true);
    try {
      // Check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .eq('role', selectedRole as 'admin' | 'user' | 'organizer' | 'creator')
        .maybeSingle();

      if (existingRole) {
        toast({ title: 'Info', description: 'User already has this role.' });
        setRoleDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.user_id,
          role: selectedRole as 'admin' | 'user' | 'organizer' | 'creator',
        });

      if (error) throw error;

      toast({ title: 'Success', description: `User is now a ${selectedRole}.` });
      setRoleDialogOpen(false);
      setSelectedRole('');
      fetchUserRoles(selectedUser.user_id);
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({ title: 'Error', description: 'Failed to assign role.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveRole = async (role: string) => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.user_id)
        .eq('role', role as 'admin' | 'user' | 'organizer' | 'creator');

      if (error) throw error;

      toast({ title: 'Success', description: `${role} role removed.` });
      fetchUserRoles(selectedUser.user_id);
    } catch (error) {
      console.error('Error removing role:', error);
      toast({ title: 'Error', description: 'Failed to remove role.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const openWalletDialog = (action: 'add' | 'deduct') => {
    setWalletAction(action);
    setWalletAmount('');
    setWalletReason('');
    setWalletDialogOpen(true);
  };

  const handleWalletAction = async () => {
    if (!selectedUser || !walletAmount || !walletReason) {
      toast({ title: 'Error', description: 'Please fill all fields.', variant: 'destructive' });
      return;
    }

    if (!isSuperAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only Super Admin can perform this action.',
        variant: 'destructive',
      });
      return;
    }

    const amount = Number(walletAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Error', description: 'Enter a valid amount.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_adjust_wallet', {
        p_target_user_id: selectedUser.user_id,
        p_action: walletAction,
        p_amount: amount,
        p_reason: walletReason,
      } as any);

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        toast({
          title: 'Error',
          description: result?.error || 'Failed to update wallet.',
          variant: 'destructive',
        });
        return;
      }

      const newBalance = Number(result.new_balance);

      toast({
        title: 'Success',
        description: `₹${amount} ${walletAction === 'add' ? 'added to' : 'deducted from'} wallet.`,
      });

      setWalletDialogOpen(false);
      fetchUsers();

      setSelectedUser({
        ...selectedUser,
        wallet_balance: Number.isFinite(newBalance) ? newBalance : selectedUser.wallet_balance,
      });
    } catch (err) {
      console.error('Error:', err);
      toast({ title: 'Error', description: 'Failed to update wallet.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Calculate stats
  const totalNewUsersLast30Days = userGrowthData.reduce((sum, d) => sum + d.newUsers, 0);
  const todayNewUsers = userGrowthData.length > 0 ? userGrowthData[userGrowthData.length - 1].newUsers : 0;

  if (authLoading || loading) {
    return (
      <AdminLayout title="Users">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="User Management">
      <div className="p-4 space-y-4">
        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => generateUsersPDF(filteredUsers as UserData[])}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => generateUsersCSV(filteredUsers as UserData[])}
            className="flex-1"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-lg font-bold">{users.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-lg font-bold">{totalNewUsersLast30Days}</p>
                  <p className="text-[10px] text-muted-foreground">Last 30 Days</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold">{todayNewUsers}</p>
                  <p className="text-[10px] text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Growth Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              User Growth (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={userGrowthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  className="text-muted-foreground"
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="newUsers"
                  name="New Users"
                  fill="url(#colorNewUsers)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
            
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-primary" />
                <span className="text-xs text-muted-foreground">New Registrations</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Users List */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Balance</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {u.username?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.full_name || u.username || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">₹{u.wallet_balance || 0}</span>
                      </TableCell>
                      <TableCell>
                        {u.is_banned ? (
                          <Badge variant="destructive" className="text-[10px]">Banned</Badge>
                        ) : u.is_frozen ? (
                          <Badge variant="secondary" className="text-[10px]">Frozen</Badge>
                        ) : (
                          <Badge className="bg-green-500/10 text-green-600 text-[10px]">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedUser(u);
                            fetchUserRoles(u.user_id);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <User className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">No users found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View and manage user account
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 pt-4">
              {/* User Info */}
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-semibold text-primary">
                    {selectedUser.username?.charAt(0).toUpperCase() || selectedUser.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{selectedUser.full_name || selectedUser.username || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {format(new Date(selectedUser.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {/* Wallet Section */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Wallet Balance</span>
                  <span className="text-xl font-bold text-primary">₹{selectedUser.wallet_balance || 0}</span>
                </div>
                
                {isSuperAdmin && hasPermission('users:manage') && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-green-600 border-green-600"
                      onClick={() => openWalletDialog('add')}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Money
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-destructive border-destructive"
                      onClick={() => openWalletDialog('deduct')}
                    >
                      <Minus className="h-3 w-3 mr-1" /> Deduct
                    </Button>
                  </div>
                )}
              </div>

              {/* User Roles */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">User Roles</span>
                  {isSuperAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRoleDialogOpen(true)}
                    >
                      <UserPlus className="h-3 w-3 mr-1" /> Assign Role
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {userRoles.length === 0 ? (
                    <Badge variant="secondary" className="text-xs">User</Badge>
                  ) : (
                    userRoles.map((role) => (
                      <Badge 
                        key={role} 
                        className={`text-xs ${
                          role === 'admin' ? 'bg-red-500/10 text-red-600' :
                          role === 'organizer' ? 'bg-primary/10 text-primary' :
                          role === 'creator' ? 'bg-pink-500/10 text-pink-600' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {role}
                        {isSuperAdmin && role !== 'user' && (
                          <button
                            className="ml-1 hover:text-destructive"
                            onClick={() => handleRemoveRole(role)}
                            disabled={processing}
                          >
                            ×
                          </button>
                        )}
                      </Badge>
                    ))
                  )}
                </div>
                
                {/* Quick Action Buttons for Making Creator/Organizer */}
                {isSuperAdmin && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {!userRoles.includes('creator') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-pink-500/10 border-pink-500/30 text-pink-600 hover:bg-pink-500/20"
                        onClick={async () => {
                          setProcessing(true);
                          try {
                            const { error } = await supabase
                              .from('user_roles')
                              .insert({
                                user_id: selectedUser.user_id,
                                role: 'creator' as 'admin' | 'user' | 'organizer' | 'creator',
                              });
                            if (error) throw error;
                            toast({ title: 'Success', description: 'User is now a Creator!' });
                            fetchUserRoles(selectedUser.user_id);
                          } catch (error) {
                            console.error('Error:', error);
                            toast({ title: 'Error', description: 'Failed to assign creator role.', variant: 'destructive' });
                          } finally {
                            setProcessing(false);
                          }
                        }}
                        disabled={processing}
                      >
                        <Palette className="h-3 w-3 mr-1" /> Make Creator
                      </Button>
                    )}
                    {!userRoles.includes('organizer') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                        onClick={async () => {
                          setProcessing(true);
                          try {
                            const { error } = await supabase
                              .from('user_roles')
                              .insert({
                                user_id: selectedUser.user_id,
                                role: 'organizer' as 'admin' | 'user' | 'organizer' | 'creator',
                              });
                            if (error) throw error;
                            toast({ title: 'Success', description: 'User is now an Organizer!' });
                            fetchUserRoles(selectedUser.user_id);
                          } catch (error) {
                            console.error('Error:', error);
                            toast({ title: 'Error', description: 'Failed to assign organizer role.', variant: 'destructive' });
                          } finally {
                            setProcessing(false);
                          }
                        }}
                        disabled={processing}
                      >
                        <UserPlus className="h-3 w-3 mr-1" /> Make Organizer
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {/* Account Actions */}
              {isSuperAdmin && hasPermission('users:manage') && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Account Actions</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleFreezeAccount(selectedUser.user_id, !selectedUser.is_frozen)}
                      disabled={processing}
                    >
                      {selectedUser.is_frozen ? 'Unfreeze' : 'Freeze Account'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleBanUser(selectedUser.user_id, !selectedUser.is_banned)}
                      disabled={processing}
                    >
                      <Ban className="h-3 w-3 mr-1" />
                      {selectedUser.is_banned ? 'Unban' : 'Ban User'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet Action Dialog */}
      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {walletAction === 'add' ? 'Add Money to Wallet' : 'Deduct from Wallet'}
            </DialogTitle>
            <DialogDescription>
              This action will be logged for audit purposes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                placeholder="Enter reason for this transaction (required for audit)"
                value={walletReason}
                onChange={(e) => setWalletReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={walletAction === 'add' ? 'default' : 'destructive'}
              onClick={handleWalletAction}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Assignment Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.full_name || selectedUser?.username || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Select Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organizer">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-primary" />
                      <span>Organizer</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="creator">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-pink-500" />
                      <span>Creator</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-xs">
              {selectedRole === 'organizer' && (
                <p><strong>Organizer:</strong> Can create official tournaments shown on Home page</p>
              )}
              {selectedRole === 'creator' && (
                <p><strong>Creator:</strong> Can create creator tournaments shown on Creator page</p>
              )}
              {!selectedRole && (
                <p className="text-muted-foreground">Select a role to see its description</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignRole}
              disabled={processing || !selectedRole}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;