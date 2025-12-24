import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import all preset avatars
import avatar1 from '@/assets/avatars/avatar-1.png';
import avatar2 from '@/assets/avatars/avatar-2.png';
import avatar3 from '@/assets/avatars/avatar-3.png';
import avatar4 from '@/assets/avatars/avatar-4.png';
import avatar5 from '@/assets/avatars/avatar-5.png';
import avatar6 from '@/assets/avatars/avatar-6.png';
import avatar7 from '@/assets/avatars/avatar-7.png';
import avatar8 from '@/assets/avatars/avatar-8.png';

export const presetAvatars = [
  { id: 'warrior', src: avatar1, name: 'Cyber Warrior' },
  { id: 'ninja', src: avatar2, name: 'Shadow Ninja' },
  { id: 'mech', src: avatar3, name: 'Mech Soldier' },
  { id: 'skull', src: avatar4, name: 'Flame Skull' },
  { id: 'wolf', src: avatar5, name: 'Ice Wolf' },
  { id: 'dragon', src: avatar6, name: 'Fire Dragon' },
  { id: 'eagle', src: avatar7, name: 'Thunder Eagle' },
  { id: 'panther', src: avatar8, name: 'Neon Panther' },
];

interface PresetAvatarGalleryProps {
  currentAvatarUrl?: string | null;
  onSelect: (avatarUrl: string) => Promise<void>;
  disabled?: boolean;
}

export const PresetAvatarGallery = ({
  currentAvatarUrl,
  onSelect,
  disabled = false,
}: PresetAvatarGalleryProps) => {
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = async (avatar: typeof presetAvatars[0]) => {
    if (disabled || selecting) return;
    
    setSelecting(avatar.id);
    try {
      await onSelect(avatar.src);
    } finally {
      setSelecting(null);
    }
  };

  const isCurrentAvatar = (src: string) => {
    if (!currentAvatarUrl) return false;
    // Check if the current avatar URL contains the same filename
    return currentAvatarUrl.includes(src.split('/').pop() || '');
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Or choose a preset avatar:</p>
      <div className="grid grid-cols-4 gap-3">
        {presetAvatars.map((avatar) => {
          const isSelected = isCurrentAvatar(avatar.src);
          const isSelecting = selecting === avatar.id;
          
          return (
            <button
              key={avatar.id}
              onClick={() => handleSelect(avatar)}
              disabled={disabled || !!selecting}
              className={cn(
                "relative aspect-square rounded-full overflow-hidden border-2 transition-all",
                "hover:scale-105 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border",
                (disabled || selecting) && "opacity-50 cursor-not-allowed hover:scale-100"
              )}
              title={avatar.name}
            >
              <img
                src={avatar.src}
                alt={avatar.name}
                className="w-full h-full object-cover"
              />
              
              {/* Selection overlay */}
              {isSelected && !isSelecting && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}
              
              {/* Loading overlay */}
              {isSelecting && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
