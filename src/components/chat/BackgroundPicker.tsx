 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { cn } from '@/lib/utils';
 
 interface BackgroundOption {
   id: string;
   name: string;
   style: string;
   preview: string;
 }
 
 const BACKGROUNDS: BackgroundOption[] = [
   {
     id: 'default',
     name: 'Default',
     style: 'bg-background',
     preview: 'bg-background',
   },
   {
     id: 'gaming-dark',
     name: 'Gaming Dark',
     style: 'bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900',
     preview: 'bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-900',
   },
   {
     id: 'neon-grid',
     name: 'Neon Grid',
     style: 'bg-slate-950',
     preview: 'bg-gradient-to-br from-cyan-900/30 to-purple-900/30',
   },
   {
     id: 'cyber-blue',
     name: 'Cyber Blue',
     style: 'bg-gradient-to-b from-blue-950 via-slate-900 to-blue-950',
     preview: 'bg-gradient-to-br from-blue-950 via-slate-900 to-blue-950',
   },
   {
     id: 'fire-red',
     name: 'Fire Red',
     style: 'bg-gradient-to-b from-red-950/50 via-slate-900 to-red-950/50',
     preview: 'bg-gradient-to-br from-red-900/50 via-slate-900 to-red-900/50',
   },
   {
     id: 'matrix',
     name: 'Matrix',
     style: 'bg-gradient-to-b from-green-950/40 via-slate-950 to-green-950/40',
     preview: 'bg-gradient-to-br from-green-900/40 via-slate-950 to-green-900/40',
   },
 ];
 
 interface BackgroundPickerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   currentBackground: string;
   onSelectBackground: (backgroundId: string) => void;
 }
 
 const BackgroundPicker = ({ open, onOpenChange, currentBackground, onSelectBackground }: BackgroundPickerProps) => {
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-sm">
         <DialogHeader>
           <DialogTitle className="text-base">Chat Wallpaper</DialogTitle>
         </DialogHeader>
         
         <div className="grid grid-cols-3 gap-3 mt-2">
           {BACKGROUNDS.map(bg => (
             <button
               key={bg.id}
               onClick={() => {
                 onSelectBackground(bg.id);
                 onOpenChange(false);
               }}
               className={cn(
                 "aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all",
                 currentBackground === bg.id
                   ? "border-primary ring-2 ring-primary/30"
                   : "border-border hover:border-primary/50"
               )}
             >
               <div className={cn("h-full w-full flex items-end p-1.5", bg.preview)}>
                 <span className="text-[10px] text-white/80 font-medium bg-black/40 px-1.5 py-0.5 rounded-full">
                   {bg.name}
                 </span>
               </div>
             </button>
           ))}
         </div>
         
         <p className="text-[11px] text-muted-foreground text-center mt-2">
           Wallpaper applies to all team members
         </p>
       </DialogContent>
     </Dialog>
   );
 };
 
 export { BACKGROUNDS };
 export default BackgroundPicker;