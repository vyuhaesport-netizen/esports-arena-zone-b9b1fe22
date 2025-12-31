import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FollowButton from '@/components/FollowButton';
import OrganizerProfilePreview from '@/components/OrganizerProfilePreview';
import { Trophy, Users, Wallet, Share2, Calendar, Eye, ChevronRight, Zap, Clock, Youtube, Instagram, Gift, ScrollText } from 'lucide-react';

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
  isFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  joinDisabled?: boolean;
  joinDisabledReason?: string;
  exitDisabled?: boolean; // Exit only allowed for solo tournaments
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
  isFollowing = false,
  onFollowChange,
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

  // Countdown timer effect
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
      // Mark as "soon" if less than 1 hour remaining
      setIsDeadlineSoon(remaining > 0 && remaining < 60 * 60 * 1000);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [tournament.registration_deadline]);

  // Swipe state
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

  return <div className="relative overflow-hidden rounded-lg">
      {/* Swipe indicator background */}
      {canSwipeJoin && <div className={`absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-emerald-500 to-emerald-500/50 flex items-center justify-end pr-3 transition-opacity ${swipeX < -30 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-white text-xs font-semibold flex items-center gap-1">
            <ChevronRight className="h-4 w-4 animate-pulse" />
            Join
          </div>
        </div>}
      
      <div ref={cardRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{
      transform: `translateX(${swipeX}px)`,
      transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
    }} className="bg-card rounded-lg border border-border/50 p-3 hover:border-primary/30 transition-all relative">
        
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-sm">
              {tournament.title}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-[10px] text-muted-foreground">{tournament.game}</span>
              {tournament.is_giveaway && (
                <Badge className="text-[8px] px-1.5 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 font-bold shadow-md shadow-emerald-500/40">
                  <Gift className="h-2.5 w-2.5 mr-0.5" />
                  GIVEAWAY
                </Badge>
              )}
              <Badge className={`text-[8px] px-1 py-0 capitalize ${variant === 'creator' ? 'bg-purple-500/10 text-purple-600' : 'bg-gaming-orange/10 text-gaming-orange'}`}>
                {tournament.tournament_mode || 'Solo'}
              </Badge>
              <Badge className={`text-[8px] px-1 py-0 capitalize ${tournament.status === 'upcoming' ? 'bg-emerald-500/10 text-emerald-600' : tournament.status === 'ongoing' ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                {tournament.status}
              </Badge>
            </div>
            {/* Organizer Info */}
            {organizerName && tournament.created_by && (
              <button onClick={() => setProfilePreviewOpen(true)} className="text-[9px] text-muted-foreground hover:text-primary hover:underline transition-colors mt-0.5">
                by {organizerName}
              </button>
            )}
          </div>
          {/* Follow Button - Right Side */}
          {tournament.created_by && onFollowChange && (
            <div className="flex-shrink-0">
              <FollowButton organizerId={tournament.created_by} isFollowing={isFollowing} onFollowChange={onFollowChange} organizerName={organizerName} />
            </div>
          )}
        </div>

        {/* Organizer Profile Preview Dialog */}
        {tournament.created_by && <OrganizerProfilePreview organizerId={tournament.created_by} open={profilePreviewOpen} onOpenChange={setProfilePreviewOpen} isFollowing={isFollowing} onFollowChange={onFollowChange} />}

        {/* Registration Deadline Countdown */}
        {countdown && !isJoined && (
          <div className={`flex items-center gap-1.5 mb-2 px-2 py-1 rounded text-[10px] font-medium ${
            isDeadlineSoon 
              ? 'bg-red-500/10 text-red-600 animate-pulse' 
              : 'bg-orange-500/10 text-orange-600'
          }`}>
            <Clock className="h-3 w-3" />
            <span>Registration closes in {countdown}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-2 mb-2 text-[10px] flex-wrap">
          <div className="flex items-center gap-1 text-amber-600">
            <Trophy className="h-3 w-3" />
            <span className="font-medium">{prizeAmount}</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <div className="flex items-center gap-1 text-emerald-600">
            <Wallet className="h-3 w-3" />
            <span className="font-medium">{tournament.is_giveaway ? '₹1' : entryFee}</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <div className="flex items-center gap-1 text-blue-600">
            <Users className="h-3 w-3" />
            <span className="font-medium">{spotsLeft} left</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(tournament.start_date), 'MMM dd, h:mm a')}</span>
          </div>
        </div>

        {/* Room Details */}
        {isJoined && showRoomDetails && tournament.room_id && <div className="p-1.5 bg-emerald-500/10 rounded border border-emerald-500/20 mb-2">
            <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-medium">
              <Eye className="h-3 w-3" />
              <span>Room: {tournament.room_id}</span>
              {tournament.room_password && <span className="text-muted-foreground">| Pass: {tournament.room_password}</span>}
            </div>
          </div>}

        {/* Social Links */}
        {(tournament.youtube_link || tournament.instagram_link) && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {tournament.youtube_link && (
              <a 
                href={tournament.youtube_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-600 text-[10px] hover:bg-red-500/20 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Youtube className="h-3 w-3" />
                <span>YouTube</span>
              </a>
            )}
            {tournament.instagram_link && (
              <a 
                href={tournament.instagram_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded bg-pink-500/10 text-pink-600 text-[10px] hover:bg-pink-500/20 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Instagram className="h-3 w-3" />
                <span>Instagram</span>
              </a>
            )}
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center gap-1.5">
          {isJoined ? (
            exitDisabled ? (
              <div className="flex-1 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 text-[10px]">
                {exitDisabledReason || 'Exit not allowed'}
              </div>
            ) : (
              <Button onClick={onExitClick} disabled={isLoading} variant="outline" size="sm" className="flex-1 h-7 text-xs text-destructive border-destructive/50 hover:bg-destructive/10">
                {isLoading ? 'Processing...' : 'Exit'}
              </Button>
            )
          ) : (
            canSwipeJoin ? (
              <div className="flex-1 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-1 text-emerald-600 text-[10px]">
                <Zap className="h-3 w-3" />
                <span>Swipe left to join</span>
                <ChevronRight className="h-3 w-3 animate-pulse" />
              </div>
            ) : joinDisabled ? (
              <div className="flex-1 h-7 rounded bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-600 text-[10px]">
                {joinDisabledReason || 'Registration Closed'}
              </div>
            ) : (
              <div className="flex-1 h-7 rounded bg-muted/50 flex items-center justify-center text-muted-foreground text-[10px]">
                {spotsLeft <= 0 ? 'Full' : 'Not Available'}
              </div>
            )
          )}
          
          <Button variant="outline" size="sm" onClick={onRulesClick} className="h-7 px-2 text-[10px] gap-1">
            <ScrollText className="h-3 w-3" />
            Rules
          </Button>
          
          <Button variant="outline" size="sm" onClick={onPrizeClick} className="h-7 px-2 text-[10px] gap-1">
            <Trophy className="h-3 w-3" />
            Prizes
          </Button>
          
          <button onClick={onShareClick} className="h-7 w-7 rounded border border-border/50 flex items-center justify-center hover:bg-accent">
            <Share2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>;
};
export default TournamentCard;