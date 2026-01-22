import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  user_ids?: string[];
  external_ids?: string[];
  segment?: string;
  title: string;
  message: string;
  url?: string;
  data?: Record<string, unknown>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error('OneSignal credentials not configured');
    }

    const body: PushNotificationRequest = await req.json();
    const { user_ids, external_ids, segment, title, message, url, data } = body;

    if (!title || !message) {
      throw new Error('Title and message are required');
    }

    // Build OneSignal notification payload
    const notificationPayload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
    };

    // Add URL if provided
    if (url) {
      notificationPayload.url = url;
    }

    // Add custom data if provided
    if (data) {
      notificationPayload.data = data;
    }

    // Target users - OneSignal uses external_user_id for targeting
    if (external_ids && external_ids.length > 0) {
      notificationPayload.include_aliases = {
        external_id: external_ids
      };
      notificationPayload.target_channel = "push";
    } else if (user_ids && user_ids.length > 0) {
      // Use user_ids as external_ids (Supabase user IDs)
      notificationPayload.include_aliases = {
        external_id: user_ids
      };
      notificationPayload.target_channel = "push";
    } else if (segment) {
      // Target by segment
      notificationPayload.included_segments = [segment];
    } else {
      // Send to all subscribed users
      notificationPayload.included_segments = ['Subscribed Users'];
    }

    console.log('Sending push notification:', JSON.stringify(notificationPayload, null, 2));

    // Send notification via OneSignal API
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
      console.error('OneSignal API error:', result);
      throw new Error(result.errors?.[0] || 'Failed to send push notification');
    }

    console.log('Push notification sent:', result);

    return new Response(
      JSON.stringify({ success: true, notification_id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending push notification:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
