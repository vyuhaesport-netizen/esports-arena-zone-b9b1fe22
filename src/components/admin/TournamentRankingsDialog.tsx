import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Medal, Trophy, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TournamentRankingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentTitle: string;
  tournamentType: 'organizer' | 'creator' | 'local' | 'school';
}

interface RankEntry {
  rank: number;
  userId: string;
  username: string;
  inGameName: string;
  avatarUrl: string | null;
  teamName: string | null;
  prizeAmount: number;
}

const TournamentRankingsDialog = ({
  open,
  onOpenChange,
  tournamentId,
  tournamentTitle,
  tournamentType,
}: TournamentRankingsDialogProps) => {
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && tournamentId) {
      fetchRankings();
    }
  }, [open, tournamentId, tournamentType]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      if (tournamentType === 'school') {
        await fetchSchoolRankings();
      } else {
        await fetchRegularRankings();
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolRankings = async () => {
    // For school tournaments, get rankings from room assignments
    const { data: assignments, error } = await supabase
      .from('school_tournament_room_assignments')
      .select(`
        match_rank,
        team_id,
        school_tournament_teams!inner (
          team_name,
          leader_id
        )
      `)
      .eq('is_winner', true)
      .not('match_rank', 'is', null)
      .order('match_rank', { ascending: true });

    if (error) {
      console.error('Error fetching school rankings:', error);
      return;
    }

    // Get unique team rankings
    const teamRankMap = new Map<string, { rank: number; teamName: string; leaderId: string }>();
    
    (assignments || []).forEach((a: any) => {
      if (a.match_rank && a.team_id && !teamRankMap.has(a.team_id)) {
        teamRankMap.set(a.team_id, {
          rank: a.match_rank,
          teamName: a.school_tournament_teams?.team_name || 'Unknown Team',
          leaderId: a.school_tournament_teams?.leader_id,
        });
      }
    });

    // Fetch leader profiles
    const leaderIds = Array.from(teamRankMap.values()).map(v => v.leaderId).filter(Boolean);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, in_game_name, avatar_url')
      .in('user_id', leaderIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const rankEntries: RankEntry[] = Array.from(teamRankMap.entries())
      .map(([teamId, data]) => {
        const profile = profileMap.get(data.leaderId);
        return {
          rank: data.rank,
          userId: data.leaderId || teamId,
          username: profile?.username || 'Unknown',
          inGameName: profile?.in_game_name || 'N/A',
          avatarUrl: profile?.avatar_url || null,
          teamName: data.teamName,
          prizeAmount: 0, // Will be calculated separately if needed
        };
      })
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10);

    setRankings(rankEntries);
  };

  const fetchRegularRankings = async () => {
    // For regular/creator/local tournaments, get rankings from wallet_transactions
    // Prize descriptions contain position info like "Position #1 prize for..."
    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('user_id, amount, description')
      .eq('type', 'prize')
      .like('description', `%prize for ${tournamentTitle}%`)
      .order('amount', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
    }

    // Also try matching by checking tournament ID in descriptions
    const { data: transactions2 } = await supabase
      .from('wallet_transactions')
      .select('user_id, amount, description')
      .eq('type', 'prize')
      .order('amount', { ascending: false })
      .limit(100);

    const allTransactions = [...(transactions || []), ...(transactions2 || [])];
    
    // Parse rankings from descriptions
    const rankMap = new Map<string, { rank: number; amount: number; teamName: string | null }>();
    
    allTransactions.forEach((t: any) => {
      const desc = t.description || '';
      // Match patterns like "Position #1" or "Team XYZ Position #1"
      const positionMatch = desc.match(/Position #(\d+)/i);
      const teamMatch = desc.match(/Team (\S+)/i);
      
      if (positionMatch && desc.toLowerCase().includes(tournamentTitle.toLowerCase().substring(0, 10))) {
        const rank = parseInt(positionMatch[1]);
        const existingEntry = rankMap.get(t.user_id);
        
        // Only keep the highest rank (lowest number) for each user
        if (!existingEntry || rank < existingEntry.rank) {
          rankMap.set(t.user_id, {
            rank,
            amount: parseFloat(t.amount) || 0,
            teamName: teamMatch ? teamMatch[1] : null,
          });
        }
      }
    });

    // Fetch profiles for ranked users
    const userIds = Array.from(rankMap.keys());
    if (userIds.length === 0) {
      setRankings([]);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, in_game_name, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const rankEntries: RankEntry[] = Array.from(rankMap.entries())
      .map(([userId, data]) => {
        const profile = profileMap.get(userId);
        return {
          rank: data.rank,
          userId,
          username: profile?.username || 'Unknown',
          inGameName: profile?.in_game_name || 'N/A',
          avatarUrl: profile?.avatar_url || null,
          teamName: data.teamName,
          prizeAmount: data.amount,
        };
      })
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10);

    setRankings(rankEntries);
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      case 2: return 'bg-slate-300/20 text-slate-600 border-slate-400/30';
      case 3: return 'bg-orange-700/20 text-orange-700 border-orange-600/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <Medal className={`h-5 w-5 ${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-slate-400' : 'text-orange-600'}`} />;
    }
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Tournament Rankings
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{tournamentTitle}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No rankings found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Winners may not have been declared yet
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-4">
              {rankings.map((entry) => (
                <div
                  key={`${entry.userId}-${entry.rank}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${getRankColor(entry.rank)}`}
                >
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={entry.avatarUrl || undefined} />
                    <AvatarFallback>{entry.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{entry.username}</p>
                      {entry.teamName && (
                        <Badge variant="outline" className="text-[10px]">
                          {entry.teamName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{entry.inGameName}</p>
                  </div>

                  {entry.prizeAmount > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-green-600">₹{entry.prizeAmount}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TournamentRankingsDialog;
