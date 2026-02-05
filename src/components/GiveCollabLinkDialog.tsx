 import { useState } from 'react';
 import { Button } from '@/components/ui/button';
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
 import { useToast } from '@/hooks/use-toast';
 import { useAuth } from '@/contexts/AuthContext';
 import { Loader2, Link2 } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
 
 interface GiveCollabLinkDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   userId: string;
   userType: 'organizer' | 'creator';
   userName: string;
 }
 
 const GiveCollabLinkDialog = ({ 
   open, 
   onOpenChange, 
   userId, 
   userType, 
   userName 
 }: GiveCollabLinkDialogProps) => {
   const [commission, setCommission] = useState('5');
   const [expiry, setExpiry] = useState('never');
   const [processing, setProcessing] = useState(false);
   const { toast } = useToast();
   const { user } = useAuth();
   const navigate = useNavigate();
 
   const generateLinkCode = () => {
     const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
     let result = '';
     for (let i = 0; i < 8; i++) {
       result += chars.charAt(Math.floor(Math.random() * chars.length));
     }
     return result;
   };
 
   const calculateExpiryDate = (expiryType: string): string | null => {
     if (expiryType === 'never') return null;
     
     const now = new Date();
     switch (expiryType) {
       case '30days':
         now.setDate(now.getDate() + 30);
         break;
       case '1year':
         now.setFullYear(now.getFullYear() + 1);
         break;
       case '10years':
         now.setFullYear(now.getFullYear() + 10);
         break;
       default:
         return null;
     }
     return now.toISOString();
   };
 
   const handleCreateLink = async () => {
     if (!user) return;
     
     const commissionAmount = parseFloat(commission);
     if (isNaN(commissionAmount) || commissionAmount < 0) {
       toast({ title: 'Invalid Amount', description: 'Please enter a valid commission amount', variant: 'destructive' });
       return;
     }
 
     setProcessing(true);
     try {
       // Check if user already has a link
       const { data: existingLink } = await supabase
         .from('collab_links')
         .select('id')
         .eq('user_id', userId)
         .maybeSingle();
 
       if (existingLink) {
         toast({ title: 'Already Has Link', description: 'This user already has a collab link', variant: 'destructive' });
         setProcessing(false);
         return;
       }
 
       const linkCode = generateLinkCode();
       const expiresAt = calculateExpiryDate(expiry);
 
       const { error } = await supabase
         .from('collab_links')
         .insert({
           user_id: userId,
           user_type: userType,
           link_code: linkCode,
           commission_per_registration: commissionAmount,
           expires_at: expiresAt,
           created_by: user.id,
         });
 
       if (error) throw error;
 
       toast({ title: 'Link Created', description: `Collab link created for ${userName}` });
       onOpenChange(false);
       navigate('/admin/collab-links');
     } catch (error) {
       console.error('Error:', error);
       toast({ title: 'Error', description: 'Failed to create collab link', variant: 'destructive' });
     } finally {
       setProcessing(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Link2 className="h-5 w-5" />
             Give Collab Link
           </DialogTitle>
           <DialogDescription>
             Create a referral link for {userName} ({userType})
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4 py-4">
           <div className="space-y-2">
             <Label>Commission per Qualified Registration (₹)</Label>
             <Input
               type="number"
               min="0"
               step="0.5"
               value={commission}
               onChange={(e) => setCommission(e.target.value)}
               placeholder="Enter amount"
             />
             <p className="text-xs text-muted-foreground">
               This amount will be credited when a referred user completes a tournament or deposits ₹50+
             </p>
           </div>
 
           <div className="space-y-2">
             <Label>Link Expiry</Label>
             <Select value={expiry} onValueChange={setExpiry}>
               <SelectTrigger>
                 <SelectValue placeholder="Select expiry" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="30days">30 Days</SelectItem>
                 <SelectItem value="1year">1 Year</SelectItem>
                 <SelectItem value="10years">10 Years</SelectItem>
                 <SelectItem value="never">Never Expires</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </div>
 
         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
           <Button onClick={handleCreateLink} disabled={processing}>
             {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
             Create Link
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default GiveCollabLinkDialog;