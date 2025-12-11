import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Users, 
  Wallet,
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
  
  const accentColor = variant === 'creator' ? 'purple' : 'gaming-orange';

  return (
    <div className="group bg-card rounded-xl border border-border/50 p-4 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-gaming font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {tournament.title}
            </h3>
            {isOfficial && (
              <Badge className="bg-gaming-orange/10 text-gaming-orange text-[9px] px-1.5 py-0 flex items-center gap-0.5 shrink-0">
                <BadgeCheck className="h-2.5 w-2.5" />
                Official
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{tournament.game}</p>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge className={`text-[9px] px-2 py-0.5 capitalize ${
            variant === 'creator' 
              ? 'bg-purple-500/10 text-purple-600' 
              : 'bg-gaming-orange/10 text-gaming-orange'
          }`}>
            {tournament.tournament_mode || 'Solo'}
          </Badge>
          <Badge className={`text-[9px] px-2 py-0.5 capitalize ${
            tournament.status === 'upcoming' 
              ? 'bg-emerald-500/10 text-emerald-600' 
              : tournament.status === 'ongoing'
              ? 'bg-amber-500/10 text-amber-600'
              : 'bg-muted text-muted-foreground'
          }`}>
            {tournament.status}
          </Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-3">
        <div className="flex items-center gap-1 group-hover:text-amber-500 transition-colors">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-medium">{prizeAmount}</span>
        </div>
        <div className="flex items-center gap-1 group-hover:text-emerald-500 transition-colors">
          <Wallet className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-medium">{entryFee}</span>
        </div>
        <div className="flex items-center gap-1 group-hover:text-blue-500 transition-colors">
          <Users className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-medium">{spotsLeft} left</span>
        </div>
        <div className="flex items-center gap-1 group-hover:text-purple-500 transition-colors">
          <Calendar className="h-3.5 w-3.5 text-purple-500" />
          <span className="font-medium">{format(new Date(tournament.start_date), 'MMM dd, h:mm a')}</span>
        </div>
      </div>

      {/* Room Details */}
      {isJoined && showRoomDetails && tournament.room_id && (
        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 mb-3 animate-fade-in">
          <div className="flex items-center gap-2 text-emerald-600 text-[11px] font-medium">
            <Eye className="h-3.5 w-3.5" />
            <span>Room: {tournament.room_id}</span>
            {tournament.room_password && (
              <span className="text-muted-foreground">| Pass: {tournament.room_password}</span>
            )}
          </div>
        </div>
      )}

      {/* Action Row */}
      <div className="flex items-center gap-2">
        {isJoined ? (
          <Button
            onClick={onExitClick}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-destructive border-destructive/50 hover:bg-destructive/10 hover:border-destructive transition-all"
          >
            {isLoading ? 'Processing...' : 'Exit'}
          </Button>
        ) : (
          <button
            onClick={onJoinClick}
            disabled={isLoading || tournament.status !== 'upcoming' || spotsLeft <= 0}
            className="flex-1 h-9 rounded-lg font-semibold text-xs text-white bg-gradient-to-r from-gray-900 via-gray-800 to-gaming-orange hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200"
          >
            {isLoading ? 'Joining...' : spotsLeft <= 0 ? 'Full' : 'Join Now'}
          </button>
        )}
        
        {tournament.prize_distribution && onPrizeClick && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onPrizeClick}
            className="h-9 px-3 hover:bg-accent hover:scale-105 transition-all"
          >
            Prizes
          </Button>
        )}
        
        <button 
          onClick={onShareClick}
          className="h-9 w-9 rounded-lg border border-border/50 flex items-center justify-center hover:bg-accent hover:scale-105 hover:border-primary/30 transition-all"
        >
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default TournamentCard;
