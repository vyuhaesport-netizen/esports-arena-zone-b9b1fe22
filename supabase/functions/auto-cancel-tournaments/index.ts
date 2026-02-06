import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting auto-cancel check for tournaments...');

    // Find completed tournaments without winner declaration after 1 hour of being marked completed
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    console.log('Checking for tournaments completed before:', oneHourAgo);

    // Get regular tournaments that are completed, no winner declared, and marked completed more than 1 hour ago
    // Using updated_at since that's when status changed to 'completed'
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('id, title, entry_fee, created_by, updated_at')
      .eq('status', 'completed')
      .is('winner_declared_at', null)
      .lt('updated_at', oneHourAgo);
    
    console.log('Found regular tournaments to cancel:', tournaments?.length || 0, tournaments);

    if (tournamentsError) {
      console.error('Error fetching tournaments:', tournamentsError);
      throw tournamentsError;
    }

    // Get local tournaments that are completed, no winner declared, and completed more than 1 hour ago
    const { data: localTournaments, error: localError } = await supabase
      .from('local_tournaments')
      .select('id, tournament_name, entry_fee, organizer_id, updated_at')
      .eq('status', 'completed')
      .is('winner_declared_at', null)
      .lt('updated_at', oneHourAgo);
    
    console.log('Found local tournaments to cancel:', localTournaments?.length || 0, localTournaments);

    if (localError) {
      console.error('Error fetching local tournaments:', localError);
      throw localError;
    }

    const results: any[] = [];

    // Process regular tournaments
    for (const tournament of tournaments || []) {
      console.log(`Processing tournament: ${tournament.title} (${tournament.id})`);

      try {
        // Get all registrations for this tournament (regular tournaments don't have payment_status or amount_paid)
        const { data: registrations, error: regError } = await supabase
          .from('tournament_registrations')
          .select('user_id')
          .eq('tournament_id', tournament.id);

        if (regError) {
          console.error(`Error fetching registrations for ${tournament.id}:`, regError);
          continue;
        }

        console.log(`Found ${registrations?.length || 0} registrations to refund for tournament ${tournament.id}`);

        // Entry fee is already a number in the tournaments table
        const refundAmount = tournament.entry_fee || 0;

        // Refund each participant
        for (const reg of registrations || []) {
          if (refundAmount > 0) {
            // Add to user's wallet using correct function signature
            const { error: walletError } = await supabase.rpc('admin_adjust_wallet', {
              p_target_user_id: reg.user_id,
              p_action: 'add',
              p_amount: refundAmount,
              p_reason: `Refund for cancelled tournament: ${tournament.title} (Winner not declared in time)`
            });

            if (walletError) {
              console.error(`Error refunding user ${reg.user_id}:`, walletError);
            } else {
              console.log(`Refunded ₹${refundAmount} to user ${reg.user_id}`);
            }
          }
        }

        // Update tournament status to cancelled
        const { error: updateError } = await supabase
          .from('tournaments')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', tournament.id);

        if (updateError) {
          console.error(`Error updating tournament ${tournament.id}:`, updateError);
        } else {
          console.log(`Tournament ${tournament.id} cancelled successfully`);
          
          // Notify organizer/creator
          await supabase.rpc('create_notification', {
            p_user_id: tournament.created_by,
            p_title: 'Tournament Auto-Cancelled',
            p_message: `Your tournament "${tournament.title}" was automatically cancelled because winner was not declared within 1 hour. All participants have been refunded.`,
            p_type: 'warning'
          });

          results.push({ id: tournament.id, title: tournament.title, type: 'regular', status: 'cancelled', refunds: registrations?.length || 0 });
        }
      } catch (err) {
        console.error(`Error processing tournament ${tournament.id}:`, err);
      }
    }

    // Process local tournaments
    for (const tournament of localTournaments || []) {
      console.log(`Processing local tournament: ${tournament.tournament_name} (${tournament.id})`);

      try {
        // Get all registrations for this local tournament
        const { data: registrations, error: regError } = await supabase
          .from('local_tournament_registrations')
          .select('user_id, amount_paid')
          .eq('tournament_id', tournament.id)
          .eq('payment_status', 'completed');

        if (regError) {
          console.error(`Error fetching registrations for local ${tournament.id}:`, regError);
          continue;
        }

        // Refund each participant
        for (const reg of registrations || []) {
          const refundAmount = reg.amount_paid || tournament.entry_fee || 0;
          
          if (refundAmount > 0) {
            const { error: walletError } = await supabase.rpc('admin_adjust_wallet', {
              p_target_user_id: reg.user_id,
              p_action: 'add',
              p_amount: refundAmount,
              p_reason: `Refund for cancelled local tournament: ${tournament.tournament_name} (Winner not declared in time)`
            });

            if (walletError) {
              console.error(`Error refunding user ${reg.user_id}:`, walletError);
            } else {
              console.log(`Refunded ₹${refundAmount} to user ${reg.user_id}`);
            }
          }
        }

        // Update local tournament status to cancelled
        const { error: updateError } = await supabase
          .from('local_tournaments')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', tournament.id);

        if (updateError) {
          console.error(`Error updating local tournament ${tournament.id}:`, updateError);
        } else {
          console.log(`Local tournament ${tournament.id} cancelled successfully`);
          
          await supabase.rpc('create_notification', {
            p_user_id: tournament.organizer_id,
            p_title: 'Local Tournament Auto-Cancelled',
            p_message: `Your local tournament "${tournament.tournament_name}" was automatically cancelled because winner was not declared within 1 hour. All participants have been refunded.`,
            p_type: 'warning'
          });

          results.push({ id: tournament.id, title: tournament.tournament_name, type: 'local', status: 'cancelled', refunds: registrations?.length || 0 });
        }
      } catch (err) {
        console.error(`Error processing local tournament ${tournament.id}:`, err);
      }
    }

    console.log(`Auto-cancel completed. Processed ${results.length} tournaments.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.length} tournaments`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in auto-cancel-tournaments:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
