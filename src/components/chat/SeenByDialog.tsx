 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { Check, CheckCheck } from 'lucide-react';
 
 interface SeenByMember {
   user_id: string;
   username: string | null;
   full_name: string | null;
   avatar_url: string | null;
 }
 
 interface SeenByDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   seenBy: string[];
   teamMembers: SeenByMember[];
   senderId: string;
 }
 
 const SeenByDialog = ({ open, onOpenChange, seenBy, teamMembers, senderId }: SeenByDialogProps) => {
   const seenMembers = teamMembers.filter(m => seenBy.includes(m.user_id) && m.user_id !== senderId);
   const unseenMembers = teamMembers.filter(m => !seenBy.includes(m.user_id) && m.user_id !== senderId);
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-xs">
         <DialogHeader>
           <DialogTitle className="text-base">Message Info</DialogTitle>
         </DialogHeader>
         
         <div className="space-y-4">
           {/* Seen By Section */}
           <div>
             <div className="flex items-center gap-2 mb-2">
               <CheckCheck className="h-4 w-4 text-blue-400" />
               <span className="text-sm font-medium text-muted-foreground">
                 Seen by ({seenMembers.length})
               </span>
             </div>
             {seenMembers.length === 0 ? (
               <p className="text-xs text-muted-foreground pl-6">No one has seen yet</p>
             ) : (
               <div className="space-y-2 pl-1">
                 {seenMembers.map(member => (
                   <div key={member.user_id} className="flex items-center gap-2">
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={member.avatar_url || ''} />
                       <AvatarFallback className="bg-primary/20 text-primary text-xs">
                         {(member.full_name || member.username || 'P').charAt(0).toUpperCase()}
                       </AvatarFallback>
                     </Avatar>
                     <span className="text-sm">{member.full_name || member.username || 'Player'}</span>
                   </div>
                 ))}
               </div>
             )}
           </div>
 
           {/* Not Seen Section */}
           {unseenMembers.length > 0 && (
             <div>
               <div className="flex items-center gap-2 mb-2">
                 <Check className="h-4 w-4 text-muted-foreground" />
                 <span className="text-sm font-medium text-muted-foreground">
                   Delivered to ({unseenMembers.length})
                 </span>
               </div>
               <div className="space-y-2 pl-1">
                 {unseenMembers.map(member => (
                   <div key={member.user_id} className="flex items-center gap-2">
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={member.avatar_url || ''} />
                       <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                         {(member.full_name || member.username || 'P').charAt(0).toUpperCase()}
                       </AvatarFallback>
                     </Avatar>
                     <span className="text-sm text-muted-foreground">{member.full_name || member.username || 'Player'}</span>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default SeenByDialog;