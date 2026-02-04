import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, tournament_id } = await req.json();
    console.log(`Action: ${action}, Tournament: ${tournament_id}`);

    if (action === 'generate_mock_teams') {
      // Generate 2499 mock teams (user will be the 2500th team)
      const TOTAL_MOCK_TEAMS = 2499;
      const BATCH_SIZE = 500;
      
      // Generate fake UUIDs for mock leaders (deterministic based on index)
      const generateFakeUUID = (index: number) => {
        const hex = index.toString(16).padStart(8, '0');
        return `00000000-0000-4000-8000-${hex.padStart(12, '0')}`;
      };
      
      const mockTeams = [];
      for (let i = 1; i <= TOTAL_MOCK_TEAMS; i++) {
        mockTeams.push({
          tournament_id,
          team_name: `MockTeam_${String(i).padStart(4, '0')}`,
          leader_id: generateFakeUUID(i), // Fake UUID for mock leader
          current_round: 0,
          is_eliminated: false,
          is_verified: true,
          registration_method: 'manual', // Valid value: 'qr' or 'manual'
          contact_number: `9${String(1000000000 + i).slice(1)}`,
        });
      }

      // Insert in batches
      let inserted = 0;
      for (let i = 0; i < mockTeams.length; i += BATCH_SIZE) {
        const batch = mockTeams.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('school_tournament_teams')
          .insert(batch);
        
        if (error) {
          console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error);
          throw error;
        }
        inserted += batch.length;
        console.log(`Inserted ${inserted}/${TOTAL_MOCK_TEAMS} teams`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Created ${TOTAL_MOCK_TEAMS} mock teams`,
        teams_created: TOTAL_MOCK_TEAMS 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'set_room_passwords') {
      // Get all rooms for this tournament
      const { data: rooms, error: roomsError } = await supabase
        .from('school_tournament_rooms')
        .select('id, room_number, round_number')
        .eq('tournament_id', tournament_id);

      if (roomsError) throw roomsError;

      // Update each room with a password
      for (const room of rooms || []) {
        const password = `PASS${room.round_number}R${room.room_number}`;
        await supabase
          .from('school_tournament_rooms')
          .update({ 
            room_password: password,
            room_id: `ROOM${room.round_number}_${room.room_number}`
          })
          .eq('id', room.id);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Set passwords for ${rooms?.length || 0} rooms` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'auto_manage_round') {
      // This will:
      // 1. Start all rooms in current round
      // 2. Wait 60 seconds
      // 3. Select random winners
      // 4. End all rooms
      
      const { round_number } = await req.json();
      
      // Get all rooms for this round
      const { data: rooms, error: roomsError } = await supabase
        .from('school_tournament_rooms')
        .select('id, room_number')
        .eq('tournament_id', tournament_id)
        .eq('round_number', round_number)
        .eq('status', 'pending');

      if (roomsError) throw roomsError;
      console.log(`Found ${rooms?.length || 0} pending rooms for round ${round_number}`);

      // Start all rooms
      for (const room of rooms || []) {
        await supabase
          .from('school_tournament_rooms')
          .update({ status: 'live' })
          .eq('id', room.id);
      }
      console.log('All rooms started');

      // Wait 60 seconds
      await new Promise(resolve => setTimeout(resolve, 60000));

      // Select winners and end rooms
      for (const room of rooms || []) {
        // Get teams in this room
        const { data: roomTeams } = await supabase
          .from('school_tournament_room_teams')
          .select('team_id')
          .eq('room_id', room.id);

        if (roomTeams && roomTeams.length > 0) {
          // Pick random winner
          const winnerIndex = Math.floor(Math.random() * roomTeams.length);
          const winnerId = roomTeams[winnerIndex].team_id;

          // Update room with winner and complete status
          await supabase
            .from('school_tournament_rooms')
            .update({ 
              status: 'completed',
              winner_team_id: winnerId 
            })
            .eq('id', room.id);

          // Update winner team to advance
          await supabase
            .from('school_tournament_teams')
            .update({ current_round: round_number + 1 })
            .eq('id', winnerId);

          // Eliminate other teams
          const loserIds = roomTeams
            .filter(t => t.team_id !== winnerId)
            .map(t => t.team_id);
          
          if (loserIds.length > 0) {
            await supabase
              .from('school_tournament_teams')
              .update({ 
                is_eliminated: true, 
                eliminated_at_round: round_number 
              })
              .in('id', loserIds);
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Round ${round_number} completed with winners selected` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'quick_complete_room') {
      // Quickly complete a single room with random winner
      const { room_id } = await req.json();
      
      // Get teams in this room
      const { data: roomTeams } = await supabase
        .from('school_tournament_room_teams')
        .select('team_id')
        .eq('room_id', room_id);

      if (roomTeams && roomTeams.length > 0) {
        const winnerIndex = Math.floor(Math.random() * roomTeams.length);
        const winnerId = roomTeams[winnerIndex].team_id;

        // Get room details
        const { data: room } = await supabase
          .from('school_tournament_rooms')
          .select('round_number')
          .eq('id', room_id)
          .single();

        // Update room
        await supabase
          .from('school_tournament_rooms')
          .update({ 
            status: 'completed',
            winner_team_id: winnerId 
          })
          .eq('id', room_id);

        // Update winner
        await supabase
          .from('school_tournament_teams')
          .update({ current_round: (room?.round_number || 1) + 1 })
          .eq('id', winnerId);

        // Eliminate losers
        const loserIds = roomTeams
          .filter(t => t.team_id !== winnerId)
          .map(t => t.team_id);
        
        if (loserIds.length > 0) {
          await supabase
            .from('school_tournament_teams')
            .update({ 
              is_eliminated: true, 
              eliminated_at_round: room?.round_number || 1 
            })
            .in('id', loserIds);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          winner_team_id: winnerId 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No teams in room' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (action === 'cleanup_mock_data') {
      // Delete all mock teams (those with fake UUID pattern)
      const { error } = await supabase
        .from('school_tournament_teams')
        .delete()
        .eq('tournament_id', tournament_id)
        .like('team_name', 'MockTeam_%');

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Mock data cleaned up' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
