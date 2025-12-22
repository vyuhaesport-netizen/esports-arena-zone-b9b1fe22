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
  Info
} from 'lucide-react';

interface FunctionDoc {
  name: string;
  description: string;
  location: string;
  logic: string[];
  database?: string;
  security?: string;
}

const AdminDocumentation = () => {
  const [activeTab, setActiveTab] = useState('overview');

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
      name: 'Join Tournament',
      description: 'User joins a tournament by paying entry fee',
      location: 'src/pages/TournamentDetails.tsx',
      logic: [
        'User clicks "Join Tournament" button',
        'Shows confirmation dialog with entry fee and balance',
        'Calls process_tournament_join RPC function',
        'RPC validates: tournament exists, is upcoming, not full, user not already joined',
        'Checks wallet balance >= entry fee',
        'Atomically: deducts entry fee, adds user to joined_users array',
        'Calculates fee split: organizer %, platform %, prize pool %',
        'Creates entry_fee transaction, tournament registration record'
      ],
      database: 'tournaments (joined_users, current_prize_pool), profiles, wallet_transactions, tournament_registrations',
      security: 'SECURITY DEFINER function with row locks to prevent race conditions'
    },
    {
      name: 'Exit Tournament',
      description: 'User leaves a tournament before it starts',
      location: 'Not yet implemented in UI',
      logic: [
        'Calls process_tournament_exit RPC function',
        'Validates: tournament is upcoming, user is registered',
        'Must be at least 30 minutes before start time',
        'Atomically: refunds entry fee, removes from joined_users',
        'Adjusts prize pool accordingly',
        'Deletes tournament registration'
      ],
      database: 'tournaments, profiles, wallet_transactions, tournament_registrations',
      security: 'SECURITY DEFINER function with time-based validation'
    },
    {
      name: 'Declare Winners',
      description: 'Organizer declares tournament winners',
      location: 'src/pages/organizer/OrganizerDashboard.tsx',
      logic: [
        'Organizer assigns positions to participants',
        'Calls process_winner_declaration RPC function',
        'Validates: caller is tournament creator, winners not already declared',
        'Calculates prize amounts from prize_distribution or defaults (50/30/20)',
        'Atomically: credits winners wallets, creates prize transactions',
        'Credits organizer earnings to their wallet',
        'Creates notifications for winners',
        'Marks tournament as completed'
      ],
      database: 'tournaments, profiles, wallet_transactions, notifications',
      security: 'Only tournament creator can declare winners'
    }
  ];

  const authFunctions: FunctionDoc[] = [
    {
      name: 'User Signup',
      description: 'New user registration with profile creation',
      location: 'src/pages/Auth.tsx, src/contexts/AuthContext.tsx',
      logic: [
        'User enters email, password, username, full name, phone',
        'Validates username: unique, lowercase alphanumeric, 3-20 chars',
        'Calls supabase.auth.signUp',
        'handle_new_user trigger automatically creates profile',
        'Updates profile with username, full_name, phone',
        'Auto-assigns admin role if email matches admin emails',
        'Otherwise assigns user role'
      ],
      database: 'auth.users (managed by Supabase), profiles, user_roles',
      security: 'Auto-confirm enabled for development'
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
        'Fetches current wallet balance',
        'Updates balance: current + deposit amount',
        'Updates transaction status to completed',
        'Shows success toast'
      ],
      database: 'wallet_transactions, profiles',
      security: 'Requires admin role + deposits:approve permission'
    },
    {
      name: 'Process Withdrawal',
      description: 'Admin approves or rejects withdrawal request',
      location: 'src/pages/admin/AdminWithdrawals.tsx',
      logic: [
        'Admin views pending withdrawals with UPI details',
        'Approve: marks transaction as completed (money already deducted)',
        'Reject: marks transaction as failed, refunds wallet balance',
        'Sends notification to user'
      ],
      database: 'wallet_transactions, profiles, notifications',
      security: 'Requires admin role + withdrawals:manage permission'
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
    }
  ];

  const databaseFunctions: FunctionDoc[] = [
    {
      name: 'process_tournament_join',
      description: 'Atomic function to join tournament',
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
        'Returns success with new balance'
      ],
      security: 'SECURITY DEFINER, SET search_path = public'
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
        'Updates tournament: removes user, adjusts prize pool',
        'Credits wallet balance',
        'Creates refund transaction',
        'Deletes registration'
      ],
      security: 'SECURITY DEFINER, prevents race conditions'
    },
    {
      name: 'process_winner_declaration',
      description: 'Distribute prizes and complete tournament',
      location: 'Database RPC',
      logic: [
        'Validates caller is tournament creator',
        'Checks winners not already declared',
        'Gets prize distribution from tournament or defaults',
        'For each winner: credits wallet, creates transaction, notification',
        'Credits organizer earnings',
        'Marks tournament completed'
      ],
      security: 'SECURITY DEFINER, creator-only access'
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
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
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

const FunctionCard = ({ func, isRpc = false }: { func: FunctionDoc; isRpc?: boolean }) => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="flex items-start justify-between">
      <div>
        <h4 className="font-semibold text-foreground">{func.name}</h4>
        <p className="text-sm text-muted-foreground">{func.description}</p>
      </div>
      {isRpc && <Badge variant="outline" className="text-xs">RPC</Badge>}
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