import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ArrowLeft,
  Users,
  Gamepad2,
  Trophy,
  MapPin,
  Play,
  StopCircle,
  QrCode,
  Share2,
  Download,
  Eye,
  CheckCircle,
  Crown,
  Loader2,
  RefreshCw,
  Lock,
  Timer,
  FileText,
  UserCheck,
  ClipboardCheck,
  Phone,
  IdCard
} from 'lucide-react';
import RoundProgressionChart from '@/components/RoundProgressionChart';

interface Tournament {
  id: string;
  tournament_name: string;
  school_name: string;
  school_city: string;
  school_state: string;
  school_district: string;
  school_image_url?: string;
  game: string;
  max_players: number;
  current_players: number;
  status: string;
  tournament_date: string;
  registration_deadline: string;
  private_code: string;
  total_rooms: number;
  current_round: number;
  total_rounds: number;
  entry_type: string;
  entry_fee: number;
  prize_pool: number;
  total_collected: number;
  players_per_room: number;
  verification_type: 'online' | 'spot';
   prize_distribution_mode?: 'online' | 'local_venue';
   winners_per_room?: number;
}

interface PlayerProfile {
  user_id: string;
  username?: string;
  full_name?: string;
  in_game_name?: string;
  game_uid?: string;
}

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
  registered_at: string;
  is_verified?: boolean;
  verified_at?: string;
  verified_by?: string;
  verification_notes?: string;
  govt_id_number?: string;
  contact_number?: string;
}

interface Room {
  id: string;
  round_number: number;
  room_number: number;
  room_name: string;
  room_id?: string;
  room_password?: string;
  status: string;
  scheduled_time?: string;
  winner_team_id?: string;
  teams?: Team[];
}

