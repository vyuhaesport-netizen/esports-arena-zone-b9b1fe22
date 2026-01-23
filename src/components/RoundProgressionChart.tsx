import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, ChevronRight, Crown, Target } from 'lucide-react';

interface RoundData {
  round: number;
  rooms: number;
  teams: number;
  isComplete: boolean;
  isCurrent: boolean;
}

interface RoundProgressionChartProps {
  game: string;
  totalTeams: number;
  currentRound: number;
  status: string;
  roomsByRound?: Record<number, { total: number; completed: number }>;
}

const RoundProgressionChart = ({ 
  game, 
  totalTeams, 
  currentRound, 
  status,
  roomsByRound = {}
}: RoundProgressionChartProps) => {
  const teamsPerRoom = game === 'BGMI' ? 25 : 12;
  const finaleMaxTeams = teamsPerRoom;
  
  const roundBreakdown = useMemo(() => {
    const rounds: RoundData[] = [];
    let currentTeams = totalTeams;
    let roundNum = 1;
    
    while (currentTeams > finaleMaxTeams) {
      const roomsNeeded = Math.ceil(currentTeams / teamsPerRoom);
      const roundData = roomsByRound[roundNum];
      const isComplete = roundData ? roundData.completed === roundData.total && roundData.total > 0 : false;
      
      rounds.push({ 
        round: roundNum, 
        rooms: roomsNeeded, 
        teams: currentTeams,
        isComplete,
        isCurrent: currentRound === roundNum
      });
      currentTeams = roomsNeeded; // Top 1 from each room advances
      roundNum++;
    }
    
    // Add finale round
    const finaleData = roomsByRound[roundNum];
    rounds.push({ 
      round: roundNum, 
      rooms: 1, 
      teams: currentTeams,
      isComplete: status === 'completed',
      isCurrent: status === 'finale' || currentRound === roundNum
    });
    
    return rounds;
  }, [totalTeams, teamsPerRoom, finaleMaxTeams, currentRound, status, roomsByRound]);

  const totalRounds = roundBreakdown.length;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Round Progression
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual Flow Chart */}
        <div className="relative">
          <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2">
            {roundBreakdown.map((round, index) => {
              const isFinale = index === roundBreakdown.length - 1;
              const bgColor = round.isComplete 
                ? 'bg-green-500/20 border-green-500' 
                : round.isCurrent 
                  ? 'bg-primary/20 border-primary animate-pulse' 
                  : 'bg-muted border-muted-foreground/30';
              
              return (
                <div key={round.round} className="flex items-center">
                  {/* Round Box */}
                  <div className={`
                    relative flex flex-col items-center p-3 rounded-lg border-2 min-w-[80px]
                    ${bgColor}
                  `}>
                    {/* Round Number */}
                    <div className="flex items-center gap-1 mb-1">
                      {isFinale ? (
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <span className="text-xs font-bold">R{round.round}</span>
                      )}
                    </div>
                    
                    {/* Teams Count */}
                    <div className="flex items-center gap-1 text-lg font-bold">
                      <Users className="h-4 w-4" />
                      {round.teams}
                    </div>
                    
                    {/* Rooms Info */}
                    <p className="text-[10px] text-muted-foreground">
                      {isFinale ? 'Final' : `${round.rooms} room${round.rooms > 1 ? 's' : ''}`}
                    </p>
                    
                    {/* Status Badge */}
                    {round.isComplete && (
                      <Badge variant="default" className="absolute -top-2 -right-2 text-[8px] px-1 py-0">
                        ✓
                      </Badge>
                    )}
                    {round.isCurrent && !round.isComplete && (
                      <Badge variant="secondary" className="absolute -top-2 -right-2 text-[8px] px-1 py-0">
                        Live
                      </Badge>
                    )}
                  </div>
                  
                  {/* Arrow to next round */}
                  {index < roundBreakdown.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground mx-1 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-bold">{totalRounds}</p>
            <p className="text-[10px] text-muted-foreground">Total Rounds</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{teamsPerRoom}</p>
            <p className="text-[10px] text-muted-foreground">Teams/Room</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold flex items-center justify-center gap-1">
              <Crown className="h-4 w-4 text-yellow-500" />
              Top 1
            </p>
            <p className="text-[10px] text-muted-foreground">Advances</p>
          </div>
        </div>

        {/* Round Details Table */}
        <div className="space-y-1 pt-2">
          {roundBreakdown.map((round, index) => (
            <div 
              key={round.round} 
              className={`
                flex items-center justify-between text-xs p-2 rounded
                ${round.isCurrent ? 'bg-primary/10' : 'bg-muted/50'}
              `}
            >
              <div className="flex items-center gap-2">
                {index === roundBreakdown.length - 1 ? (
                  <Trophy className="h-3 w-3 text-yellow-500" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                    {round.round}
                  </span>
                )}
                <span className="font-medium">
                  {index === roundBreakdown.length - 1 ? 'Grand Finale' : `Round ${round.round}`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>{round.teams} teams</span>
                <span>→</span>
                <span>{round.rooms} room{round.rooms > 1 ? 's' : ''}</span>
                {round.isComplete && <Badge variant="outline" className="text-[8px] h-4">Done</Badge>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoundProgressionChart;