import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback models in order of preference
const FALLBACK_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
];

// Function to fetch real-time platform data
async function getPlatformContext(supabase: any, userId?: string): Promise<string> {
  let context = '';
  
  try {
    // Get active tournaments count
    const { data: activeTournaments } = await supabase
      .from('tournaments')
      .select('id, title, game, entry_fee, current_prize_pool, max_participants, joined_users, status, start_date')
      .in('status', ['active', 'upcoming', 'registration_open'])
      .order('start_date', { ascending: true })
      .limit(10);
    
    if (activeTournaments && activeTournaments.length > 0) {
      context += `\n\n## LIVE PLATFORM DATA:\n`;
      context += `### Active/Upcoming Tournaments (${activeTournaments.length}):\n`;
      activeTournaments.forEach((t: any) => {
        const joinedCount = t.joined_users?.length || 0;
        context += `- "${t.title}" (${t.game}) - Entry: ₹${t.entry_fee || 0}, Prize Pool: ₹${t.current_prize_pool || 0}, Players: ${joinedCount}/${t.max_participants || '∞'}, Status: ${t.status}, Starts: ${t.start_date}\n`;
      });
    }
    
    // Get local tournaments
    const { data: localTournaments } = await supabase
      .from('local_tournaments')
      .select('id, tournament_name, game, entry_fee, current_prize_pool, max_participants, joined_users, status, tournament_date, institution_name')
      .in('status', ['active', 'upcoming', 'registration_open'])
      .order('tournament_date', { ascending: true })
      .limit(5);
    
    if (localTournaments && localTournaments.length > 0) {
      context += `\n### Local Tournaments (${localTournaments.length}):\n`;
      localTournaments.forEach((t: any) => {
        const joinedCount = t.joined_users?.length || 0;
        context += `- "${t.tournament_name}" at ${t.institution_name} (${t.game}) - Entry: ₹${t.entry_fee || 0}, Players: ${joinedCount}/${t.max_participants || '∞'}, Status: ${t.status}, Date: ${t.tournament_date}\n`;
      });
    }
    
    // Get total platform stats
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalTournaments } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true });
    
    context += `\n### Platform Stats:\n`;
    context += `- Total Registered Players: ${totalUsers || 0}\n`;
    context += `- Total Tournaments Hosted: ${totalTournaments || 0}\n`;
    
    // If userId is provided, get user-specific data
    if (userId) {
      // Get user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('username, wallet_balance, withdrawable_balance, in_game_name, preferred_game')
        .eq('user_id', userId)
        .single();
      
      if (userProfile) {
        context += `\n### YOUR ACCOUNT INFO:\n`;
        context += `- Username: ${userProfile.username || 'Not set'}\n`;
        context += `- In-Game Name: ${userProfile.in_game_name || 'Not set'}\n`;
        context += `- Wallet Balance: ₹${userProfile.wallet_balance || 0}\n`;
        context += `- Withdrawable Balance: ₹${userProfile.withdrawable_balance || 0}\n`;
        context += `- Preferred Game: ${userProfile.preferred_game || 'Not set'}\n`;
      }
      
      // Get user's registered tournaments (My Match)
      const { data: userRegistrations } = await supabase
        .from('tournament_registrations')
        .select(`
          tournament_id,
          status,
          registered_at,
          tournaments (
            title,
            game,
            start_date,
            status,
            room_id,
            room_password
          )
        `)
        .eq('user_id', userId)
        .order('registered_at', { ascending: false })
        .limit(5);
      
      if (userRegistrations && userRegistrations.length > 0) {
        context += `\n### YOUR REGISTERED MATCHES:\n`;
        userRegistrations.forEach((reg: any) => {
          const t = reg.tournaments;
          if (t) {
            context += `- "${t.title}" (${t.game}) - Status: ${t.status}, Match Date: ${t.start_date}`;
            if (t.room_id && t.status === 'active') {
              context += `, Room ID: ${t.room_id}, Password: ${t.room_password || 'N/A'}`;
            }
            context += `\n`;
          }
        });
      }
      
      // Get user's Dhana balance
      const { data: dhanaBalance } = await supabase
        .from('dhana_balances')
        .select('available_dhana, pending_dhana, total_earned')
        .eq('user_id', userId)
        .single();
      
      if (dhanaBalance) {
        context += `\n### YOUR DHANA:\n`;
        context += `- Available Dhana: ${dhanaBalance.available_dhana || 0}\n`;
        context += `- Pending Dhana: ${dhanaBalance.pending_dhana || 0}\n`;
        context += `- Total Earned: ${dhanaBalance.total_earned || 0}\n`;
      }
      
      // Get user stats
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('first_place_count, second_place_count, third_place_count, tournament_wins, total_earnings')
        .eq('user_id', userId)
        .single();
      
      if (userStats) {
        const statsPoints = (userStats.first_place_count * 10) + (userStats.second_place_count * 9) + (userStats.third_place_count * 8);
        context += `\n### YOUR STATS:\n`;
        context += `- 1st Place Wins: ${userStats.first_place_count || 0}\n`;
        context += `- 2nd Place: ${userStats.second_place_count || 0}\n`;
        context += `- 3rd Place: ${userStats.third_place_count || 0}\n`;
        context += `- Total Tournament Wins: ${userStats.tournament_wins || 0}\n`;
        context += `- Total Earnings: ₹${userStats.total_earnings || 0}\n`;
        context += `- Stats Points: ${statsPoints}\n`;
      }
    }
  } catch (error) {
    console.error('Error fetching platform context:', error);
  }
  
  return context;
}

