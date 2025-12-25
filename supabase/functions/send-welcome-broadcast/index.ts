import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeBroadcastRequest {
  user_id: string;
  role: 'organizer' | 'creator';
  user_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, role, user_name }: WelcomeBroadcastRequest = await req.json();

    console.log(`Sending welcome broadcast for ${role} role to user ${user_id}`);

    const roleTitle = role === 'organizer' ? 'Organizer' : 'Creator';
    const dashboardPath = role === 'organizer' ? '/organizer/dashboard' : '/creator/dashboard';

    const welcomeMessage = `🎉 Welcome to the Vyuha Esport ${roleTitle} Program!

Hello${user_name ? ` ${user_name}` : ''}! Congratulations on becoming a ${roleTitle}! Here's everything you need to know:

📊 **Your Dashboard**
Access your ${roleTitle} Dashboard to create and manage tournaments, track earnings, and more.

🏆 **How to Create Tournaments**
1. Go to your Dashboard
2. Click "Create Tournament"
3. Fill in details (name, game, entry fee, date)
4. Set prize distribution for winners
5. Submit and wait for approval

💰 **Commission Structure**
• Prize Pool: 70% (goes to winners)
• Your Commission: 20% (your earnings as ${roleTitle.toLowerCase()})
• Platform Fee: 10%

🏦 **Withdrawing Earnings**
• Your commission is credited as Dhana
• Dhana matures after 15 days for security
• Go to Wallet → Request Withdrawal
• Enter UPI ID and amount (min ₹100)
• Processing within 24-48 hours

📌 **Important Tips**
• Declare winners within 30 minutes after tournament ends
• Set room details before tournament starts
• Handle player reports fairly
• Lower entry fees attract more players

📞 **Need Help?**
Use the Contact section in your dashboard or raise a support ticket.

Welcome to the family! Start hosting tournaments and earn while gaming! 🎮

Best regards,
Vyuha Esport Team`;

    // Create a notification for the user
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user_id,
        type: 'role_assigned',
        title: `🎉 Welcome ${roleTitle}!`,
        message: `Congratulations! You are now a ${roleTitle}. Check the Broadcast Channel for your complete guide!`,
        related_id: null,
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    // Check if a welcome broadcast already exists (to avoid duplicates)
    const { data: existingBroadcast } = await supabase
      .from('admin_broadcasts')
      .select('id')
      .eq('title', `Welcome ${roleTitle} Guide`)
      .eq('is_published', true)
      .limit(1);

    // If no welcome guide exists, create one (this is a general guide, not per-user)
    if (!existingBroadcast || existingBroadcast.length === 0) {
      const { error: broadcastError } = await supabase
        .from('admin_broadcasts')
        .insert({
          admin_id: user_id, // Using user_id as we need a valid UUID
          title: `Welcome ${roleTitle} Guide`,
          message: welcomeMessage,
          broadcast_type: 'announcement',
          target_audience: role === 'organizer' ? 'organizers' : 'creators',
          is_published: true,
        });

      if (broadcastError) {
        console.error('Error creating broadcast:', broadcastError);
      } else {
        console.log(`Welcome broadcast created for ${roleTitle}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Welcome broadcast sent to ${roleTitle}` 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-broadcast:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
