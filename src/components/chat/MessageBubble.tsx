 import { useState } from 'react';
 import { Check, CheckCheck, Reply, Trash2, Pencil, MoreVertical, Copy, Smile, X, Eye } from 'lucide-react';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
   DropdownMenuSeparator,
 } from '@/components/ui/dropdown-menu';
 import { format } from 'date-fns';
 import { cn } from '@/lib/utils';
 
 interface MessageBubbleProps {
   id: string;
   content: string;
   senderId: string;
   senderName: string;
   senderAvatar?: string;
   timestamp: string;
   isOwn: boolean;
   isEdited?: boolean;
   seenCount?: number;
   totalMembers?: number;
   replyTo?: {
     senderName: string;
     content: string;
   } | null;
   reactions?: Record<string, string[]>;
   canModify?: boolean;
   onReply: () => void;
   onEdit: () => void;
   onDelete: () => void;
   onReact?: (emoji: string) => void;
   onViewSeenBy?: () => void;
   isEditing?: boolean;
   editContent?: string;
   onEditChange?: (value: string) => void;
   onEditSave?: () => void;
   onEditCancel?: () => void;
 }
 
 const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];
 
 const MessageBubble = ({
   id: _id,
   content,
   senderId: _senderId,
   senderName,
   senderAvatar,
   timestamp,
   isOwn,
   isEdited,
   seenCount = 0,
   totalMembers = 0,
   replyTo,
   reactions = {},
   canModify,
   onReply,
   onEdit,
   onDelete,
   onReact,
   onViewSeenBy,
   isEditing,
   editContent,
   onEditChange,
   onEditSave,
   onEditCancel,
 }: MessageBubbleProps) => {
   const [showReactions, setShowReactions] = useState(false);
 
   // All members seen (excluding sender) = total - 1 (sender)
   const allSeen = totalMembers > 1 && seenCount >= totalMembers - 1;
 
   const getTickColor = () => {
     if (allSeen) return 'text-blue-400';
     if (seenCount > 0) return 'text-blue-400';
     return 'text-muted-foreground';
   };
 
   const groupedReactions = Object.entries(reactions).filter(([_, users]) => users.length > 0);
 
   return (
     <div
       className={cn(
         "flex gap-2 group relative px-3 py-1",
         isOwn ? "flex-row-reverse" : ""
       )}
     >
       {/* Avatar - only for others */}
       {!isOwn && (
         <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5 border-2 border-primary/30">
           <AvatarImage src={senderAvatar || ''} />
           <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
             {senderName.charAt(0).toUpperCase()}
           </AvatarFallback>
         </Avatar>
       )}
 
       <div className={cn("max-w-[75%] min-w-[80px]", isOwn ? "items-end" : "items-start")}>
         {/* Sender name for others */}
         {!isOwn && (
           <span className="text-xs font-bold text-primary ml-2 mb-0.5 block">
             {senderName}
           </span>
         )}
 
         {/* Reply preview */}
         {replyTo && (
           <div 
             className={cn(
               "flex items-start gap-1 mb-1 px-2 py-1 rounded-lg",
               isOwn ? "bg-white/10" : "bg-muted"
             )}
           >
             <div className={cn(
               "w-0.5 h-6 rounded-full",
               isOwn ? "bg-white/50" : "bg-primary"
             )} />
             <div className="text-[11px] leading-tight">
               <span className={cn(
                 "font-bold block",
                 isOwn ? "text-white/80" : "text-primary"
               )}>
                 {replyTo.senderName}
               </span>
               <span className={cn(
                 "line-clamp-1",
                 isOwn ? "text-white/60" : "text-muted-foreground"
               )}>{replyTo.content}</span>
             </div>
           </div>
         )}
 
         {/* Message Bubble */}
         <div className="relative">
           {isEditing ? (
             <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl p-1">
               <Input
                 value={editContent}
                 onChange={(e) => onEditChange?.(e.target.value)}
                 className="flex-1 h-8 text-xs border-0 bg-transparent"
                 autoFocus
               />
               <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditSave}>
                 <Check className="h-4 w-4 text-green-500" />
               </Button>
               <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditCancel}>
                 <X className="h-4 w-4 text-destructive" />
               </Button>
             </div>
           ) : (
             <div
               className={cn(
                 "relative px-3 py-2 rounded-2xl",
                 isOwn
                   ? "bg-primary text-primary-foreground rounded-br-sm shadow-md"
                   : "bg-card/90 border border-border text-foreground rounded-bl-sm shadow-sm"
               )}
             >
               {/* Message Content */}
               <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                 {content}
               </p>
 
               {/* Time & Status Row */}
               <div className={cn(
                 "flex items-center gap-1 mt-1 justify-end",
                 isOwn ? "text-white/70" : "text-muted-foreground"
               )}>
                 <span className="text-[10px]">
                   {format(new Date(timestamp), 'h:mm a')}
                 </span>
                 {isEdited && (
                   <span className="text-[9px] italic">edited</span>
                 )}
                 {isOwn && (
                   <span className={cn("flex items-center", getTickColor())}>
                     {allSeen ? (
                       <CheckCheck className="h-3.5 w-3.5" />
                     ) : seenCount > 0 ? (
                       <CheckCheck className="h-3.5 w-3.5" />
                     ) : (
                       <Check className="h-3 w-3" />
                     )}
                   </span>
                 )}
               </div>
             </div>
           )}
 
           {/* Reactions Display */}
           {groupedReactions.length > 0 && (
             <div className={cn(
               "flex flex-wrap gap-1 mt-1",
               isOwn ? "justify-end" : "justify-start"
             )}>
               {groupedReactions.map(([emoji, users]) => (
                 <button
                   key={emoji}
                   className="flex items-center gap-0.5 bg-muted border border-border rounded-full px-1.5 py-0.5 text-xs"
                   onClick={() => onReact?.(emoji)}
                 >
                   <span>{emoji}</span>
                   {users.length > 1 && <span className="text-[10px] text-muted-foreground">{users.length}</span>}
                 </button>
               ))}
             </div>
           )}
 
           {/* Quick Reactions Bar */}
           {showReactions && (
             <div className={cn(
               "absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150"
             )}>
               {QUICK_REACTIONS.map((emoji) => (
                 <button
                   key={emoji}
                   className="text-lg hover:scale-110 transition-transform"
                   onClick={() => {
                     onReact?.(emoji);
                     setShowReactions(false);
                   }}
                 >
                   {emoji}
                 </button>
               ))}
             </div>
           )}
         </div>
 
         {/* Hover Actions */}
         {!isEditing && (
           <div className={cn(
             "flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
             isOwn ? "justify-end" : "justify-start"
           )}>
             <Button
               size="icon"
               variant="ghost"
               className="h-7 w-7"
               onClick={onReply}
             >
               <Reply className="h-4 w-4" />
             </Button>
             <Button
               size="icon"
               variant="ghost"
               className="h-7 w-7"
               onClick={() => setShowReactions(true)}
             >
               <Smile className="h-4 w-4" />
             </Button>
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button size="icon" variant="ghost" className="h-7 w-7">
                   <MoreVertical className="h-4 w-4" />
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-36">
                 <DropdownMenuItem onClick={() => navigator.clipboard.writeText(content)}>
                   <Copy className="h-4 w-4 mr-2" /> Copy
                 </DropdownMenuItem>
                 {isOwn && onViewSeenBy && (
                   <DropdownMenuItem onClick={onViewSeenBy}>
                     <Eye className="h-4 w-4 mr-2" /> Seen By
                   </DropdownMenuItem>
                 )}
                 {canModify && (
                   <>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={onEdit}>
                       <Pencil className="h-4 w-4 mr-2" /> Edit
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={onDelete} className="text-destructive">
                       <Trash2 className="h-4 w-4 mr-2" /> Delete
                     </DropdownMenuItem>
                   </>
                 )}
               </DropdownMenuContent>
             </DropdownMenu>
           </div>
         )}
       </div>
     </div>
   );
 };
 
 export default MessageBubble;