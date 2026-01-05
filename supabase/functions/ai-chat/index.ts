import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const groqApiKey = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

IMPORTANT: 
- Only answer questions related to Vyuha Esports platform
- If asked about unrelated topics, politely redirect to Vyuha-related questions
- If you don't know something specific about Vyuha, say so and suggest contacting support`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type = 'support' } = await req.json();

    if (!groqApiKey) {
      console.error('GROQ_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    }

    console.log('Calling Groq API with type:', type);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedText = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    console.log('Groq API response received successfully');

    return new Response(
      JSON.stringify({ response: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in ai-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
