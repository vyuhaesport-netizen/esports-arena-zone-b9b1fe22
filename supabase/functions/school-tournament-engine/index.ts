import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RoomDistribution {
  roomNumber: number;
  teams: string[];
  scheduledTime?: string;
}

interface TournamentStructure {
  playersPerRoom: number;
  teamsPerRoom: number;
  totalTeams: number;
  initialRooms: number;
  totalRounds: number;
  finaleMaxTeams: number;
  roundBreakdown: { round: number; rooms: number; teams: number }[];
}

// Calculate tournament structure based on game and player count
function calculateTournamentStructure(game: string, maxPlayers: number): TournamentStructure {
  const playersPerRoom = game === "BGMI" ? 100 : 50;
  const teamsPerRoom = game === "BGMI" ? 25 : 12;
  const finaleMaxTeams = teamsPerRoom;
  
  // Squad mode = 4 players per team
  const totalTeams = Math.ceil(maxPlayers / 4);
  const initialRooms = Math.ceil(totalTeams / teamsPerRoom);
  
  // Calculate rounds needed
  const roundBreakdown: { round: number; rooms: number; teams: number }[] = [];
  let currentTeams = totalTeams;
  let roundNum = 1;
  
  while (currentTeams > finaleMaxTeams) {
    const roomsNeeded = Math.ceil(currentTeams / teamsPerRoom);
    roundBreakdown.push({ round: roundNum, rooms: roomsNeeded, teams: currentTeams });
    currentTeams = roomsNeeded; // Top 1 from each room advances
    roundNum++;
  }
  
  // Add finale round
  roundBreakdown.push({ round: roundNum, rooms: 1, teams: currentTeams });
  
  return {
    playersPerRoom,
    teamsPerRoom,
    totalTeams,
    initialRooms,
    totalRounds: roundNum,
    finaleMaxTeams,
    roundBreakdown
  };
}

// Distribute teams into rooms with random shuffling
function distributeTeamsToRooms(teamIds: string[], teamsPerRoom: number): RoomDistribution[] {
  // Shuffle teams randomly for fair distribution
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  
  const rooms: RoomDistribution[] = [];
  let roomNumber = 1;
  
  for (let i = 0; i < shuffled.length; i += teamsPerRoom) {
    const roomTeams = shuffled.slice(i, i + teamsPerRoom);
    rooms.push({
      roomNumber,
      teams: roomTeams
    });
    roomNumber++;
  }
  
  return rooms;
}

