import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to fetch comprehensive platform data for AI
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
    
    // If userId is provided, get comprehensive user-specific data
    if (userId) {
      // Get user profile with all details
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (userProfile) {
        context += `\n### YOUR COMPLETE ACCOUNT INFO:\n`;
        context += `- User ID: ${userId}\n`;
        context += `- Username: ${userProfile.username || 'Not set'}\n`;
        context += `- Full Name: ${userProfile.full_name || 'Not set'}\n`;
        context += `- Email: ${userProfile.email || 'Not set'}\n`;
        context += `- Phone: ${userProfile.phone || 'Not set'}\n`;
        context += `- Game UID: ${userProfile.game_uid || 'Not set'}\n`;
        context += `- In-Game Name: ${userProfile.in_game_name || 'Not set'}\n`;
        context += `- Wallet Balance: ₹${userProfile.wallet_balance || 0}\n`;
        context += `- Withdrawable Balance: ₹${userProfile.withdrawable_balance || 0}\n`;
        context += `- Preferred Game: ${userProfile.preferred_game || 'Not set'}\n`;
        context += `- Location: ${userProfile.location || 'Not set'}\n`;
        context += `- Date of Birth: ${userProfile.date_of_birth || 'Not set'}\n`;
        context += `- Account Status: ${userProfile.is_banned ? 'BANNED' : userProfile.is_frozen ? 'FROZEN' : 'Active'}\n`;
        context += `- Last Activity: ${userProfile.last_activity_at || 'Unknown'}\n`;
        context += `- Account Created: ${userProfile.created_at}\n`;
      }
      
      // Check ALL bans (active and inactive) for complete history
      const { data: allBans } = await supabase
        .from('player_bans')
        .select('*')
        .eq('user_id', userId)
        .order('banned_at', { ascending: false });
      
      if (allBans && allBans.length > 0) {
        context += `\n### COMPLETE BAN HISTORY:\n`;
        context += `- Total Bans: ${allBans.length}\n`;
        
        const activeBan = allBans.find((b: any) => b.is_active);
        if (activeBan) {
          context += `\n### CURRENT ACTIVE BAN:\n`;
          context += `- Ban ID: ${activeBan.id}\n`;
          context += `- Ban Reason: ${activeBan.ban_reason}\n`;
          context += `- Ban Type: ${activeBan.ban_type}\n`;
          context += `- Ban Number: ${activeBan.ban_number}\n`;
          context += `- Banned At: ${activeBan.banned_at}\n`;
          context += `- Expires At: ${activeBan.expires_at || 'Never (Permanent)'}\n`;
          context += `- Is Restorable by AI: ${
            activeBan.ban_reason?.toLowerCase().includes('unusual activity') || 
            activeBan.ban_reason?.toLowerCase().includes('inactive') ||
            activeBan.ban_reason?.toLowerCase().includes('inactivity') ||
            activeBan.ban_type === 'permanent' ? 'YES - AI CAN RESTORE' : 'NO - Contact Admin'
          }\n`;
        }
        
        allBans.forEach((ban: any, index: number) => {
          context += `\n- Ban #${index + 1}: ${ban.ban_reason} (${ban.ban_type}) - ${ban.is_active ? 'ACTIVE' : 'Lifted'} - ${ban.banned_at}\n`;
        });
      }
      
      // Get user's registered tournaments
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
        .limit(10);
      
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
        .select('available_dhana, pending_dhana, total_earned, total_withdrawn')
        .eq('user_id', userId)
        .single();
      
      if (dhanaBalance) {
        context += `\n### YOUR DHANA (Organizer/Creator Currency):\n`;
        context += `- Available Dhana: ${dhanaBalance.available_dhana || 0}\n`;
        context += `- Pending Dhana: ${dhanaBalance.pending_dhana || 0}\n`;
        context += `- Total Earned: ${dhanaBalance.total_earned || 0}\n`;
        context += `- Total Withdrawn: ${dhanaBalance.total_withdrawn || 0}\n`;
      }
      
      // Get user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (userRoles && userRoles.length > 0) {
        context += `\n### YOUR ROLES:\n`;
        userRoles.forEach((r: any) => {
          context += `- ${r.role}\n`;
        });
      }
      
      // Get user stats
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('first_place_count, second_place_count, third_place_count, tournament_wins, total_earnings')
        .eq('user_id', userId)
        .single();
      
      if (userStats) {
        const statsPoints = (userStats.first_place_count * 10) + (userStats.second_place_count * 9) + (userStats.third_place_count * 8);
        context += `\n### YOUR GAME STATS:\n`;
        context += `- 1st Place Wins: ${userStats.first_place_count || 0}\n`;
        context += `- 2nd Place: ${userStats.second_place_count || 0}\n`;
        context += `- 3rd Place: ${userStats.third_place_count || 0}\n`;
        context += `- Total Tournament Wins: ${userStats.tournament_wins || 0}\n`;
        context += `- Total Earnings: ₹${userStats.total_earnings || 0}\n`;
        context += `- Stats Points: ${statsPoints}\n`;
      }
      
      // Get user's recent transactions
      const { data: recentTransactions } = await supabase
        .from('wallet_transactions')
        .select('type, amount, status, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recentTransactions && recentTransactions.length > 0) {
        context += `\n### YOUR RECENT TRANSACTIONS:\n`;
        recentTransactions.forEach((t: any) => {
          context += `- ${t.type}: ₹${t.amount} (${t.status}) - ${t.description || 'No description'} - ${t.created_at}\n`;
        });
      }
      
      // Get user's support tickets
      const { data: userTickets } = await supabase
        .from('support_tickets')
        .select('id, topic, status, created_at, admin_response')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (userTickets && userTickets.length > 0) {
        context += `\n### YOUR SUPPORT TICKETS:\n`;
        userTickets.forEach((t: any) => {
          context += `- #${t.id.slice(0, 8)}: ${t.topic} (${t.status}) - ${t.created_at}${t.admin_response ? ' - Has Response' : ''}\n`;
        });
      }
      
      // Get user's team memberships
      const { data: teamMemberships } = await supabase
        .from('player_team_members')
        .select(`
          role,
          player_teams (
            name,
            game,
            leader_id
          )
        `)
        .eq('user_id', userId);
      
      if (teamMemberships && teamMemberships.length > 0) {
        context += `\n### YOUR TEAMS:\n`;
        teamMemberships.forEach((m: any) => {
          if (m.player_teams) {
            context += `- ${m.player_teams.name} (${m.player_teams.game || 'All Games'}) - Role: ${m.role}\n`;
          }
        });
      }
    }
  } catch (error) {
    console.error('Error fetching platform context:', error);
  }
  
  return context;
}

