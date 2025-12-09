import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
}

import { MessageCircle } from 'lucide-react';

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', permission: 'dashboard:view' },
  { icon: Users, label: 'Users', path: '/admin/users', permission: 'users:view' },
  { icon: Trophy, label: 'Tournaments', path: '/admin/tournaments', permission: 'tournaments:view' },
  { icon: ShieldCheck, label: 'Organizer Verifications', path: '/admin/organizers', permission: 'organizers:view' },
  { icon: ArrowDownLeft, label: 'Deposits', path: '/admin/deposits', permission: 'deposits:view' },
  { icon: Receipt, label: 'Transactions', path: '/admin/transactions', permission: 'transactions:view' },
  { icon: ArrowUpRight, label: 'Withdrawals', path: '/admin/withdrawals', permission: 'withdrawals:view' },
  { icon: HeadphonesIcon, label: 'Support', path: '/admin/support', permission: 'support:view' },
  { icon: Bell, label: 'Notifications', path: '/admin/notifications', permission: 'notifications:view' },
  { icon: MessageCircle, label: 'Messages', path: '/admin/messages', permission: 'notifications:view' },
  { icon: Settings, label: 'Settings', path: '/admin/settings', permission: 'settings:view' },
  { icon: UsersRound, label: 'Team', path: '/admin/team', superAdminOnly: true },
];

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hasPermission, isSuperAdmin, signOut } = useAuth();
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
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = window.location.pathname === item.path;
          
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
              {item.label}
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
