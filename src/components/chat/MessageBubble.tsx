import { useRef, useEffect } from 'react';
import { Check, CheckCheck, Reply, Trash2, Pencil, MoreVertical, Copy, Eye, X } from 'lucide-react';
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
  canModify?: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewSeenBy?: () => void;
  isEditing?: boolean;
  editContent?: string;
  onEditChange?: (value: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
}

// Unique colors for different team members to easily identify who sent what
const MEMBER_COLORS = [
  'bg-emerald-600',
  'bg-sky-600', 
  'bg-amber-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-teal-600',
  'bg-orange-600',
  'bg-pink-600',
];

// Generate consistent color based on sender name
const getSenderColor = (senderName: string): string => {
  let hash = 0;
  for (let i = 0; i < senderName.length; i++) {
    hash = senderName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
};
 
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
  canModify,
  onReply,
  onEdit,
  onDelete,
  onViewSeenBy,
  isEditing,
  editContent,
  onEditChange,
  onEditSave,
  onEditCancel,
}: MessageBubbleProps) => {
  const actionsRef = useRef<HTMLDivElement>(null);

   // All members seen (excluding sender) = total - 1 (sender)
   const allSeen = totalMembers > 1 && seenCount >= totalMembers - 1;
 
   const getTickColor = () => {
     if (allSeen) return 'text-blue-400';
     if (seenCount > 0) return 'text-blue-400';
     return 'text-muted-foreground';
   };
 
  // Get unique color for this sender
  const senderColor = getSenderColor(senderName);
 
  return (
    <div
      className={cn(
        "flex gap-2 group relative px-3 py-1.5",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar - only for others (LEFT side) */}
      {!isOwn && (
        <Avatar className={cn("h-8 w-8 flex-shrink-0 mt-0.5 ring-2", `ring-${senderColor.replace('bg-', '')}`)}>
          <AvatarImage src={senderAvatar || ''} />
          <AvatarFallback className={cn(senderColor, "text-white text-xs font-bold")}>
            {senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("max-w-[75%] min-w-[80px] flex flex-col", isOwn ? "items-end" : "items-start")}>
        {/* Sender name for others (LEFT side messages) */}
        {!isOwn && (
          <span className={cn("text-xs font-bold ml-2 mb-0.5", senderColor.replace('bg-', 'text-'))}>
            {senderName}
          </span>
        )}

        {/* Reply preview */}
        {replyTo && (
          <div 
            className={cn(
              "flex items-start gap-1 mb-1 px-2 py-1 rounded-lg w-full",
              isOwn ? "bg-white/10" : "bg-muted"
            )}
          >
            <div className={cn(
              "w-0.5 h-6 rounded-full flex-shrink-0",
              isOwn ? "bg-white/50" : "bg-primary"
            )} />
            <div className="text-[11px] leading-tight min-w-0">
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
        <div className="relative" ref={actionsRef}>
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
                  ? "bg-gaming-purple rounded-br-sm shadow-md"
                  : "bg-card/90 border border-border rounded-bl-sm shadow-sm"
              )}
            >
              {/* Message Content */}
              <p className={cn("text-sm leading-relaxed break-words whitespace-pre-wrap", isOwn ? "text-white" : "text-foreground")}>
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
         </div>
 
        {/* Action Buttons */}
        {!isEditing && (
          <div className={cn(
            "flex items-center gap-0.5 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onReply}
            >
              <Reply className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground">
                  <MoreVertical className="h-3.5 w-3.5" />
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