const SchoolTournamentManage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomAssignments, setRoomAssignments] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [declareWinnerDialogOpen, setDeclareWinnerDialogOpen] = useState(false);
  const [viewTeamsDialogOpen, setViewTeamsDialogOpen] = useState(false);
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, PlayerProfile>>({});
  
  // Multi-select room states
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  
  // Form states
  const [roomCredentials, setRoomCredentials] = useState({ roomId: '', password: '', scheduledTime: '' });
  const [selectedWinnerTeam, setSelectedWinnerTeam] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [tournamentStats, setTournamentStats] = useState<{
    roomsByRound: Record<number, { total: number; completed: number }>;
  }>({ roomsByRound: {} });
  
  // Verification states
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [selectedTeamForVerification, setSelectedTeamForVerification] = useState<Team | null>(null);
  const [verificationForm, setVerificationForm] = useState({
    govtIdNumber: '',
    contactNumber: '',
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchTournamentData();
    }
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      // NOTE: PostgREST can still cap responses to 1000 rows even when using .range().
      // So we page manually for teams/assignments to reliably load 2500+ rows.
      const fetchAllTeams = async (tournamentId: string, expectedMaxTeams?: number) => {
        const PAGE_SIZE = 1000;
        const hardCap = Math.max(expectedMaxTeams ?? 0, 5000); // safety

        const all: Team[] = [];
        for (let from = 0; from < hardCap; from += PAGE_SIZE) {
          const to = from + PAGE_SIZE - 1;
          const { data, error } = await supabase
            .from('school_tournament_teams')
            .select('*')
            .eq('tournament_id', tournamentId)
            .order('registered_at', { ascending: true })
            .range(from, to);

          if (error) throw error;
          if (data?.length) all.push(...(data as Team[]));
          if (!data || data.length < PAGE_SIZE) break;
        }

        return all;
      };

      const fetchAllAssignments = async (roomIds: string[]) => {
        const PAGE_SIZE = 1000;
        const all: Array<{ room_id: string; team_id: string }> = [];

        for (let from = 0; from < 10000; from += PAGE_SIZE) {
          const to = from + PAGE_SIZE - 1;
          const { data, error } = await supabase
            .from('school_tournament_room_assignments')
            .select('room_id, team_id')
            .in('room_id', roomIds)
            .range(from, to);

          if (error) throw error;
          if (data?.length) all.push(...(data as any));
          if (!data || data.length < PAGE_SIZE) break;
        }

        return all;
      };

      const [tournamentRes, roomsRes] = await Promise.all([
        supabase.from('school_tournaments').select('*').eq('id', id).single(),
        supabase
          .from('school_tournament_rooms')
          .select('*')
          .eq('tournament_id', id)
          .order('round_number', { ascending: true })
          .order('room_number', { ascending: true }),
      ]);

      const expectedTeams = tournamentRes.data?.max_players
        ? Math.ceil(tournamentRes.data.max_players / 4)
        : undefined;

      const allTeams = await fetchAllTeams(id, expectedTeams);

      if (tournamentRes.data) setTournament({
        ...tournamentRes.data,
         verification_type: (tournamentRes.data.verification_type as 'online' | 'spot') || 'online',
         prize_distribution_mode: (tournamentRes.data.prize_distribution_mode as 'online' | 'local_venue') || 'online',
         winners_per_room: tournamentRes.data.winners_per_room || 1
      });
      
      console.log(`[DEBUG] Teams fetched: ${allTeams.length} teams`);
      setTeams(allTeams);
      if (roomsRes.data) {
        setRooms(roomsRes.data);
        const roomStats: Record<number, { total: number; completed: number }> = {};
        roomsRes.data.forEach((room: any) => {
          if (!roomStats[room.round_number]) {
            roomStats[room.round_number] = { total: 0, completed: 0 };
          }
          roomStats[room.round_number].total++;
          if (room.status === 'completed') {
            roomStats[room.round_number].completed++;
          }
        });
        setTournamentStats({ roomsByRound: roomStats });
      }
      
      // Build room -> team_ids mapping
      const roomIds = (roomsRes.data || []).map((r: any) => r.id);
      if (roomIds.length > 0) {
        try {
          const assignments = await fetchAllAssignments(roomIds);
          const mapping: Record<string, string[]> = {};
          (assignments || []).forEach((a: any) => {
            if (!mapping[a.room_id]) mapping[a.room_id] = [];
            mapping[a.room_id].push(a.team_id);
          });
          setRoomAssignments(mapping);
        } catch (e) {
          console.warn('Failed to fetch room assignments:', e);
        }
      } else {
        setRoomAssignments({});
      }

      // Fetch all player profiles for teams in batches (Supabase .in() has URL length limits)
      if (allTeams.length > 0) {
        const allPlayerIds: string[] = [];
        allTeams.forEach((team: any) => {
          if (team.leader_id) allPlayerIds.push(team.leader_id);
          if (team.member_1_id) allPlayerIds.push(team.member_1_id);
          if (team.member_2_id) allPlayerIds.push(team.member_2_id);
          if (team.member_3_id) allPlayerIds.push(team.member_3_id);
        });
        const uniqueIds = [...new Set(allPlayerIds)];
        
        // Batch fetch profiles to avoid URL length limits (max ~300 UUIDs per batch)
        const BATCH_SIZE = 300;
        const profileMap: Record<string, PlayerProfile> = {};
        
        for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
          const batch = uniqueIds.slice(i, i + BATCH_SIZE);
          if (batch.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, username, full_name, in_game_name, game_uid')
              .in('user_id', batch);
            if (profiles) {
              profiles.forEach(p => { profileMap[p.user_id] = p; });
            }
          }
        }
        setPlayerProfiles(profileMap);
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      toast.error('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRoomTeams = (room: Room) => {
    setSelectedRoom(room);
    setViewTeamsDialogOpen(true);
  };

  const handleStartRound = async (roundNumber: number) => {
    if (!id) return;
    setProcessing(true);
    try {
      const { data: existingRooms, error: existingRoomsError } = await supabase
        .from('school_tournament_rooms')
        .select('id')
        .eq('tournament_id', id)
        .eq('round_number', roundNumber)
        .limit(1);

      if (existingRoomsError) throw existingRoomsError;

      if (existingRooms && existingRooms.length > 0) {
        const { error: updateError } = await supabase
          .from('school_tournaments')
          .update({
            status: roundNumber === tournament?.total_rounds ? 'finale' : `round_${roundNumber}`,
            current_round: roundNumber,
          })
          .eq('id', id);

        if (updateError) throw updateError;

        toast.success(`Round ${roundNumber} already started`);
        fetchTournamentData();
        return;
      }

      const { data, error } = await supabase.rpc('generate_tournament_round_rooms', {
        p_tournament_id: id,
        p_round_number: roundNumber
      });

      if (error) throw error;

      toast.success(`Round ${roundNumber} started with ${data} rooms!`);
      
      const { error: updateError } = await supabase
        .from('school_tournaments')
        .update({ 
          status: roundNumber === tournament?.total_rounds ? 'finale' : `round_${roundNumber}`,
          current_round: roundNumber
        })
        .eq('id', id);

      if (updateError) throw updateError;

      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start round');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartNextRound = async () => {
    if (!tournament) return;
    
    if (tournament.current_round >= tournament.total_rounds) {
      toast.error('Tournament has reached finale. No more rounds can be created.');
      return;
    }
    
    setProcessing(true);
    try {
      const currentRoundRoomsCheck = rooms.filter(r => r.round_number === tournament.current_round);
      const previousRoundRoomsCheck = rooms.filter(r => r.round_number === (tournament.current_round - 1));
      
      const needsCurrentRoundRooms = currentRoundRoomsCheck.length === 0 && previousRoundRoomsCheck.length > 0;
      
      const roundToProcess = needsCurrentRoundRooms 
        ? tournament.current_round - 1
        : tournament.current_round;
      
      const { data: result, error } = await supabase.functions.invoke('school-tournament-engine', {
        body: {
          action: 'start_next_round',
          tournamentId: id,
          currentRound: roundToProcess,
        }
      });

      if (error) throw error;
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to start next round');
      }
      
      const targetRound = needsCurrentRoundRooms ? tournament.current_round : (tournament.current_round || 1) + 1;
      toast.success(`Round ${targetRound} started with ${result.newRoomsCreated} rooms!`);
      
      fetchTournamentData();
    } catch (error: any) {
      console.error('Start next round error:', error);
      toast.error(error.message || 'Failed to start next round');
    } finally {
      setProcessing(false);
    }
  };

  const handleEndTournament = async () => {
    if (!tournament) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('school_tournaments')
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Tournament ended successfully!');
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to end tournament');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetRoomCredentials = async () => {
    if (!selectedRoom || !roomCredentials.roomId || !roomCredentials.password) {
      toast.error('Please fill room ID and password');
      return;
    }

    setProcessing(true);
    try {
      const updateData: any = {
        room_id: roomCredentials.roomId,
        room_password: roomCredentials.password,
        status: 'credentials_set'
      };
      
      if (roomCredentials.scheduledTime) {
        updateData.scheduled_time = new Date(roomCredentials.scheduledTime).toISOString();
      }
      
      const { error } = await supabase
        .from('school_tournament_rooms')
        .update(updateData)
        .eq('id', selectedRoom.id);

      if (error) throw error;

      toast.success('Room credentials saved!');
      setRoomDialogOpen(false);
      setRoomCredentials({ roomId: '', password: '', scheduledTime: '' });
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save credentials');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartRoom = async (roomId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('school_tournament_rooms')
        .update({ status: 'live' })
        .eq('id', roomId);

      if (error) throw error;
      toast.success('Room started!');
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start room');
    } finally {
      setProcessing(false);
    }
  };

  const handleEndRoom = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    if (!room.winner_team_id) {
      toast.error('Pehle Winner Save karo, phir Room End karo.');
      return;
    }

    setProcessing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('school-tournament-engine', {
        body: {
          action: 'end_room',
          roomId,
        }
      });

      if (error) throw error;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to end room');
      }

      toast.success('Room ended!');
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to end room');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkStartRooms = async () => {
    if (selectedRoomIds.length === 0) {
      toast.error('Select at least one room');
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('school_tournament_rooms')
        .update({ status: 'live' })
        .in('id', selectedRoomIds);

      if (error) throw error;
      toast.success(`${selectedRoomIds.length} rooms started!`);
      setSelectedRoomIds([]);
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start rooms');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkEndRooms = async () => {
    if (selectedRoomIds.length === 0) {
      toast.error('Select at least one room');
      return;
    }

    const selectedRooms = rooms.filter(r => selectedRoomIds.includes(r.id));
    const missingWinner = selectedRooms.filter(r => !r.winner_team_id);
    if (missingWinner.length > 0) {
      toast.error(`${missingWinner.length} rooms me winner save nahi hai. Pehle Winner Save karo.`);
      return;
    }

    setProcessing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('school-tournament-engine', {
        body: {
          action: 'bulk_end_rooms',
          roomIds: selectedRoomIds,
        }
      });

      if (error) throw error;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to end rooms');
      }

      toast.success(`${result.endedCount || selectedRoomIds.length} rooms ended!`);
      setSelectedRoomIds([]);
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to end rooms');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclareRoomWinner = async () => {
    if (!selectedRoom || !selectedWinnerTeam) {
      toast.error('Please select a winner team');
      return;
    }

    setProcessing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('school-tournament-engine', {
        body: {
          action: 'save_room_winner',
          roomId: selectedRoom.id,
          winnerTeamId: selectedWinnerTeam,
        }
      });

      if (error) throw error;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to save winner');
      }

      toast.success('Winner saved! Ab Room End karo.');
      setDeclareWinnerDialogOpen(false);
      setSelectedWinnerTeam('');
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save winner');
    } finally {
      setProcessing(false);
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/join-school-tournament/${tournament?.private_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  };

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds(prev => 
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  // Verification Functions
  const handleOpenVerification = (team: Team) => {
    setSelectedTeamForVerification(team);
    setVerificationForm({
      govtIdNumber: team.govt_id_number || '',
      contactNumber: team.contact_number || '',
      notes: team.verification_notes || ''
    });
    setVerificationDialogOpen(true);
  };

  const handleVerifyTeam = async () => {
    if (!selectedTeamForVerification || !verificationForm.govtIdNumber || !verificationForm.contactNumber) {
      toast.error('Please fill Govt ID and Contact Number');
      return;
    }
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('school_tournament_teams')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
          govt_id_number: verificationForm.govtIdNumber,
          contact_number: verificationForm.contactNumber,
          verification_notes: verificationForm.notes || null
        })
        .eq('id', selectedTeamForVerification.id);

      if (error) throw error;

      toast.success('Team verified successfully!');
      setVerificationDialogOpen(false);
      setSelectedTeamForVerification(null);
      setVerificationForm({ govtIdNumber: '', contactNumber: '', notes: '' });
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify team');
    } finally {
      setProcessing(false);
    }
  };

  const handleUnverifyTeam = async (teamId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('school_tournament_teams')
        .update({
          is_verified: false,
          verified_at: null,
          verified_by: null
        })
        .eq('id', teamId);

      if (error) throw error;
      toast.success('Verification removed');
      fetchTournamentData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove verification');
    } finally {
      setProcessing(false);
    }
  };

  const generateVerificationFormPDF = () => {
    if (!tournament) return;
    
    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Team Verification Form - ${tournament.tournament_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; padding: 30px; background: white; }
    .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 15px; margin-bottom: 25px; }
    .header h1 { color: #1a1a1a; font-size: 20px; margin-bottom: 5px; }
    .header h2 { color: #666; font-size: 14px; font-weight: normal; }
    .brand { color: #f97316; font-weight: bold; font-size: 12px; margin-top: 8px; }
    .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .info-box p { font-size: 12px; margin-bottom: 5px; }
    .info-box strong { color: #333; }
    .section { margin-bottom: 25px; }
    .section-title { background: #333; color: white; padding: 8px 12px; font-size: 13px; font-weight: bold; margin-bottom: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 10px; font-size: 11px; text-align: left; }
    th { background: #f5f5f5; font-weight: bold; }
    .fill-field { height: 35px; background: #fafafa; }
    .signature-box { display: flex; gap: 20px; margin-top: 20px; }
    .signature-item { flex: 1; border: 1px solid #ddd; padding: 15px; text-align: center; }
    .signature-item p { font-size: 10px; color: #666; margin-bottom: 40px; }
    .signature-line { border-top: 1px solid #333; padding-top: 5px; font-size: 11px; }
    .rules { background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #f97316; }
    .rules h4 { color: #e65100; font-size: 12px; margin-bottom: 10px; }
    .rules ul { font-size: 11px; color: #666; padding-left: 20px; }
    .rules li { margin-bottom: 5px; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 10px; }
    .checkbox { width: 14px; height: 14px; border: 2px solid #333; display: inline-block; margin-right: 8px; vertical-align: middle; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tournament.tournament_name}</h1>
    <h2>${tournament.school_name}, ${tournament.school_city}</h2>
    <p class="brand">VYUHA ESPORT - TEAM VERIFICATION FORM</p>
  </div>

  <div class="info-box">
    <p><strong>Game:</strong> ${tournament.game} | <strong>Date:</strong> ${new Date(tournament.tournament_date).toLocaleDateString()}</p>
    <p><strong>Registration Code:</strong> ${tournament.private_code}</p>
  </div>

  <div class="section">
    <div class="section-title">TEAM DETAILS</div>
    <table>
      <tr>
        <th style="width: 25%;">Team Name</th>
        <td class="fill-field" colspan="3"></td>
      </tr>
      <tr>
        <th>Team Number</th>
        <td class="fill-field"></td>
        <th>Date</th>
        <td class="fill-field"></td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">MEMBER DETAILS (Fill with Pen)</div>
    <table>
      <thead>
        <tr>
          <th style="width: 8%;">Role</th>
          <th style="width: 20%;">In-Game Name (IGN)</th>
          <th style="width: 18%;">Game UID</th>
          <th style="width: 12%;">Level</th>
          <th style="width: 22%;">Govt ID Number</th>
          <th style="width: 20%;">Contact Number</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Leader</strong></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
        </tr>
        <tr>
          <td>Member 2</td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
        </tr>
        <tr>
          <td>Member 3</td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
        </tr>
        <tr>
          <td>Member 4</td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
          <td class="fill-field"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">MEMBER SIGNATURES</div>
    <div class="signature-box">
      <div class="signature-item">
        <p>Leader Signature</p>
        <div class="signature-line">Name: _________________</div>
      </div>
      <div class="signature-item">
        <p>Member 2 Signature</p>
        <div class="signature-line">Name: _________________</div>
      </div>
      <div class="signature-item">
        <p>Member 3 Signature</p>
        <div class="signature-line">Name: _________________</div>
      </div>
      <div class="signature-item">
        <p>Member 4 Signature</p>
        <div class="signature-line">Name: _________________</div>
      </div>
    </div>
  </div>

  <div class="rules">
    <h4>⚠️ MANDATORY RULES</h4>
    <ul>
      <li>All members must bring valid Government ID proof (Aadhaar/School ID)</li>
      <li>IGN and UID must match the registered details exactly</li>
      <li>All team members must be present during verification</li>
      <li>Fake details will result in immediate disqualification</li>
      <li>Tournament entry only allowed after successful verification</li>
    </ul>
  </div>

  <div class="section" style="margin-top: 25px;">
    <div class="section-title">ORGANIZER VERIFICATION</div>
    <table>
      <tr>
        <td style="width: 50%;">
          <p style="margin-bottom: 40px;">
            <span class="checkbox"></span> All documents verified
          </p>
          <p>
            <span class="checkbox"></span> All members present
          </p>
        </td>
        <td style="width: 50%; text-align: center;">
          <p style="margin-bottom: 50px; color: #666; font-size: 10px;">Organizer Signature & Stamp</p>
          <div style="border-top: 1px solid #333; padding-top: 5px;">
            Verified By: _________________
          </div>
        </td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()} | © VYUHA ESPORT</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) printWindow.onload = () => printWindow.print();
  };

  // PDF Generation Functions
  const generateTeamsPDF = () => {
    if (!tournament || teams.length === 0) return;
    
    const sortedTeams = [...teams].sort((a, b) => {
      if (a.is_eliminated !== b.is_eliminated) return a.is_eliminated ? 1 : -1;
      return 0;
    });

    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tournament.tournament_name} - Teams List</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: #1a1a1a; margin: 0 0 5px 0; font-size: 18px; }
    .header p { color: #666; margin: 0; font-size: 12px; }
    .brand { color: #f97316; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f97316; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .eliminated { background: #fee2e2 !important; text-decoration: line-through; opacity: 0.7; }
    .team-number { font-weight: bold; background: #f97316; color: white; text-align: center; width: 30px; }
    .footer { margin-top: 20px; text-align: center; color: #666; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tournament.tournament_name}</h1>
    <p>${tournament.school_name} | ${new Date(tournament.tournament_date).toLocaleDateString()}</p>
    <p class="brand">VYUHA ESPORT</p>
  </div>
  
  <h3>All Teams (${teams.length})</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Team Name</th>
        <th>Leader</th>
        <th>Member 2</th>
        <th>Member 3</th>
        <th>Member 4</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${sortedTeams.map((team, index) => {
        const leader = playerProfiles[team.leader_id];
        const m1 = team.member_1_id ? playerProfiles[team.member_1_id] : null;
        const m2 = team.member_2_id ? playerProfiles[team.member_2_id] : null;
        const m3 = team.member_3_id ? playerProfiles[team.member_3_id] : null;
        return `
          <tr class="${team.is_eliminated ? 'eliminated' : ''}">
            <td class="team-number">${index + 1}</td>
            <td>${team.team_name}</td>
            <td>${leader?.in_game_name || leader?.username || 'N/A'}</td>
            <td>${m1?.in_game_name || m1?.username || '-'}</td>
            <td>${m2?.in_game_name || m2?.username || '-'}</td>
            <td>${m3?.in_game_name || m3?.username || '-'}</td>
            <td>${team.is_eliminated ? 'Eliminated' : 'Active'}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()} | © VYUHA ESPORT</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) printWindow.onload = () => printWindow.print();
  };

  const generateRoomPDF = (room: Room) => {
    if (!tournament) return;
    
    const teamIds = roomAssignments[room.id] || [];
    const roomTeams = teams.filter(t => teamIds.includes(t.id));

    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${room.room_name} - Teams</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: #1a1a1a; margin: 0 0 5px 0; font-size: 18px; }
    .header p { color: #666; margin: 0; font-size: 12px; }
    .brand { color: #f97316; font-weight: bold; }
    .room-info { background: #fff3e0; padding: 10px; border-radius: 8px; margin-bottom: 15px; }
    .room-info p { margin: 3px 0; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f97316; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .slot { font-weight: bold; background: #f97316; color: white; text-align: center; width: 30px; }
    .footer { margin-top: 20px; text-align: center; color: #666; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tournament.tournament_name}</h1>
    <p>${tournament.school_name}</p>
    <p class="brand">VYUHA ESPORT</p>
  </div>
  
  <div class="room-info">
    <p><strong>${room.room_name}</strong> | Round ${room.round_number}</p>
    ${room.room_id ? `<p>Room ID: ${room.room_id} | Password: ${room.room_password}</p>` : ''}
    ${room.scheduled_time ? `<p>Time: ${new Date(room.scheduled_time).toLocaleString()}</p>` : ''}
  </div>
  
  <h3>Teams (${roomTeams.length})</h3>
  <table>
    <thead>
      <tr>
        <th>Slot</th>
        <th>Team Name</th>
        <th>Leader (IGN)</th>
        <th>Leader UID</th>
        <th>M2 IGN</th>
        <th>M3 IGN</th>
        <th>M4 IGN</th>
      </tr>
    </thead>
    <tbody>
      ${roomTeams.map((team, index) => {
        const leader = playerProfiles[team.leader_id];
        const m1 = team.member_1_id ? playerProfiles[team.member_1_id] : null;
        const m2 = team.member_2_id ? playerProfiles[team.member_2_id] : null;
        const m3 = team.member_3_id ? playerProfiles[team.member_3_id] : null;
        return `
          <tr>
            <td class="slot">${index + 1}</td>
            <td>${team.team_name}</td>
            <td>${leader?.in_game_name || leader?.username || 'N/A'}</td>
            <td>${leader?.game_uid || '-'}</td>
            <td>${m1?.in_game_name || m1?.username || '-'}</td>
            <td>${m2?.in_game_name || m2?.username || '-'}</td>
            <td>${m3?.in_game_name || m3?.username || '-'}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()} | © VYUHA ESPORT</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) printWindow.onload = () => printWindow.print();
  };

  const generateAllRoomsPDF = () => {
    if (!tournament || rooms.length === 0) return;
    
    const currentRound = tournament.current_round;
    const roundRooms = rooms.filter(r => r.round_number === currentRound);
    
    let roomsContent = '';
    roundRooms.forEach((room, roomIdx) => {
      const teamIds = roomAssignments[room.id] || [];
      const roomTeams = teams.filter(t => teamIds.includes(t.id));
      
      roomsContent += `
        <div class="room-section ${roomIdx > 0 ? 'page-break' : ''}">
          <div class="room-header">
            <h3>${room.room_name}</h3>
            ${room.room_id ? `<p>ID: ${room.room_id} | Pass: ${room.room_password}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Slot</th>
                <th>Team</th>
                <th>Leader</th>
                <th>UID</th>
              </tr>
            </thead>
            <tbody>
              ${roomTeams.map((team, idx) => {
                const leader = playerProfiles[team.leader_id];
                return `
                  <tr>
                    <td class="slot">${idx + 1}</td>
                    <td>${team.team_name}</td>
                    <td>${leader?.in_game_name || leader?.username || 'N/A'}</td>
                    <td>${leader?.game_uid || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Round ${currentRound} - All Rooms</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: #1a1a1a; margin: 0 0 5px 0; font-size: 18px; }
    .brand { color: #f97316; font-weight: bold; }
    .room-section { margin-bottom: 30px; }
    .room-header { background: #f97316; color: white; padding: 8px 12px; border-radius: 4px 4px 0 0; }
    .room-header h3 { margin: 0; font-size: 14px; }
    .room-header p { margin: 3px 0 0 0; font-size: 11px; opacity: 0.9; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 6px; text-align: left; border: 1px solid #ddd; }
    th { background: #333; color: white; }
    .slot { font-weight: bold; text-align: center; width: 40px; }
    .page-break { page-break-before: always; }
    .footer { margin-top: 20px; text-align: center; color: #666; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tournament.tournament_name} - Round ${currentRound}</h1>
    <p class="brand">VYUHA ESPORT</p>
  </div>
  ${roomsContent}
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) printWindow.onload = () => printWindow.print();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'secondary';
      case 'finale': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const teamsPerRoom = tournament?.game === 'BGMI' ? 25 : 12;
  
  // Sort teams: active first, then eliminated
  const sortedTeams = [...teams].sort((a, b) => {
    if (a.is_eliminated !== b.is_eliminated) return a.is_eliminated ? 1 : -1;
    return 0;
  });
  
  const activeTeams = teams.filter(t => !t.is_eliminated);
  const currentRoundRooms = rooms.filter(r => r.round_number === tournament?.current_round);
  const previousRoundRooms = rooms.filter(r => r.round_number === (tournament?.current_round || 1) - 1);
  const hasPreviousRoundRoomsOnly = currentRoundRooms.length === 0 && previousRoundRooms.length > 0;
  const allPreviousRoomsCompleted = previousRoundRooms.every(r => r.status === 'completed');
  const allCurrentRoomsCompleted = currentRoundRooms.length > 0 && currentRoundRooms.every(r => r.status === 'completed');
  const isAtFinale = (tournament?.current_round || 0) >= (tournament?.total_rounds || 999);
  const shouldShowStartNextRound = !isAtFinale && ((hasPreviousRoundRoomsOnly && allPreviousRoomsCompleted) || allCurrentRoomsCompleted);
  const nextRoundNumber = (tournament?.current_round || 1) + (hasPreviousRoundRoomsOnly ? 0 : 1);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!tournament) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">Tournament not found</p>
          <Button className="mt-4" size="sm" onClick={() => navigate('/school-tournament')}>
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-20">
        {/* Header - Compact */}
        <div className="bg-background/95 backdrop-blur-xl border-b p-3">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/school-tournament')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold truncate">{tournament.tournament_name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {tournament.school_name}
              </p>
            </div>
            <Badge variant={getStatusColor(tournament.status)} className="text-[10px]">
              {tournament.status}
            </Badge>
          </div>

          {/* Quick Stats - Compact Grid */}
          <div className="grid grid-cols-4 gap-1.5">
            <div className="text-center p-1.5 bg-card rounded-lg">
              <p className="text-sm font-bold">{tournament.current_players}</p>
              <p className="text-[10px] text-muted-foreground">Players</p>
            </div>
            <div className="text-center p-1.5 bg-card rounded-lg">
              <p className="text-sm font-bold">{teams.length}</p>
              <p className="text-[10px] text-muted-foreground">Teams</p>
            </div>
            <div className="text-center p-1.5 bg-card rounded-lg">
              <p className="text-sm font-bold">{tournament.current_round}/{tournament.total_rounds}</p>
              <p className="text-[10px] text-muted-foreground">Round</p>
            </div>
            <div className="text-center p-1.5 bg-card rounded-lg">
              <p className="text-sm font-bold">{activeTeams.length}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
          </div>
        </div>

        {/* Action Bar - Compact */}
        <div className="flex gap-1.5 p-2 overflow-x-auto">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setQrDialogOpen(true)}>
            <QrCode className="h-3 w-3 mr-1" /> QR
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={copyShareLink}>
            <Share2 className="h-3 w-3 mr-1" /> Share
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={fetchTournamentData}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-2">
          <TabsList className={`grid w-full h-9 ${tournament.verification_type === 'spot' ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="teams" className="text-xs">Teams ({teams.length})</TabsTrigger>
            <TabsTrigger value="rooms" className="text-xs">Rooms ({rooms.length})</TabsTrigger>
            {tournament.verification_type === 'spot' && (
              <TabsTrigger value="verify" className="text-xs">
                Verify ({teams.filter(t => !t.is_verified).length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-3 space-y-3">
            {/* Tournament Info */}
            <Card>
              <CardHeader className="pb-2 p-3">
                <CardTitle className="text-xs">Tournament Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs p-3 pt-0">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game</span>
                  <span className="font-medium">{tournament.game}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="font-medium">Squad (4 players)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teams/Room</span>
                  <span className="font-medium">{teamsPerRoom}</span>
                </div>
                {tournament.entry_type === 'paid' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collected</span>
                    <span className="font-medium text-green-500">₹{tournament.total_collected}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verification</span>
                  <span className={`font-medium flex items-center gap-1 ${tournament.verification_type === 'spot' ? 'text-orange-500' : 'text-blue-500'}`}>
                    {tournament.verification_type === 'spot' ? (
                      <><UserCheck className="h-3 w-3" /> Spot</>
                    ) : (
                      <><CheckCircle className="h-3 w-3" /> Online</>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Private Code */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Join Code</p>
                    <p className="text-xl font-mono font-bold tracking-widest">
                      {tournament.private_code}
                    </p>
                  </div>
                  <Button size="sm" className="h-8" onClick={() => setQrDialogOpen(true)}>
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Round Progression Chart */}
            <RoundProgressionChart
              game={tournament.game}
              totalTeams={teams.length}
              currentRound={tournament.current_round}
              status={tournament.status}
              roomsByRound={tournamentStats.roomsByRound}
            />

            {/* Round Control */}
            <Card>
              <CardHeader className="pb-2 p-3">
                <CardTitle className="text-xs">Round Management</CardTitle>
                <CardDescription className="text-[10px]">
                  {tournament.status === 'registration' 
                    ? 'Start Round 1 when ready' 
                    : `Currently in ${tournament.status}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {tournament.status === 'registration' && teams.length >= teamsPerRoom ? (
                  <Button 
                    className="w-full h-9 text-xs" 
                    onClick={() => handleStartRound(1)}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                    Start Round 1
                  </Button>
                ) : tournament.status === 'registration' ? (
                  <div className="text-center py-3 text-muted-foreground">
                    <p className="text-xs">Need at least {teamsPerRoom} teams</p>
                    <p className="text-[10px]">Current: {teams.length} teams</p>
                  </div>
                ) : tournament.status !== 'completed' && tournament.status !== 'finale' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Rooms Completed</span>
                      <span className="font-bold">
                        {currentRoundRooms.length > 0 
                          ? `${currentRoundRooms.filter(r => r.status === 'completed').length} / ${currentRoundRooms.length}`
                          : `${previousRoundRooms.filter(r => r.status === 'completed').length} / ${previousRoundRooms.length}`
                        }
                      </span>
                    </div>
                    
                    {shouldShowStartNextRound ? (
                      <Button 
                        className="w-full h-9 text-xs" 
                        onClick={() => handleStartNextRound()}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                        {hasPreviousRoundRoomsOnly 
                          ? `Create Round ${tournament.current_round} Rooms`
                          : `Start Round ${nextRoundNumber}`
                        }
                      </Button>
                    ) : (
                      <p className="text-[10px] text-center text-muted-foreground">
                        Complete all rooms to start next round
                      </p>
                    )}
                  </div>
                ) : tournament.status === 'finale' ? (
                  <div className="space-y-2">
                    <div className="text-center">
                      <Trophy className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
                      <p className="font-semibold text-xs">Grand Finale!</p>
                      <p className="text-[10px] text-muted-foreground">{activeTeams.length} teams competing</p>
                    </div>
                    
                    {currentRoundRooms.length === 0 ? (
                      <Button 
                        className="w-full h-9 text-xs" 
                        onClick={() => handleStartRound(tournament.current_round)}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                        Start Finale Room
                      </Button>
                    ) : allCurrentRoomsCompleted ? (
                      <Button 
                        className="w-full h-9 text-xs" 
                        variant="destructive"
                        onClick={handleEndTournament}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <StopCircle className="h-3 w-3 mr-1" />}
                        End Tournament
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Finale Room</span>
                        <Badge variant={currentRoundRooms[0]?.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                          {currentRoundRooms[0]?.status || 'waiting'}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-1" />
                    <p className="font-semibold text-xs">Tournament Completed!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-3">
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={generateTeamsPDF}>
                <Download className="h-3 w-3 mr-1" /> Download PDF
              </Button>
            </div>
            <ScrollArea className="h-[60vh]">
              <div className="space-y-1.5">
                {sortedTeams.map((team, _index) => {
                  // Find team's permanent number (1-indexed based on registration order)
                  const permanentNumber = teams.findIndex(t => t.id === team.id) + 1;
                  const leader = playerProfiles[team.leader_id];
                  const m1 = team.member_1_id ? playerProfiles[team.member_1_id] : null;
                  const m2 = team.member_2_id ? playerProfiles[team.member_2_id] : null;
                  const m3 = team.member_3_id ? playerProfiles[team.member_3_id] : null;
                  
                  return (
                    <Card key={team.id} className={team.is_eliminated ? 'opacity-50 border-destructive/30' : ''}>
                      <CardContent className="p-2.5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                              {permanentNumber}
                            </div>
                            <div>
                              <p className="font-medium text-xs">{team.team_name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Round {team.current_round} • {team.registration_method}
                              </p>
                            </div>
                          </div>
                          {team.is_eliminated ? (
                            <Badge variant="destructive" className="text-[10px]">Eliminated</Badge>
                          ) : team.final_rank ? (
                            <Badge className="text-[10px]">
                              {team.final_rank === 1 && <Crown className="h-3 w-3 mr-1" />}
                              #{team.final_rank}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Active</Badge>
                          )}
                        </div>
                        
                        {/* Player Cards */}
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            { label: 'Leader', profile: leader },
                            { label: 'M2', profile: m1 },
                            { label: 'M3', profile: m2 },
                            { label: 'M4', profile: m3 },
                          ].map((player, pIdx) => (
                            <div key={pIdx} className="bg-muted/50 rounded p-1.5 text-[10px]">
                              <p className="text-muted-foreground">{player.label}</p>
                              <p className="font-medium truncate">
                                {player.profile?.in_game_name || player.profile?.username || '-'}
                              </p>
                              {player.profile?.game_uid && (
                                <p className="text-muted-foreground truncate">UID: {player.profile.game_uid}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms" className="mt-3">
            {rooms.length === 0 ? (
              <Card className="text-center py-6">
                <CardContent>
                  <Gamepad2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No rooms created yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Start a round to generate rooms</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Bulk Actions */}
                <div className="flex gap-1.5 mb-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs flex-1"
                    onClick={handleBulkStartRooms}
                    disabled={selectedRoomIds.length === 0 || processing}
                  >
                    <Play className="h-3 w-3 mr-1" /> Start ({selectedRoomIds.length})
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs flex-1"
                    onClick={handleBulkEndRooms}
                    disabled={selectedRoomIds.length === 0 || processing}
                  >
                    <StopCircle className="h-3 w-3 mr-1" /> End ({selectedRoomIds.length})
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs"
                    onClick={generateAllRoomsPDF}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>

                <ScrollArea className="h-[55vh]">
                  <div className="space-y-1.5">
                    {rooms.map((room) => (
                      <Card key={room.id}>
                        <CardContent className="p-2.5">
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox 
                              checked={selectedRoomIds.includes(room.id)}
                              onCheckedChange={() => toggleRoomSelection(room.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-xs">{room.room_name}</p>
                                <Badge variant={
                                  room.status === 'completed' ? 'default' :
                                  room.status === 'live' ? 'secondary' :
                                  room.status === 'credentials_set' ? 'secondary' : 'outline'
                                } className="text-[10px]">
                                  {room.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>R{room.round_number} • Room {room.room_number}</span>
                                {room.scheduled_time && (
                                  <span className="flex items-center gap-0.5 text-primary">
                                    <Timer className="h-2.5 w-2.5" />
                                    {new Date(room.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {room.room_id && (
                            <div className="flex items-center gap-1.5 text-[10px] bg-muted p-1.5 rounded mb-2">
                              <Lock className="h-2.5 w-2.5" />
                              <span>ID: {room.room_id}</span>
                              <span>•</span>
                              <span>Pass: {room.room_password}</span>
                            </div>
                          )}

                          <div className="flex gap-1 flex-wrap">
                            <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => handleViewRoomTeams(room)}>
                              <Eye className="h-2.5 w-2.5 mr-0.5" /> Teams ({(roomAssignments[room.id] || []).length})
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => generateRoomPDF(room)}>
                              <FileText className="h-2.5 w-2.5 mr-0.5" /> PDF
                            </Button>
                            
                            {room.status === 'waiting' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px]"
                                onClick={() => {
                                  setSelectedRoom(room);
                                  setRoomDialogOpen(true);
                                }}
                              >
                                <Lock className="h-2.5 w-2.5 mr-0.5" /> Credentials
                              </Button>
                            )}
                            
                            {(room.status === 'waiting' || room.status === 'credentials_set') && (
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="h-7 text-[10px]"
                                onClick={() => handleStartRoom(room.id)}
                                disabled={processing}
                              >
                                <Play className="h-2.5 w-2.5 mr-0.5" /> Start
                              </Button>
                            )}
                            
                            {room.status === 'live' && (
                              <>
                                <Button
                                  size="sm" 
                                  variant="destructive" 
                                  className="h-7 text-[10px]"
                                  onClick={() => handleEndRoom(room.id)}
                                  disabled={processing}
                                >
                                  <StopCircle className="h-2.5 w-2.5 mr-0.5" /> End
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="h-7 text-[10px]"
                                  onClick={() => {
                                    setSelectedRoom(room);
                                    setDeclareWinnerDialogOpen(true);
                                  }}
                                >
                                  <Trophy className="h-2.5 w-2.5 mr-0.5" /> Winner
                                </Button>
                              </>
                            )}
                            
                            {room.winner_team_id && (
                              <div className="flex items-center gap-1 text-[10px] text-green-500">
                                <CheckCircle className="h-3 w-3" /> Done
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          {/* Verification Tab (Spot Verification Only) */}
          {tournament.verification_type === 'spot' && (
            <TabsContent value="verify" className="mt-3 space-y-3">
              {/* Verification Header */}
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="h-4 w-4 text-orange-500" />
                    <h3 className="font-semibold text-sm">Spot Verification Required</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Teams must visit {tournament.school_name} for physical ID verification before they can participate.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 text-xs" onClick={generateVerificationFormPDF}>
                      <FileText className="h-3 w-3 mr-1" /> Print Verification Form
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Stats */}
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-2.5 text-center">
                  <p className="text-lg font-bold text-green-500">{teams.filter(t => t.is_verified).length}</p>
                  <p className="text-[10px] text-muted-foreground">Verified</p>
                </Card>
                <Card className="p-2.5 text-center">
                  <p className="text-lg font-bold text-orange-500">{teams.filter(t => !t.is_verified).length}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </Card>
                <Card className="p-2.5 text-center">
                  <p className="text-lg font-bold">{teams.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </Card>
              </div>

              {/* Teams to Verify */}
              <ScrollArea className="h-[50vh]">
                <div className="space-y-2">
                  {teams
                    .sort((a, b) => {
                      if (a.is_verified === b.is_verified) return 0;
                      return a.is_verified ? 1 : -1;
                    })
                    .map((team, _idx) => {
                      const leader = playerProfiles[team.leader_id];
                      const teamNumber = teams
                        .sort((a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime())
                        .findIndex(t => t.id === team.id) + 1;
                      
                      return (
                        <Card 
                          key={team.id} 
                          className={`p-3 ${team.is_verified ? 'border-green-500/30 bg-green-500/5' : 'border-orange-500/30'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                team.is_verified ? 'bg-green-500 text-white' : 'bg-orange-500/20 text-orange-500'
                              }`}>
                                {teamNumber}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs truncate">{team.team_name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {leader?.in_game_name || leader?.username || 'Unknown'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              {team.is_verified ? (
                                <>
                                  <Badge className="bg-green-500 text-white text-[9px]">
                                    <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Verified
                                  </Badge>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 text-[10px]"
                                    onClick={() => handleUnverifyTeam(team.id)}
                                    disabled={processing}
                                  >
                                    Undo
                                  </Button>
                                </>
                              ) : (
                                <Button 
                                  size="sm" 
                                  className="h-7 text-[10px] bg-orange-500 hover:bg-orange-600"
                                  onClick={() => handleOpenVerification(team)}
                                >
                                  <ClipboardCheck className="h-3 w-3 mr-1" /> Verify
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {team.is_verified && team.govt_id_number && (
                            <div className="mt-2 pt-2 border-t border-border/30 grid grid-cols-2 gap-2 text-[10px]">
                              <div className="flex items-center gap-1">
                                <IdCard className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">ID:</span>
                                <span className="font-mono">{team.govt_id_number}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Phone:</span>
                                <span className="font-mono">{team.contact_number}</span>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Verification Dialog */}
      <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-orange-500" />
              Verify Team
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedTeamForVerification?.team_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-2.5 bg-muted/30 rounded-lg text-[10px] text-muted-foreground">
              <p className="font-medium text-foreground text-xs mb-1">Verification Checklist:</p>
              <ul className="space-y-0.5">
                <li>• Check Government ID proof (Aadhaar/School ID)</li>
                <li>• Verify IGN and UID match registered details</li>
                <li>• Confirm all team members are present</li>
                <li>• Collect signatures on verification form</li>
              </ul>
            </div>
            
            <div>
              <Label className="text-xs">Government ID Number *</Label>
              <Input
                placeholder="Aadhaar / School ID Number"
                className="h-9 text-xs"
                value={verificationForm.govtIdNumber}
                onChange={(e) => setVerificationForm(prev => ({ ...prev, govtIdNumber: e.target.value }))}
              />
            </div>
            
            <div>
              <Label className="text-xs">Contact Number *</Label>
              <Input
                placeholder="Leader's Phone Number"
                className="h-9 text-xs"
                maxLength={10}
                value={verificationForm.contactNumber}
                onChange={(e) => setVerificationForm(prev => ({ ...prev, contactNumber: e.target.value.replace(/\D/g, '') }))}
              />
            </div>
            
            <div>
              <Label className="text-xs">Notes (Optional)</Label>
              <Input
                placeholder="Any additional notes..."
                className="h-9 text-xs"
                value={verificationForm.notes}
                onChange={(e) => setVerificationForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            
            <Button 
              className="w-full h-9 text-xs bg-green-500 hover:bg-green-600"
              onClick={handleVerifyTeam}
              disabled={processing || !verificationForm.govtIdNumber || !verificationForm.contactNumber}
            >
              {processing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              Confirm Verification
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Tournament QR Code</DialogTitle>
            <DialogDescription className="text-xs">Scan to join</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-3">
            <div className="bg-white p-3 rounded-lg">
              <QRCodeCanvas
                value={`${window.location.origin}/join-school-tournament/${tournament?.private_code}`}
                size={160}
                level="H"
              />
            </div>
            <p className="text-xl font-mono font-bold mt-3 tracking-widest">
              {tournament?.private_code}
            </p>
            <Button className="mt-3 w-full h-9 text-xs" onClick={copyShareLink}>
              <Share2 className="h-3 w-3 mr-1" /> Copy Join Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Credentials Dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Set Room Credentials</DialogTitle>
            <DialogDescription className="text-xs">{selectedRoom?.room_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Room ID *</Label>
              <Input
                placeholder="Enter Room ID"
                className="h-9 text-xs"
                value={roomCredentials.roomId}
                onChange={(e) => setRoomCredentials(prev => ({ ...prev, roomId: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Password *</Label>
              <Input
                placeholder="Enter Password"
                className="h-9 text-xs"
                value={roomCredentials.password}
                onChange={(e) => setRoomCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Timer className="h-3 w-3" /> Start Time (Optional)
              </Label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={roomCredentials.scheduledTime}
                onChange={(e) => setRoomCredentials(prev => ({ ...prev, scheduledTime: e.target.value }))}
              />
            </div>
            <Button 
              className="w-full h-9 text-xs" 
              onClick={handleSetRoomCredentials}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
              Save Credentials
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Declare Winner Dialog */}
      <Dialog open={declareWinnerDialogOpen} onOpenChange={setDeclareWinnerDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Declare Room Winner</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedRoom?.room_name} - Select the winning team
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <ScrollArea className="h-[250px]">
              <div className="space-y-1.5">
                {selectedRoom && roomAssignments[selectedRoom.id] ? (
                  teams
                    .filter(t => roomAssignments[selectedRoom.id]?.includes(t.id))
                    .map((team) => (
                      <button
                        key={team.id}
                        className={`w-full p-2.5 rounded-lg border text-left transition-colors text-xs ${
                          selectedWinnerTeam === team.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-muted hover:bg-muted'
                        }`}
                        onClick={() => setSelectedWinnerTeam(team.id)}
                      >
                        <div className="flex items-center gap-2">
                          {selectedWinnerTeam === team.id && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium">{team.team_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {team.registration_method} registration
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-xs">
                    No teams assigned to this room
                  </p>
                )}
              </div>
            </ScrollArea>
            <Button 
              className="w-full mt-3 h-9 text-xs" 
              onClick={handleDeclareRoomWinner}
              disabled={!selectedWinnerTeam || processing}
            >
              {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trophy className="h-3 w-3 mr-1" />}
              Confirm Winner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Teams Dialog */}
      <Dialog open={viewTeamsDialogOpen} onOpenChange={setViewTeamsDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              {selectedRoom?.room_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {(roomAssignments[selectedRoom?.id || ''] || []).length} teams assigned
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-2">
            <div className="space-y-2">
              {selectedRoom && roomAssignments[selectedRoom.id] ? (
                teams
                  .filter(t => roomAssignments[selectedRoom.id]?.includes(t.id))
                  .map((team, idx) => {
                    const permanentNumber = teams.findIndex(t => t.id === team.id) + 1;
                    const playerIds = [
                      team.leader_id,
                      team.member_1_id,
                      team.member_2_id,
                      team.member_3_id
                    ].filter(Boolean);

                    return (
                      <Card key={team.id}>
                        <CardContent className="p-2.5">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                {permanentNumber}
                              </div>
                              <span className="font-medium text-xs">{team.team_name}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px]">Slot {idx + 1}</Badge>
                          </div>
                          <div className="space-y-1">
                            {playerIds.map((pid, pIdx) => {
                              const profile = playerProfiles[pid as string];
                              return (
                                <div key={pid} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded text-[10px]">
                                  <span className="text-muted-foreground w-5">P{pIdx + 1}</span>
                                  <div className="flex-1">
                                    <span className="font-medium">
                                      {profile?.in_game_name || profile?.username || 'Player ' + (pIdx + 1)}
                                    </span>
                                    {profile?.game_uid && (
                                      <span className="text-muted-foreground ml-2">
                                        UID: {profile.game_uid}
                                      </span>
                                    )}
                                  </div>
                                  {pIdx === 0 && (
                                    <Badge variant="secondary" className="text-[8px] py-0">Leader</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              ) : (
                <p className="text-center text-muted-foreground py-6 text-xs">
                  No teams in this room
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SchoolTournamentManage;
