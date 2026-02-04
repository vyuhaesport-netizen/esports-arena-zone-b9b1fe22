import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Plus, 
  Loader2, 
  UsersRound,
  Edit2,
  Trash2,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Permission {
  id: string;
  label: string;
  description: string;
}

interface PagePermissionGroup {
  page: string;
  icon: string;
  description: string;
  permissions: Permission[];
}

const pagePermissionGroups: PagePermissionGroup[] = [
  {
    page: 'Dashboard',
    icon: '📊',
    description: 'Main admin dashboard with statistics',
    permissions: [
      { id: 'dashboard:view', label: 'View Dashboard', description: 'Access to view dashboard metrics and statistics' },
    ],
  },
  {
    page: 'Users Management',
    icon: '👥',
    description: 'Manage all platform users',
    permissions: [
      { id: 'users:view', label: 'View Users', description: 'View user list and profiles' },
      { id: 'users:manage', label: 'Manage Users', description: 'Ban/freeze users, adjust wallets, terminate accounts' },
    ],
  },
  {
    page: 'Tournaments',
    icon: '🏆',
    description: 'Manage online tournaments',
    permissions: [
      { id: 'tournaments:view', label: 'View Tournaments', description: 'View all tournaments' },
      { id: 'tournaments:create', label: 'Create Tournaments', description: 'Create new tournaments' },
      { id: 'tournaments:edit', label: 'Edit Tournaments', description: 'Modify tournament details, room ID, password' },
      { id: 'tournaments:delete', label: 'Delete Tournaments', description: 'Cancel and delete tournaments' },
    ],
  },
  {
    page: 'Organizer Management',
    icon: '🎯',
    description: 'Handle organizer applications and verification',
    permissions: [
      { id: 'organizers:view', label: 'View Organizers', description: 'View organizer applications' },
      { id: 'organizers:manage', label: 'Manage Organizers', description: 'Approve/reject organizer applications' },
    ],
  },
  {
    page: 'Creator Management',
    icon: '🎨',
    description: 'Handle content creator applications',
    permissions: [
      { id: 'creators:view', label: 'View Creators', description: 'View creator applications' },
      { id: 'creators:manage', label: 'Manage Creators', description: 'Approve/reject creator applications' },
    ],
  },
  {
    page: 'Deposits',
    icon: '💰',
    description: 'Process user deposit requests',
    permissions: [
      { id: 'deposits:view', label: 'View Deposits', description: 'View pending deposits' },
      { id: 'deposits:manage', label: 'Manage Deposits', description: 'Approve/reject deposit requests' },
    ],
  },
  {
    page: 'Withdrawals',
    icon: '💸',
    description: 'Process user withdrawal requests',
    permissions: [
      { id: 'withdrawals:view', label: 'View Withdrawals', description: 'View pending withdrawals' },
      { id: 'withdrawals:manage', label: 'Manage Withdrawals', description: 'Approve/reject withdrawal requests' },
    ],
  },
  {
    page: 'Transactions & Wallet Audit',
    icon: '📋',
    description: 'View all financial transactions',
    permissions: [
      { id: 'transactions:view', label: 'View Transactions', description: 'View all wallet transactions and audit logs' },
    ],
  },
  {
    page: 'Support Tickets',
    icon: '🎧',
    description: 'Handle user support requests',
    permissions: [
      { id: 'support:view', label: 'View Support', description: 'View support tickets' },
      { id: 'support:manage', label: 'Manage Support', description: 'Respond to and resolve support tickets' },
    ],
  },
  {
    page: 'Notifications & Broadcasts',
    icon: '🔔',
    description: 'Send notifications to users',
    permissions: [
      { id: 'notifications:view', label: 'View Notifications', description: 'View notification history' },
      { id: 'notifications:manage', label: 'Send Notifications', description: 'Create and send push notifications, broadcasts' },
    ],
  },
  {
    page: 'Ban Management',
    icon: '🚫',
    description: 'Manage player bans and reports',
    permissions: [
      { id: 'bans:view', label: 'View Bans', description: 'View active bans and reports' },
      { id: 'bans:manage', label: 'Manage Bans', description: 'Issue bans, lift bans, review reports' },
    ],
  },
  {
    page: 'Settings',
    icon: '⚙️',
    description: 'Platform settings and configuration',
    permissions: [
      { id: 'settings:view', label: 'View Settings', description: 'View platform settings' },
      { id: 'settings:manage', label: 'Manage Settings', description: 'Update platform settings' },
    ],
  },
];

