import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DecentroResponse {
  decentroTxnId?: string;
  decentro_txn_id?: string;
  status?: string;
  responseCode?: string;
  response_code?: string;
  message?: string;
  responseKey?: string;
  response_key?: string;
  request_id?: string;
  data?: {
    upiVpa?: string;
    upi_vpa?: string;
    upiId?: string;
    name?: string;
    beneficiaryName?: string;
    accountHolderName?: string;
    status?: string;
    merchantId?: string;
    terminalId?: string;
    bankRrn?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { upi_id } = await req.json();

    if (!upi_id || typeof upi_id !== "string") {
      console.error("Invalid UPI ID provided");
      return new Response(
        JSON.stringify({ success: false, verified: false, error: "UPI ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upiId = upi_id.trim();

    // Basic UPI ID format validation
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    if (!upiRegex.test(upiId)) {
      console.error("Invalid UPI ID format:", upiId);
      return new Response(
        JSON.stringify({
          success: true,
          verified: false,
          error: "Invalid UPI ID format. Format should be like: yourname@upi",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const clientId = Deno.env.get("DECENTRO_CLIENT_ID");
    const clientSecret = Deno.env.get("DECENTRO_CLIENT_SECRET");
    const moduleSecret = Deno.env.get("DECENTRO_MODULE_SECRET");

    if (!clientId || !clientSecret || !moduleSecret) {
      console.error("Decentro credentials not configured");
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: "UPI verification service not configured",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Verifying UPI ID:", upiId);

    // Decentro VerifyPay endpoint (staging + production fallback)
    // Docs: https://docs.decentro.tech/reference/verify_pay
    const baseUrlCandidates = [
      Deno.env.get("DECENTRO_BASE_URL"),
      "https://in.staging.decentro.tech",
      "https://in.decentro.tech",
    ].filter((v): v is string => Boolean(v));

    const baseUrls = Array.from(new Set(baseUrlCandidates));

    let data: DecentroResponse = {} as DecentroResponse;
    let usedBaseUrl = baseUrls[0] ?? "https://in.staging.decentro.tech";

    for (const baseUrl of baseUrls) {
      usedBaseUrl = baseUrl;
      console.log("Calling Decentro VerifyPay:", `${baseUrl}/v2/banking/verify_pay`);

      const response = await fetch(`${baseUrl}/v2/banking/verify_pay`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          client_id: clientId,
          client_secret: clientSecret,
          module_secret: moduleSecret,
        },
        body: JSON.stringify({
          // Keep reference_id strictly alphanumeric to avoid Decentro sanitization errors
          reference_id: `upiverify${Date.now()}`,
          upi_vpa: upiId,
        }),
      });

      data = await response.json().catch(() => ({} as DecentroResponse));
      console.log("Decentro response:", JSON.stringify({ usedBaseUrl, ...data }));

      const msg = (data.message ?? "").toString().toLowerCase();
      const responseCode = (data.responseCode ?? data.response_code ?? "").toString();
      const responseKey = (data.responseKey ?? data.response_key ?? "").toString();

      const isAuthFailed =
        msg.includes("authentication failed") ||
        msg === "unauthorized" ||
        responseCode === "E00008" ||
        responseKey === "E00008";

      // If auth failed, try the next environment/base URL
      if (isAuthFailed && baseUrl !== baseUrls[baseUrls.length - 1]) {
        console.error("Decentro auth failed, trying next environment. baseUrl:", baseUrl);
        continue;
      }

      break;
    }

    const responseCode = (data.responseCode ?? data.response_code ?? "").toString();
    const responseKey = (data.responseKey ?? data.response_key ?? "").toString();
    const msg = (data.message ?? "").toString();

    // Some Decentro failures still come back with HTTP 200, so we interpret the payload.
    const isUnauthorized =
      msg.toLowerCase().includes("authentication failed") ||
      msg.toLowerCase() === "unauthorized" ||
      responseCode === "E00008" ||
      responseKey === "E00008" ||
      responseKey === "error_unauthorized_module";

    if (isUnauthorized) {
      console.error("Decentro authorization failed. responseKey:", responseKey);
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error:
            "UPI verification not authorized (Decentro credentials/module not enabled). Please update Decentro production keys.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Success case
    // VerifyPay returns responseKey like: success_account_details_retrieved
    const isValidByKey = responseKey.startsWith("success_");
    const isInvalidByKey =
      responseKey.includes("invalid") ||
      responseKey.includes("no_account_mapped") ||
      responseKey.includes("expired") ||
      responseKey.includes("blocked") ||
      responseKey.includes("closed") ||
      responseKey.includes("frozen") ||
      responseKey.includes("dormant");

    const name =
      data.data?.name ||
      data.data?.beneficiaryName ||
      data.data?.accountHolderName ||
      "Account Holder";

    if (isValidByKey) {
      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          name,
          upi_id: upiId,
          message: "UPI ID verified successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (isInvalidByKey) {
      return new Response(
        JSON.stringify({
          success: true,
          verified: false,
          error: "UPI ID is invalid or does not exist",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fallback
    return new Response(
      JSON.stringify({
        success: false,
        verified: false,
        error: data.message || "Unable to verify UPI ID. Please try again.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error verifying UPI:", error);
    return new Response(
      JSON.stringify({
        success: false,
        verified: false,
        error: "Failed to verify UPI ID. Please try again.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