// Generate scheduled times for rooms (15 min gap between rooms)
function generateRoomSchedules(rooms: RoomDistribution[], startTime: Date): RoomDistribution[] {
  const scheduleGapMinutes = 15;
  
  return rooms.map((room, index) => ({
    ...room,
    scheduledTime: new Date(startTime.getTime() + (index * scheduleGapMinutes * 60 * 1000)).toISOString()
  }));
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, ...params } = await req.json();

    switch (action) {
      case "calculate_structure": {
        // Calculate tournament structure without creating anything
        const { game, maxPlayers } = params;
        const structure = calculateTournamentStructure(game, maxPlayers);
        
        return new Response(JSON.stringify({ success: true, structure }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "generate_round": {
        // Generate rooms for a specific round
        const { tournamentId, roundNumber } = params;
        
        // Get tournament details
        const { data: tournament, error: tournamentError } = await supabase
          .from("school_tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single();
        
        if (tournamentError || !tournament) {
          throw new Error("Tournament not found");
        }
        
        // Check if rooms already exist for this round
        const { data: existingRooms } = await supabase
          .from("school_tournament_rooms")
          .select("id")
          .eq("tournament_id", tournamentId)
          .eq("round_number", roundNumber);
        
        if (existingRooms && existingRooms.length > 0) {
          // Rooms already exist, just return success
          return new Response(JSON.stringify({ 
            success: true, 
            roomsCreated: 0,
            teamsAssigned: 0,
            message: "Rooms already exist for this round"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        const teamsPerRoom = tournament.game === "BGMI" ? 25 : 12;
        
        // Get active teams for this round
        const { data: activeTeams, error: teamsError } = await supabase
          .from("school_tournament_teams")
          .select("id")
          .eq("tournament_id", tournamentId)
          .eq("is_eliminated", false)
          .eq("current_round", roundNumber);
        
        if (teamsError) {
          throw new Error("Failed to fetch teams: " + teamsError.message);
        }
        
        if (!activeTeams || activeTeams.length === 0) {
          throw new Error("No active teams found for this round");
        }
        
        const teamIds = activeTeams.map(t => t.id);
        
        // Distribute teams into rooms
        let rooms = distributeTeamsToRooms(teamIds, teamsPerRoom);
        
        // Add scheduled times (start from tournament date)
        const startTime = new Date(tournament.tournament_date);
        rooms = generateRoomSchedules(rooms, startTime);
        
        // Create rooms in database
        const roomInserts = rooms.map(room => ({
          tournament_id: tournamentId,
          round_number: roundNumber,
          room_number: room.roomNumber,
          room_name: `Round ${roundNumber} - Room ${room.roomNumber}`,
          scheduled_time: room.scheduledTime,
          status: "waiting"
        }));
        
        const { data: createdRooms, error: roomsError } = await supabase
          .from("school_tournament_rooms")
          .insert(roomInserts)
          .select();
        
        if (roomsError) {
          throw new Error("Failed to create rooms: " + roomsError.message);
        }
        
        // Create room assignments
        const assignments: { room_id: string; team_id: string; slot_number: number }[] = [];
        
        for (let i = 0; i < rooms.length; i++) {
          const room = rooms[i];
          const createdRoom = createdRooms[i];
          
          room.teams.forEach((teamId, slotIndex) => {
            assignments.push({
              room_id: createdRoom.id,
              team_id: teamId,
              slot_number: slotIndex + 1
            });
          });
        }
        
        const { error: assignError } = await supabase
          .from("school_tournament_room_assignments")
          .insert(assignments);
        
        if (assignError) {
          throw new Error("Failed to assign teams: " + assignError.message);
        }
        
        // Update tournament status
        const newStatus = roundNumber === tournament.total_rounds ? "finale" : `round_${roundNumber}`;
        await supabase
          .from("school_tournaments")
          .update({ 
            status: newStatus, 
            current_round: roundNumber,
            updated_at: new Date().toISOString()
          })
          .eq("id", tournamentId);
        
        return new Response(JSON.stringify({ 
          success: true, 
          roomsCreated: createdRooms.length,
          teamsAssigned: assignments.length
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "declare_room_winner": {
        // Declare winner for a room and handle progression
        const { roomId, winnerTeamId } = params;
        
        // Get room details with tournament
        const { data: room, error: roomError } = await supabase
          .from("school_tournament_rooms")
          .select(`
            *,
            tournament:school_tournaments(*)
          `)
          .eq("id", roomId)
          .single();
        
        if (roomError || !room) {
          throw new Error("Room not found");
        }
        
        const tournament = room.tournament;
        const teamsPerRoom = tournament.game === "BGMI" ? 25 : 12;
        
        // Verify winner is in this room
        const { data: assignment } = await supabase
          .from("school_tournament_room_assignments")
          .select("id")
          .eq("room_id", roomId)
          .eq("team_id", winnerTeamId)
          .single();
        
        if (!assignment) {
          throw new Error("Winner team is not in this room");
        }
        
        // Mark room as completed with winner
        await supabase
          .from("school_tournament_rooms")
          .update({ 
            winner_team_id: winnerTeamId, 
            status: "completed",
            updated_at: new Date().toISOString()
          })
          .eq("id", roomId);
        
        // Mark winner assignment
        await supabase
          .from("school_tournament_room_assignments")
          .update({ is_winner: true, match_rank: 1 })
          .eq("room_id", roomId)
          .eq("team_id", winnerTeamId);
        
        // Advance winner to next round
        await supabase
          .from("school_tournament_teams")
          .update({ 
            current_round: room.round_number + 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", winnerTeamId);
        
        // Eliminate all other teams in this room
        const { data: otherTeams } = await supabase
          .from("school_tournament_room_assignments")
          .select("team_id")
          .eq("room_id", roomId)
          .neq("team_id", winnerTeamId);
        
        if (otherTeams && otherTeams.length > 0) {
          const eliminatedIds = otherTeams.map(t => t.team_id);
          await supabase
            .from("school_tournament_teams")
            .update({ 
              is_eliminated: true, 
              eliminated_at_round: room.round_number,
              updated_at: new Date().toISOString()
            })
            .in("id", eliminatedIds);
        }
        
        // Check if all rooms in this round are completed
        const { data: incompleteRooms } = await supabase
          .from("school_tournament_rooms")
          .select("id")
          .eq("tournament_id", tournament.id)
          .eq("round_number", room.round_number)
          .neq("status", "completed");
        
        let roundComplete = !incompleteRooms || incompleteRooms.length === 0;
        let nextRoundGenerated = false;
        let isFinalRound = false;
        let newRoomsCreated = 0;
        
        if (roundComplete) {
          // All rooms in this round are done - automatically progress to next round
          console.log(`Round ${room.round_number} complete! Processing automatic progression...`);
          
          // Get all winners from this round (teams that advanced)
          const { data: advancedTeams } = await supabase
            .from("school_tournament_teams")
            .select("id")
            .eq("tournament_id", tournament.id)
            .eq("is_eliminated", false)
            .eq("current_round", room.round_number + 1);
          
          const winnerCount = advancedTeams?.length || 0;
          console.log(`${winnerCount} teams advanced to round ${room.round_number + 1}`);
          
          // Check if this is the finale (<=12 teams for Free Fire, <=25 for BGMI)
          if (winnerCount <= teamsPerRoom) {
            // This is the finale round
            isFinalRound = true;
            console.log("Finale round reached!");
            
            // Delete old round rooms and assignments
            const { data: oldRooms } = await supabase
              .from("school_tournament_rooms")
              .select("id")
              .eq("tournament_id", tournament.id)
              .eq("round_number", room.round_number);
            
            if (oldRooms && oldRooms.length > 0) {
              const oldRoomIds = oldRooms.map(r => r.id);
              
              // Delete assignments first (foreign key constraint)
              await supabase
                .from("school_tournament_room_assignments")
                .delete()
                .in("room_id", oldRoomIds);
              
              // Delete old rooms
              await supabase
                .from("school_tournament_rooms")
                .delete()
                .in("id", oldRoomIds);
              
              console.log(`Deleted ${oldRooms.length} rooms from round ${room.round_number}`);
            }
            
            // Create single finale room
            const finaleRoomNumber = 1;
            const { data: finaleRoom, error: finaleError } = await supabase
              .from("school_tournament_rooms")
              .insert({
                tournament_id: tournament.id,
                round_number: room.round_number + 1,
                room_number: finaleRoomNumber,
                room_name: `Finale - Grand Final`,
                status: "waiting"
              })
              .select()
              .single();
            
            if (finaleError) {
              throw new Error("Failed to create finale room: " + finaleError.message);
            }
            
            // Assign all winners to finale room
            if (advancedTeams && advancedTeams.length > 0) {
              const finaleAssignments = advancedTeams.map((team, idx) => ({
                room_id: finaleRoom.id,
                team_id: team.id,
                slot_number: idx + 1
              }));
              
              await supabase
                .from("school_tournament_room_assignments")
                .insert(finaleAssignments);
            }
            
            // Update tournament status to finale
            await supabase
              .from("school_tournaments")
              .update({ 
                status: "finale", 
                current_round: room.round_number + 1,
                updated_at: new Date().toISOString()
              })
              .eq("id", tournament.id);
            
            newRoomsCreated = 1;
            nextRoundGenerated = true;
            
          } else {
            // More rounds needed - create next round rooms
            console.log(`Creating next round with ${winnerCount} teams...`);
            
            // Delete old round rooms and assignments
            const { data: oldRooms } = await supabase
              .from("school_tournament_rooms")
              .select("id")
              .eq("tournament_id", tournament.id)
              .eq("round_number", room.round_number);
            
            if (oldRooms && oldRooms.length > 0) {
              const oldRoomIds = oldRooms.map(r => r.id);
              
              // Delete assignments first (foreign key constraint)
              await supabase
                .from("school_tournament_room_assignments")
                .delete()
                .in("room_id", oldRoomIds);
              
              // Delete old rooms
              await supabase
                .from("school_tournament_rooms")
                .delete()
                .in("id", oldRoomIds);
              
              console.log(`Deleted ${oldRooms.length} rooms from round ${room.round_number}`);
            }
            
            // Distribute winners into new rooms
            const winnerIds = advancedTeams?.map(t => t.id) || [];
            const newRooms = distributeTeamsToRooms(winnerIds, teamsPerRoom);
            
            // Create new rooms
            const roomInserts = newRooms.map(r => ({
              tournament_id: tournament.id,
              round_number: room.round_number + 1,
              room_number: r.roomNumber,
              room_name: `Round ${room.round_number + 1} - Room ${r.roomNumber}`,
              status: "waiting"
            }));
            
            const { data: createdRooms, error: roomsError } = await supabase
              .from("school_tournament_rooms")
              .insert(roomInserts)
              .select();
            
            if (roomsError) {
              throw new Error("Failed to create next round rooms: " + roomsError.message);
            }
            
            // Create room assignments
            const assignments: { room_id: string; team_id: string; slot_number: number }[] = [];
            
            for (let i = 0; i < newRooms.length; i++) {
              const roomData = newRooms[i];
              const createdRoom = createdRooms[i];
              
              roomData.teams.forEach((teamId, slotIndex) => {
                assignments.push({
                  room_id: createdRoom.id,
                  team_id: teamId,
                  slot_number: slotIndex + 1
                });
              });
            }
            
            await supabase
              .from("school_tournament_room_assignments")
              .insert(assignments);
            
            // Update tournament current round
            await supabase
              .from("school_tournaments")
              .update({ 
                current_round: room.round_number + 1,
                status: `round_${room.round_number + 1}`,
                updated_at: new Date().toISOString()
              })
              .eq("id", tournament.id);
            
            newRoomsCreated = createdRooms.length;
            nextRoundGenerated = true;
            
            console.log(`Created ${newRoomsCreated} rooms for round ${room.round_number + 1}`);
          }
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          roundComplete,
          nextRoundGenerated,
          newRoomsCreated,
          isFinalRound
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "start_next_round": {
        // Manually trigger next round creation (after all rooms in current round are completed)
        const { tournamentId, currentRound } = params;
        
        // Get tournament details
        const { data: tournament, error: tournamentError } = await supabase
          .from("school_tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single();
        
        if (tournamentError || !tournament) {
          throw new Error("Tournament not found");
        }
        
        const teamsPerRoom = tournament.game === "BGMI" ? 25 : 12;
        const nextRound = (currentRound || tournament.current_round || 1) + 1;
        
        // Verify all rooms in current round are completed
        const { data: incompleteRooms } = await supabase
          .from("school_tournament_rooms")
          .select("id")
          .eq("tournament_id", tournamentId)
          .eq("round_number", currentRound || tournament.current_round)
          .neq("status", "completed");
        
        if (incompleteRooms && incompleteRooms.length > 0) {
          throw new Error(`${incompleteRooms.length} rooms are not yet completed in current round`);
        }
        
        // Get all teams that advanced to next round
        const { data: advancedTeams } = await supabase
          .from("school_tournament_teams")
          .select("id")
          .eq("tournament_id", tournamentId)
          .eq("is_eliminated", false)
          .eq("current_round", nextRound);
        
        const winnerCount = advancedTeams?.length || 0;
        
        if (winnerCount === 0) {
          throw new Error("No teams advanced to next round");
        }
        
        console.log(`Starting round ${nextRound} with ${winnerCount} teams`);
        
        // Delete old round rooms and assignments
        const { data: oldRooms } = await supabase
          .from("school_tournament_rooms")
          .select("id")
          .eq("tournament_id", tournamentId)
          .eq("round_number", currentRound || tournament.current_round);
        
        if (oldRooms && oldRooms.length > 0) {
          const oldRoomIds = oldRooms.map(r => r.id);
          
          // Delete assignments first (foreign key constraint)
          await supabase
            .from("school_tournament_room_assignments")
            .delete()
            .in("room_id", oldRoomIds);
          
          // Delete old rooms
          await supabase
            .from("school_tournament_rooms")
            .delete()
            .in("id", oldRoomIds);
          
          console.log(`Deleted ${oldRooms.length} rooms from round ${currentRound || tournament.current_round}`);
        }
        
        let newRoomsCreated = 0;
        let isFinalRound = false;
        
        // Check if this is the finale (<=teams_per_room teams remaining)
        if (winnerCount <= teamsPerRoom) {
          // This is the finale round
          isFinalRound = true;
          console.log("Finale round reached!");
          
          // Create single finale room
          const { data: finaleRoom, error: finaleError } = await supabase
            .from("school_tournament_rooms")
            .insert({
              tournament_id: tournamentId,
              round_number: nextRound,
              room_number: 1,
              room_name: `Finale - Grand Final`,
              status: "waiting"
            })
            .select()
            .single();
          
          if (finaleError) {
            throw new Error("Failed to create finale room: " + finaleError.message);
          }
          
          // Assign all winners to finale room
          if (advancedTeams && advancedTeams.length > 0) {
            const finaleAssignments = advancedTeams.map((team, idx) => ({
              room_id: finaleRoom.id,
              team_id: team.id,
              slot_number: idx + 1
            }));
            
            await supabase
              .from("school_tournament_room_assignments")
              .insert(finaleAssignments);
          }
          
          // Update tournament status to finale
          await supabase
            .from("school_tournaments")
            .update({ 
              status: "finale", 
              current_round: nextRound,
              updated_at: new Date().toISOString()
            })
            .eq("id", tournamentId);
          
          newRoomsCreated = 1;
          
        } else {
          // More rounds needed - create next round rooms
          console.log(`Creating round ${nextRound} with ${winnerCount} teams...`);
          
          // Distribute winners into new rooms
          const winnerIds = advancedTeams?.map(t => t.id) || [];
          const newRooms = distributeTeamsToRooms(winnerIds, teamsPerRoom);
          
          // Create new rooms
          const roomInserts = newRooms.map(r => ({
            tournament_id: tournamentId,
            round_number: nextRound,
            room_number: r.roomNumber,
            room_name: `Round ${nextRound} - Room ${r.roomNumber}`,
            status: "waiting"
          }));
          
          const { data: createdRooms, error: roomsError } = await supabase
            .from("school_tournament_rooms")
            .insert(roomInserts)
            .select();
          
          if (roomsError) {
            throw new Error("Failed to create rooms: " + roomsError.message);
          }
          
          // Create room assignments
          const assignments: { room_id: string; team_id: string; slot_number: number }[] = [];
          
          for (let i = 0; i < newRooms.length; i++) {
            const roomData = newRooms[i];
            const createdRoom = createdRooms[i];
            
            roomData.teams.forEach((teamId, slotIndex) => {
              assignments.push({
                room_id: createdRoom.id,
                team_id: teamId,
                slot_number: slotIndex + 1
              });
            });
          }
          
          await supabase
            .from("school_tournament_room_assignments")
            .insert(assignments);
          
          // Update tournament current round
          await supabase
            .from("school_tournaments")
            .update({ 
              current_round: nextRound,
              status: `round_${nextRound}`,
              updated_at: new Date().toISOString()
            })
            .eq("id", tournamentId);
          
          newRoomsCreated = createdRooms.length;
          console.log(`Created ${newRoomsCreated} rooms for round ${nextRound}`);
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          newRoomsCreated,
          isFinalRound,
          nextRound,
          teamsAdvanced: winnerCount
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "declare_final_winners": {
        // Declare top 3 winners for the tournament
        const { tournamentId, firstPlaceTeamId, secondPlaceTeamId, thirdPlaceTeamId } = params;
        
        // Update team ranks
        const updates = [
          { id: firstPlaceTeamId, final_rank: 1 },
          { id: secondPlaceTeamId, final_rank: 2 },
          { id: thirdPlaceTeamId, final_rank: 3 }
        ];
        
        for (const update of updates) {
          await supabase
            .from("school_tournament_teams")
            .update({ final_rank: update.final_rank, updated_at: new Date().toISOString() })
            .eq("id", update.id);
        }
        
        // Mark tournament as completed
        await supabase
          .from("school_tournaments")
          .update({ 
            status: "completed",
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", tournamentId);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "get_tournament_stats": {
        // Get real-time tournament statistics
        const { tournamentId } = params;
        
        const [
          { data: tournament },
          { count: totalTeams },
          { count: activeTeams },
          { count: eliminatedTeams },
          { data: rooms }
        ] = await Promise.all([
          supabase.from("school_tournaments").select("*").eq("id", tournamentId).single(),
          supabase.from("school_tournament_teams").select("id", { count: "exact", head: true }).eq("tournament_id", tournamentId),
          supabase.from("school_tournament_teams").select("id", { count: "exact", head: true }).eq("tournament_id", tournamentId).eq("is_eliminated", false),
          supabase.from("school_tournament_teams").select("id", { count: "exact", head: true }).eq("tournament_id", tournamentId).eq("is_eliminated", true),
          supabase.from("school_tournament_rooms").select("id, round_number, status").eq("tournament_id", tournamentId)
        ]);
        
        const roomsByRound: Record<number, { total: number; completed: number }> = {};
        if (rooms) {
          rooms.forEach(room => {
            if (!roomsByRound[room.round_number]) {
              roomsByRound[room.round_number] = { total: 0, completed: 0 };
            }
            roomsByRound[room.round_number].total++;
            if (room.status === "completed") {
              roomsByRound[room.round_number].completed++;
            }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          stats: {
            tournament,
            totalTeams: totalTeams || 0,
            activeTeams: activeTeams || 0,
            eliminatedTeams: eliminatedTeams || 0,
            roomsByRound
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