// Flatten for easy lookup
const allPermissions: Permission[] = pagePermissionGroups.flatMap(g => g.permissions);

const AdminTeam = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [memberPermissions, setMemberPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'team_member',
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isSuperAdmin) {
        navigate('/admin');
        toast({
          title: 'Access Denied',
          description: 'Only Super Admin can access team management.',
          variant: 'destructive',
        });
      }
    }
  }, [user, isSuperAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTeamMembers();
    }
  }, [isSuperAdmin]);

  const fetchTeamMembers = async () => {
    try {
      const { data: members, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeamMembers(members || []);

      // Fetch permissions for each member
      const perms: Record<string, string[]> = {};
      for (const member of members || []) {
        const { data: permData } = await supabase
          .from('admin_permissions')
          .select('permission')
          .eq('user_id', member.user_id);
        
        perms[member.user_id] = permData?.map(p => p.permission) || [];
      }
      setMemberPermissions(perms);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ email: '', name: '', role: 'team_member' });
    setSelectedPermissions([]);
    setEditingMember(null);
  };

  const openEditDialog = async (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      email: member.email,
      name: member.name,
      role: member.role,
    });
    setSelectedPermissions(memberPermissions[member.user_id] || []);
    setDialogOpen(true);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = async () => {
    if (!formData.email || !formData.name) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      if (editingMember) {
        // Update existing member
        const { error: memberError } = await supabase
          .from('team_members')
          .update({
            name: formData.name,
            role: formData.role,
          })
          .eq('id', editingMember.id);

        if (memberError) throw memberError;

        // Update permissions - delete existing and insert new
        await supabase
          .from('admin_permissions')
          .delete()
          .eq('user_id', editingMember.user_id);

        if (selectedPermissions.length > 0) {
          const { error: permError } = await supabase
            .from('admin_permissions')
            .insert(
              selectedPermissions.map(p => ({
                user_id: editingMember.user_id,
                permission: p,
                created_by: user?.id,
              }))
            );

          if (permError) throw permError;
        }

        toast({ title: 'Success', description: 'Team member updated.' });
      } else {
        // Find user by email in profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', formData.email)
          .single();

        if (profileError || !profile) {
          toast({
            title: 'Error',
            description: 'User not found. They must have an account first.',
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }

        // Add team member
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            user_id: profile.user_id,
            email: formData.email,
            name: formData.name,
            role: formData.role,
            appointed_by: user?.id,
          });

        if (memberError) throw memberError;

        // Add admin role using upsert
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: profile.user_id,
            role: 'admin',
          }, { onConflict: 'user_id,role' });

        if (roleError) throw roleError;

        // Add permissions
        if (selectedPermissions.length > 0) {
          const { error: permError } = await supabase
            .from('admin_permissions')
            .insert(
              selectedPermissions.map(p => ({
                user_id: profile.user_id,
                permission: p,
                created_by: user?.id,
              }))
            );

          if (permError) throw permError;
        }

        toast({ title: 'Success', description: 'Team member added.' });
      }

      setDialogOpen(false);
      resetForm();
      fetchTeamMembers();
    } catch (error) {
      console.error('Error saving team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to save team member.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: TeamMember) => {
    if (!confirm(`Remove ${member.name} from the team?`)) return;

    try {
      // Remove permissions
      await supabase
        .from('admin_permissions')
        .delete()
        .eq('user_id', member.user_id);

      // Remove admin role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', member.user_id)
        .eq('role', 'admin');

      // Remove team member
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', member.id);

      if (error) throw error;

      toast({ title: 'Removed', description: 'Team member removed successfully.' });
      fetchTeamMembers();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member.',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Team">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <AdminLayout title="Team Management">
      <div className="p-4 space-y-4">
        {/* Add Button */}
        <Button 
          variant="gaming" 
          className="w-full"
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Team Member
        </Button>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Super Admin Access</p>
                <p className="text-xs text-muted-foreground mt-1">
                  As Super Admin, you have full access to all sections. Team members can only access sections based on their assigned permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {member.role}
                        </Badge>
                        <Badge 
                          className={`text-[10px] ${member.is_active ? 'bg-green-500/10 text-green-600' : 'bg-muted'}`}
                        >
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(member)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(member)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Permissions Preview - Grouped by Page */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Page Access:</p>
                  <div className="flex flex-wrap gap-1">
                    {pagePermissionGroups
                      .filter(group => group.permissions.some(p => (memberPermissions[member.user_id] || []).includes(p.id)))
                      .slice(0, 6)
                      .map(group => (
                        <Badge key={group.page} variant="outline" className="text-[10px]">
                          {group.icon} {group.page}
                        </Badge>
                      ))}
                    {pagePermissionGroups.filter(group => 
                      group.permissions.some(p => (memberPermissions[member.user_id] || []).includes(p.id))
                    ).length > 6 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{pagePermissionGroups.filter(group => 
                          group.permissions.some(p => (memberPermissions[member.user_id] || []).includes(p.id))
                        ).length - 6} more
                      </Badge>
                    )}
                    {(memberPermissions[member.user_id] || []).length === 0 && (
                      <span className="text-xs text-muted-foreground">No permissions assigned</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {teamMembers.length === 0 && (
            <div className="text-center py-12">
              <UsersRound className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No team members yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add team members to help manage the platform</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Edit Team Member' : 'Add Team Member'}
            </DialogTitle>
            <DialogDescription>
              {editingMember ? 'Update member details and permissions' : 'Add a new team member with specific permissions'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="member@example.com"
                  disabled={!!editingMember}
                />
                {!editingMember && (
                  <p className="text-xs text-muted-foreground">User must have an existing account</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Team member name"
                />
              </div>
            </div>

            {/* Page-based Permissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Page Permissions</Label>
                  <p className="text-xs text-muted-foreground">
                    Assign access to specific admin pages
                  </p>
                </div>
                <Badge variant="secondary">
                  {selectedPermissions.length} selected
                </Badge>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto border rounded-lg p-3">
                {pagePermissionGroups.map((group) => {
                  const groupPerms = group.permissions.map(p => p.id);
                  const selectedInGroup = groupPerms.filter(p => selectedPermissions.includes(p));
                  const allSelected = selectedInGroup.length === groupPerms.length;
                  const someSelected = selectedInGroup.length > 0 && !allSelected;

                  const toggleGroup = () => {
                    if (allSelected) {
                      // Deselect all in group
                      setSelectedPermissions(prev => prev.filter(p => !groupPerms.includes(p)));
                    } else {
                      // Select all in group
                      setSelectedPermissions(prev => [...new Set([...prev, ...groupPerms])]);
                    }
                  };

                  return (
                    <div key={group.page} className="border rounded-lg overflow-hidden">
                      {/* Group Header */}
                      <div 
                        className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
                        onClick={toggleGroup}
                      >
                        <Checkbox
                          checked={allSelected}
                          ref={(el) => {
                            if (el) (el as any).indeterminate = someSelected;
                          }}
                          onCheckedChange={toggleGroup}
                        />
                        <span className="text-lg">{group.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{group.page}</p>
                          <p className="text-xs text-muted-foreground">{group.description}</p>
                        </div>
                        <Badge variant={allSelected ? 'default' : someSelected ? 'secondary' : 'outline'} className="text-[10px]">
                          {selectedInGroup.length}/{groupPerms.length}
                        </Badge>
                      </div>

                      {/* Individual Permissions */}
                      <div className="p-2 space-y-1 bg-background">
                        {group.permissions.map((perm) => (
                          <div
                            key={perm.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer"
                            onClick={() => togglePermission(perm.id)}
                          >
                            <Checkbox
                              checked={selectedPermissions.includes(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                              className="ml-6"
                            />
                            <div className="flex-1">
                              <p className="text-sm">{perm.label}</p>
                              <p className="text-[11px] text-muted-foreground">{perm.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setSelectedPermissions(allPermissions.map(p => p.id))}
                >
                  Select All
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setSelectedPermissions([])}
                >
                  Clear All
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setSelectedPermissions(allPermissions.filter(p => p.id.endsWith(':view')).map(p => p.id))}
                >
                  View Only
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="gaming" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingMember ? 'Update' : 'Add Member')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTeam;
