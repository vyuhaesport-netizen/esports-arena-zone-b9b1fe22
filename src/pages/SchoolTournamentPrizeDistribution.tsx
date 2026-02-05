 import { useState, useEffect } from 'react';
 import { useParams, useNavigate } from 'react-router-dom';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from '@/components/ui/sonner';
 import AppLayout from '@/components/layout/AppLayout';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
 import {
   Trophy,
   Search,
   Check,
   Loader2,
   AlertCircle,
   Wallet,
   Users,
   Award,
   Star,
   Target,
   Crosshair
 } from 'lucide-react';
 
 interface Tournament {
   id: string;
   tournament_name: string;
   school_name: string;
   game: string;
   total_collected: number;
   prize_distribution_mode: string;
   prizes_distributed: boolean;
   organizer_id: string;
 }
 
 interface Team {
   id: string;
   team_name: string;
   leader_id: string;
   current_round: number;
   is_eliminated: boolean;
   final_rank?: number;
 }
 
 interface PlayerProfile {
   user_id: string;
   username?: string;
   in_game_name?: string;
 }
 
 interface PrizeEntry {
   teamId: string;
   teamName: string;
   amount: number;
   rank?: number;
   awardType: 'rank' | 'special';
   awardName?: string;
 }
 
 const SPECIAL_AWARDS = [
   { value: 'best_runner_up', label: 'Best Runner Up' },
   { value: 'best_sniper', label: 'Best Sniper' },
   { value: 'best_assaulter', label: 'Best Assaulter' },
   { value: 'best_support', label: 'Best Support' },
   { value: 'most_kills', label: 'Most Kills' },
   { value: 'best_survival', label: 'Best Survival' },
   { value: 'mvp', label: 'MVP' },
 ];
 
 const SchoolTournamentPrizeDistribution = () => {
   const { id } = useParams<{ id: string }>();
   const navigate = useNavigate();
   const { user } = useAuth();
   
   const [loading, setLoading] = useState(true);
   const [processing, setProcessing] = useState(false);
   const [tournament, setTournament] = useState<Tournament | null>(null);
   const [teams, setTeams] = useState<Team[]>([]);
   const [winnerTeams, setWinnerTeams] = useState<Team[]>([]);
   const [playerProfiles, setPlayerProfiles] = useState<Record<string, PlayerProfile>>({});
   const [searchQuery, setSearchQuery] = useState('');
   
   const [prizeEntries, setPrizeEntries] = useState<PrizeEntry[]>([]);
   const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
   const [prizeAmount, setPrizeAmount] = useState('');
   const [prizeRank, setPrizeRank] = useState('');
   const [awardType, setAwardType] = useState<'rank' | 'special'>('rank');
   const [specialAward, setSpecialAward] = useState('');
   
   // Calculate prize pool breakdown
   const prizePool = tournament ? Math.floor(tournament.total_collected * 0.8) : 0;
   const organizerEarnings = tournament ? Math.floor(tournament.total_collected * 0.1) : 0;
   const platformEarnings = tournament ? Math.floor(tournament.total_collected * 0.1) : 0;
   
   const totalDistributed = prizeEntries.reduce((sum, e) => sum + e.amount, 0);
   const remainingPool = prizePool - totalDistributed;
 
   useEffect(() => {
     if (id) {
       fetchData();
     }
   }, [id]);
 
   const fetchData = async () => {
     try {
       const { data: tournamentData, error: tError } = await supabase
         .from('school_tournaments')
         .select('*')
         .eq('id', id)
         .single();
 
       if (tError) throw tError;
       
       if (tournamentData.organizer_id !== user?.id) {
         toast.error('You are not authorized to distribute prizes');
         navigate(-1);
         return;
       }
       
       if (tournamentData.prizes_distributed) {
         toast.error('Prizes have already been distributed');
         navigate(-1);
         return;
       }
 
       setTournament({
         ...tournamentData,
         prize_distribution_mode: tournamentData.prize_distribution_mode || 'online'
       });
 
       // Fetch all teams
       const { data: teamsData, error: teamsError } = await supabase
         .from('school_tournament_teams')
         .select('*')
         .eq('tournament_id', id)
         .order('current_round', { ascending: false });
 
       if (teamsError) throw teamsError;
       setTeams(teamsData || []);
       
       // Filter winner teams (not eliminated or highest round)
       const winners = (teamsData || []).filter(t => !t.is_eliminated);
       setWinnerTeams(winners);
 
       // Fetch player profiles
       const allPlayerIds = (teamsData || []).map(t => t.leader_id);
       const uniqueIds = [...new Set(allPlayerIds)];
       
       if (uniqueIds.length > 0) {
         const { data: profiles } = await supabase
           .from('profiles')
           .select('user_id, username, in_game_name')
           .in('user_id', uniqueIds.slice(0, 300));
         
         const profileMap: Record<string, PlayerProfile> = {};
         (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
         setPlayerProfiles(profileMap);
       }
     } catch (error) {
       console.error('Error fetching data:', error);
       toast.error('Failed to load tournament data');
     } finally {
       setLoading(false);
     }
   };
 
   const filteredTeams = teams.filter(t => 
     t.team_name.toLowerCase().includes(searchQuery.toLowerCase())
   );
 
   const handleAddPrize = () => {
     if (!selectedTeam) {
       toast.error('Please select a team');
       return;
     }
     
     const amount = parseFloat(prizeAmount);
     if (!amount || amount <= 0) {
       toast.error('Please enter a valid amount');
       return;
     }
     
     if (amount > remainingPool) {
       toast.error(`Amount exceeds remaining pool (₹${remainingPool})`);
       return;
     }
     
     if (awardType === 'rank') {
       const rank = parseInt(prizeRank);
       if (!rank || rank < 1 || rank > 10) {
         toast.error('Please enter rank between 1-10');
         return;
       }
       
       // Check if rank already assigned
       if (prizeEntries.some(e => e.awardType === 'rank' && e.rank === rank)) {
         toast.error(`Rank ${rank} is already assigned`);
         return;
       }
     } else {
       if (!specialAward) {
         toast.error('Please select a special award');
         return;
       }
     }
     
     // Check if team already has this type of prize
     if (prizeEntries.some(e => e.teamId === selectedTeam.id && e.awardType === awardType)) {
       toast.error('This team already has a prize of this type');
       return;
     }
     
     const newEntry: PrizeEntry = {
       teamId: selectedTeam.id,
       teamName: selectedTeam.team_name,
       amount,
       awardType,
       ...(awardType === 'rank' 
         ? { rank: parseInt(prizeRank) } 
         : { awardName: SPECIAL_AWARDS.find(a => a.value === specialAward)?.label || specialAward }
       )
     };
     
     setPrizeEntries([...prizeEntries, newEntry]);
     setSelectedTeam(null);
     setPrizeAmount('');
     setPrizeRank('');
     setSpecialAward('');
     toast.success('Prize added!');
   };
 
   const handleRemovePrize = (index: number) => {
     setPrizeEntries(prizeEntries.filter((_, i) => i !== index));
   };
 
   const handleDistributePrizes = async () => {
     if (prizeEntries.length === 0) {
       toast.error('Please add at least one prize');
       return;
     }
     
     if (totalDistributed > prizePool) {
       toast.error('Total distributed exceeds prize pool');
       return;
     }
     
     setProcessing(true);
     try {
       // Insert prize distributions
       const distributions = prizeEntries.map(entry => ({
         tournament_id: id,
         team_id: entry.teamId,
         rank: entry.rank || null,
         award_type: entry.awardType,
         award_name: entry.awardName || null,
         amount: entry.amount,
         distributed_by: user?.id
       }));
       
       const { error: distError } = await supabase
         .from('school_tournament_prize_distributions')
         .insert(distributions);
       
       if (distError) throw distError;
       
       // Update tournament with prize distribution info
       const { error: updateError } = await supabase
         .from('school_tournaments')
         .update({
           prizes_distributed: true,
           prizes_distributed_at: new Date().toISOString(),
           prizes_distributed_by: user?.id,
           organizer_earnings: organizerEarnings,
           platform_earnings: platformEarnings
         })
         .eq('id', id);
       
       if (updateError) throw updateError;
       
        // Credit organizer earnings to Total Earned (withdrawable balance)
        const { error: walletTxError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: tournament?.organizer_id,
            amount: organizerEarnings,
            type: 'commission',
            status: 'completed',
            description: `Tournament Commission: ${tournament?.tournament_name}`
          });
        
        if (walletTxError) console.error('Error crediting organizer:', walletTxError);
       
       // Award stats points to winners
       const rankEntries = prizeEntries.filter(e => e.awardType === 'rank' && e.rank && e.rank <= 10);
       for (const entry of rankEntries) {
         const team = teams.find(t => t.id === entry.teamId);
         if (team) {
           const statsPoints = entry.rank! <= 10 ? 50 : 10;
           // Update team leader's stats
           const { data: existingStats } = await supabase
             .from('player_game_stats')
             .select('*')
             .eq('user_id', team.leader_id)
             .maybeSingle();
           
           if (existingStats) {
             await supabase
               .from('player_game_stats')
               .update({
                 wins: (existingStats.wins || 0) + 1
               })
               .eq('user_id', team.leader_id);
           }
         }
       }
       
       // Delete eliminated teams data (cleanup)
       const eliminatedTeams = teams.filter(t => t.is_eliminated);
       if (eliminatedTeams.length > 0) {
         // Keep winner team data, only delete eliminated
         // Note: We don't delete team data as it may be needed for records
       }
       
       toast.success('Prizes distributed successfully!');
       navigate(`/school-tournament/${id}`);
     } catch (error: any) {
       console.error('Error distributing prizes:', error);
       toast.error(error.message || 'Failed to distribute prizes');
     } finally {
       setProcessing(false);
     }
   };
 
   if (loading) {
     return (
       <AppLayout title="Distribute Prizes" showBack>
         <div className="flex justify-center py-20">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       </AppLayout>
     );
   }
 
   if (!tournament) {
     return (
       <AppLayout title="Distribute Prizes" showBack>
         <div className="p-4 text-center">
           <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
           <p>Tournament not found</p>
         </div>
       </AppLayout>
     );
   }
 
   return (
     <AppLayout title="Distribute Prizes" showBack>
       <div className="p-4 space-y-4 pb-32">
         {/* Header */}
         <Card className="bg-gradient-to-br from-warning/20 to-warning/5 border-warning/30">
           <CardHeader className="pb-2">
             <CardTitle className="flex items-center gap-2 text-base">
               <Trophy className="h-5 w-5 text-warning" />
               {tournament.tournament_name}
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <div className="grid grid-cols-3 gap-2 text-center">
               <div className="bg-background/50 rounded-lg p-2">
                 <p className="text-[10px] text-muted-foreground">Total Collected</p>
                 <p className="text-sm font-bold">₹{tournament.total_collected}</p>
               </div>
               <div className="bg-success/10 rounded-lg p-2 border border-success/30">
                 <p className="text-[10px] text-muted-foreground">Prize Pool (80%)</p>
                 <p className="text-sm font-bold text-success">₹{prizePool}</p>
               </div>
               <div className="bg-primary/10 rounded-lg p-2 border border-primary/30">
                 <p className="text-[10px] text-muted-foreground">Your Earnings (10%)</p>
                 <p className="text-sm font-bold text-primary">₹{organizerEarnings}</p>
               </div>
             </div>
             
             <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
               <span className="text-xs text-muted-foreground">Remaining Pool:</span>
               <span className={`font-bold ${remainingPool < 0 ? 'text-destructive' : 'text-success'}`}>
                 ₹{remainingPool}
               </span>
             </div>
             
             <p className="text-[10px] text-muted-foreground">
               Platform Commission: ₹{platformEarnings} (10%)
             </p>
           </CardContent>
         </Card>
 
         {/* Search Teams */}
         <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Search teams..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="pl-10"
           />
         </div>
 
         {/* Add Prize Form */}
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm flex items-center gap-2">
               <Award className="h-4 w-4" />
               Add Prize
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             {/* Team Selection */}
             <div>
               <Label className="text-xs">Select Team</Label>
               <ScrollArea className="h-32 border rounded-lg mt-1">
                 <div className="p-2 space-y-1">
                   {filteredTeams.map(team => (
                     <button
                       key={team.id}
                       onClick={() => setSelectedTeam(team)}
                       className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                         selectedTeam?.id === team.id 
                           ? 'bg-primary text-primary-foreground' 
                           : 'hover:bg-muted'
                       }`}
                     >
                       <div className="flex items-center justify-between">
                         <span className="font-medium">{team.team_name}</span>
                         <div className="flex items-center gap-1">
                           {!team.is_eliminated && (
                             <Badge variant="secondary" className="text-[9px]">Winner</Badge>
                           )}
                           <Badge variant="outline" className="text-[9px]">R{team.current_round}</Badge>
                         </div>
                       </div>
                       <p className="text-[10px] opacity-70">
                         Leader: {playerProfiles[team.leader_id]?.in_game_name || 'N/A'}
                       </p>
                     </button>
                   ))}
                 </div>
               </ScrollArea>
             </div>
 
             {/* Award Type */}
             <div className="grid grid-cols-2 gap-2">
               <Button
                 type="button"
                 variant={awardType === 'rank' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setAwardType('rank')}
                 className="text-xs"
               >
                 <Trophy className="h-3 w-3 mr-1" />
                 Rank (1-10)
               </Button>
               <Button
                 type="button"
                 variant={awardType === 'special' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setAwardType('special')}
                 className="text-xs"
               >
                 <Star className="h-3 w-3 mr-1" />
                 Special Award
               </Button>
             </div>
 
             {/* Rank or Special Award */}
             {awardType === 'rank' ? (
               <div>
                 <Label className="text-xs">Rank (1-10)</Label>
                <Select value={prizeRank} onValueChange={(value) => setPrizeRank(value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select rank" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => {
                      const isAssigned = prizeEntries.some(e => e.awardType === 'rank' && e.rank === rank);
                      return (
                        <SelectItem 
                          key={rank} 
                          value={rank.toString()}
                          disabled={isAssigned}
                          className="cursor-pointer"
                        >
                          Rank #{rank} {isAssigned && '(Assigned)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
               </div>
             ) : (
               <div>
                 <Label className="text-xs">Special Award</Label>
                 <div className="grid grid-cols-2 gap-1 mt-1">
                   {SPECIAL_AWARDS.map(award => (
                     <Button
                       key={award.value}
                       type="button"
                       variant={specialAward === award.value ? 'default' : 'outline'}
                       size="sm"
                       onClick={() => setSpecialAward(award.value)}
                       className="text-[10px] h-8"
                     >
                       {award.label}
                     </Button>
                   ))}
                 </div>
               </div>
             )}
 
             {/* Amount */}
             <div>
               <Label className="text-xs">Prize Amount (₹)</Label>
               <Input
                 type="number"
                 placeholder="Enter amount"
                 value={prizeAmount}
                 onChange={(e) => setPrizeAmount(e.target.value)}
                 min={1}
               />
               <p className="text-[10px] text-muted-foreground mt-1">
                 Max: ₹{remainingPool}
               </p>
             </div>
 
             <Button 
               onClick={handleAddPrize}
               className="w-full"
               disabled={!selectedTeam || !prizeAmount}
             >
               <Check className="h-4 w-4 mr-2" />
               Add Prize
             </Button>
           </CardContent>
         </Card>
 
         {/* Prize List */}
         {prizeEntries.length > 0 && (
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center justify-between">
                 <span className="flex items-center gap-2">
                   <Wallet className="h-4 w-4" />
                   Prize Distribution ({prizeEntries.length})
                 </span>
                 <Badge variant="secondary">₹{totalDistributed}</Badge>
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-2">
                 {prizeEntries
                   .sort((a, b) => (a.rank || 99) - (b.rank || 99))
                   .map((entry, index) => (
                   <div 
                     key={index}
                     className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                   >
                     <div className="flex items-center gap-2">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                         entry.rank === 1 ? 'bg-warning/20 text-warning' :
                         entry.rank === 2 ? 'bg-muted text-foreground' :
                         entry.rank === 3 ? 'bg-orange-500/20 text-orange-500' :
                         'bg-primary/20 text-primary'
                       }`}>
                         {entry.awardType === 'rank' ? (
                           <span className="text-xs font-bold">#{entry.rank}</span>
                         ) : (
                           <Star className="h-4 w-4" />
                         )}
                       </div>
                       <div>
                         <p className="text-xs font-medium">{entry.teamName}</p>
                         <p className="text-[10px] text-muted-foreground">
                           {entry.awardType === 'rank' 
                             ? `Rank ${entry.rank}` 
                             : entry.awardName
                           }
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className="font-bold text-sm text-success">₹{entry.amount}</span>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleRemovePrize(index)}
                         className="h-6 w-6 p-0 text-destructive"
                       >
                         ×
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
         )}
       </div>
 
       {/* Fixed Bottom Button */}
       <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
         <Button
           onClick={handleDistributePrizes}
           disabled={prizeEntries.length === 0 || processing}
           className="w-full h-12 text-base font-semibold bg-gradient-to-r from-warning to-orange-500"
         >
           {processing ? (
             <Loader2 className="h-5 w-5 animate-spin mr-2" />
           ) : (
             <Trophy className="h-5 w-5 mr-2" />
           )}
           Distribute ₹{totalDistributed} to {prizeEntries.length} Teams
         </Button>
         <p className="text-[10px] text-center text-muted-foreground mt-2">
           Your earnings ₹{organizerEarnings} will be credited to your Dhana wallet
         </p>
       </div>
     </AppLayout>
   );
 };
 
 export default SchoolTournamentPrizeDistribution;