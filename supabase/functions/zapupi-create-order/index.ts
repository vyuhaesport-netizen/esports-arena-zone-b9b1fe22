import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { amount, userId, mobile, redirectUrl } = await req.json();
    
    console.log('Creating ZapUPI order:', { amount, userId, mobile });

    if (!amount || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Amount and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch ZapUPI credentials from payment_gateway_config table
    const { data: gatewayConfig, error: configError } = await supabase
      .from('payment_gateway_config')
      .select('api_key_id, api_key_secret')
      .eq('gateway_name', 'zapupi')
      .single();

    if (configError || !gatewayConfig) {
      console.error('Error fetching ZapUPI config:', configError);
      return new Response(
        JSON.stringify({ success: false, error: 'ZapUPI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ZAPUPI_TOKEN = gatewayConfig.api_key_id;
    const ZAPUPI_SECRET = gatewayConfig.api_key_secret;

    if (!ZAPUPI_TOKEN || !ZAPUPI_SECRET) {
      console.error('ZapUPI credentials not configured in database');
      return new Response(
        JSON.stringify({ success: false, error: 'ZapUPI API credentials not configured. Please set them in Admin → API Payment.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('ZapUPI credentials loaded from database, token starts with:', ZAPUPI_TOKEN.substring(0, 8));

    // Generate unique order ID - ZapUPI requires alphanumeric only, max 25 chars
    const orderId = `VYUHA${Date.now()}`;

    // Create transaction record
    const { data: txnData, error: txnError } = await supabase
      .from('payment_gateway_transactions')
      .insert({
        user_id: userId,
        gateway_name: 'zapupi',
        order_id: orderId,
        amount: parseFloat(amount),
        transaction_type: 'credit',
        status: 'created',
        metadata: { 
          initiated_at: new Date().toISOString(),
          mobile: mobile || null
        }
      })
      .select()
      .single();

    if (txnError) {
      console.error('Error creating transaction record:', txnError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create transaction record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare ZapUPI API request - send multiple aliases for compatibility
    const tokenKey = (ZAPUPI_TOKEN || '').trim();
    const secretKey = (ZAPUPI_SECRET || '').trim();

    const payload = new URLSearchParams();
    // Common variants seen across ZapUPI setups
    payload.append('token_key', tokenKey);
    payload.append('secret_key', secretKey);
    payload.append('token', tokenKey);
    payload.append('secret', secretKey);
    payload.append('amount', amount.toString());
    payload.append('order_id', orderId);
    payload.append('customer_mobile', (mobile || '').trim());
    payload.append('redirect_url', redirectUrl || `${req.headers.get('origin')}/wallet`);
    payload.append('remark', 'Vyuha Esport Payment');

    console.log('ZapUPI request auth lengths:', { tokenLen: tokenKey.length, secretLen: secretKey.length });

    console.log('Calling ZapUPI API with order:', orderId);

    const response = await fetch('https://zapupi.com/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload,
    });

    const data = await response.json();
    console.log('ZapUPI API response:', data);

    if (response.ok && data.status === 'success') {
      // Update transaction with payment URL
      await supabase
        .from('payment_gateway_transactions')
        .update({
          status: 'pending',
          metadata: {
            ...txnData.metadata,
            payment_url: data.payment_url,
            zapupi_response: data
          }
        })
        .eq('id', txnData.id);

      return new Response(
        JSON.stringify({
          success: true,
          payment_url: data.payment_url,
          order_id: orderId,
          transaction_id: txnData.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Update transaction as failed
      await supabase
        .from('payment_gateway_transactions')
        .update({
          status: 'failed',
          error_description: data.message || 'Failed to create order'
        })
        .eq('id', txnData.id);

       console.error('ZapUPI API error:', data);
       const friendly = data.message === 'Unauthorized'
         ? 'ZapUPI credentials are invalid. Update API Token & Secret Key in Admin → API Payment.'
         : (data.message || 'Failed to create payment order');
       return new Response(
         JSON.stringify({ success: false, error: friendly }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
    }
  } catch (error: unknown) {
    console.error('Error in zapupi-create-order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
