import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Download,
  Users,
  Wallet,
  Trophy,
  Shield,
  CreditCard,
  Bell,
  Settings,
  Database,
  Code,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  Play,
  Square,
  Award,
  UserCheck
} from 'lucide-react';

interface FunctionDoc {
  name: string;
  description: string;
  location: string;
  logic: string[];
  database?: string;
  security?: string;
  addedDate?: string;
}

const AdminDocumentation = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const recentUpdates: FunctionDoc[] = [
    {
      name: 'Profile Completion Flow',
      description: 'Mandatory profile completion after signup with essential gaming fields',
      location: 'src/pages/Auth.tsx, src/pages/CompleteProfile.tsx, src/App.tsx',
      logic: [
        'Signup now only requires email, password, and terms acceptance',
        'After signup, user is redirected to /complete-profile page',
        'Required fields: username, preferred_game, in_game_name, game_uid',
        'App-wide check verifies these 4 fields on every route',
        'Incomplete profiles are redirected to /complete-profile',
        'Full name and phone are optional (can be added later in profile edit)'
      ],
      database: 'profiles (username, preferred_game, in_game_name, game_uid)',
      security: 'Protected route ensures profile completion before accessing app',
      addedDate: '2024-12-23'
    },
    {
      name: 'Start Tournament Button',
      description: 'Organizers/Creators manually start tournaments when scheduled time is reached',
      location: 'src/pages/creator/CreatorDashboard.tsx, src/pages/admin/AdminTournaments.tsx',
      logic: [
        'Button appears when tournament start_date is reached (past or current)',
        'Only visible for "upcoming" status tournaments',
        'Clicking triggers recalculate_tournament_prizepool RPC first',
        'Then updates tournament status from "upcoming" to "ongoing"',
        'Tournament now appears in "Live" section of My Matches',
        'Players can see room ID and password after tournament starts'
      ],
      database: 'tournaments (status: upcoming → ongoing)',
      security: 'Only tournament creator or admin can start',
      addedDate: '2024-12-23'
    },
    {
      name: 'End Tournament Button',
      description: 'Organizers/Creators end tournaments to move them to completed status',
      location: 'src/pages/creator/CreatorDashboard.tsx, src/pages/admin/AdminTournaments.tsx',
      logic: [
        'Button appears for tournaments with "ongoing" status',
        'Clicking updates status from "ongoing" to "completed"',
        'Sets end_date timestamp to current time',
        'Tournament moves to "Completed" section in My Matches',
        'Winner declaration button becomes available after 30 minutes'
      ],
      database: 'tournaments (status: ongoing → completed, end_date)',
      security: 'Only tournament creator or admin can end',
      addedDate: '2024-12-23'
    },
    {
      name: '2-Minute Registration Lock',
      description: 'Prevents new registrations within 2 minutes of tournament start',
      location: 'src/pages/Home.tsx, Database Functions',
      logic: [
        'Home page hides tournaments that are within 2 minutes of start_date',
        'Database functions block joining with "Registration closed" error',
        'Applies to both solo and team tournament joins',
        'Already registered players can still view tournament in My Matches',
        'System recalculates prize pool when registration closes',
        'Prevents last-minute joins that could affect prize calculations'
      ],
      database: 'tournaments (start_date comparison)',
      security: 'Enforced at both UI (Home.tsx) and database function level',
      addedDate: '2024-12-23'
    },
    {
      name: 'Winner Declaration 30-Minute Delay',
      description: 'Winner declaration button only enabled 30 minutes after tournament ends',
      location: 'src/pages/creator/CreatorDashboard.tsx',
      logic: [
        'After clicking "End Tournament", end_date is recorded',
        '"Declare Winner" button appears but is disabled initially',
        'Button shows countdown or "Available in X minutes" message',
        'Becomes clickable only 30 minutes after end_date',
        'Gives time for disputes and result verification',
        'Organizer can then select winners by position'
      ],
      database: 'tournaments (end_date + 30 minute check)',
      security: 'Time-based validation prevents premature declarations',
      addedDate: '2024-12-23'
    },
    {
      name: 'Auto Prize Pool Recalculation',
      description: 'Prize pool is recalculated based on actual participants when tournament starts',
      location: 'src/pages/creator/CreatorDashboard.tsx, Database RPC',
      logic: [
        'When organizer clicks "Start Tournament"',
        'recalculate_tournament_prizepool RPC is called automatically',
        'Calculates actual prize pool from real joined players',
        'Updates current_prize_pool based on actual fees collected',
        'Recalculates organizer_earnings and platform_earnings',
        'Scales prize_distribution amounts proportionally',
        'Initial creation values are just predictions, this is the real calculation'
      ],
      database: 'tournaments (current_prize_pool, organizer_earnings, platform_earnings, prize_distribution)',
      security: 'SECURITY DEFINER function ensures accurate calculations',
      addedDate: '2024-12-23'
    },
    {
      name: 'Profile Auto-Creation on Deposit',
      description: 'Admin deposit approval now auto-creates missing profiles',
      location: 'Database RPC (admin_process_deposit)',
      logic: [
        'When admin approves a deposit request',
        'Function first checks if user has a profile',
        'If profile is missing, creates one with email from auth.users',
        'Then credits the deposit amount to wallet_balance',
        'Prevents "profile not found" errors for edge cases',
        'Ensures all users have profiles before money operations'
      ],
      database: 'profiles, wallet_transactions',
      security: 'SECURITY DEFINER, handles missing profiles gracefully',
      addedDate: '2024-12-23'
    }
  ];

  const walletFunctions: FunctionDoc[] = [
    {
      name: 'Add Money (Deposit)',
      description: 'User initiates deposit request with amount',
      location: 'src/pages/Wallet.tsx → src/pages/Payment.tsx',
      logic: [
        'User enters amount (min ₹10) in Wallet page',
        'Redirects to Payment page with amount as query param',
        'Fetches admin UPI ID and QR from platform_settings',
        'User pays via UPI and enters UTR number',
        'Optionally uploads payment screenshot',
        'Creates pending deposit in wallet_transactions table',
        'Admin approves/rejects in AdminDeposits page',
        'On approval: wallet_balance updated in profiles table'
      ],
      database: 'wallet_transactions (type: deposit), profiles (wallet_balance)',
      security: 'RLS: Users can only insert their own deposits'
    },
    {
      name: 'Withdraw Money',
      description: 'User requests withdrawal to their UPI',
      location: 'src/pages/Wallet.tsx',
      logic: [
        'User enters amount, phone, and UPI ID',
        'Validates: min ₹10, sufficient balance, valid UPI',
        'Calls process_withdrawal RPC function',
        'RPC atomically: deducts balance, creates pending withdrawal',
        'Admin sees request in AdminWithdrawals page',
        'Admin approves (marks completed) or rejects (refunds balance)'
      ],
      database: 'wallet_transactions (type: withdrawal), profiles (wallet_balance)',
      security: 'SECURITY DEFINER function ensures atomic operations'
    },
    {
      name: 'Admin Credit/Debit',
      description: 'Admin manually adds or deducts money from user wallet',
      location: 'src/pages/admin/AdminUsers.tsx',
      logic: [
        'Admin selects user and opens wallet dialog',
        'Enters amount and reason',
        'Updates wallet_balance in profiles',
        'Creates transaction record (type: admin_credit or admin_debit)',
        'Only Super Admin can perform this action'
      ],
      database: 'wallet_transactions, profiles',
      security: 'Requires Super Admin + users:manage permission'
    }
  ];

  const tournamentFunctions: FunctionDoc[] = [
    {
      name: 'Tournament Lifecycle',
      description: 'Complete tournament status flow from creation to completion',
      location: 'Multiple files',
      logic: [
        'Status: upcoming → Created and accepting registrations',
        'Status: ongoing → Started by organizer, match in progress',
        'Status: completed → Ended by organizer, awaiting winner declaration',
        'Registration closes 2 minutes before start_date',
        'Prize pool recalculated when tournament starts',
        'Winners can be declared 30 minutes after end'
      ],
      database: 'tournaments (status, start_date, end_date)',
      security: 'Status changes controlled by organizer/creator/admin'
    },
    {
      name: 'Registration Deadline Logic',
      description: 'Tournaments are hidden and blocked after registration deadline',
      location: 'src/pages/Home.tsx, Database Functions',
      logic: [
        'Each tournament has an optional registration_deadline timestamp',
        'Home page filters: only shows tournaments where deadline has NOT passed',
        'Additional filter: hides tournaments within 2 minutes of start_date',
        'Tournaments past deadline are HIDDEN from browse pages',
        'Registered players can still view in "My Matches" section',
        'Database functions block joining: "Registration closed"',
        'This applies to both solo and team tournament joins',
        'Organizers set deadline when creating tournament'
      ],
      database: 'tournaments (registration_deadline, start_date)',
      security: 'Enforced at both UI and database function level'
    },
    {
      name: 'Join Tournament (Solo)',
      description: 'User joins a solo tournament by paying entry fee',
      location: 'src/pages/TournamentDetails.tsx',
      logic: [
        'User clicks "Join Tournament" button',
        'Shows confirmation dialog with entry fee and balance',
        'Calls process_tournament_join RPC function',
        'RPC validates: tournament exists, is upcoming, not full, user not already joined',
        'Validates registration deadline has not passed',
        'Validates tournament start_date is more than 2 minutes away',
        'Checks wallet balance >= entry fee',
        'Atomically: deducts entry fee, adds user to joined_users array',
        'Calculates fee split: organizer %, platform %, prize pool %',
        'Creates entry_fee transaction, tournament registration record',
        'Sends notification to user about successful join'
      ],
      database: 'tournaments (joined_users, current_prize_pool), profiles, wallet_transactions, tournament_registrations, notifications',
      security: 'SECURITY DEFINER function with row locks to prevent race conditions'
    },
    {
      name: 'Join Tournament (Team - Duo/Squad)',
      description: 'Team leader registers team for duo/squad tournament',
      location: 'src/pages/TournamentDetails.tsx',
      logic: [
        'User clicks "Join as Team" for duo/squad tournament',
        'Opens team selection dialog with player_teams members',
        'Shows each teammate\'s wallet balance for verification',
        'User selects teammates (2 for duo, 4 for squad)',
        'Validates: all members have sufficient balance',
        'Validates registration deadline has not passed',
        'Validates tournament start_date is more than 2 minutes away',
        'Blocks registration if any teammate has insufficient balance',
        'Calls process_team_tournament_join RPC function',
        'RPC atomically: deducts entry fee from ALL team members',
        'Creates registration records with team_name, team_members, is_team_leader',
        'Sends notification to all team members'
      ],
      database: 'tournaments, profiles, wallet_transactions, tournament_registrations, player_teams, player_team_members, notifications',
      security: 'SECURITY DEFINER function, validates all member balances and 2-min lock before any deduction'
    },
    {
      name: 'Exit Tournament',
      description: 'User leaves a tournament before it starts',
      location: 'src/pages/TournamentDetails.tsx',
      logic: [
        'Calls process_tournament_exit RPC function',
        'Validates: tournament is upcoming, user is registered',
        'Must be at least 30 minutes before start time',
        'Atomically: refunds entry fee, removes from joined_users',
        'Adjusts prize pool accordingly',
        'Deletes tournament registration',
        'Sends notification to user about exit and refund'
      ],
      database: 'tournaments, profiles, wallet_transactions, tournament_registrations, notifications',
      security: 'SECURITY DEFINER function with time-based validation'
    },
    {
      name: 'Declare Winners (Solo)',
      description: 'Organizer declares individual winners for solo tournament',
      location: 'src/pages/organizer/OrganizerDashboard.tsx, src/pages/creator/CreatorDashboard.tsx',
      logic: [
        'Button enabled only 30 minutes after tournament ends',
        'Organizer assigns positions to individual participants',
        'Calls process_winner_declaration RPC function',
        'Validates: caller is tournament creator, winners not already declared',
        'Calculates prize amounts from prize_distribution or defaults (50/30/20)',
        'Atomically: credits winners wallets, creates prize transactions',
        'Credits organizer earnings to their wallet',
        'Creates notifications for winners with congratulations message',
        'Marks tournament as completed'
      ],
      database: 'tournaments, profiles, wallet_transactions, notifications',
      security: 'Only tournament creator can declare winners, 30-min delay enforced'
    },
    {
      name: 'Declare Winners (Team - Duo/Squad)',
      description: 'Organizer declares team winners for duo/squad tournament',
      location: 'src/pages/organizer/OrganizerDashboard.tsx, src/pages/creator/CreatorDashboard.tsx',
      logic: [
        'Button enabled only 30 minutes after tournament ends',
        'Dashboard shows teams grouped by team_name',
        'Organizer assigns positions to TEAMS (not individuals)',
        'Calls process_team_winner_declaration RPC function',
        'Validates: caller is tournament creator, winners not already declared',
        'Gets team members from tournament_registrations',
        'Calculates prize per member: position_prize / team_member_count',
        'Atomically: credits EACH team member equally',
        'Creates prize transactions for each member',
        'Sends notifications to all team members',
        'Credits organizer earnings to their wallet',
        'Marks tournament as completed'
      ],
      database: 'tournaments, profiles, wallet_transactions, tournament_registrations, notifications',
      security: 'SECURITY DEFINER, only tournament creator, equal split among team members, 30-min delay'
    }
  ];

  const authFunctions: FunctionDoc[] = [
    {
      name: 'User Signup',
      description: 'Streamlined signup with mandatory profile completion',
      location: 'src/pages/Auth.tsx, src/pages/CompleteProfile.tsx',
      logic: [
        'User enters email and password only',
        'Accepts terms and conditions',
        'Calls supabase.auth.signUp',
        'handle_new_user trigger creates basic profile with email',
        'User is redirected to /complete-profile page',
        'Must fill: username, preferred_game, in_game_name, game_uid',
        'Auto-assigns admin role if email matches admin emails',
        'Otherwise assigns user role'
      ],
      database: 'auth.users (managed by Supabase), profiles, user_roles',
      security: 'Auto-confirm enabled, profile completion enforced app-wide'
    },
    {
      name: 'Profile Completion Check',
      description: 'App-wide verification of essential profile fields',
      location: 'src/App.tsx',
      logic: [
        'Checks 4 required fields: username, preferred_game, in_game_name, game_uid',
        'Runs on every protected route navigation',
        'Incomplete profiles are redirected to /complete-profile',
        'Allows access to: /complete-profile, /auth, /terms, /refund-policy, /about-us',
        'Prevents access to main app features until profile is complete'
      ],
      database: 'profiles',
      security: 'Enforced in ProtectedRoute component'
    },
    {
      name: 'Role Management',
      description: 'Assign or remove roles from users',
      location: 'src/pages/admin/AdminUsers.tsx',
      logic: [
        'Admin views user details',
        'Can assign: admin, user, organizer, creator',
        'Checks if role already exists before inserting',
        'Super Admin can remove roles',
        'Roles determine access to features and pages'
      ],
      database: 'user_roles',
      security: 'Super Admin or users:manage permission required'
    },
    {
      name: 'Permission System',
      description: 'Fine-grained permission control for admins',
      location: 'src/contexts/AuthContext.tsx',
      logic: [
        'Super Admins have all permissions automatically',
        'Other admins get permissions from admin_permissions table',
        'hasPermission() checks: is_super_admin OR has_admin_permission',
        'Permissions: users:view, users:manage, tournaments:view, etc.',
        'Used throughout admin pages to control access'
      ],
      database: 'admin_permissions',
      security: 'RLS: Only super admins can manage permissions'
    }
  ];

  const adminFunctions: FunctionDoc[] = [
    {
      name: 'Approve Deposit',
      description: 'Admin approves user deposit request',
      location: 'src/pages/admin/AdminDeposits.tsx',
      logic: [
        'Admin views pending deposits with UTR and screenshots',
        'Clicks Approve button',
        'Calls admin_process_deposit RPC function',
        'RPC checks if user has a profile, creates one if missing',
        'RPC atomically: validates deposit, credits wallet_balance, updates status',
        'Shows success toast'
      ],
      database: 'wallet_transactions, profiles',
      security: 'SECURITY DEFINER RPC, requires admin role + deposits:manage permission, auto-creates missing profiles'
    },
    {
      name: 'Process Withdrawal',
      description: 'Admin approves or rejects withdrawal request',
      location: 'src/pages/admin/AdminWithdrawals.tsx',
      logic: [
        'Admin views pending withdrawals with UPI details',
        'Calls admin_process_withdrawal RPC function',
        'Approve: marks transaction as completed (money already deducted)',
        'Reject: atomically refunds wallet balance and marks as rejected',
        'All wallet updates happen server-side only'
      ],
      database: 'wallet_transactions, profiles',
      security: 'SECURITY DEFINER RPC, requires admin role + withdrawals:manage permission'
    },
    {
      name: 'Admin Credit/Debit',
      description: 'Admin manually adds or deducts money from user wallet',
      location: 'src/pages/admin/AdminUsers.tsx',
      logic: [
        'Admin selects user and opens wallet dialog',
        'Enters amount and reason',
        'Calls admin_adjust_wallet RPC function',
        'RPC atomically: validates, updates wallet_balance, creates transaction',
        'Only Super Admin can perform this action'
      ],
      database: 'wallet_transactions, profiles',
      security: 'SECURITY DEFINER RPC, Super Admin + users:manage permission'
    },
    {
      name: 'Platform Settings',
      description: 'Configure commission percentages and payment info',
      location: 'src/pages/admin/AdminSettings.tsx',
      logic: [
        'Super Admin can set: organizer %, platform %, prize pool %',
        'Must total 100%',
        'Sets admin UPI ID and payment QR code',
        'QR uploaded to payment-screenshots bucket',
        'Settings used by tournament join/declare functions'
      ],
      database: 'platform_settings',
      security: 'Only Super Admin can modify settings'
    },
    {
      name: 'Ban/Freeze User',
      description: 'Restrict user account access',
      location: 'src/pages/admin/AdminUsers.tsx',
      logic: [
        'Ban: sets is_banned = true in profiles',
        'Freeze: sets is_frozen = true in profiles',
        'App should check these flags on login/actions',
        'Only Super Admin can perform these actions'
      ],
      database: 'profiles',
      security: 'Super Admin only'
    },
    {
      name: 'Start/End Tournament (Admin)',
      description: 'Admin can start or end any tournament',
      location: 'src/pages/admin/AdminTournaments.tsx',
      logic: [
        'View all tournaments with current status',
        'Start: Available when start_date reached and status is "upcoming"',
        'Starting triggers prize pool recalculation first',
        'End: Available when status is "ongoing"',
        'Ending sets end_date and changes status to "completed"',
        'Admin can manage tournaments from any organizer/creator'
      ],
      database: 'tournaments',
      security: 'Requires admin role + tournaments:manage permission'
    }
  ];

  const databaseFunctions: FunctionDoc[] = [
    {
      name: 'create_notification',
      description: 'Helper function to create user notifications',
      location: 'Database RPC',
      logic: [
        'Called by other functions to send notifications',
        'Inserts into notifications table',
        'Parameters: user_id, type, title, message, related_id',
        'Used for: tournament join/exit, deposits, withdrawals, prizes'
      ],
      security: 'SECURITY DEFINER, called internally by other functions'
    },
    {
      name: 'process_tournament_join',
      description: 'Atomic function to join solo tournament',
      location: 'Database RPC',
      logic: [
        'Locks tournament row (FOR UPDATE)',
        'Validates tournament status, capacity, user not joined',
        'Checks wallet balance',
        'Gets commission percentages from platform_settings',
        'Calculates fee distribution',
        'Updates tournament: joined_users, fees, prize_pool',
        'Deducts wallet balance',
        'Creates entry_fee transaction',
        'Creates registration record',
        'Sends notification to user',
        'Returns success with new balance'
      ],
      security: 'SECURITY DEFINER, SET search_path = public'
    },
    {
      name: 'process_team_tournament_join',
      description: 'Atomic function to join duo/squad tournament as team',
      location: 'Database RPC',
      logic: [
        'Locks tournament row',
        'Validates team size (2 for duo, 4 for squad)',
        'Checks no duplicate team members',
        'Verifies ALL members have sufficient balance',
        'Deducts entry fee from EACH team member',
        'Creates transaction record for each member',
        'Adds all members to joined_users array',
        'Creates registration with team_name, team_members, is_team_leader',
        'Sends notification to all team members',
        'Returns success with total fee and team info'
      ],
      security: 'SECURITY DEFINER, validates all balances before any deduction'
    },
    {
      name: 'process_tournament_exit',
      description: 'Atomic function to exit tournament',
      location: 'Database RPC',
      logic: [
        'Locks tournament row',
        'Validates: upcoming status, user in tournament',
        'Checks 30-minute rule before start',
        'Calculates refund (exact entry fee)',
        'Updates tournament: removes user from joined_users, adjusts prize pool',
        'Credits wallet balance',
        'Creates refund transaction',
        'Deletes registration record',
        'Sends notification about refund'
      ],
      security: 'SECURITY DEFINER, prevents race conditions'
    },
    {
      name: 'process_winner_declaration',
      description: 'Distribute prizes for solo tournaments',
      location: 'Database RPC',
      logic: [
        'Validates caller is tournament creator',
        'Checks winners not already declared',
        'Gets prize distribution (amounts) from tournament or defaults',
        'For each winner: credits wallet, creates transaction, notification',
        'Credits organizer earnings',
        'Marks tournament completed'
      ],
      security: 'SECURITY DEFINER, creator-only access'
    },
    {
      name: 'process_team_winner_declaration',
      description: 'Distribute prizes equally among team members',
      location: 'Database RPC',
      logic: [
        'Validates caller is tournament creator',
        'Takes team positions (team_name → position mapping)',
        'For each winning team: gets team_members from registration',
        'Calculates prize per member: position_prize / team_size',
        'Credits EACH team member equally',
        'Creates prize transaction for each member',
        'Sends notification to all team members',
        'Credits organizer earnings',
        'Marks tournament completed'
      ],
      security: 'SECURITY DEFINER, equal split only, creator-only access'
    },
    {
      name: 'process_withdrawal',
      description: 'Atomic withdrawal processing',
      location: 'Database RPC',
      logic: [
        'Validates amount >= 10, valid phone/UPI',
        'Locks profile row',
        'Checks sufficient balance',
        'Deducts from wallet',
        'Creates pending withdrawal transaction'
      ],
      security: 'SECURITY DEFINER, atomic balance update'
    },
    {
      name: 'admin_process_deposit',
      description: 'Approve or reject deposit requests',
      location: 'Database RPC',
      logic: [
        'Validates admin authorization',
        'Locks transaction row',
        'Approve: credits wallet_balance, marks completed, sends notification',
        'Reject: marks failed with reason, sends notification',
        'All operations atomic'
      ],
      security: 'SECURITY DEFINER, admin-only access'
    },
    {
      name: 'admin_process_withdrawal',
      description: 'Approve or reject withdrawal requests',
      location: 'Database RPC',
      logic: [
        'Validates admin authorization',
        'Locks transaction row',
        'Approve: marks completed (money already deducted), sends notification',
        'Reject: atomically refunds wallet_balance, marks rejected, sends notification',
        'All operations atomic'
      ],
      security: 'SECURITY DEFINER, admin-only access'
    },
    {
      name: 'admin_adjust_wallet',
      description: 'Manually credit or debit user wallet',
      location: 'Database RPC',
      logic: [
        'Validates Super Admin authorization',
        'Locks profile row',
        'Add or deduct amount from wallet_balance',
        'Creates admin_credit or admin_debit transaction',
        'Requires reason for audit trail'
      ],
      security: 'SECURITY DEFINER, Super Admin only'
    },
    {
      name: 'recalculate_tournament_prizepool',
      description: 'Recalculate prize pool before tournament starts',
      location: 'Database RPC / Edge Function',
      logic: [
        'Called 2 minutes before tournament starts',
        'Gets actual joined players count',
        'Recalculates prize pool based on actual fees collected',
        'Scales prize distribution amounts proportionally',
        'Prevents organizer/creator looting'
      ],
      security: 'SECURITY DEFINER, called by cron job'
    }
  ];

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <AdminLayout title="Documentation">
      <div className="p-4 space-y-4 print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Platform Documentation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Complete function logic and flow documentation
            </p>
          </div>
          <Button onClick={handleExportPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export as PDF
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="tournament">Tournament</TabsTrigger>
            <TabsTrigger value="auth">Auth & Roles</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Print All Content */}
        <div className="space-y-6">
          {/* Overview */}
          {(activeTab === 'overview' || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
            <Card className="print:break-after-page">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  System Overview
                </CardTitle>
                <CardDescription>High-level architecture and flow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4" />
                      Database
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• profiles - User data & wallet balance</li>
                      <li>• user_roles - Role assignments (admin, user, organizer, creator)</li>
                      <li>• admin_permissions - Fine-grained admin permissions</li>
                      <li>• tournaments - Tournament data & prize pools</li>
                      <li>• tournament_registrations - User registrations</li>
                      <li>• wallet_transactions - All money movements</li>
                      <li>• platform_settings - Commission & payment config</li>
                      <li>• notifications - User notifications</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4" />
                      Security
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Row Level Security (RLS) on all tables</li>
                      <li>• SECURITY DEFINER functions for atomic operations</li>
                      <li>• Super Admin check via email whitelist</li>
                      <li>• Permission-based access control</li>
                      <li>• Wallet operations use row locks</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-semibold mb-2">Money Flow</h4>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Badge>User Deposits</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge variant="secondary">Pending Approval</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge>Wallet Balance</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge variant="secondary">Tournament Entry</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge>Prize Pool</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge variant="secondary">Winners</Badge>
                  </div>
                </div>

                <div className="p-4 bg-amber-500/10 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Commission Split
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    When a user joins a tournament, the entry fee is split according to platform_settings:
                  </p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• <strong>Organizer Commission</strong> - Goes to tournament creator</li>
                    <li>• <strong>Platform Commission</strong> - Platform revenue</li>
                    <li>• <strong>Prize Pool</strong> - Added to tournament prize pool</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Updates */}
          {(activeTab === 'updates' || activeTab === 'overview') && (
            <Card className="print:break-after-page">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Updates & Changes
                </CardTitle>
                <CardDescription>Latest features and modifications to the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentUpdates.map((func, index) => (
                  <FunctionCard key={index} func={func} isUpdate />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Wallet Functions */}
          {(activeTab === 'wallet' || activeTab === 'overview') && (
            <Card className="print:break-after-page">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Wallet Functions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {walletFunctions.map((func, index) => (
                  <FunctionCard key={index} func={func} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tournament Functions */}
          {(activeTab === 'tournament' || activeTab === 'overview') && (
            <Card className="print:break-after-page">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Tournament Functions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tournamentFunctions.map((func, index) => (
                  <FunctionCard key={index} func={func} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Auth Functions */}
          {(activeTab === 'auth' || activeTab === 'overview') && (
            <Card className="print:break-after-page">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Authentication & Roles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {authFunctions.map((func, index) => (
                  <FunctionCard key={index} func={func} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Admin Functions */}
          {(activeTab === 'admin' || activeTab === 'overview') && (
            <Card className="print:break-after-page">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Admin Functions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {adminFunctions.map((func, index) => (
                  <FunctionCard key={index} func={func} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Database Functions */}
          {(activeTab === 'admin' || activeTab === 'overview') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Database RPC Functions
                </CardTitle>
                <CardDescription>
                  These are stored procedures that handle atomic operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {databaseFunctions.map((func, index) => (
                  <FunctionCard key={index} func={func} isRpc />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

const FunctionCard = ({ func, isRpc = false, isUpdate = false }: { func: FunctionDoc; isRpc?: boolean; isUpdate?: boolean }) => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="flex items-start justify-between">
      <div>
        <h4 className="font-semibold text-foreground">{func.name}</h4>
        <p className="text-sm text-muted-foreground">{func.description}</p>
      </div>
      <div className="flex gap-2">
        {isRpc && <Badge variant="outline" className="text-xs">RPC</Badge>}
        {isUpdate && <Badge className="text-xs bg-green-500/20 text-green-600 border-green-500/30">New</Badge>}
        {func.addedDate && <Badge variant="secondary" className="text-xs">{func.addedDate}</Badge>}
      </div>
    </div>
    
    <div className="text-xs text-muted-foreground">
      <span className="font-medium">Location:</span> {func.location}
    </div>

    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">Logic Flow:</p>
      <ol className="text-sm space-y-1">
        {func.logic.map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-primary font-medium min-w-[20px]">{i + 1}.</span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
    </div>

    {func.database && (
      <div className="flex items-center gap-2 text-xs">
        <Database className="h-3 w-3 text-blue-500" />
        <span className="text-muted-foreground">{func.database}</span>
      </div>
    )}

    {func.security && (
      <div className="flex items-center gap-2 text-xs">
        <Shield className="h-3 w-3 text-green-500" />
        <span className="text-muted-foreground">{func.security}</span>
      </div>
    )}
  </div>
);

export default AdminDocumentation;