import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Users, 
  Wallet,
  Gamepad2,
  Share2,
  Calendar,
  BadgeCheck,
  Eye
} from 'lucide-react';

interface Tournament {
  id: string;
  title: string;
  game: string;
  prize_pool: string | null;
  entry_fee: number | null;
  start_date: string;
  status: string | null;
  max_participants: number | null;
  tournament_type: string;
  joined_users: string[] | null;
  current_prize_pool: number | null;
  tournament_mode: string | null;
  image_url?: string | null;
  room_id?: string | null;
  room_password?: string | null;
  prize_distribution?: any;
}

interface TournamentCardProps {
  tournament: Tournament;
  isJoined?: boolean;
  onJoinClick?: () => void;
  onShareClick?: () => void;
  onExitClick?: () => void;
  onPrizeClick?: () => void;
  isLoading?: boolean;
  variant?: 'organizer' | 'creator';
  showRoomDetails?: boolean;
}

const TournamentCard = ({
  tournament,
  isJoined = false,
  onJoinClick,
  onShareClick,
  onExitClick,
  onPrizeClick,
  isLoading = false,
  variant = 'organizer',
  showRoomDetails = false,
}: TournamentCardProps) => {
  const spotsLeft = (tournament.max_participants || 100) - (tournament.joined_users?.length || 0);
  const prizeAmount = tournament.prize_pool || `₹${tournament.current_prize_pool || 0}`;
  const entryFee = tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free';
  const isOfficial = tournament.tournament_type === 'organizer';
  
  const getStatusColor = () => {
    switch (tournament.status) {
      case 'upcoming':
        return 'bg-emerald-500/90 text-white';
      case 'ongoing':
        return 'bg-amber-500/90 text-white';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-emerald-500/90 text-white';
    }
  };

  const getModeColor = () => {
    return variant === 'creator' 
      ? 'bg-purple-500/90 text-white' 
      : 'bg-gaming-orange/90 text-white';
  };

  return (
    <div className="bg-card rounded-xl shadow-md overflow-hidden border border-border/50 hover:shadow-lg transition-shadow duration-300">
      {/* Banner Image Area */}
      <div className="relative aspect-video bg-gradient-to-br from-secondary via-muted to-accent rounded-t-xl overflow-hidden">
        {tournament.image_url ? (
          <img 
            src={tournament.image_url} 
            alt={tournament.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            variant === 'creator' 
              ? 'bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-purple-400/20' 
              : 'bg-gradient-to-br from-gaming-orange/20 via-amber-500/10 to-yellow-400/20'
          }`}>
            <Gamepad2 className={`h-16 w-16 ${
              variant === 'creator' ? 'text-purple-500/40' : 'text-gaming-orange/40'
            }`} />
          </div>
        )}
        
        {/* Overlay Badges */}
        <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
          <div className="flex items-start justify-between">
            {/* Format Badge - Top Left */}
            <Badge className={`${getModeColor()} text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 shadow-sm`}>
              {tournament.tournament_mode || 'Solo'}
            </Badge>
            
            {/* Status Badge - Top Right */}
            <Badge className={`${getStatusColor()} text-[10px] font-semibold capitalize px-2.5 py-1 shadow-sm`}>
              {tournament.status || 'Upcoming'}
            </Badge>
          </div>
          
          {/* Share Button - Floating Right */}
          <div className="flex justify-end">
            <button 
              onClick={onShareClick}
              className="pointer-events-auto p-2 rounded-full bg-card/90 backdrop-blur-sm hover:bg-card shadow-md transition-colors"
            >
              <Share2 className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-gaming font-bold text-base text-foreground truncate flex-1">
              {tournament.title}
            </h3>
            {isOfficial && (
              <Badge className="bg-gaming-orange/10 text-gaming-orange border-gaming-orange/20 text-[10px] font-medium px-2 py-0.5 flex items-center gap-1 shrink-0">
                <BadgeCheck className="h-3 w-3" />
                Official
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{tournament.game}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2.5 bg-secondary/50 rounded-lg">
            <div className="p-1.5 bg-amber-500/10 rounded-md">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Prize</p>
              <p className="text-sm font-semibold text-foreground">{prizeAmount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2.5 bg-secondary/50 rounded-lg">
            <div className="p-1.5 bg-emerald-500/10 rounded-md">
              <Wallet className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Entry</p>
              <p className="text-sm font-semibold text-foreground">{entryFee}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2.5 bg-secondary/50 rounded-lg">
            <div className="p-1.5 bg-blue-500/10 rounded-md">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Spots</p>
              <p className="text-sm font-semibold text-foreground">{spotsLeft} left</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2.5 bg-secondary/50 rounded-lg">
            <div className="p-1.5 bg-purple-500/10 rounded-md">
              <Calendar className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</p>
              <p className="text-sm font-semibold text-foreground">
                {format(new Date(tournament.start_date), 'MMM dd')}
              </p>
            </div>
          </div>
        </div>

        {/* Room Details - Only for joined users near match time */}
        {isJoined && showRoomDetails && tournament.room_id && (
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
              <Eye className="h-4 w-4" />
              <span>Room: {tournament.room_id}</span>
              {tournament.room_password && (
                <span className="text-muted-foreground">| Pass: {tournament.room_password}</span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isJoined ? (
            <Button
              onClick={onExitClick}
              disabled={isLoading}
              variant="outline"
              className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
            >
              {isLoading ? 'Processing...' : 'Exit'}
            </Button>
          ) : (
            <button
              onClick={onJoinClick}
              disabled={isLoading || tournament.status !== 'upcoming' || spotsLeft <= 0}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all duration-200 bg-gradient-to-r from-gray-900 via-gray-800 to-gaming-orange hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isLoading ? 'Joining...' : spotsLeft <= 0 ? 'Full' : 'Join Now'}
            </button>
          )}
          
          {tournament.prize_distribution && onPrizeClick && (
            <Button 
              variant="outline" 
              size="default"
              onClick={onPrizeClick}
              className="shrink-0"
            >
              Prizes
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentCard;
