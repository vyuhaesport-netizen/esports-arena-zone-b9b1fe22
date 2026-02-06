import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Crown, Users } from 'lucide-react';

interface Team {
  id: string;
  team_name: string;
  leader_id: string;
  member_1_id?: string;
  member_2_id?: string;
  member_3_id?: string;
  current_round: number;
  is_eliminated: boolean;
  final_rank?: number;
  registration_method: string;
  is_verified?: boolean;
}

interface PlayerProfile {
  user_id: string;
  username?: string;
  full_name?: string;
  in_game_name?: string;
  game_uid?: string;
}

interface Props {
  teams: Team[];
  playerProfiles: Record<string, PlayerProfile>;
  onTeamClick?: (team: Team) => void;
  height?: number;
}

const ITEM_HEIGHT = 80;
const OVERSCAN = 5;

const TeamRow = memo(({ 
  team, 
  playerProfiles, 
  onClick 
}: { 
  team: Team; 
  playerProfiles: Record<string, PlayerProfile>;
  onClick?: () => void;
}) => {
  const leader = playerProfiles[team.leader_id];
  const memberCount = [team.leader_id, team.member_1_id, team.member_2_id, team.member_3_id]
    .filter(Boolean).length;

  return (
    <div 
      className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
      style={{ height: ITEM_HEIGHT - 8 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{team.team_name}</span>
          {team.is_verified && (
            <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />
          )}
          {team.final_rank === 1 && (
            <Crown className="h-3.5 w-3.5 text-warning flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="truncate">
            {leader?.in_game_name || leader?.username || 'Loading...'}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {memberCount}/4
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {team.is_eliminated ? (
          <Badge variant="destructive" className="text-[10px] h-5">
            <XCircle className="h-3 w-3 mr-1" />
            Out
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] h-5">
            R{team.current_round}
          </Badge>
        )}
      </div>
    </div>
  );
});

TeamRow.displayName = 'TeamRow';

const VirtualizedTeamList = ({ 
  teams, 
  playerProfiles, 
  onTeamClick,
  height = 400 
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(height / ITEM_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(teams.length, startIndex + visibleCount);

  const visibleTeams = teams.slice(startIndex, endIndex);
  const offsetY = startIndex * ITEM_HEIGHT;

  return (
    <div 
      ref={containerRef}
      className="overflow-auto"
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: teams.length * ITEM_HEIGHT, position: 'relative' }}>
        <div 
          className="space-y-2"
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            width: '100%',
            top: 0,
            left: 0
          }}
        >
          {visibleTeams.map(team => (
            <TeamRow
              key={team.id}
              team={team}
              playerProfiles={playerProfiles}
              onClick={() => onTeamClick?.(team)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VirtualizedTeamList;
