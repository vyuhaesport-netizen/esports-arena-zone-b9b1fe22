import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import unique team mascot avatars
import phoenixTeam from '@/assets/team-avatars/phoenix-team.png';
import dragonTeam from '@/assets/team-avatars/dragon-team.png';
import lionTeam from '@/assets/team-avatars/lion-team.png';
import wolfTeam from '@/assets/team-avatars/wolf-team.png';
import cobraTeam from '@/assets/team-avatars/cobra-team.png';
import tigerTeam from '@/assets/team-avatars/tiger-team.png';
import eagleTeam from '@/assets/team-avatars/eagle-team.png';
import skullTeam from '@/assets/team-avatars/skull-team.png';

export const teamAvatars = [
  { id: 'phoenix', src: phoenixTeam, name: 'Phoenix' },
  { id: 'dragon', src: dragonTeam, name: 'Dragon' },
  { id: 'lion', src: lionTeam, name: 'Lion' },
  { id: 'wolf', src: wolfTeam, name: 'Wolf' },
  { id: 'cobra', src: cobraTeam, name: 'Cobra' },
  { id: 'tiger', src: tigerTeam, name: 'Tiger' },
  { id: 'eagle', src: eagleTeam, name: 'Eagle' },
  { id: 'skull', src: skullTeam, name: 'Skull' },
];

interface TeamAvatarGalleryProps {
  currentAvatarUrl?: string | null;
  onSelect: (avatarUrl: string) => Promise<void>;
  disabled?: boolean;
}

export const TeamAvatarGallery = ({
  currentAvatarUrl,
  onSelect,
  disabled = false,
}: TeamAvatarGalleryProps) => {
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = async (avatar: typeof teamAvatars[0]) => {
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
    const srcFileName = src.split('/').pop()?.split('?')[0] || '';
    return currentAvatarUrl.includes(srcFileName);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-center">Choose Team Logo</p>
      
      <div className="grid grid-cols-4 gap-3">
        {teamAvatars.map((avatar) => {
          const isSelected = isCurrentAvatar(avatar.src);
          const isSelecting = selecting === avatar.id;
          
          return (
            <button
              key={avatar.id}
              onClick={() => handleSelect(avatar)}
              disabled={disabled || !!selecting}
              className={cn(
                "relative aspect-square rounded-full overflow-hidden border-2 transition-all duration-300",
                "hover:scale-105 hover:border-primary hover:shadow-lg hover:shadow-primary/20",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected ? "border-primary ring-2 ring-primary ring-offset-2 shadow-lg shadow-primary/30" : "border-border",
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
                <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}
              
              {/* Loading overlay */}
              {isSelecting && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        Tap to select your team's logo
      </p>
    </div>
  );
};
