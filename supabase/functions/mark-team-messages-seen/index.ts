import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MarkSeenRequest = {
  team_id: string;
  message_ids?: string[];
};

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

    const userId = userData.user.id;
    const body = (await req.json()) as Partial<MarkSeenRequest>;
    const teamId = body.team_id;

    if (!teamId || typeof teamId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "team_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify membership (leader OR member)
    const [{ data: leaderTeam }, { data: memberRow }] = await Promise.all([
      supabaseAdmin
        .from("player_teams")
        .select("id")
        .eq("id", teamId)
        .eq("leader_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("player_team_members")
        .select("id")
        .eq("team_id", teamId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (!leaderTeam && !memberRow) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const messageIds = Array.isArray(body.message_ids) ? body.message_ids : null;

    let query = supabaseAdmin
      .from("team_messages")
      .select("id, sender_id, seen_by")
      .eq("team_id", teamId)
      .neq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (messageIds && messageIds.length > 0) {
      query = query.in("id", messageIds);
    }

    const { data: msgs, error: msgErr } = await query;
    if (msgErr) throw msgErr;

    const toUpdate = (msgs ?? []).filter((m) => {
      const seenBy = Array.isArray(m.seen_by) ? (m.seen_by as string[]) : [];
      return !seenBy.includes(userId);
    });

    let updated = 0;
    for (const m of toUpdate) {
      const current = Array.isArray(m.seen_by) ? (m.seen_by as string[]) : [];
      const next = [...current, userId];

      const { error: upErr } = await supabaseAdmin
        .from("team_messages")
        .update({ seen_by: next })
        .eq("id", m.id);

      if (upErr) throw upErr;
      updated++;
    }

    return new Response(
      JSON.stringify({ success: true, updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("mark-team-messages-seen error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