// Vyuha Platform Knowledge Base - Enhanced System Prompt for User Support ONLY
const VYUHA_SYSTEM_PROMPT = `You are Vyuha AI Assistant, the official support bot for Vyuha Esports - a premier gaming tournament platform in India.

## COMMUNICATION STYLE:
- Keep responses SHORT, MEANINGFUL, and PROFESSIONAL
- NO emojis allowed - maintain formal tone
- Be direct and concise - avoid unnecessary elaboration
- Use clear, simple language
- After each response, ask: "Was this helpful? Is there anything else I can assist you with?"

## PRIMARY MISSION:
Answer user questions about their account, tournaments, wallet, and platform features.

## CRITICAL RULES - NEVER VIOLATE:
1. ONLY discuss topics related to the USER's account and the Vyuha Esports platform
2. NEVER mention or provide information about:
   - Organizer Panel or Dashboard
   - Creator Panel or Dashboard  
   - Admin Panel or any administrative features
   - Backend systems or internal operations
3. If asked about organizer/creator/admin features, respond: "I assist with player account matters only. For organizer or admin queries, please contact support directly."

## About Vyuha Esports:
- Esports tournament platform for players to compete and win real money
- Supports Free Fire, BGMI, and other popular mobile games

## Key Features:
1. Tournaments: Online and local tournaments with cash prizes
2. Wallet System: Deposit to join tournaments, withdraw winnings
3. Dhana: Virtual currency earned from wins
4. Teams: Create or join teams for team tournaments
5. Leaderboard: Global rankings based on performance

## Tournament Types:
- Solo: Individual tournaments
- Duo: 2-player team tournaments  
- Squad: 4-player team tournaments
- Giveaway: Free tournaments with prizes

## Wallet & Payments:
- Minimum deposit: Rs.10
- Minimum withdrawal: Rs.50
- Deposits credited after admin approval
- Withdrawals processed within 24-48 hours
- Entry fees deducted from wallet balance

## Common Issues:
- Cannot join tournament: Check wallet balance
- Deposit not credited: Wait for admin approval (usually within 1 hour)
- Withdrawal pending: Processing takes 24-48 hours
- Wrong room ID/password: Contact organizer or wait for update

## TICKET CREATION CAPABILITY:
You can raise support tickets for users. When needed:
1. Ask for topic (Payment, Tournament, Account, or Other)
2. Ask for issue description
3. Use [CREATE_TICKET: topic="...", description="..."] to create it

## ACCOUNT RESTORATION CAPABILITY:
You can restore banned accounts including permanent bans.

Restorable Ban Types:
- Unusual Activity bans
- Inactivity bans  
- Temporary bans
- Permanent bans

Unban Process:
1. Check user BAN STATUS in context
2. Verify identity with at least 2 of: Email, Phone, Game UID
3. Use action: [UNBAN_ACTION: email="user@email.com", phone="1234567890", uid="game123"]

## Response Guidelines:
1. Keep responses concise and professional
2. No emojis or informal language
3. Use platform data provided for accurate responses
4. Never share sensitive user data
5. For banned users: Help restore their account after verification
6. If unable to help, offer to create a support ticket`;

