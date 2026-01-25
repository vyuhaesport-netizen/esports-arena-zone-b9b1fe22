import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoPushEvent {
  event_type: 'deposit_approved' | 'withdrawal_approved' | 'withdrawal_rejected' | 
              'tournament_joined' | 'tournament_won' | 'ban_lifted' | 'profile_updated' |
              'dhana_earned' | 'match_starting' | 'tournament_cancelled' | 'bonus_received';
  user_id: string;
  data?: Record<string, unknown>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.log('OneSignal not configured, skipping push');
      return new Response(JSON.stringify({ success: false, error: 'OneSignal not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: AutoPushEvent = await req.json();
    const { event_type, user_id, data } = body;

    if (!event_type || !user_id) {
      throw new Error('event_type and user_id are required');
    }

    // Fetch user profile for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, full_name, in_game_name')
      .eq('user_id', user_id)
      .maybeSingle();

    const userName = profile?.username || profile?.in_game_name || profile?.full_name || 'Player';

    // Generate notification content based on event type
    let title = '';
    let message = '';
    let url = '/';

    switch (event_type) {
      case 'deposit_approved':
        const depositAmount = data?.amount || 0;
        title = 'Deposit Successful';
        message = `Rs. ${depositAmount} has been added to your wallet. Start playing now.`;
        url = '/wallet';
        break;

      case 'withdrawal_approved':
        const withdrawAmount = data?.amount || 0;
        title = 'Withdrawal Processed';
        message = `Rs. ${withdrawAmount} has been transferred to your account.`;
        url = '/wallet';
        break;

      case 'withdrawal_rejected':
        title = 'Withdrawal Update';
        message = `Your withdrawal request was not approved. Check details in wallet.`;
        url = '/wallet';
        break;

      case 'tournament_joined':
        const tournamentName = data?.tournament_name || 'Tournament';
        title = 'Registration Confirmed';
        message = `You have joined ${tournamentName}. Check match details.`;
        url = '/my-match';
        break;

      case 'tournament_won':
        const prize = data?.prize || 0;
        const rank = data?.rank || 1;
        title = 'Congratulations';
        message = `You secured rank ${rank} and won Rs. ${prize}. Prize added to wallet.`;
        url = '/wallet';
        break;

      case 'ban_lifted':
        title = 'Account Restored';
        message = `Your account has been restored. You can now access all features.`;
        url = '/';
        break;

      case 'profile_updated':
        title = 'Profile Updated';
        message = `Your profile changes have been saved successfully.`;
        url = '/profile';
        break;

      case 'dhana_earned':
        const dhanaAmount = data?.amount || 0;
        title = 'Dhana Earned';
        message = `You earned ${dhanaAmount} Dhana. Available after cooldown period.`;
        url = '/wallet';
        break;

      case 'match_starting':
        const matchTime = data?.time || '15 minutes';
        const matchName = data?.tournament_name || 'Tournament';
        title = 'Match Starting Soon';
        message = `${matchName} starts in ${matchTime}. Get ready.`;
        url = '/my-match';
        break;

      case 'tournament_cancelled':
        title = 'Tournament Cancelled';
        message = `Tournament has been cancelled. Entry fee refunded to wallet.`;
        url = '/wallet';
        break;

      case 'bonus_received':
        const bonusAmount = data?.amount || 0;
        title = 'Bonus Received';
        message = `Rs. ${bonusAmount} bonus added to your wallet.`;
        url = '/wallet';
        break;

      default:
        console.log('Unknown event type:', event_type);
        return new Response(JSON.stringify({ success: false, error: 'Unknown event type' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Sending auto push for ${event_type} to user ${user_id}: ${title}`);

    // Send push notification via OneSignal
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      url: url,
      include_aliases: {
        external_id: [user_id]
      },
      target_channel: "push"
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal error:', result);
      return new Response(JSON.stringify({ success: false, error: result.errors?.[0] }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the notification
    try {
      await supabase.from('push_notification_logs').insert({
        title,
        message,
        target_type: 'auto',
        target_count: 1,
        status: 'success',
        data: { event_type, user_id, ...data }
      });
    } catch (logError) {
      console.log('Could not log push notification');
    }

    console.log('Auto push sent successfully:', result.id);

    return new Response(JSON.stringify({ 
      success: true, 
      notification_id: result.id,
      event_type,
      user_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-auto-push:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
