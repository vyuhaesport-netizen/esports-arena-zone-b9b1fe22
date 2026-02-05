 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 // Mock team members (6 members - max for a team)
 const MOCK_MEMBERS = [
   { user_id: 'member-1', username: 'DragonSlayer', full_name: 'Arjun Sharma', avatar_url: null },
   { user_id: 'member-2', username: 'PhoenixRising', full_name: 'Priya Patel', avatar_url: null },
   { user_id: 'member-3', username: 'ShadowNinja', full_name: 'Rahul Kumar', avatar_url: null },
   { user_id: 'member-4', username: 'ThunderBolt', full_name: 'Sneha Reddy', avatar_url: null },
   { user_id: 'member-5', username: 'IceQueen', full_name: 'Anjali Gupta', avatar_url: null },
   { user_id: 'member-6', username: 'FireMage', full_name: 'Vikram Singh', avatar_url: null },
 ];
 
 // Sample messages for realistic chat
 const MESSAGE_TEMPLATES = [
   "Bhai match start hone wala hai, ready ho?",
   "Mera loadout ready hai 💪",
   "Kaunsa drop lena hai?",
   "Pochinki chalte hain",
   "School building mein loot milega",
   "Enemy spotted 🎯",
   "Cover me, reloading!",
   "Nice headshot bro! 🔥",
   "GG well played everyone",
   "Next match mein aur achha khelenge",
   "Scope mil gaya finally",
   "Medkit use kar le jaldi",
   "Zone aa raha hai, move karo",
   "Vehicle lena padega",
   "Bridge pe enemies hain",
   "Sniper hai uske paas",
   "Smoke throw karo",
   "Grenade use karo",
   "Last circle mein hain hum",
   "Winner winner chicken dinner! 🏆",
   "Kya strategy use karein?",
   "Flanking karte hain",
   "Rush karo!",
   "Patience rakho",
   "Level 3 helmet mila",
   "AWM drop mein hai",
   "Flare gun use karo",
   "Air drop aa raha hai",
   "Compound secure karo",
   "High ground lo",
   "Bots hain ye log 😂",
   "Pro player hai ye wala",
   "Ping karo enemy location",
   "Ammo chahiye",
   "First aid de do koi",
   "Revive karo jaldi!",
   "Knocked ho gaya 😭",
   "Clutch kar diya bhai!",
   "MVP ban gaya tu! 🌟",
   "Tournament practice karte hain",
   "Scrim khelein kya?",
   "Custom room banana hai?",
   "Discord pe aao sab",
   "Voice chat on karo",
   "Mic mute hai tumhara",
   "Lag ho raha hai thoda",
   "Ping bahut high hai 📶",
   "Settings optimize karo",
   "Sensitivity kya hai tumhari?",
   "Gyroscope use karte ho?",
 ];
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { teamId, messageCount = 50 } = await req.json();
 
     // Generate mock messages
     const messages = [];
     const now = new Date();
     
     for (let i = 0; i < messageCount; i++) {
       const randomMember = MOCK_MEMBERS[Math.floor(Math.random() * MOCK_MEMBERS.length)];
       const randomMessage = MESSAGE_TEMPLATES[Math.floor(Math.random() * MESSAGE_TEMPLATES.length)];
       
       // Messages spread over the last 24 hours
       const messageTime = new Date(now.getTime() - (messageCount - i) * 2 * 60 * 1000);
       
       messages.push({
         id: `mock-${i}`,
         team_id: teamId || 'mock-team',
         sender_id: randomMember.user_id,
         content: randomMessage,
         created_at: messageTime.toISOString(),
         reactions: {},
         is_edited: false,
         reply_to: null,
         seen_by: MOCK_MEMBERS.map(m => m.user_id).slice(0, Math.floor(Math.random() * 6) + 1),
         sender: {
           username: randomMember.username,
           full_name: randomMember.full_name,
           avatar_url: randomMember.avatar_url,
         },
       });
     }
 
     return new Response(
       JSON.stringify({ messages, members: MOCK_MEMBERS }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   } catch (error) {
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });