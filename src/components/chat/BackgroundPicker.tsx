import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

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
    preview: 'bg-gradient-to-br from-slate-900 to-slate-800',
  },
  {
    id: 'neon-storm',
    name: 'Neon Storm',
    style: 'bg-gradient-to-br from-violet-950 via-fuchsia-900/40 to-cyan-900/30',
    preview: 'bg-gradient-to-br from-violet-900 via-fuchsia-800/60 to-cyan-800/40',
  },
  {
    id: 'cyber-matrix',
    name: 'Cyber Matrix',
    style: 'bg-gradient-to-b from-emerald-950/80 via-slate-950 to-emerald-950/60',
    preview: 'bg-gradient-to-br from-emerald-900/80 via-slate-900 to-emerald-800/60',
  },
  {
    id: 'fire-rage',
    name: 'Fire Rage',
    style: 'bg-gradient-to-br from-orange-950/70 via-red-950/50 to-amber-950/40',
    preview: 'bg-gradient-to-br from-orange-800/70 via-red-900/60 to-amber-800/50',
  },
  {
    id: 'ice-dragon',
    name: 'Ice Dragon',
    style: 'bg-gradient-to-br from-blue-950/80 via-cyan-950/50 to-sky-950/60',
    preview: 'bg-gradient-to-br from-blue-800/80 via-cyan-900/60 to-sky-800/60',
  },
  {
    id: 'shadow-realm',
    name: 'Shadow Realm',
    style: 'bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950',
    preview: 'bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-900',
  },
  {
    id: 'golden-legend',
    name: 'Golden Legend',
    style: 'bg-gradient-to-br from-amber-950/60 via-yellow-950/30 to-orange-950/40',
    preview: 'bg-gradient-to-br from-amber-800/60 via-yellow-900/40 to-orange-800/50',
  },
  {
    id: 'blood-moon',
    name: 'Blood Moon',
    style: 'bg-gradient-to-br from-rose-950/70 via-red-950/60 to-pink-950/40',
    preview: 'bg-gradient-to-br from-rose-800/70 via-red-900/60 to-pink-900/50',
  },
  {
    id: 'void-abyss',
    name: 'Void Abyss',
    style: 'bg-gradient-to-br from-indigo-950/80 via-slate-950 to-violet-950/60',
    preview: 'bg-gradient-to-br from-indigo-900/80 via-slate-900 to-violet-900/60',
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
          <DialogTitle className="text-base">Choose Wallpaper</DialogTitle>
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
                "aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all relative",
                currentBackground === bg.id
                  ? "border-primary ring-2 ring-primary/40 scale-[1.02]"
                  : "border-border/50 hover:border-primary/50 hover:scale-[1.02]"
              )}
            >
              <div className={cn("h-full w-full flex items-end p-1.5", bg.preview)}>
                <span className="text-[9px] text-white font-semibold bg-black/50 px-2 py-0.5 rounded-full truncate w-full text-center">
                  {bg.name}
                </span>
              </div>
              {currentBackground === bg.id && (
                <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
        
        <p className="text-[11px] text-muted-foreground text-center mt-3">
          Your wallpaper is saved automatically
        </p>
      </DialogContent>
    </Dialog>
  );
};

export { BACKGROUNDS };
export default BackgroundPicker;