// Vyuha Platform Knowledge Base - System Prompt
const VYUHA_SYSTEM_PROMPT = `You are Vyuha AI Assistant, the official support bot for Vyuha Esports - a premier gaming tournament platform in India.

## About Vyuha Esports:
- Vyuha is an esports tournament platform where players can participate in gaming tournaments
- We support games like Free Fire, BGMI, and other popular mobile games
- Players can win real money prizes by participating in tournaments

## Key Features:
1. **Tournaments**: Online and local (offline) tournaments with real cash prizes
2. **Wallet System**: Players deposit money to join tournaments and withdraw winnings
3. **Dhana**: Virtual currency earned from tournament wins (different from wallet balance)
4. **Teams**: Players can create or join teams to participate in team tournaments
5. **Leaderboard**: Global rankings based on tournament wins and earnings

## Tournament Types:
- **Solo**: Individual player tournaments
- **Duo**: 2-player team tournaments  
- **Squad**: 4-player team tournaments
- **Giveaway**: Free tournaments with prizes (no entry fee)

## Wallet & Payments:
- Minimum deposit: ₹10
- Deposits are credited after admin approval
- Withdrawals require UPI ID and phone number
- Minimum withdrawal: ₹50
- Withdrawals are processed within 24-48 hours
- Entry fees are deducted from wallet balance

## Dhana System:
- Dhana is virtual currency earned from tournament placements
- 1 Dhana = ₹1 (when withdrawing)
- Dhana has a 7-day maturation period before withdrawal
- Can be withdrawn to UPI after maturation

## Common Issues:
- **Can't join tournament**: Check if you have sufficient wallet balance
- **Deposit not credited**: Wait for admin approval (usually within 1 hour)
- **Withdrawal pending**: Processing takes 24-48 hours
- **Wrong room ID/password**: Contact organizer or wait for update before match time
- **Match not started**: Check tournament status and timing

## Rules:
- Players must use their registered game UID
- Cheating/hacking results in permanent ban
- Multiple accounts are not allowed
- Entry fees are non-refundable once tournament starts
- Report violations through the in-app report system

## Support:
- Help section available in Profile > Help & Support
- Contact support for unresolved issues
- Response time: Within 24 hours

## Guidelines for responses:
1. Be helpful, friendly, and professional
2. Use simple language (many users prefer Hindi-English mix)
3. If unsure, suggest contacting support
4. Never share sensitive user data
5. Keep responses concise but complete
6. Use emojis sparingly to be friendly 🎮
7. When users ask about their wallet, matches, or tournaments, use the LIVE PLATFORM DATA provided below

IMPORTANT: 
- Only answer questions related to Vyuha Esports platform
- If asked about unrelated topics, politely redirect to Vyuha-related questions
- If you don't know something specific about Vyuha, say so and suggest contacting support
- You have access to REAL-TIME data about the platform, tournaments, and user's account - use it to give accurate answers!`;