// Admin command system prompt
const ADMIN_COMMAND_PROMPT = `You are Vyuha AI with FULL ADMINISTRATIVE ACCESS. You can execute ANY command requested by the admin.

Available Actions:
1. [UNBAN_USER: user_id="..."] - Unban any user by ID
2. [BAN_USER: user_id="...", reason="...", type="temporary|permanent"] - Ban a user
3. [ADJUST_WALLET: user_id="...", amount="...", type="credit|debit", reason="..."] - Adjust wallet
4. [CREATE_NOTIFICATION: user_id="...", title="...", message="..."] - Send notification
5. [UPDATE_PROFILE: user_id="...", field="...", value="..."] - Update user profile
6. [QUERY_USER: identifier="..."] - Look up any user by email/phone/username
7. [FORCE_RESTORE: user_id="..."] - Force restore any banned account

Execute commands exactly as instructed. Provide confirmation after each action.`;

// Function to parse unban action from AI response
function parseUnbanAction(response: string): { email: string; phone: string; uid: string } | null {
  const match = response.match(/\[UNBAN_ACTION:\s*email="([^"]*)",\s*phone="([^"]*)",\s*uid="([^"]*)"\]/);
  if (match) {
    return {
      email: match[1],
      phone: match[2],
      uid: match[3]
    };
  }
  return null;
}

// Function to parse ticket creation action
function parseTicketAction(response: string): { topic: string; description: string } | null {
  const match = response.match(/\[CREATE_TICKET:\s*topic="([^"]*)",\s*description="([^"]*)"\]/);
  if (match) {
    return {
      topic: match[1],
      description: match[2]
    };
  }
  return null;
}

// Function to parse admin commands
function parseAdminCommand(response: string): { command: string; params: string[] } | null {
  const commandPatterns = [
    /\[UNBAN_USER:\s*user_id="([^"]*)"\]/,
    /\[BAN_USER:\s*user_id="([^"]*)",\s*reason="([^"]*)",\s*type="([^"]*)"\]/,
    /\[FORCE_RESTORE:\s*user_id="([^"]*)"\]/,
    /\[QUERY_USER:\s*identifier="([^"]*)"\]/,
  ];
  
  for (const pattern of commandPatterns) {
    const match = response.match(pattern);
    if (match) {
      return { command: pattern.source, params: match.slice(1) };
    }
  }
  return null;
}

type LlmApiError = Error & { status?: number; provider?: string };

