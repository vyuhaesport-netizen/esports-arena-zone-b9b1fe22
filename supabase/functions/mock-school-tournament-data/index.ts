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
    const { tournament_id, team_count } = await req.json();
    
    console.log(`Generating ${team_count} mock teams for tournament ${tournament_id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First check if teams already exist
    const { count: existingCount } = await supabase
      .from('school_tournament_teams')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournament_id);

    if (existingCount && existingCount > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Tournament already has ${existingCount} teams`,
          existing_teams: existingCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate mock UUIDs for teams
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Generate mock teams in batches of 500
    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (let batch = 0; batch < Math.ceil(team_count / BATCH_SIZE); batch++) {
      const startIdx = batch * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, team_count);
      
      const teams = [];
      for (let i = startIdx; i < endIdx; i++) {
        const teamNum = i + 1;
        teams.push({
          tournament_id,
          team_name: `Team ${String(teamNum).padStart(4, '0')}`,
          leader_id: generateUUID(),
          member_1_id: generateUUID(),
          member_2_id: generateUUID(),
          member_3_id: generateUUID(),
          registration_method: 'manual', // Valid: 'qr' or 'manual'
          current_round: 1,
          is_eliminated: false,
          registered_at: new Date().toISOString()
        });
      }

      const { error: insertError } = await supabase
        .from('school_tournament_teams')
        .insert(teams);

      if (insertError) {
        console.error(`Batch ${batch} insert error:`, insertError);
        throw insertError;
      }

      totalInserted += teams.length;
      console.log(`Inserted batch ${batch + 1}: ${teams.length} teams (Total: ${totalInserted})`);
    }

    // Update tournament stats
    const totalPlayers = team_count * 4;
    const totalCollected = team_count * 400; // Assuming 100 per player x 4 players

    const { error: updateError } = await supabase
      .from('school_tournaments')
      .update({
        current_players: totalPlayers,
        total_collected: totalCollected,
        current_round: 1
      })
      .eq('id', tournament_id);

    if (updateError) {
      console.error('Tournament update error:', updateError);
    }

    console.log(`Successfully created ${totalInserted} mock teams with ${totalPlayers} players`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        teams_created: totalInserted,
        players: totalPlayers,
        total_collected: totalCollected
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
