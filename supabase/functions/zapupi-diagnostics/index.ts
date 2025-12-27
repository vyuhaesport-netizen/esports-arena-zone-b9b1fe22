import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", message: "zapupi-diagnostics is running" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load ZapUPI credentials
    const { data: gatewayConfig, error: configError } = await supabase
      .from("payment_gateway_config")
      .select("api_key_id, api_key_secret")
      .eq("gateway_name", "zapupi")
      .single();

    if (configError || !gatewayConfig?.api_key_id || !gatewayConfig?.api_key_secret) {
      console.error("ZapUPI config missing:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "ZapUPI is not configured. Please save API Token & Secret Key in Admin → API Payment.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tokenKey = (gatewayConfig.api_key_id || "").trim();
    const secretKey = (gatewayConfig.api_key_secret || "").trim();

    // Determine outbound IP (useful for ZapUPI IP whitelist)
    let outboundIp: string | null = null;
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      outboundIp = ipData?.ip || null;
    } catch (e) {
      console.warn("Could not fetch outbound IP:", e);
    }

    // Call ZapUPI create-order for a lightweight auth check
    const orderId = `VYUHA_TEST_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 25);

    const payload = new URLSearchParams();
    payload.append("token_key", tokenKey);
    payload.append("secret_key", secretKey);
    payload.append("token", tokenKey);
    payload.append("secret", secretKey);
    payload.append("amount", "1");
    payload.append("order_id", orderId);
    payload.append("customer_mobile", "9999999999");
    payload.append("redirect_url", "https://example.com");
    payload.append("remark", "Vyuha ZapUPI Diagnostics");

    console.log("ZapUPI diagnostics calling create-order", {
      outboundIp,
      orderId,
      tokenLen: tokenKey.length,
      secretLen: secretKey.length,
    });

    const response = await fetch("https://zapupi.com/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload,
    });

    let zapupiData: any = null;
    try {
      zapupiData = await response.json();
    } catch {
      zapupiData = { status: "error", message: "Non-JSON response from ZapUPI" };
    }

    return new Response(
      JSON.stringify({
        success: true,
        outbound_ip: outboundIp,
        request: {
          order_id: orderId,
          token_len: tokenKey.length,
          secret_len: secretKey.length,
        },
        zapupi_http_ok: response.ok,
        zapupi_status: zapupiData?.status,
        zapupi_message: zapupiData?.message,
        zapupi_response: zapupiData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error in zapupi-diagnostics:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
