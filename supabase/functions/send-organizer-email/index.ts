import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrganizerEmailRequest {
  email: string;
  name: string;
  type: "approved" | "rejected";
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-organizer-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user has admin permission using service role
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isAdmin } = await supabaseServiceRole.rpc("is_super_admin", {
      _user_id: user.id,
    });

    const { data: hasPermission } = await supabaseServiceRole.rpc("has_admin_permission", {
      _user_id: user.id,
      _permission: "manage_organizers",
    });

    if (!isAdmin && !hasPermission) {
      console.error("User does not have admin permission");
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, name, type, reason }: OrganizerEmailRequest = await req.json();

    console.log(`Sending ${type} email to ${email} for ${name} by admin ${user.id}`);

    let subject: string;
    let htmlContent: string;

    if (type === "approved") {
      subject = "🎉 Congratulations! Your Organizer Application is Approved";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Vyuha!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">Great news! Your application to become an organizer on Vyuha has been <strong style="color: #10b981;">approved</strong>! 🎉</p>
            <p style="font-size: 16px; margin-bottom: 20px;">You can now:</p>
            <ul style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">
              <li>Create and manage tournaments</li>
              <li>Set entry fees and prize pools</li>
              <li>Earn commission from your tournaments</li>
              <li>Build your gaming community</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://vyuha.lovable.app/organizer" style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Go to Organizer Dashboard</a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">If you have any questions, feel free to reach out to our support team.</p>
            <p style="font-size: 14px; color: #6b7280;">Best of luck with your tournaments!</p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">— The Vyuha Team</p>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = "Update on Your Organizer Application";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Vyuha</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">Thank you for your interest in becoming an organizer on Vyuha.</p>
            <p style="font-size: 16px; margin-bottom: 20px;">After reviewing your application, we regret to inform you that we are unable to approve it at this time.</p>
            ${reason ? `
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="font-size: 14px; color: #991b1b; margin: 0;"><strong>Reason:</strong> ${reason}</p>
            </div>
            ` : ''}
            <p style="font-size: 16px; margin-bottom: 20px;">You are welcome to reapply after addressing the concerns mentioned above. We encourage you to:</p>
            <ul style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">
              <li>Complete your profile information</li>
              <li>Provide valid identification</li>
              <li>Add your social media links</li>
            </ul>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">If you have any questions about this decision, please contact our support team.</p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">— The Vyuha Team</p>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Vyuha <onboarding@resend.dev>",
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    if (!emailResponse.ok) {
      throw new Error(emailData.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-organizer-email function:", error);
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
