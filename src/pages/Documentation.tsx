import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Trophy, Users, Wallet, Shield, Gamepad2, 
  UserCheck, CreditCard, Award, Clock, ArrowRight,
  Zap, Lock, RefreshCw, Bell, FileText,
  ChevronDown, ChevronUp, User, Settings, MessageSquare,
  Scale, Building2, Star, Target, TrendingUp, Gift
} from 'lucide-react';
import vyuhaLogo from '@/assets/vyuha-logo.png';

interface DocSection {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  content: string;
  keywords: string[];
}

const Documentation = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const docSections: DocSection[] = [
    // Player Stats System - NEW
    {
      id: 'stats-point-system',
      title: 'Stats Point System',
      category: 'Player Stats',
      icon: <Target className="h-5 w-5 text-primary" />,
      content: `**Stats Point System:**

Earn Stats Points based on your tournament rank position!

**Points Per Rank:**
• **Rank 1 (Champion)**: 10 Points
• **Rank 2 (Elite)**: 9 Points
• **Rank 3 (Veteran)**: 8 Points
• **Rank 4 (Master)**: 7 Points
• **Rank 5 (Expert)**: 6 Points
• **Rank 6 (Skilled)**: 5 Points
• **Rank 7 (Adept)**: 4 Points
• **Rank 8 (Rising)**: 3 Points
• **Rank 9 (Starter)**: 2 Points
• **Rank 10 (Rookie)**: 1 Point

**How It Works:**
1. Participate in tournaments
2. Win or place in top 10 positions
3. Automatically earn stats points
4. Points accumulate over time
5. Climb the stats leaderboard!`,
      keywords: ['stats', 'points', 'rank', 'position', 'earn', 'champion', 'elite', 'veteran']
    },
    {
      id: 'stats-milestone-bonuses',
      title: 'Milestone Bonuses',
      category: 'Player Stats',
      icon: <Gift className="h-5 w-5 text-green-500" />,
      content: `**Milestone Bonuses:**

Claim cash rewards when you reach stats point milestones!

**Bonus Tiers:**
• **50 Points - Starter Bonus**: ₹10
• **100 Points - Rising Star**: ₹25
• **500 Points - Pro Player**: ₹100
• **1000 Points - Legend Reward**: ₹500

**Important Rules:**
- Bonus money is added to wallet balance
- Can ONLY be used to join tournaments
- Cannot be withdrawn as cash
- Each milestone can be claimed once
- Claim button appears when eligible

**How to Claim:**
1. Go to Profile → Player Stats
2. Check your total points
3. Click "Claim" on available milestones
4. Money added to wallet instantly!`,
      keywords: ['milestone', 'bonus', 'reward', 'claim', 'money', 'wallet', 'cash']
    },
    {
      id: 'stats-rank-tiers',
      title: 'Player Rank Tiers',
      category: 'Player Stats',
      icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
      content: `**Player Rank Tiers:**

Your overall rank based on total stats points!

**Rank Progression:**
• **Unranked**: 0-9 Points
• **Bronze**: 10-24 Points
• **Silver**: 25-49 Points
• **Gold**: 50-99 Points
• **Platinum**: 100-199 Points
• **Diamond**: 200-299 Points
• **Grandmaster**: 300-499 Points
• **Legendary**: 500+ Points

**Benefits of Higher Ranks:**
- Profile badge display
- Leaderboard recognition
- Exclusive achievements
- Higher milestone bonuses

**Tips to Rank Up:**
- Win more tournaments
- Aim for top 3 positions
- Participate consistently
- Check progress in Player Stats`,
      keywords: ['rank', 'tier', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'grandmaster', 'legendary']
    },
    // Tournament System
    {
      id: 'tournament-modes',
      title: 'Tournament Modes (Solo, Duo, Squad)',
      category: 'Tournaments',
      icon: <Gamepad2 className="h-5 w-5 text-primary" />,
      content: `**Tournament Modes:**
      
• **Solo Mode**: Individual players compete. Each player registers and plays alone. Winner is an individual.

• **Duo Mode**: Teams of 2 players. Team leader selects 1 teammate and enters a team name. Entry fee is charged to both players. Prize is split equally between teammates.

• **Squad Mode**: Teams of 4 players. Team leader selects 3 teammates and enters a team name. Entry fee is charged to all 4 players. Prize is split equally among all 4 members.

**How Teams Join:**
1. Leader clicks "Join Tournament"
2. Selects teammates from their Player Teams
3. Enters a tournament team name
4. Entry fee deducted from each member's wallet
5. All members added to tournament's joined_users array

**Winner Declaration for Duo/Squad:**
- Organizer selects TEAM (not individual) for positions
- Prize amount is divided equally among team members
- Example: 1st place ₹1000 for Duo = ₹500 each`,
      keywords: ['solo', 'duo', 'squad', 'team', 'mode', 'players', 'join', 'tournament', 'teammates']
    },
    {
      id: 'tournament-creation',
      title: 'Creating Tournaments (Organizer/Creator)',
      category: 'Tournaments',
      icon: <Trophy className="h-5 w-5 text-amber-500" />,
      content: `**Steps to Create a Tournament:**

1. Go to Organizer/Creator Dashboard
2. Click "Create Tournament" button
3. Fill in required fields:
   - Title, Game, Entry Fee, Max Participants
   - Start Date & Time
   - Tournament Mode (Solo/Duo/Squad)
   - Prize Distribution (JSON format)
4. Click "Create"

**Tournament Lifecycle:**
1. **Upcoming**: Tournament created, registration open
2. **Ongoing**: Started by organizer (requires Room ID)
3. **Completed**: Ended by organizer, 30-min wait for winner declaration
4. **Cancelled**: Cancelled with refunds to all participants

**Prize Pool Calculation:**
- Base Prize Pool = Entry Fee × Number of Players × 70%
- Organizer/Creator Commission = 20%
- Platform Fee = 10%`,
      keywords: ['create', 'tournament', 'organizer', 'creator', 'prize', 'pool', 'entry', 'fee']
    },
    {
      id: 'winner-declaration',
      title: 'Declaring Winners',
      category: 'Tournaments',
      icon: <Award className="h-5 w-5 text-yellow-500" />,
      content: `**Winner Declaration Process:**

1. Tournament must be "Completed" status
2. Wait 30 minutes after ending (anti-cheat verification)
3. Click "Declare Winners" button
4. For Solo: Select individual players for positions (1st, 2nd, 3rd...)
5. For Duo/Squad: Select TEAMS for positions
6. Click "Submit" to distribute prizes

**Important Rules:**
- Winners can only be declared ONCE per tournament
- Prize distribution can be edited before declaring
- Team prizes are split equally among all members
- Organizer commission is auto-credited to Dhana balance

**Auto-Cancel Feature:**
- If winner not declared within 1 hour of completion
- Tournament auto-cancels
- All participants receive full refund`,
      keywords: ['winner', 'declare', 'prize', 'distribution', 'team', 'solo', 'cancel', 'refund']
    },
    {
      id: 'tournament-lifecycle',
      title: 'Tournament Status Flow',
      category: 'Tournaments',
      icon: <RefreshCw className="h-5 w-5 text-blue-500" />,
      content: `**Tournament Status Flow:**

UPCOMING → ONGOING → COMPLETED → Winners Declared

**Status Transitions:**

• **Upcoming → Ongoing**: 
  - Organizer clicks "Start Tournament"
  - Room ID must be set
  - Prize pool is recalculated based on actual participants

• **Ongoing → Completed**:
  - Organizer clicks "End Tournament"
  - 30-minute cooldown starts
  - Players can submit reports

• **Completed → Winners Declared**:
  - After 30-min cooldown
  - Organizer declares winners
  - Prizes distributed automatically

• **Cancelled** (from any status):
  - Organizer cancels with reason
  - All participants refunded
  - Tournament marked as cancelled`,
      keywords: ['status', 'upcoming', 'ongoing', 'completed', 'cancelled', 'lifecycle', 'flow']
    },
    // Wallet System
    {
      id: 'wallet-system',
      title: 'Wallet System',
      category: 'Payments',
      icon: <Wallet className="h-5 w-5 text-green-500" />,
      content: `**Wallet Balance:**
- Main currency for tournament entry fees
- Credited via manual payment gateway
- Used for joining tournaments

**How to Add Money:**
1. Go to Wallet → "Add Money"
2. Select amount
3. Pay via UPI/Bank to provided details
4. Submit UTR number
5. Wait for admin verification (15 min - 24 hrs)

**Withdrawals:**
- Minimum withdrawal: ₹100
- Maximum: ₹10,000 per transaction
- Requires UPI ID
- Admin approval required`,
      keywords: ['wallet', 'balance', 'money', 'add', 'withdraw', 'upi', 'payment']
    },
    {
      id: 'dhana-system',
      title: 'Dhana (Organizer/Creator Currency)',
      category: 'Payments',
      icon: <CreditCard className="h-5 w-5 text-purple-500" />,
      content: `**What is Dhana?**
- Special currency for Organizers and Creators
- Earned as commission from tournaments
- Has a 15-day maturity period

**Earning Dhana:**
- 20% of tournament entry fees
- Credited after winner declaration
- Appears as "Pending Dhana"

**Dhana Maturity:**
- 15-day waiting period after earning
- After maturity, becomes "Available Dhana"
- Can be withdrawn to bank account

**Withdrawing Dhana:**
1. Go to Organizer/Creator Wallet
2. Click "Withdraw Dhana"
3. Enter amount and UPI ID
4. Wait for admin approval`,
      keywords: ['dhana', 'organizer', 'creator', 'commission', 'earnings', 'maturity', 'withdraw']
    },
    // User System
    {
      id: 'user-roles',
      title: 'User Roles & Permissions',
      category: 'Users',
      icon: <UserCheck className="h-5 w-5 text-indigo-500" />,
      content: `**User Roles:**

• **Player (Default)**: Can join tournaments, view leaderboard, manage wallet

• **Organizer**: Can create tournaments, declare winners, earn Dhana
  - Apply via Profile → "Become Organizer"
  - Requires verification (Aadhaar, phone)

• **Creator**: Special content creators with tournament privileges
  - Assigned by admin only
  - Same abilities as Organizer`,
      keywords: ['role', 'player', 'organizer', 'creator', 'permission']
    },
    {
      id: 'player-teams',
      title: 'Player Teams',
      category: 'Users',
      icon: <Users className="h-5 w-5 text-cyan-500" />,
      content: `**Creating a Team:**
1. Go to Profile → Team
2. Click "Create Team"
3. Enter team name, game, slogan
4. Invite members via search

**Team Structure:**
- Leader: Can manage team, invite/remove members
- Members: Can participate in team tournaments

**Using Teams in Tournaments:**
- For Duo/Squad tournaments
- Select teammates from your teams
- Each member must have sufficient wallet balance
- Entry fee charged to each member individually`,
      keywords: ['team', 'create', 'leader', 'member', 'invite', 'squad', 'duo']
    },
    // Platform Features
    {
      id: 'local-tournaments',
      title: 'Local Tournaments (Schools/Colleges)',
      category: 'Features',
      icon: <Building2 className="h-5 w-5 text-orange-500" />,
      content: `**What are Local Tournaments?**
- Institution-specific tournaments
- Private code-based access
- For schools, colleges, organizations

**Applying for Local Tournament:**
1. Go to Local Tournament page
2. Click "Apply for Local Tournament"
3. Fill institution details, contact, game
4. Submit for admin approval

**How It Works:**
- Admin approves application
- Private code generated
- Share code with participants
- Players join using code via QR scan or manual entry
- Same tournament flow (join → play → winners)`,
      keywords: ['local', 'tournament', 'school', 'college', 'institution', 'private', 'code']
    },
    {
      id: 'achievements',
      title: 'Achievements System',
      category: 'Features',
      icon: <Star className="h-5 w-5 text-yellow-500" />,
      content: `**How Achievements Work:**
- Unlock by completing specific actions
- Earn points and special avatars
- Display on profile

**Achievement Categories:**
- Tournament: Win matches, participate in events
- Social: Make friends, join teams
- Spending: Add money, join paid tournaments
- Loyalty: Daily logins, account age

**Rewards:**
- Points for leaderboard ranking
- Exclusive avatar unlocks
- Profile badges`,
      keywords: ['achievement', 'badge', 'reward', 'points', 'unlock', 'avatar']
    },
    {
      id: 'broadcast-channel',
      title: 'Broadcast Channel',
      category: 'Features',
      icon: <Bell className="h-5 w-5 text-red-500" />,
      content: `**What is Broadcast Channel?**
- Official announcements from platform
- New tournament alerts
- Important updates and news

**Content Types:**
- Text announcements
- Image/Banner posts
- Video links (YouTube)
- Voice messages

**Notifications:**
- Push notifications for new broadcasts
- In-app notification bell
- Broadcast history in channel page`,
      keywords: ['broadcast', 'channel', 'announcement', 'notification', 'news', 'update']
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard System',
      category: 'Features',
      icon: <Trophy className="h-5 w-5 text-amber-500" />,
      content: `**Leaderboard Ranking:**

**Top Earners:**
- Based on total prize winnings
- Shows players who won the most money
- Updated after each tournament

**Best Players:**
- Based on Stats Points
- Calculated from tournament rank positions
- Higher positions = more points

**Earning Rankings:**
- Win tournaments to earn points
- Higher positions = more points
- Consistent performance rewards`,
      keywords: ['leaderboard', 'ranking', 'points', 'top', 'player', 'winner', 'stats']
    }
  ];

  const categories = [...new Set(docSections.map(s => s.category))];

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return docSections;
    
    const query = searchQuery.toLowerCase();
    return docSections.filter(section => 
      section.title.toLowerCase().includes(query) ||
      section.content.toLowerCase().includes(query) ||
      section.keywords.some(k => k.includes(query))
    );
  }, [searchQuery]);

  const groupedSections = useMemo(() => {
    return categories.map(cat => ({
      category: cat,
      sections: filteredSections.filter(s => s.category === cat)
    })).filter(g => g.sections.length > 0);
  }, [filteredSections]);

  return (
    <AppLayout title="Documentation" showBack>
      <div className="p-4 pb-8 space-y-4">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl border-2 border-border p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border-2 border-border mb-4">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Platform Documentation</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Complete guide to all features and workflows in Vyuha Esport
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results count */}
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            Found {filteredSections.length} results for "{searchQuery}"
          </p>
        )}

        {/* Documentation Sections */}
        <div className="space-y-6">
          {groupedSections.map(group => (
            <div key={group.category} className="space-y-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {group.category}
                </Badge>
                <span className="text-muted-foreground text-sm font-normal">
                  ({group.sections.length} topics)
                </span>
              </h2>

              <div className="space-y-2">
                {group.sections.map(section => (
                  <Card 
                    key={section.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      expandedSection === section.id ? 'ring-2 ring-primary/50' : ''
                    }`}
                    onClick={() => setExpandedSection(
                      expandedSection === section.id ? null : section.id
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            {section.icon}
                          </div>
                          <CardTitle className="text-sm font-semibold">
                            {section.title}
                          </CardTitle>
                        </div>
                        {expandedSection === section.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                    
                    {expandedSection === section.id && (
                      <CardContent className="pt-0 px-4 pb-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                            {section.content.split('\n').map((line, i) => {
                              if (line.startsWith('**') && line.endsWith('**')) {
                                return (
                                  <p key={i} className="font-semibold text-foreground mt-3 mb-1">
                                    {line.replace(/\*\*/g, '')}
                                  </p>
                                );
                              }
                              if (line.startsWith('• ')) {
                                const content = line.substring(2);
                                if (content.includes('**')) {
                                  const parts = content.split('**');
                                  return (
                                    <p key={i} className="pl-4 flex items-start gap-2">
                                      <span className="text-primary">•</span>
                                      <span>
                                        <strong className="text-foreground">{parts[1]}</strong>
                                        {parts[2]}
                                      </span>
                                    </p>
                                  );
                                }
                                return (
                                  <p key={i} className="pl-4 flex items-start gap-2">
                                    <span className="text-primary">•</span>
                                    <span>{content}</span>
                                  </p>
                                );
                              }
                              if (/^\d+\./.test(line.trim())) {
                                return (
                                  <p key={i} className="pl-4">
                                    {line}
                                  </p>
                                );
                              }
                              return <p key={i}>{line}</p>;
                            })}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {groupedSections.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try different keywords
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Documentation;