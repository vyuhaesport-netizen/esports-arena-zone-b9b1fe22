import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find tournaments starting within the next 2-3 minutes that are still upcoming
    const now = new Date();
    const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);
    const threeMinutesFromNow = new Date(now.getTime() + 3 * 60 * 1000);

    const { data: tournaments, error: fetchError } = await supabase
      .from('tournaments')
      .select('id, title, start_date, entry_fee, joined_users, current_prize_pool')
      .eq('status', 'upcoming')
      .gte('start_date', twoMinutesFromNow.toISOString())
      .lt('start_date', threeMinutesFromNow.toISOString());

    if (fetchError) {
      console.error('Error fetching tournaments:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tournaments || tournaments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tournaments need recalculation', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const tournament of tournaments) {
      // Call the recalculate function
      const { data, error } = await supabase.rpc('recalculate_tournament_prizepool', {
        p_tournament_id: tournament.id,
      });

      if (error) {
        console.error(`Error recalculating tournament ${tournament.id}:`, error);
        results.push({ id: tournament.id, title: tournament.title, success: false, error: error.message });
      } else {
        console.log(`Recalculated tournament ${tournament.id}:`, data);
        results.push({ id: tournament.id, title: tournament.title, success: true, ...data });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${tournaments.length} tournaments`, 
        processed: tournaments.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recalculate-prizepools:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
