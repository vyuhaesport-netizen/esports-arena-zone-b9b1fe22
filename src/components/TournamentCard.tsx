import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import OrganizerProfilePreview from '@/components/OrganizerProfilePreview';
import { Trophy, Users, Wallet, Share2, Calendar, Eye, ChevronLeft, Clock, Youtube, Instagram, Gift, ScrollText } from 'lucide-react';

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
  registration_deadline?: string | null;
  youtube_link?: string | null;
  instagram_link?: string | null;
  is_giveaway?: boolean | null;
  rules?: string | null;
}

interface TournamentCardProps {
  tournament: Tournament;
  isJoined?: boolean;
  onJoinClick?: () => void;
  onShareClick?: () => void;
  onExitClick?: () => void;
  onPrizeClick?: () => void;
  onRulesClick?: () => void;
  onSwipeJoin?: () => void;
  isLoading?: boolean;
  variant?: 'organizer' | 'creator';
  showRoomDetails?: boolean;
  organizerName?: string;
  joinDisabled?: boolean;
  joinDisabledReason?: string;
  exitDisabled?: boolean;
  exitDisabledReason?: string;
}

const formatCountdown = (ms: number): string => {
  if (ms <= 0) return 'Closed';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h left`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m left`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s left`;
  } else {
    return `${seconds}s left`;
  }
};

const TournamentCard = ({
  tournament,
  isJoined = false,
  onJoinClick,
  onShareClick,
  onExitClick,
  onPrizeClick,
  onRulesClick,
  onSwipeJoin,
  isLoading = false,
  variant = 'organizer',
  showRoomDetails = false,
  organizerName,
  joinDisabled = false,
  joinDisabledReason,
  exitDisabled = false,
  exitDisabledReason
}: TournamentCardProps) => {
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [isDeadlineSoon, setIsDeadlineSoon] = useState(false);
  
  const spotsLeft = (tournament.max_participants || 100) - (tournament.joined_users?.length || 0);
  const prizeAmount = tournament.prize_pool || `₹${tournament.current_prize_pool || 0}`;
  const entryFee = tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free';
  const playerCount = tournament.joined_users?.length || 0;
  const maxPlayers = tournament.max_participants || 100;

  useEffect(() => {
    if (!tournament.registration_deadline) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const deadline = new Date(tournament.registration_deadline!).getTime();
      const now = Date.now();
      const remaining = deadline - now;
      
      setCountdown(formatCountdown(remaining));
      setIsDeadlineSoon(remaining > 0 && remaining < 60 * 60 * 1000);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [tournament.registration_deadline]);

  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const SWIPE_THRESHOLD = 100;
  const canSwipeJoin = !isJoined && tournament.status === 'upcoming' && spotsLeft > 0 && !joinDisabled;
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canSwipeJoin) return;
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !canSwipeJoin) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
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

  return (
    <div className="relative">
      <div 
        ref={cardRef} 
        onTouchStart={handleTouchStart} 
        onTouchMove={handleTouchMove} 
        onTouchEnd={handleTouchEnd} 
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }} 
        className="glass-card rounded-xl p-3.5 hover:shadow-md transition-all duration-200"
      >
        {/* Swipe indicator */}
        {canSwipeJoin && (
          <div className={`absolute inset-y-0 right-0 w-14 pointer-events-none rounded-r-xl bg-gradient-to-l from-success to-success/50 flex items-center justify-end pr-2.5 transition-opacity ${swipeX < -30 ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-white text-xs font-bold">JOIN</span>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">
              {tournament.title}
            </h3>
            {organizerName && tournament.created_by && (
              <button 
                onClick={() => setProfilePreviewOpen(true)} 
                className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors mt-0.5"
              >
                by {organizerName}
              </button>
            )}
          </div>
          {tournament.is_giveaway && (
            <Badge className="text-xs px-2.5 py-1 bg-gradient-to-r from-success to-gaming-cyan text-white border-0 font-bold flex-shrink-0 shadow-md">
              <Gift className="h-3.5 w-3.5 mr-1" />
              Giveaway
            </Badge>
          )}
        </div>

        {tournament.created_by && (
          <OrganizerProfilePreview 
            organizerId={tournament.created_by} 
            open={profilePreviewOpen} 
            onOpenChange={setProfilePreviewOpen}
          />
        )}

        {/* Deadline Countdown */}
        {countdown && !isJoined && (
          <div className={`flex items-center gap-1.5 mb-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
            isDeadlineSoon 
              ? 'bg-destructive/15 text-destructive border border-destructive/30 animate-pulse' 
              : 'bg-warning/15 text-warning border border-warning/30'
          }`}>
            <Clock className="h-3.5 w-3.5" />
            <span>Closes in {countdown}</span>
          </div>
        )}

        {/* Stats Grid - Improved */}
        <div className="grid grid-cols-4 gap-2 mb-2.5">
          <div className="bg-warning/10 rounded-lg p-2.5 text-center border border-warning/20">
            <Trophy className="h-4.5 w-4.5 text-warning mx-auto mb-1" />
            <p className="text-sm font-bold text-warning">{prizeAmount}</p>
            <p className="text-[10px] text-muted-foreground">Prize</p>
          </div>
          <div className="bg-success/10 rounded-lg p-2.5 text-center border border-success/20">
            <Wallet className="h-4.5 w-4.5 text-success mx-auto mb-1" />
            <p className="text-sm font-bold text-success">{tournament.is_giveaway ? '₹1' : entryFee}</p>
            <p className="text-[10px] text-muted-foreground">Entry</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-2.5 text-center border border-primary/20">
            <Users className="h-4.5 w-4.5 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{playerCount}/{maxPlayers}</p>
            <p className="text-[10px] text-muted-foreground">Players</p>
          </div>
          <div className="bg-muted/60 rounded-lg p-2.5 text-center border border-border/50">
            <Calendar className="h-4.5 w-4.5 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{format(new Date(tournament.start_date), 'MMM d')}</p>
            <p className="text-[10px] text-muted-foreground">{format(new Date(tournament.start_date), 'h:mm a')}</p>
          </div>
        </div>

        {/* Room Details */}
        {isJoined && showRoomDetails && tournament.room_id && (
          <div className="p-3 bg-success/10 rounded-lg border border-success/30 mb-2.5">
            <div className="flex items-center gap-2.5 text-success text-sm font-semibold">
              <Eye className="h-4 w-4" />
              <span>Room: {tournament.room_id}</span>
              {tournament.room_password && (
                <span className="text-muted-foreground">• Pass: {tournament.room_password}</span>
              )}
            </div>
          </div>
        )}

        {/* Social Links */}
        {(tournament.youtube_link || tournament.instagram_link) && (
          <div className="flex items-center gap-2 mb-2.5">
            {tournament.youtube_link && (
              <a 
                href={tournament.youtube_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-500 text-xs font-semibold hover:bg-red-500/25 transition-colors border border-red-500/20"
                onClick={(e) => e.stopPropagation()}
              >
                <Youtube className="h-3.5 w-3.5" />
                YouTube
              </a>
            )}
            {tournament.instagram_link && (
              <a 
                href={tournament.instagram_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pink-500/15 text-pink-500 text-xs font-semibold hover:bg-pink-500/25 transition-colors border border-pink-500/20"
                onClick={(e) => e.stopPropagation()}
              >
                <Instagram className="h-3.5 w-3.5" />
                Instagram
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {isJoined ? (
            exitDisabled ? (
              <div className="flex-1 h-8 rounded-lg bg-warning/15 border border-warning/30 flex items-center justify-center text-warning text-xs font-medium">
                {exitDisabledReason || 'Exit not allowed'}
              </div>
            ) : (
              <Button 
                onClick={onExitClick} 
                disabled={isLoading} 
                variant="outline" 
                className="flex-1 h-8 text-xs text-destructive border-destructive/50 hover:bg-destructive/10 rounded-lg font-medium"
              >
                {isLoading ? 'Processing...' : 'Exit'}
              </Button>
            )
          ) : canSwipeJoin ? (
            <Button 
              onClick={onJoinClick} 
              disabled={isLoading} 
              className="flex-1 h-8 text-xs rounded-lg bg-success hover:bg-success/90 font-medium"
            >
              {isLoading ? 'Processing...' : 'Join Now'}
            </Button>
          ) : joinDisabled ? (
            <div className="flex-1 h-8 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive text-xs font-medium">
              {joinDisabledReason || 'Closed'}
            </div>
          ) : (
            <div className="flex-1 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground text-xs font-medium">
              {spotsLeft <= 0 ? 'Full' : 'N/A'}
            </div>
          )}
          
          <Button 
            variant="outline" 
            onClick={onRulesClick} 
            className="h-8 w-8 p-0 rounded-lg"
            size="sm"
          >
            <ScrollText className="h-3.5 w-3.5" />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onPrizeClick} 
            className="h-8 w-8 p-0 rounded-lg"
            size="sm"
          >
            <Trophy className="h-3.5 w-3.5" />
          </Button>
          
          <Button 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onShareClick?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="h-8 w-8 p-0 rounded-lg touch-manipulation"
            size="sm"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Swipe indicator */}
      {canSwipeJoin && (
        <div className="flex items-center justify-center gap-2 mt-2 text-success/70">
          <ChevronLeft className="h-3.5 w-3.5 animate-bounce-soft" />
          <span className="text-xs font-semibold">Swipe to join</span>
          <ChevronLeft className="h-3.5 w-3.5 animate-bounce-soft" />
        </div>
      )}
    </div>
  );
};

export default TournamentCard;