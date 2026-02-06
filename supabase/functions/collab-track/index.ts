import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CollabTrackRequest =
  | { action: "click"; code: string }
  | { action: "signup"; code: string }
  | { action: "qualify"; user_id: string; qualification_type: string };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as Partial<CollabTrackRequest>;
    const action = body.action;

    if (!action || typeof action !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ============ CLICK TRACKING ============
    if (action === "click") {
      const code = (body as any)?.code;
      if (!code || typeof code !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Missing code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: link, error: linkErr } = await supabaseAdmin
        .from("collab_links")
        .select("id, total_clicks, expires_at")
        .eq("link_code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (linkErr) throw linkErr;
      if (!link) {
        return new Response(
          JSON.stringify({ success: true, ignored: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check expiry
      if (link.expires_at) {
        const exp = new Date(link.expires_at);
        if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
          return new Response(
            JSON.stringify({ success: true, ignored: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      await supabaseAdmin
        .from("collab_links")
        .update({
          total_clicks: (link.total_clicks ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", link.id);

      console.log(`Click tracked for code: ${code}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============ SIGNUP TRACKING ============
    if (action === "signup") {
      const code = (body as any)?.code;
      if (!code || typeof code !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Missing code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get user from auth header
      const authHeader = req.headers.get("authorization") ?? "";
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const referredUserId = userData.user.id;

      // Find the link
      const { data: link, error: linkErr } = await supabaseAdmin
        .from("collab_links")
        .select("id, total_signups, user_id, expires_at")
        .eq("link_code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (linkErr) throw linkErr;
      if (!link) {
        console.log(`Link not found or inactive: ${code}`);
        return new Response(
          JSON.stringify({ success: true, ignored: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check expiry
      if (link.expires_at) {
        const exp = new Date(link.expires_at);
        if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
          return new Response(
            JSON.stringify({ success: true, ignored: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // Prevent self-referral
      if (link.user_id === referredUserId) {
        console.log(`Self-referral blocked: ${referredUserId}`);
        return new Response(
          JSON.stringify({ success: true, ignored: true, reason: "self_referral" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check if already referred
      const { data: existing } = await supabaseAdmin
        .from("collab_referrals")
        .select("id")
        .eq("link_id", link.id)
        .eq("referred_user_id", referredUserId)
        .maybeSingle();

      if (!existing) {
        const { error: insErr } = await supabaseAdmin
          .from("collab_referrals")
          .insert({
            link_id: link.id,
            referred_user_id: referredUserId,
            status: "registered",
          });

        if (insErr) throw insErr;

        await supabaseAdmin
          .from("collab_links")
          .update({
            total_signups: (link.total_signups ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", link.id);

        console.log(`Signup tracked for user: ${referredUserId}, link: ${code}`);
      } else {
        console.log(`User already referred: ${referredUserId}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============ QUALIFICATION TRACKING ============
    if (action === "qualify") {
      const userId = (body as any)?.user_id;
      const qualificationType = (body as any)?.qualification_type;

      if (!userId || typeof userId !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Missing user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Find pending referral for this user
      const { data: referral, error: refErr } = await supabaseAdmin
        .from("collab_referrals")
        .select("id, link_id, status")
        .eq("referred_user_id", userId)
        .eq("status", "registered")
        .maybeSingle();

      if (refErr) throw refErr;
      if (!referral) {
        console.log(`No pending referral for user: ${userId}`);
        return new Response(
          JSON.stringify({ success: true, ignored: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get link info for commission
      const { data: link, error: linkErr } = await supabaseAdmin
        .from("collab_links")
        .select("id, user_id, commission_per_registration, total_qualified, total_earned")
        .eq("id", referral.link_id)
        .single();

      if (linkErr) throw linkErr;

      const commission = link.commission_per_registration || 5;

      // Update referral to qualified
      await supabaseAdmin
        .from("collab_referrals")
        .update({
          status: "qualified",
          qualified_at: new Date().toISOString(),
          qualification_type: qualificationType || "deposit",
          commission_amount: commission,
          commission_credited: true,
        })
        .eq("id", referral.id);

      // Update link totals
      await supabaseAdmin
        .from("collab_links")
        .update({
          total_qualified: (link.total_qualified ?? 0) + 1,
          total_earned: (link.total_earned ?? 0) + commission,
          updated_at: new Date().toISOString(),
        })
        .eq("id", link.id);

      // Credit commission to link owner's withdrawable balance
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("withdrawable_balance")
        .eq("user_id", link.user_id)
        .maybeSingle();

      await supabaseAdmin
        .from("profiles")
        .update({
          withdrawable_balance: (ownerProfile?.withdrawable_balance || 0) + commission,
        })
        .eq("user_id", link.user_id);

      // Create wallet transaction for the owner (using 'commission' type)
      await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: link.user_id,
          amount: commission,
          type: "commission",
          status: "completed",
          description: `Collab Commission: User qualified (${qualificationType || "deposit"})`,
        });

      console.log(`Qualification tracked: user ${userId}, commission ₹${commission} to ${link.user_id}`);

      return new Response(
        JSON.stringify({ success: true, commission_credited: commission }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("collab-track error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
