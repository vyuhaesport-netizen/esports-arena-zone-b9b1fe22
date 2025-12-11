import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FollowButton from '@/components/FollowButton';
import { 
  Trophy, 
  Users, 
  Wallet,
  Share2,
  Calendar,
  Eye,
  ChevronRight,
  Award
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
  created_by?: string | null;
}

interface TournamentCardProps {
  tournament: Tournament;
  isJoined?: boolean;
  onJoinClick?: () => void;
  onShareClick?: () => void;
  onExitClick?: () => void;
  onPrizeClick?: () => void;
  onSwipeJoin?: () => void;
  isLoading?: boolean;
  variant?: 'organizer' | 'creator';
  showRoomDetails?: boolean;
  organizerName?: string;
  isFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

const TournamentCard = ({
  tournament,
  isJoined = false,
  onJoinClick,
  onShareClick,
  onExitClick,
  onPrizeClick,
  onSwipeJoin,
  isLoading = false,
  variant = 'organizer',
  showRoomDetails = false,
  organizerName,
  isFollowing = false,
  onFollowChange,
}: TournamentCardProps) => {
  const spotsLeft = (tournament.max_participants || 100) - (tournament.joined_users?.length || 0);
  const prizeAmount = tournament.prize_pool || `₹${tournament.current_prize_pool || 0}`;
  const entryFee = tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free';
  
  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const SWIPE_THRESHOLD = 100;
  const canSwipeJoin = !isJoined && tournament.status === 'upcoming' && spotsLeft > 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canSwipeJoin) return;
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !canSwipeJoin) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    // Only allow left swipe (negative values)
    if (diff < 0) {
      setSwipeX(Math.max(diff, -150));
    }
  };

  const handleTouchEnd = () => {
    if (!canSwipeJoin) return;
    if (swipeX < -SWIPE_THRESHOLD && onSwipeJoin) {
      onSwipeJoin();
    }
    setSwipeX(0);
    setIsSwiping(false);
  };

  // Get default prize distribution if none set
  const getPrizeDistribution = () => {
    if (tournament.prize_distribution) return tournament.prize_distribution;
    // Default distribution: 50/30/20
    return [
      { position: 1, percentage: 50 },
      { position: 2, percentage: 30 },
      { position: 3, percentage: 20 },
    ];
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe indicator background */}
      {canSwipeJoin && (
        <div 
          className={`absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-emerald-500 to-emerald-500/50 flex items-center justify-end pr-4 transition-opacity ${
            swipeX < -30 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="text-white text-sm font-semibold flex items-center gap-1">
            <ChevronRight className="h-5 w-5 animate-pulse" />
            Join
          </div>
        </div>
      )}
      
      <div 
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
        className="group bg-card rounded-xl border border-border/50 p-4 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out relative"
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-gaming font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {tournament.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-muted-foreground">{tournament.game}</p>
              {/* Follow Button */}
              {tournament.created_by && onFollowChange && (
                <FollowButton
                  organizerId={tournament.created_by}
                  isFollowing={isFollowing}
                  onFollowChange={onFollowChange}
                  organizerName={organizerName}
                />
              )}
            </div>
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
          
          {/* Always show Prize Distribution button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={onPrizeClick}
            className="h-9 px-3 hover:bg-accent hover:scale-105 transition-all"
          >
            <Award className="h-3.5 w-3.5 mr-1" />
            Prizes
          </Button>
          
          <button 
            onClick={onShareClick}
            className="h-9 w-9 rounded-lg border border-border/50 flex items-center justify-center hover:bg-accent hover:scale-105 hover:border-primary/30 transition-all"
          >
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Swipe hint for mobile */}
        {canSwipeJoin && (
          <div className="absolute bottom-1 right-2 text-[9px] text-muted-foreground/50 md:hidden">
            ← Swipe to join
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentCard;