// Function to call AI with fallback models
async function callAIWithFallback(
  systemPrompt: string,
  messages: any[],
  supabase: any,
  userId: string | undefined,
  requestType: string,
  startTime: number
): Promise<{ response: string; usage: any; model: string }> {
  
  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const model = FALLBACK_MODELS[i];
    console.log(`Attempting AI call with model: ${model} (attempt ${i + 1}/${FALLBACK_MODELS.length})`);
    
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Model ${model} failed with status ${response.status}:`, errorText);
        
        // If rate limited (429) or payment required (402), don't try fallbacks
        if (response.status === 429) {
          throw { status: 429, message: 'Rate limit exceeded. Please try again in a moment.' };
        }
        if (response.status === 402) {
          throw { status: 402, message: 'AI service credits exhausted. Please contact admin.' };
        }
        
        // For other errors, try next model
        continue;
      }

      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      console.log(`Successfully got response from model: ${model}, tokens used: ${usage.total_tokens}`);
      
      return { response: generatedText, usage, model };
    } catch (error: any) {
      // If it's a rate limit or payment error, throw immediately
      if (error.status === 429 || error.status === 402) {
        throw error;
      }
      console.error(`Error with model ${model}:`, error);
      // Continue to next model
    }
  }
  
  // All models failed
  throw new Error('All AI models failed. Please try again later.');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { messages, type = 'support', userId } = await req.json();

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if AI is enabled and within token limits
    const { data: limitData } = await supabase
      .from('ai_token_limits')
      .select('*')
      .eq('limit_type', 'global')
      .single();

    if (limitData && !limitData.is_enabled) {
      return new Response(
        JSON.stringify({ error: 'AI service is currently disabled' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check daily token usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: dailyUsage } = await supabase
      .from('ai_usage_logs')
      .select('total_tokens')
      .gte('created_at', today.toISOString())
      .eq('status', 'success');

    const totalDailyTokens = dailyUsage?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0;

    if (limitData && totalDailyTokens >= limitData.daily_limit) {
      return new Response(
        JSON.stringify({ error: 'Daily AI token limit reached. Please try again tomorrow.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check monthly token usage
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const { data: monthlyUsage } = await supabase
      .from('ai_usage_logs')
      .select('total_tokens')
      .gte('created_at', monthStart.toISOString())
      .eq('status', 'success');

    const totalMonthlyTokens = monthlyUsage?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0;

    if (limitData && totalMonthlyTokens >= limitData.monthly_limit) {
      return new Response(
        JSON.stringify({ error: 'Monthly AI token limit reached. Please contact admin.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPrompt = VYUHA_SYSTEM_PROMPT;
    
    // Different system prompts for different use cases
    if (type === 'moderation') {
      systemPrompt = `You are a content moderation AI for Vyuha Esports platform. 
Analyze the provided content and determine if it violates community guidelines.
Flag content that contains:
- Hate speech or discrimination
- Threats or harassment
- Spam or scam attempts
- Inappropriate language
- Cheating/hacking discussions
Respond with JSON: { "flagged": boolean, "reason": string, "severity": "low"|"medium"|"high" }`;
    } else {
      // Fetch real-time platform context for support queries
      const platformContext = await getPlatformContext(supabase, userId);
      systemPrompt = VYUHA_SYSTEM_PROMPT + platformContext;
    }

    console.log('Calling AI with type:', type, 'userId:', userId);

    // Call AI with fallback models
    const { response: generatedText, usage, model } = await callAIWithFallback(
      systemPrompt,
      messages,
      supabase,
      userId,
      type,
      startTime
    );

    const responseTime = Date.now() - startTime;

    // Log successful request
    await supabase.from('ai_usage_logs').insert({
      user_id: userId || null,
      request_type: type,
      input_tokens: usage.prompt_tokens,
      output_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      model,
      response_time_ms: responseTime,
      status: 'success',
    });

    return new Response(
      JSON.stringify({ response: generatedText, usage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('Error in ai-chat function:', error);
    
    const errorMessage = error.message || 'An unexpected error occurred';
    const statusCode = error.status || 500;

    // Log error
    try {
      await supabase.from('ai_usage_logs').insert({
        request_type: 'support',
        model: 'unknown',
        response_time_ms: responseTime,
        status: 'error',
        error_message: errorMessage.substring(0, 500),
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});