import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCounts } from '@/hooks/useAdminCounts';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import {
  Menu,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  HeadphonesIcon,
  Bell,
  Settings,
  UsersRound,
  LogOut,
  Trophy,
  Palette,
  Megaphone,
  FileText,
  Building2,
  CreditCard,
  Coins,
  Search,
  ScrollText,
  Ban,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  permission?: string;
  superAdminOnly?: boolean;
  countKey?: 'pendingDeposits' | 'pendingWithdrawals' | 'pendingDhanaWithdrawals' | 'pendingOrganizerApps' | 'pendingLocalTournamentApps' | 'pendingSupport' | 'pendingReports';
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', permission: 'dashboard:view' },
  { icon: Users, label: 'Users', path: '/admin/users', permission: 'users:view' },
  { icon: Trophy, label: 'Tournaments', path: '/admin/tournaments', permission: 'tournaments:view' },
  { icon: ShieldCheck, label: 'Organizer Management', path: '/admin/organizers', permission: 'organizers:view', countKey: 'pendingOrganizerApps' },
  { icon: Palette, label: 'Creator Management', path: '/admin/creators', permission: 'creators:view' },
  { icon: ArrowDownLeft, label: 'Deposits', path: '/admin/deposits', permission: 'deposits:view', countKey: 'pendingDeposits' },
  { icon: Receipt, label: 'Transactions', path: '/admin/transactions', permission: 'transactions:view' },
  { icon: Wallet, label: 'Wallet Audit', path: '/admin/wallet-audit', permission: 'transactions:view' },
  { icon: ArrowUpRight, label: 'Withdrawals', path: '/admin/withdrawals', permission: 'withdrawals:view', countKey: 'pendingWithdrawals' },
  { icon: Coins, label: 'Dhana Withdrawals', path: '/admin/dhana-withdrawals', permission: 'withdrawals:view', countKey: 'pendingDhanaWithdrawals' },
  { icon: CreditCard, label: 'API Payment', path: '/admin/api-payment', superAdminOnly: true },
  { icon: Search, label: 'SEO Management', path: '/admin/seo', superAdminOnly: true },
  { icon: HeadphonesIcon, label: 'Support', path: '/admin/support', permission: 'support:view', countKey: 'pendingSupport' },
  { icon: Bell, label: 'Notifications', path: '/admin/notifications', permission: 'notifications:view' },
  { icon: Megaphone, label: 'Broadcast Channel', path: '/admin/messages', permission: 'notifications:view' },
  { icon: Ban, label: 'Ban Management', path: '/admin/bans', permission: 'bans:view', countKey: 'pendingReports' },
  { icon: Settings, label: 'Settings', path: '/admin/settings', permission: 'settings:view' },
  { icon: Building2, label: 'Local Tournaments', path: '/admin/local-tournaments', permission: 'local_tournaments:view', countKey: 'pendingLocalTournamentApps' },
  { icon: ScrollText, label: 'Tournament Rules', path: '/admin/rules', superAdminOnly: true },
  { icon: FileText, label: 'Documentation', path: '/admin/docs', superAdminOnly: true },
  { icon: UsersRound, label: 'Team', path: '/admin/team', superAdminOnly: true },
];

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hasPermission, isSuperAdmin, signOut } = useAuth();
  const { counts } = useAdminCounts();
  const navigate = useNavigate();

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.permission) return hasPermission(item.permission);
    return true;
  });

  const handleNavigation = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getCountForItem = (item: MenuItem): number => {
    if (!item.countKey) return 0;
    return counts[item.countKey] || 0;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={vyuhaLogo} alt="Vyuha" className="w-10 h-10 rounded-lg" />
          <div>
            <h2 className="font-gaming font-bold text-lg">Vyuha Admin</h2>
            <p className="text-xs text-muted-foreground">
              {isSuperAdmin ? 'Super Admin' : 'Team Member'}
            </p>
          </div>
        </div>
        {/* Total pending count badge */}
        {counts.total > 0 && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-xs text-red-500 font-medium text-center">
              🔔 {counts.total} pending request{counts.total > 1 ? 's' : ''} need attention
            </p>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = window.location.pathname === item.path;
          const count = getCountForItem(item);
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {count > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] font-bold">
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-lg" />
            <span className="font-gaming font-bold">Vyuha Admin</span>
          </div>
          
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Page Title */}
      {title && (
        <div className="bg-card border-b border-border px-4 py-3">
          <h1 className="font-gaming text-lg font-bold">{title}</h1>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
