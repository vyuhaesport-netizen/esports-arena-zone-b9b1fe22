 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import AdminLayout from '@/components/admin/AdminLayout';
 import { Card, CardContent } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Input } from '@/components/ui/input';
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
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { useToast } from '@/hooks/use-toast';
 import { 
   Loader2, 
   Link2,
   Copy,
   Pause,
   Play,
   Trash2,
   IndianRupee,
   Users,
   Calendar,
   Edit,
   TrendingUp,
   UserX
 } from 'lucide-react';
 import { format } from 'date-fns';
 
 interface CollabLink {
   id: string;
   user_id: string;
  user_type: string;
   link_code: string;
   commission_per_registration: number;
   expires_at: string | null;
   is_active: boolean;
   total_clicks: number;
   total_signups: number;
   total_qualified: number;
   total_earned: number;
   created_at: string;
   user_name?: string;
   user_email?: string;
 }
 
 const AdminCollabLinks = () => {
   const [links, setLinks] = useState<CollabLink[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedLink, setSelectedLink] = useState<CollabLink | null>(null);
   const [actionDialog, setActionDialog] = useState<'edit' | 'kick' | null>(null);
   const [editCommission, setEditCommission] = useState('');
   const [processing, setProcessing] = useState(false);
 
   const { user, isSuperAdmin, loading: authLoading } = useAuth();
   const { toast } = useToast();
   const navigate = useNavigate();
 
   useEffect(() => {
     if (!authLoading && !isSuperAdmin) {
       navigate('/admin');
     }
   }, [authLoading, isSuperAdmin, navigate]);
 
   useEffect(() => {
     if (isSuperAdmin) {
       fetchLinks();
     }
   }, [isSuperAdmin]);
 
   const fetchLinks = async () => {
     try {
       const { data: linksData, error } = await supabase
         .from('collab_links')
         .select('*')
         .order('created_at', { ascending: false });
 
       if (error) throw error;
 
       // Fetch user details for each link
       const userIds = linksData?.map(l => l.user_id) || [];
       const { data: profiles } = await supabase
         .from('profiles')
         .select('user_id, full_name, email, username')
         .in('user_id', userIds);
 
       const linksWithUsers = (linksData || []).map(link => {
         const profile = profiles?.find(p => p.user_id === link.user_id);
         return {
           ...link,
           user_name: profile?.full_name || profile?.username || 'Unknown',
           user_email: profile?.email || '',
        } as CollabLink;
       });
 
       setLinks(linksWithUsers);
     } catch (error) {
       console.error('Error fetching links:', error);
       toast({ title: 'Error', description: 'Failed to load collab links', variant: 'destructive' });
     } finally {
       setLoading(false);
     }
   };
 
   const handleCopyLink = (code: string) => {
     const fullUrl = `${window.location.origin}/?ref=${code}`;
     navigator.clipboard.writeText(fullUrl);
     toast({ title: 'Copied!', description: 'Link copied to clipboard' });
   };
 
   const handleToggleActive = async (link: CollabLink) => {
     setProcessing(true);
     try {
       const { error } = await supabase
         .from('collab_links')
         .update({ is_active: !link.is_active, updated_at: new Date().toISOString() })
         .eq('id', link.id);
 
       if (error) throw error;
 
       toast({ 
         title: link.is_active ? 'Link Paused' : 'Link Activated',
         description: `The collab link has been ${link.is_active ? 'paused' : 'activated'}`
       });
       fetchLinks();
     } catch (error) {
       console.error('Error:', error);
       toast({ title: 'Error', description: 'Failed to update link', variant: 'destructive' });
     } finally {
       setProcessing(false);
     }
   };
 
   const handleUpdateCommission = async () => {
     if (!selectedLink) return;
     
     const commission = parseFloat(editCommission);
     if (isNaN(commission) || commission < 0) {
       toast({ title: 'Invalid Amount', description: 'Please enter a valid commission amount', variant: 'destructive' });
       return;
     }
 
     setProcessing(true);
     try {
       const { error } = await supabase
         .from('collab_links')
         .update({ commission_per_registration: commission, updated_at: new Date().toISOString() })
         .eq('id', selectedLink.id);
 
       if (error) throw error;
 
       toast({ title: 'Updated', description: 'Commission rate updated successfully' });
       setActionDialog(null);
       setSelectedLink(null);
       fetchLinks();
     } catch (error) {
       console.error('Error:', error);
       toast({ title: 'Error', description: 'Failed to update commission', variant: 'destructive' });
     } finally {
       setProcessing(false);
     }
   };
 
   const handleKickFromProgram = async () => {
     if (!selectedLink) return;
 
     setProcessing(true);
     try {
       // Delete the link (this will cascade delete referrals)
       const { error } = await supabase
         .from('collab_links')
         .delete()
         .eq('id', selectedLink.id);
 
       if (error) throw error;
 
       toast({ title: 'Removed', description: 'User has been removed from the collab program' });
       setActionDialog(null);
       setSelectedLink(null);
       fetchLinks();
     } catch (error) {
       console.error('Error:', error);
       toast({ title: 'Error', description: 'Failed to remove user', variant: 'destructive' });
     } finally {
       setProcessing(false);
     }
   };
 
   const totalEarned = links.reduce((sum, l) => sum + l.total_earned, 0);
   const totalQualified = links.reduce((sum, l) => sum + l.total_qualified, 0);
   const activeLinks = links.filter(l => l.is_active).length;
 
   if (authLoading || loading) {
     return (
       <AdminLayout title="Collab Links">
         <div className="flex justify-center py-20">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       </AdminLayout>
     );
   }
 
   return (
     <AdminLayout title="Collab Links Management">
       <div className="p-4 space-y-4">
         {/* Summary Stats */}
         <div className="grid grid-cols-3 gap-3">
           <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
             <CardContent className="p-3">
               <div className="flex items-center gap-2 mb-1">
                 <Link2 className="h-4 w-4 text-primary" />
                 <span className="text-xs text-muted-foreground">Active</span>
               </div>
               <p className="text-xl font-bold">{activeLinks}/{links.length}</p>
             </CardContent>
           </Card>
           <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
             <CardContent className="p-3">
               <div className="flex items-center gap-2 mb-1">
                 <Users className="h-4 w-4 text-green-500" />
                 <span className="text-xs text-muted-foreground">Qualified</span>
               </div>
               <p className="text-xl font-bold">{totalQualified}</p>
             </CardContent>
           </Card>
           <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
             <CardContent className="p-3">
               <div className="flex items-center gap-2 mb-1">
                 <IndianRupee className="h-4 w-4 text-orange-500" />
                 <span className="text-xs text-muted-foreground">Paid</span>
               </div>
               <p className="text-xl font-bold">₹{totalEarned}</p>
             </CardContent>
           </Card>
         </div>
 
         {/* Links List */}
         {links.length === 0 ? (
           <Card>
             <CardContent className="py-12 text-center">
               <Link2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
               <p className="text-muted-foreground">No collab links yet</p>
               <p className="text-xs text-muted-foreground mt-1">
                 Give links to organizers/creators from their management pages
               </p>
             </CardContent>
           </Card>
         ) : (
           <div className="space-y-3">
             {links.map((link) => (
               <Card key={link.id} className={`overflow-hidden ${!link.is_active ? 'opacity-60' : ''}`}>
                 <CardContent className="p-0">
                   <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                           link.user_type === 'creator' 
                             ? 'bg-gradient-to-br from-pink-500 to-purple-500' 
                             : 'bg-gradient-to-br from-orange-500 to-primary'
                         }`}>
                           <span className="text-white font-semibold text-sm">
                             {link.user_name?.charAt(0).toUpperCase() || '?'}
                           </span>
                         </div>
                         <div>
                           <p className="font-semibold text-sm">{link.user_name}</p>
                           <p className="text-xs text-muted-foreground">{link.user_email}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <Badge className={link.user_type === 'creator' 
                           ? 'bg-pink-500/10 text-pink-500 text-[10px]' 
                           : 'bg-orange-500/10 text-orange-500 text-[10px]'
                         }>
                           {link.user_type}
                         </Badge>
                         <Badge className={link.is_active 
                           ? 'bg-green-500/10 text-green-500 text-[10px]' 
                           : 'bg-red-500/10 text-red-500 text-[10px]'
                         }>
                           {link.is_active ? 'Active' : 'Paused'}
                         </Badge>
                       </div>
                     </div>
                   </div>
 
                   <div className="p-4 space-y-3">
                     {/* Link Code */}
                     <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                       <code className="text-xs flex-1 font-mono">{link.link_code}</code>
                       <Button size="sm" variant="ghost" onClick={() => handleCopyLink(link.link_code)}>
                         <Copy className="h-3.5 w-3.5" />
                       </Button>
                     </div>
 
                     {/* Stats */}
                     <div className="grid grid-cols-4 gap-2 text-center">
                       <div>
                         <p className="text-lg font-bold text-primary">{link.total_signups}</p>
                         <p className="text-[10px] text-muted-foreground">Signups</p>
                       </div>
                       <div>
                         <p className="text-lg font-bold text-green-500">{link.total_qualified}</p>
                         <p className="text-[10px] text-muted-foreground">Qualified</p>
                       </div>
                       <div>
                         <p className="text-lg font-bold text-orange-500">₹{link.commission_per_registration}</p>
                         <p className="text-[10px] text-muted-foreground">Per Reg</p>
                       </div>
                       <div>
                         <p className="text-lg font-bold text-purple-500">₹{link.total_earned}</p>
                         <p className="text-[10px] text-muted-foreground">Earned</p>
                       </div>
                     </div>
 
                     {/* Expiry */}
                     {link.expires_at && (
                       <div className="flex items-center gap-2 text-xs text-muted-foreground">
                         <Calendar className="h-3 w-3" />
                         Expires: {format(new Date(link.expires_at), 'dd MMM yyyy')}
                       </div>
                     )}
 
                     {/* Actions */}
                     <div className="flex gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         className="flex-1"
                         onClick={() => handleToggleActive(link)}
                         disabled={processing}
                       >
                         {link.is_active ? (
                           <><Pause className="h-3.5 w-3.5 mr-1" /> Pause</>
                         ) : (
                           <><Play className="h-3.5 w-3.5 mr-1" /> Activate</>
                         )}
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         className="flex-1"
                         onClick={() => {
                           setSelectedLink(link);
                           setEditCommission(link.commission_per_registration.toString());
                           setActionDialog('edit');
                         }}
                       >
                         <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                       </Button>
                       <Button
                         variant="destructive"
                         size="sm"
                         onClick={() => {
                           setSelectedLink(link);
                           setActionDialog('kick');
                         }}
                       >
                         <UserX className="h-3.5 w-3.5" />
                       </Button>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         )}
       </div>
 
       {/* Edit Commission Dialog */}
       <Dialog open={actionDialog === 'edit'} onOpenChange={() => setActionDialog(null)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Edit Commission Rate</DialogTitle>
             <DialogDescription>
               Update the commission per qualified registration for {selectedLink?.user_name}
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Commission per Registration (₹)</Label>
               <Input
                 type="number"
                 min="0"
                 step="0.5"
                 value={editCommission}
                 onChange={(e) => setEditCommission(e.target.value)}
                 placeholder="Enter amount"
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
             <Button onClick={handleUpdateCommission} disabled={processing}>
               {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
               Update
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Kick Confirmation Dialog */}
       <Dialog open={actionDialog === 'kick'} onOpenChange={() => setActionDialog(null)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Remove from Program</DialogTitle>
             <DialogDescription>
               Are you sure you want to remove {selectedLink?.user_name} from the collab program? 
               This will delete their link and all referral data.
             </DialogDescription>
           </DialogHeader>
           <DialogFooter>
             <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
             <Button variant="destructive" onClick={handleKickFromProgram} disabled={processing}>
               {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
               Remove
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </AdminLayout>
   );
 };
 
 export default AdminCollabLinks;