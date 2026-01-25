import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get platform context for AI
    const [tournamentsResult, localTournamentsResult, usersResult] = await Promise.all([
      supabase.from('tournaments').select('title, game, entry_fee, prize_pool, status, start_date').order('created_at', { ascending: false }).limit(5),
      supabase.from('local_tournaments').select('tournament_name, game, entry_fee, status, tournament_date').order('created_at', { ascending: false }).limit(5),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
    ]);

    const recentTournaments = tournamentsResult.data || [];
    const recentLocalTournaments = localTournamentsResult.data || [];
    const totalUsers = usersResult.count || 0;

    // Create context for AI
    const platformContext = `
VYUHA ESPORTS PLATFORM STATUS:
- Total registered players: ${totalUsers}
- Recent tournaments: ${recentTournaments.map(t => `${t.title} (${t.game}) - ${t.status}`).join(', ') || 'None'}
- Recent local tournaments: ${recentLocalTournaments.map(t => `${t.tournament_name} (${t.game}) - ${t.status}`).join(', ') || 'None'}

Today's date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    `;

    // Get current date and time in IST
    const now = new Date();
    const istOptions: Intl.DateTimeFormatOptions = { 
      timeZone: 'Asia/Kolkata', 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    const currentDateTime = now.toLocaleString('en-IN', istOptions);

    // Expanded content types with esports news and player highlights
    const contentTypes = [
      'tournament_update', 
      'motivation', 
      'game_tips', 
      'platform_news',
      'esports_news',
      'player_spotlight',
      'industry_update',
      'match_analysis'
    ];
    const selectedType = contentTypes[Math.floor(Math.random() * contentTypes.length)];

    let systemPrompt = '';
    let userPrompt = '';

    // Base system prompt for professional, no-emoji responses
    const baseSystemPrompt = `You are Vyuha AI, the official AI of Vyuha Esports - India's premier gaming tournament platform. 
RULES:
- Write professionally without emojis
- Be concise and informative
- Include relevant dates and times
- Focus on facts and actionable information
- Current Date/Time: ${currentDateTime}`;

    switch (selectedType) {
      case 'tournament_update':
        systemPrompt = baseSystemPrompt;
        userPrompt = `${platformContext}

Create a tournament update for players:
- Mention active or upcoming tournaments with dates
- Include entry fees and prize pools where relevant
- Keep it under 120 words
- Professional tone, no emojis

Format: Title on first line, then content.`;
        break;

      case 'motivation':
        systemPrompt = baseSystemPrompt;
        userPrompt = `Create a motivational message for competitive gamers:
- Focus on improvement and dedication
- Reference esports legends or tournament success stories
- Keep it under 100 words
- Professional tone, no emojis

Format: Title on first line, then content.`;
        break;

      case 'game_tips':
        systemPrompt = baseSystemPrompt;
        userPrompt = `Create a gaming strategy tip for BGMI or Free Fire:
- Provide one specific actionable tip
- Explain why it works in competitive play
- Keep it under 100 words
- Professional tone, no emojis

Format: Title on first line, then content.`;
        break;

      case 'platform_news':
        systemPrompt = baseSystemPrompt;
        userPrompt = `${platformContext}

Create a platform update:
- Highlight a feature (tournaments, Dhana rewards, local events)
- Include current platform stats
- Keep it under 100 words
- Professional tone, no emojis

Format: Title on first line, then content.`;
        break;

      case 'esports_news':
        systemPrompt = baseSystemPrompt;
        userPrompt = `Create an esports industry news update:
- Cover recent developments in Indian esports (BGMI, Free Fire, Valorant)
- Include tournament announcements, team updates, or industry milestones
- Reference real esports organizations (like BGIS, FFIC, VCT)
- Include the date: ${currentDateTime}
- Keep it under 150 words
- Professional tone, no emojis

Format: Title on first line, then news content.`;
        break;

      case 'player_spotlight':
        systemPrompt = baseSystemPrompt;
        userPrompt = `Create a player spotlight feature:
- Highlight achievements of notable Indian esports players
- Reference players from teams like GodLike, Soul, TSM, OR, Global Esports
- Include their achievements, playstyle, or recent performances
- Date: ${currentDateTime}
- Keep it under 130 words
- Professional tone, no emojis

Format: "Player Spotlight: [Name]" as title, then profile content.`;
        break;

      case 'industry_update':
        systemPrompt = baseSystemPrompt;
        userPrompt = `Create an esports industry update:
- Cover esports market growth, sponsorships, or major announcements
- Reference Indian gaming industry developments
- Include prize pool trends or viewership statistics
- Date: ${currentDateTime}
- Keep it under 130 words
- Professional tone, no emojis

Format: Title on first line, then industry update.`;
        break;

      case 'match_analysis':
        systemPrompt = baseSystemPrompt;
        userPrompt = `Create a match analysis or tournament recap:
- Analyze recent competitive matches or tournament results
- Reference BGMI or Free Fire tournaments
- Include tactical insights or standout performances
- Date: ${currentDateTime}
- Keep it under 140 words
- Professional tone, no emojis

Format: Title on first line, then analysis content.`;
        break;
    }

    console.log(`Generating ${selectedType} broadcast...`);

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated from AI');
    }

    console.log('AI generated content:', generatedContent);

    // Parse title and message from generated content
    const lines = generatedContent.split('\n').filter((line: string) => line.trim());
    let title = lines[0]?.replace(/^[#*]+\s*/, '').trim() || 'Daily Update from Vyuha AI';
    let message = lines.slice(1).join('\n').trim() || generatedContent;

    // Clean up title if it's too long
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    // Get admin user for broadcast (use first admin or create system broadcast)
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    const adminId = adminRole?.user_id;

    if (!adminId) {
      console.log('No admin found, skipping broadcast creation');
      return new Response(JSON.stringify({ success: false, error: 'No admin found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert broadcast with category tag
    const categoryTag = selectedType.replace('_', ' ').toUpperCase();
    const { data: broadcast, error: insertError } = await supabase
      .from('admin_broadcasts')
      .insert({
        admin_id: adminId,
        title: `[${categoryTag}] ${title}`,
        message: message,
        broadcast_type: 'message',
        target_audience: 'all',
        is_published: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting broadcast:', insertError);
      throw insertError;
    }

    console.log('Broadcast created successfully:', broadcast.id);

    // Send notifications to all users
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('user_id');

    if (allUsers && allUsers.length > 0) {
      const notifications = allUsers.map(user => ({
        user_id: user.user_id,
        title: `[${categoryTag}] ${title}`,
        message: message.substring(0, 200) + (message.length > 200 ? '...' : ''),
        type: 'broadcast',
        related_id: broadcast.id,
      }));

      // Insert in batches of 100
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        await supabase.from('notifications').insert(batch);
      }

      console.log(`Sent notifications to ${allUsers.length} users`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      broadcast_id: broadcast.id,
      content_type: selectedType,
      title: title
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-daily-broadcast:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