function isOpenRouterKey(apiKey: string) {
  return apiKey.startsWith('sk-or-');
}

function normalizeOpenRouterModel(model: string) {
  if (model.includes('/')) return model;

  const m = model.trim().toLowerCase();
  if (m === 'deepseek-r1' || m === 'deepseek-reasoner' || m === 'r1') return 'deepseek/deepseek-r1';
  if (m === 'deepseek-chat') return 'deepseek/deepseek-chat';
  return model;
}

function throwLlmApiError(provider: string, status: number, bodyText: string): never {
  const err = new Error(`${provider} API error: ${status} - ${bodyText}`) as LlmApiError;
  err.status = status;
  err.provider = provider;
  throw err;
}

// Function to call DeepSeek R1 API (or OpenRouter)
async function callDeepSeekR1(
  systemPrompt: string,
  messages: any[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<{ response: string; reasoning: string | null; usage: any; model: string }> {
  
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const useOpenRouter = isOpenRouterKey(DEEPSEEK_API_KEY);
  const provider = useOpenRouter ? 'OpenRouter' : 'DeepSeek';
  const endpoint = useOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.deepseek.com/chat/completions';
  const apiModel = useOpenRouter ? normalizeOpenRouterModel(model) : model;

  console.log(`Calling ${provider} with model: ${apiModel}`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
      ...(useOpenRouter ? { 'X-Title': 'Vyuha Esports' } : {}),
    },
    body: JSON.stringify({
      model: apiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: maxTokens,
      temperature: temperature,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${provider} API error: ${response.status}`, errorText);
    throwLlmApiError(provider, response.status, errorText);
  }

  const data = await response.json();
  const generatedText = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
  const reasoningContent = data.choices?.[0]?.message?.reasoning_content || null;
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  
  console.log(`Successfully got response from ${provider} model: ${apiModel}, tokens used: ${usage.total_tokens}`);
  
  return { response: generatedText, reasoning: reasoningContent, usage, model: apiModel };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { messages, type = 'support', userId, adminCommand } = await req.json();

    if (!DEEPSEEK_API_KEY) {
      console.error('DEEPSEEK_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'DeepSeek R1 API key not configured. Please add your API key in admin settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI settings from platform_settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['ai_model', 'ai_max_tokens', 'ai_temperature', 'ai_system_prompt', 'ai_enabled']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach(s => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    // Check if AI is enabled
    if (settingsMap['ai_enabled'] === 'false') {
      return new Response(
        JSON.stringify({ error: 'AI features are currently disabled' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token limits
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

    // Get configuration
    const model = settingsMap['ai_model'] || 'deepseek-reasoner';
    const maxTokens = parseInt(settingsMap['ai_max_tokens'] || '2048');
    const temperature = parseFloat(settingsMap['ai_temperature'] || '0.7');
    const customSystemPrompt = settingsMap['ai_system_prompt'] || '';

    let systemPrompt = VYUHA_SYSTEM_PROMPT;
    
    // Different system prompts for different use cases
    if (type === 'admin_command') {
      systemPrompt = ADMIN_COMMAND_PROMPT;
    } else if (type === 'moderation') {
      systemPrompt = `You are a content moderation assistant. Analyze the given content and determine if it violates community guidelines.`;
    } else if (type === 'broadcast') {
      systemPrompt = `You are the official Vyuha Esports content writer. Create engaging, gaming-focused content for broadcasts to the community.`;
    }

    // Append custom prompt if configured
    if (customSystemPrompt) {
      systemPrompt += `\n\nAdditional Context: ${customSystemPrompt}`;
    }

    // Get real-time platform context
    const platformContext = await getPlatformContext(supabase, userId);
    systemPrompt += platformContext;

    console.log(`Calling DeepSeek R1 with type: ${type} userId: ${userId}`);

    // Call DeepSeek R1 API
    const result = await callDeepSeekR1(
      systemPrompt,
      messages,
      model,
      maxTokens,
      temperature
    );

    let finalResponse = result.response;

    // Check for unban action in the response
    const unbanAction = parseUnbanAction(finalResponse);
    if (unbanAction && userId) {
      // Attempt to unban the user - now supports ALL ban types including permanent
      try {
        // First try the RPC function
        const { data: unbanResult, error: rpcError } = await supabase.rpc('ai_unban_user', {
          p_user_id: userId,
          p_verified_email: unbanAction.email,
          p_verified_phone: unbanAction.phone,
          p_verified_uid: unbanAction.uid
        });

        if (!rpcError && unbanResult?.success) {
          finalResponse = finalResponse.replace(/\[UNBAN_ACTION:[^\]]+\]/, '');
          finalResponse += '\n\n✅ Great news! Your account has been successfully restored! You can now access all features of Vyuha Esports again. Welcome back! 🎮\n\nWas this helpful? Is there anything else I can assist you with? 😊';
        } else {
          // Try direct unban for permanent bans
          const { error: directUnbanError } = await supabase
            .from('player_bans')
            .update({ 
              is_active: false, 
              lifted_at: new Date().toISOString(),
              lift_reason: 'AI Restoration - Identity Verified'
            })
            .eq('user_id', userId)
            .eq('is_active', true);

          if (!directUnbanError) {
            // Also update profile
            await supabase
              .from('profiles')
              .update({ is_banned: false })
              .eq('user_id', userId);

            finalResponse = finalResponse.replace(/\[UNBAN_ACTION:[^\]]+\]/, '');
            finalResponse += '\n\n✅ Great news! Your account has been successfully restored! Even permanent bans can be lifted when you verify your identity. Welcome back to Vyuha! 🎮\n\nWas this helpful? Is there anything else I can assist you with? 😊';
          } else {
            finalResponse = finalResponse.replace(/\[UNBAN_ACTION:[^\]]+\]/, '');
            finalResponse += '\n\n❌ Sorry, I couldn\'t verify your details. Please make sure you\'re providing the correct registered email, phone number, and game UID.\n\nWould you like me to raise a support ticket for you instead? 😊';
          }
        }
      } catch (err) {
        console.error('Unban error:', err);
        finalResponse = finalResponse.replace(/\[UNBAN_ACTION:[^\]]+\]/, '');
        finalResponse += '\n\n❌ I encountered an issue while trying to restore your account. Let me create a support ticket for you.\n\nWas there anything else I can help with? 😊';
      }
    }

    // Check for ticket creation action
    const ticketAction = parseTicketAction(finalResponse);
    if (ticketAction && userId) {
      try {
        const { error: ticketError } = await supabase
          .from('support_tickets')
          .insert({
            user_id: userId,
            topic: ticketAction.topic,
            description: `[Created by Vyuha AI]\n\n${ticketAction.description}`,
            status: 'open'
          });

        if (!ticketError) {
          finalResponse = finalResponse.replace(/\[CREATE_TICKET:[^\]]+\]/, '');
          finalResponse += '\n\n🎫 I\'ve created a support ticket for you! Our team will review it and respond within 24 hours.\n\nIs there anything else I can help you with? 😊';
        }
      } catch (err) {
        console.error('Ticket creation error:', err);
      }
    }

    // Log the usage
    const responseTime = Date.now() - startTime;
    await supabase.from('ai_usage_logs').insert({
      user_id: userId || null,
      request_type: type,
      input_tokens: result.usage.prompt_tokens || 0,
      output_tokens: result.usage.completion_tokens || 0,
      total_tokens: result.usage.total_tokens || 0,
      model: result.model,
      response_time_ms: responseTime,
      status: 'success',
    });

    return new Response(
      JSON.stringify({ 
        response: finalResponse,
        reasoning: result.reasoning,
        model: result.model,
        tokens: result.usage.total_tokens
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('DeepSeek R1 chat error:', error);
    
    const responseTime = Date.now() - startTime;
    
    // Log the error
    await supabase.from('ai_usage_logs').insert({
      user_id: null,
      request_type: 'support',
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      model: 'deepseek-reasoner',
      response_time_ms: responseTime,
      status: 'error',
      error_message: error.message || 'Unknown error',
    });

    // Handle specific error types
    if (error.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'Failed to get AI response. Please try again.',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
