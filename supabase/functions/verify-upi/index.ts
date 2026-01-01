import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DecentroResponse {
  decentroTxnId?: string;
  status?: string;
  responseCode?: string;
  message?: string;
  data?: {
    upiId?: string;
    name?: string;
    status?: string;
    merchantId?: string;
    terminalId?: string;
    bankRrn?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { upi_id } = await req.json();

    if (!upi_id || typeof upi_id !== 'string') {
      console.error('Invalid UPI ID provided');
      return new Response(
        JSON.stringify({ success: false, error: 'UPI ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic UPI ID format validation
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    if (!upiRegex.test(upi_id)) {
      console.error('Invalid UPI ID format:', upi_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid UPI ID format. Format should be like: yourname@upi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('DECENTRO_CLIENT_ID');
    const clientSecret = Deno.env.get('DECENTRO_CLIENT_SECRET');
    const moduleSecret = Deno.env.get('DECENTRO_MODULE_SECRET');

    if (!clientId || !clientSecret || !moduleSecret) {
      console.error('Decentro credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'UPI verification service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying UPI ID:', upi_id);

    // Call Decentro API for UPI verification
    const response = await fetch('https://in.staging.decentro.tech/v2/payments/vpa/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client_id': clientId,
        'client_secret': clientSecret,
        'module_secret': moduleSecret,
      },
      body: JSON.stringify({
        reference_id: `upi_verify_${Date.now()}`,
        upi_id: upi_id,
      }),
    });

    const data: DecentroResponse = await response.json();
    console.log('Decentro response:', JSON.stringify(data));

    if (data.status === 'SUCCESS' && data.data?.status === 'VALID') {
      console.log('UPI verification successful:', data.data.name);
      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          name: data.data.name || 'Account Holder',
          upi_id: data.data.upiId || upi_id,
          message: 'UPI ID verified successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (data.data?.status === 'INVALID') {
      console.log('UPI ID is invalid');
      return new Response(
        JSON.stringify({
          success: true,
          verified: false,
          error: 'UPI ID is invalid or does not exist'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Decentro API error:', data.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: data.message || 'Unable to verify UPI ID. Please try again.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error verifying UPI:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to verify UPI ID. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
