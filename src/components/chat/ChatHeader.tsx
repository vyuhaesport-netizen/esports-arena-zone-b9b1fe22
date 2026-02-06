import { ArrowLeft, MoreVertical, Users, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  teamName: string;
  memberCount: number;
  teamAvatars: string[];
  onBack: () => void;
  onViewMembers?: () => void;
  isOnline?: boolean;
  onChangeBackground?: () => void;
}
 
 const ChatHeader = ({
   teamName,
   memberCount,
   teamAvatars,
   onBack,
   onViewMembers,
   onSearch,
   isOnline = true,
   onChangeBackground,
  onLoadMockData,
 }: ChatHeaderProps) => {
   return (
     <header className="sticky top-0 z-50 bg-background border-b border-border">
       <div className="flex items-center gap-2 px-2 py-2.5">
         <Button
           variant="ghost"
           size="icon"
           className="h-9 w-9 text-foreground hover:bg-muted shrink-0"
           onClick={onBack}
         >
           <ArrowLeft className="h-5 w-5" />
         </Button>
 
         {/* Team Avatar Stack */}
         <div className="relative flex items-center cursor-pointer" onClick={onViewMembers}>
           <div className="flex -space-x-2">
             {teamAvatars.slice(0, 3).map((url, i) => (
               <Avatar key={i} className="h-9 w-9 border-2 border-background ring-2 ring-primary/50">
                 <AvatarImage src={url} />
                 <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                   {String.fromCharCode(65 + i)}
                 </AvatarFallback>
               </Avatar>
             ))}
             {teamAvatars.length === 0 && (
               <Avatar className="h-9 w-9 border-2 border-background">
                 <AvatarFallback className="bg-primary/20 text-primary">
                   <Users className="h-4 w-4" />
                 </AvatarFallback>
               </Avatar>
             )}
           </div>
           {isOnline && (
             <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 border-2 border-background rounded-full animate-pulse" />
           )}
         </div>
 
         {/* Team Info */}
         <div className="flex-1 min-w-0 ml-1 cursor-pointer" onClick={onViewMembers}>
           <h1 className="text-base font-bold truncate leading-tight text-foreground">{teamName}</h1>
           <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
             <span className="flex items-center gap-1">
               <Users className="h-3 w-3" />
               {memberCount} {memberCount === 1 ? 'member' : 'members'}
             </span>
             {isOnline && (
               <>
                 <span>•</span>
                 <span className="text-green-500">online</span>
               </>
             )}
           </div>
         </div>
 
         {/* Action Buttons */}
         <div className="flex items-center gap-0.5">
           <Button
             variant="ghost"
             size="icon"
             className="h-9 w-9 text-foreground hover:bg-muted"
             onClick={onSearch}
           >
             <Search className="h-5 w-5" />
           </Button>
 
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button
                 variant="ghost"
                 size="icon"
                 className="h-9 w-9 text-foreground hover:bg-muted"
               >
                 <MoreVertical className="h-5 w-5" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-48">
               <DropdownMenuItem onClick={onViewMembers}>
                 <Users className="h-4 w-4 mr-2" />
                 View Members
               </DropdownMenuItem>
               <DropdownMenuItem onClick={onSearch}>
                 <Search className="h-4 w-4 mr-2" />
                 Search Messages
               </DropdownMenuItem>
               <DropdownMenuSeparator />
               <DropdownMenuItem onClick={onChangeBackground}>
                 <Palette className="h-4 w-4 mr-2" />
                 Change Wallpaper
               </DropdownMenuItem>
               <DropdownMenuSeparator />
               <DropdownMenuItem onClick={onLoadMockData}>
                 <FlaskConical className="h-4 w-4 mr-2" />
                 Load Test Data (50 msgs)
               </DropdownMenuItem>
               <DropdownMenuSeparator />
               <DropdownMenuItem>
                 Mute Notifications
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
       </div>
     </header>
   );
 };
 
 export default ChatHeader;