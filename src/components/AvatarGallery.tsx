import { useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import anime avatars
import animeSamurai from '@/assets/avatars/anime-samurai.png';
import animeNinja from '@/assets/avatars/anime-ninja.png';
import animeSorcerer from '@/assets/avatars/anime-sorcerer.png';
import animeDragonslayer from '@/assets/avatars/anime-dragonslayer.png';
import animeCommander from '@/assets/avatars/anime-commander.png';
import animeFiremage from '@/assets/avatars/anime-firemage.png';
import animeIcequeen from '@/assets/avatars/anime-icequeen.png';
import animeAssassin from '@/assets/avatars/anime-assassin.png';
import animeWarrior from '@/assets/avatars/anime-warrior.png';
import animeDemonhunter from '@/assets/avatars/anime-demonhunter.png';
import animeLightningmage from '@/assets/avatars/anime-lightningmage.png';
import animeRogue from '@/assets/avatars/anime-rogue.png';
import animeAngel from '@/assets/avatars/anime-angel.png';
import animeVampire from '@/assets/avatars/anime-vampire.png';
import animeHacker from '@/assets/avatars/anime-hacker.png';
import animeKitsune from '@/assets/avatars/anime-kitsune.png';

// Import premium avatars
import championGold from '@/assets/avatars/unlockable/champion-gold.png';
import legendaryPhoenix from '@/assets/avatars/unlockable/legendary-phoenix.png';
import eliteDragon from '@/assets/avatars/unlockable/elite-dragon.png';
import masterTitan from '@/assets/avatars/unlockable/master-titan.png';
import starterWarrior from '@/assets/avatars/unlockable/starter-warrior.png';
import veteranSoldier from '@/assets/avatars/unlockable/veteran-soldier.png';
import dedicatedLegend from '@/assets/avatars/unlockable/dedicated-legend.png';
import goldChampion from '@/assets/avatars/unlockable/gold-champion.png';
import silverKnight from '@/assets/avatars/unlockable/silver-knight.png';
import localHero from '@/assets/avatars/unlockable/local-hero.png';

// All avatars - quick selection (subset for profile dialog)
export const quickAvatars = [
  { id: 'anime-samurai', src: animeSamurai, name: 'Dark Samurai', animated: true },
  { id: 'anime-ninja', src: animeNinja, name: 'Red Ninja', animated: true },
  { id: 'anime-sorcerer', src: animeSorcerer, name: 'Blue Sorcerer', animated: true },
  { id: 'anime-warrior', src: animeWarrior, name: 'Blade Warrior', animated: true },
  { id: 'anime-firemage', src: animeFiremage, name: 'Fire Mage', animated: false },
  { id: 'anime-icequeen', src: animeIcequeen, name: 'Ice Queen', animated: false },
  { id: 'anime-angel', src: animeAngel, name: 'Divine Angel', animated: false },
  { id: 'champion-gold', src: championGold, name: 'Gold Champion', animated: false },
];

// All avatars for full gallery
export const allAvatars = [
  // Anime Characters
  { id: 'anime-samurai', src: animeSamurai, name: 'Dark Samurai', category: 'warriors' },
  { id: 'anime-ninja', src: animeNinja, name: 'Red Ninja', category: 'assassins' },
  { id: 'anime-sorcerer', src: animeSorcerer, name: 'Blue Sorcerer', category: 'mages' },
  { id: 'anime-dragonslayer', src: animeDragonslayer, name: 'Dragon Slayer', category: 'warriors' },
  { id: 'anime-commander', src: animeCommander, name: 'Space Commander', category: 'legends' },
  { id: 'anime-firemage', src: animeFiremage, name: 'Fire Mage', category: 'mages' },
  { id: 'anime-icequeen', src: animeIcequeen, name: 'Ice Queen', category: 'mages' },
  { id: 'anime-assassin', src: animeAssassin, name: 'Skull Assassin', category: 'assassins' },
  { id: 'anime-warrior', src: animeWarrior, name: 'Blade Warrior', category: 'warriors' },
  { id: 'anime-demonhunter', src: animeDemonhunter, name: 'Demon Hunter', category: 'warriors' },
  { id: 'anime-lightningmage', src: animeLightningmage, name: 'Storm Mage', category: 'mages' },
  { id: 'anime-rogue', src: animeRogue, name: 'Shadow Rogue', category: 'assassins' },
  { id: 'anime-angel', src: animeAngel, name: 'Divine Angel', category: 'legends' },
  { id: 'anime-vampire', src: animeVampire, name: 'Blood Lord', category: 'assassins' },
  { id: 'anime-hacker', src: animeHacker, name: 'Neon Hacker', category: 'legends' },
  { id: 'anime-kitsune', src: animeKitsune, name: 'Spirit Fox', category: 'legends' },
  
  // Premium Characters
  { id: 'champion-gold', src: championGold, name: 'Gold Champion', category: 'premium' },
  { id: 'legendary-phoenix', src: legendaryPhoenix, name: 'Legendary Phoenix', category: 'premium' },
  { id: 'elite-dragon', src: eliteDragon, name: 'Elite Dragon', category: 'premium' },
  { id: 'master-titan', src: masterTitan, name: 'Master Titan', category: 'premium' },
  { id: 'starter-warrior', src: starterWarrior, name: 'Starter Warrior', category: 'premium' },
  { id: 'veteran-soldier', src: veteranSoldier, name: 'Veteran Soldier', category: 'premium' },
  { id: 'dedicated-legend', src: dedicatedLegend, name: 'Dedicated Legend', category: 'premium' },
  { id: 'gold-champion', src: goldChampion, name: 'Gold Knight', category: 'premium' },
  { id: 'silver-knight', src: silverKnight, name: 'Silver Knight', category: 'premium' },
  { id: 'local-hero', src: localHero, name: 'Local Hero', category: 'premium' },
];

interface AvatarGalleryProps {
  currentAvatarUrl?: string | null;
  onSelect: (avatarUrl: string) => Promise<void>;
  disabled?: boolean;
  onViewAll?: () => void;
}

export const AvatarGallery = ({
  currentAvatarUrl,
  onSelect,
  disabled = false,
  onViewAll,
}: AvatarGalleryProps) => {
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = async (avatar: typeof quickAvatars[0]) => {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <p className="text-sm font-medium">Select Avatar</p>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-primary hover:underline font-medium"
          >
            View All ({allAvatars.length}) →
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {quickAvatars.map((avatar, index) => {
          const isSelected = isCurrentAvatar(avatar.src);
          const isSelecting = selecting === avatar.id;
          const isAnimated = avatar.animated;
          
          return (
            <button
              key={avatar.id}
              onClick={() => handleSelect(avatar)}
              disabled={disabled || !!selecting}
              className={cn(
                "relative aspect-square rounded-full overflow-hidden border-2 transition-all duration-300",
                "hover:scale-110 hover:border-primary hover:shadow-lg hover:shadow-primary/20",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isSelected ? "border-primary ring-2 ring-primary ring-offset-2 shadow-lg shadow-primary/30" : "border-border",
                (disabled || selecting) && "opacity-50 cursor-not-allowed hover:scale-100",
                isAnimated && !isSelected && "animate-[pulse_2s_ease-in-out_infinite]"
              )}
              style={{
                animationDelay: isAnimated ? `${index * 0.2}s` : undefined,
              }}
              title={avatar.name}
            >
              {/* Animated glow ring for first 4 avatars */}
              {isAnimated && (
                <div 
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/50 via-purple-500/50 to-pink-500/50 animate-spin opacity-0 hover:opacity-100 transition-opacity"
                  style={{ 
                    animationDuration: '3s',
                    filter: 'blur(4px)',
                    transform: 'scale(1.1)',
                  }}
                />
              )}
              
              <img
                src={avatar.src}
                alt={avatar.name}
                className={cn(
                  "w-full h-full object-cover relative z-10 transition-transform duration-300",
                  isAnimated && "hover:scale-110"
                )}
              />
              
              {/* Sparkle indicator for animated avatars */}
              {isAnimated && !isSelected && !isSelecting && (
                <div className="absolute top-0 right-0 z-20">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                </div>
              )}
              
              {/* Selection overlay */}
              {isSelected && !isSelecting && (
                <div className="absolute inset-0 bg-primary/30 flex items-center justify-center z-20">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}
              
              {/* Loading overlay */}
              {isSelecting && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-20">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        ✨ Featured avatars have special animations
      </p>
    </div>
  );
};
