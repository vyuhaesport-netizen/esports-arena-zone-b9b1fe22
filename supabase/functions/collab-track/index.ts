import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CollabTrackRequest =
  | { action: "click"; code: string }
  | { action: "signup"; code: string };

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
    const code = (body as any)?.code;

    if (!action || typeof action !== "string" || !code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const loadActiveLink = async () => {
      const { data, error } = await supabaseAdmin
        .from("collab_links")
        .select("id, total_clicks, total_signups, expires_at")
        .eq("link_code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      if (data.expires_at) {
        const exp = new Date(data.expires_at);
        if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
          return null;
        }
      }

      return data;
    };

    if (action === "click") {
      const link = await loadActiveLink();
      if (!link) {
        return new Response(
          JSON.stringify({ success: true, ignored: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabaseAdmin
        .from("collab_links")
        .update({
          total_clicks: (link.total_clicks ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", link.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "signup") {
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

      const link = await loadActiveLink();
      if (!link) {
        return new Response(
          JSON.stringify({ success: true, ignored: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const referredUserId = userData.user.id;

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
      }

      return new Response(
        JSON.stringify({ success: true }),
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
