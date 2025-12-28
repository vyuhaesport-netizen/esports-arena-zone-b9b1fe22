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

// Import anime avatars
import animeSamurai from '@/assets/avatars/anime-samurai.png';
import animeNinja from '@/assets/avatars/anime-ninja.png';
import animeSorcerer from '@/assets/avatars/anime-sorcerer.png';
import animeDragonslayer from '@/assets/avatars/anime-dragonslayer.png';
import animeCommander from '@/assets/avatars/anime-commander.png';
import animeFiremage from '@/assets/avatars/anime-firemage.png';
import animeIcequeen from '@/assets/avatars/anime-icequeen.png';
import animeAssassin from '@/assets/avatars/anime-assassin.png';

// Import unlockable avatars (achievement rewards - now freely available)
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

// All avatars combined
export const allAvatars = [
  // Gaming Characters
  { id: 'warrior', src: avatar1, name: 'Cyber Warrior', category: 'gaming' },
  { id: 'ninja', src: avatar2, name: 'Shadow Ninja', category: 'gaming' },
  { id: 'mech', src: avatar3, name: 'Mech Soldier', category: 'gaming' },
  { id: 'skull', src: avatar4, name: 'Flame Skull', category: 'gaming' },
  { id: 'wolf', src: avatar5, name: 'Ice Wolf', category: 'gaming' },
  { id: 'dragon', src: avatar6, name: 'Fire Dragon', category: 'gaming' },
  { id: 'eagle', src: avatar7, name: 'Thunder Eagle', category: 'gaming' },
  { id: 'panther', src: avatar8, name: 'Neon Panther', category: 'gaming' },
  
  // Anime Characters
  { id: 'anime-samurai', src: animeSamurai, name: 'Dark Samurai', category: 'anime' },
  { id: 'anime-ninja', src: animeNinja, name: 'Red Ninja', category: 'anime' },
  { id: 'anime-sorcerer', src: animeSorcerer, name: 'Blue Sorcerer', category: 'anime' },
  { id: 'anime-dragonslayer', src: animeDragonslayer, name: 'Dragon Slayer', category: 'anime' },
  { id: 'anime-commander', src: animeCommander, name: 'Space Commander', category: 'anime' },
  { id: 'anime-firemage', src: animeFiremage, name: 'Fire Mage', category: 'anime' },
  { id: 'anime-icequeen', src: animeIcequeen, name: 'Ice Queen', category: 'anime' },
  { id: 'anime-assassin', src: animeAssassin, name: 'Skull Assassin', category: 'anime' },
  
  // Premium Characters (previously unlockable)
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
}

export const AvatarGallery = ({
  currentAvatarUrl,
  onSelect,
  disabled = false,
}: AvatarGalleryProps) => {
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = async (avatar: typeof allAvatars[0]) => {
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
    const srcFileName = src.split('/').pop()?.split('?')[0] || '';
    return currentAvatarUrl.includes(srcFileName);
  };

  const categories = [
    { key: 'gaming', label: 'Gaming Characters' },
    { key: 'anime', label: 'Anime Characters' },
    { key: 'premium', label: 'Premium Characters' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground font-medium">Choose your avatar:</p>
      
      {categories.map((category) => {
        const categoryAvatars = allAvatars.filter(a => a.category === category.key);
        
        return (
          <div key={category.key} className="space-y-2">
            <p className="text-xs text-muted-foreground">{category.label}</p>
            <div className="grid grid-cols-4 gap-2">
              {categoryAvatars.map((avatar) => {
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
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    
                    {/* Loading overlay */}
                    {isSelecting && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
