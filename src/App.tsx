import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { useState, useEffect } from "react";
import { supabase } from "./integrations/supabase/client";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Creator from "./pages/Creator";
import MyMatch from "./pages/MyMatch";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import Team from "./pages/Team";
import BroadcastChannel from "./pages/BroadcastChannel";
import HelpSupport from "./pages/HelpSupport";
import Payment from "./pages/Payment";
import Leaderboard from "./pages/Leaderboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminTournaments from "./pages/admin/AdminTournaments";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminOrganizers from "./pages/admin/AdminOrganizers";
import AdminCreators from "./pages/admin/AdminCreators";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminDocumentation from "./pages/admin/AdminDocumentation";
import AdminWalletAudit from "./pages/admin/AdminWalletAudit";
import AdminBanManagement from "./pages/admin/AdminBanManagement";
import AdminDhanaWithdrawals from "./pages/admin/AdminDhanaWithdrawals";
import AdminApiPayment from "./pages/admin/AdminApiPayment";
import AdminSEO from "./pages/admin/AdminSEO";
import AdminZapupiMonitor from "./pages/admin/AdminZapupiMonitor";
import AdminRules from "./pages/admin/AdminRules";
import AdminAI from "./pages/admin/AdminAI";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import OrganizerHub from "./pages/organizer/OrganizerHub";
import OrganizerWallet from "./pages/organizer/OrganizerWallet";
import OrganizerReports from "./pages/organizer/OrganizerReports";
import OrganizerContact from "./pages/organizer/OrganizerContact";
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import CreatorHub from "./pages/creator/CreatorHub";
import CreatorWallet from "./pages/creator/CreatorWallet";
import CreatorReports from "./pages/creator/CreatorReports";
import CreatorContact from "./pages/creator/CreatorContact";
import ChangePassword from "./pages/ChangePassword";
import CompleteProfile from "./pages/CompleteProfile";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import AboutUs from "./pages/AboutUs";
import Documentation from "./pages/Documentation";
import TournamentDetails from "./pages/TournamentDetails";
import LocalTournament from "./pages/LocalTournament";
import JoinLocalTournament from "./pages/JoinLocalTournament";
import AdminLocalTournaments from "./pages/admin/AdminLocalTournaments";
import AvatarSelection from "./pages/AvatarSelection";
import NotFound from "./pages/NotFound";
import PlayerStats from "./pages/PlayerStats";
import AuthRequiredLock from "./components/AuthRequiredLock";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileComplete, setProfileComplete] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkProfile = async () => {
      if (!user) {
        if (isMounted) {
          setCheckingProfile(false);
          setHasChecked(true);
        }
        return;
      }

      // Skip profile check for complete-profile page
      if (location.pathname === '/complete-profile') {
        if (isMounted) {
          setCheckingProfile(false);
          setHasChecked(true);
        }
        return;
      }

      // If we've already checked and profile is complete, don't check again
      if (hasChecked && profileComplete) {
        if (isMounted) {
          setCheckingProfile(false);
        }
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, preferred_game, in_game_name, game_uid')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        // If there's an error or no profile, allow access (don't block users)
        if (error || !profile) {
          setProfileComplete(true);
          setCheckingProfile(false);
          setHasChecked(true);
          return;
        }

        // Only check gaming-related required fields
        const isComplete = !!(
          profile.username && 
          profile.preferred_game && 
          profile.in_game_name && 
          profile.game_uid
        );
        setProfileComplete(isComplete);
      } catch (error) {
        console.error('Error checking profile:', error);
        // On error, allow access to prevent blocking users
        if (isMounted) {
          setProfileComplete(true);
        }
      } finally {
        if (isMounted) {
          setCheckingProfile(false);
          setHasChecked(true);
        }
      }
    };

    setCheckingProfile(true);
    checkProfile();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id, location.pathname]);

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Redirect to complete profile if not complete
  if (!profileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

// Route that shows content to logged-in users or lock screen to guests
const SoftProtectedRoute = ({ children, lockTitle, lockDescription }: { 
  children: React.ReactNode; 
  lockTitle?: string; 
  lockDescription?: string;
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthRequiredLock title={lockTitle} description={lockDescription} />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AuthRoute><Auth /></AuthRoute>} />
      {/* Public Routes - accessible without login */}
      <Route path="/home" element={<Home />} />
      <Route path="/creator-tournaments" element={<Creator />} />
      {/* Soft Protected Routes - show lock screen for guests */}
      <Route path="/my-match" element={<SoftProtectedRoute lockTitle="My Matches" lockDescription="Login to view your tournament matches and track your progress"><MyMatch /></SoftProtectedRoute>} />
      <Route path="/wallet" element={<SoftProtectedRoute lockTitle="Wallet" lockDescription="Login to manage your wallet, deposits, and withdrawals"><Wallet /></SoftProtectedRoute>} />
      <Route path="/profile" element={<SoftProtectedRoute lockTitle="Profile" lockDescription="Login to view and edit your gaming profile"><Profile /></SoftProtectedRoute>} />
      <Route path="/avatar-selection" element={<SoftProtectedRoute lockTitle="Avatar Selection" lockDescription="Login to customize your avatar"><AvatarSelection /></SoftProtectedRoute>} />
      <Route path="/team" element={<SoftProtectedRoute lockTitle="Teams" lockDescription="Login to create or join gaming teams"><Team /></SoftProtectedRoute>} />
      <Route path="/broadcast" element={<SoftProtectedRoute lockTitle="Broadcasts" lockDescription="Login to view broadcasts and announcements"><BroadcastChannel /></SoftProtectedRoute>} />
      <Route path="/help-support" element={<SoftProtectedRoute lockTitle="Help & Support" lockDescription="Login to access help and support"><HelpSupport /></SoftProtectedRoute>} />
      <Route path="/payment" element={<SoftProtectedRoute lockTitle="Payment" lockDescription="Login to make payments"><Payment /></SoftProtectedRoute>} />
      <Route path="/leaderboard" element={<SoftProtectedRoute lockTitle="Leaderboard" lockDescription="Login to view the leaderboard and rankings"><Leaderboard /></SoftProtectedRoute>} />
      <Route path="/player-stats" element={<SoftProtectedRoute lockTitle="Player Stats" lockDescription="Login to view your player stats and rankings"><PlayerStats /></SoftProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/team" element={<ProtectedRoute><AdminTeam /></ProtectedRoute>} />
      <Route path="/admin/tournaments" element={<ProtectedRoute><AdminTournaments /></ProtectedRoute>} />
      <Route path="/admin/transactions" element={<ProtectedRoute><AdminTransactions /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute><AdminWithdrawals /></ProtectedRoute>} />
      <Route path="/admin/deposits" element={<ProtectedRoute><AdminDeposits /></ProtectedRoute>} />
      <Route path="/admin/organizers" element={<ProtectedRoute><AdminOrganizers /></ProtectedRoute>} />
      <Route path="/admin/creators" element={<ProtectedRoute><AdminCreators /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute><AdminNotifications /></ProtectedRoute>} />
      <Route path="/admin/messages" element={<ProtectedRoute><AdminMessages /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/support" element={<ProtectedRoute><AdminSupport /></ProtectedRoute>} />
      <Route path="/admin/docs" element={<ProtectedRoute><AdminDocumentation /></ProtectedRoute>} />
      <Route path="/admin/wallet-audit" element={<ProtectedRoute><AdminWalletAudit /></ProtectedRoute>} />
      <Route path="/admin/bans" element={<ProtectedRoute><AdminBanManagement /></ProtectedRoute>} />
      <Route path="/admin/dhana-withdrawals" element={<ProtectedRoute><AdminDhanaWithdrawals /></ProtectedRoute>} />
      <Route path="/admin/local-tournaments" element={<ProtectedRoute><AdminLocalTournaments /></ProtectedRoute>} />
      <Route path="/admin/api-payment" element={<ProtectedRoute><AdminApiPayment /></ProtectedRoute>} />
      <Route path="/admin/seo" element={<ProtectedRoute><AdminSEO /></ProtectedRoute>} />
      <Route path="/admin/zapupi-monitor" element={<ProtectedRoute><AdminZapupiMonitor /></ProtectedRoute>} />
      <Route path="/admin/rules" element={<ProtectedRoute><AdminRules /></ProtectedRoute>} />
      <Route path="/admin/ai" element={<ProtectedRoute><AdminAI /></ProtectedRoute>} />
      
      {/* Organizer Routes */}
      <Route path="/organizer" element={<ProtectedRoute><OrganizerHub /></ProtectedRoute>} />
      <Route path="/organizer/dashboard" element={<ProtectedRoute><OrganizerDashboard /></ProtectedRoute>} />
      <Route path="/organizer/wallet" element={<ProtectedRoute><OrganizerWallet /></ProtectedRoute>} />
      <Route path="/organizer/reports" element={<ProtectedRoute><OrganizerReports /></ProtectedRoute>} />
      <Route path="/organizer/contact" element={<ProtectedRoute><OrganizerContact /></ProtectedRoute>} />
      
      {/* Creator Routes */}
      <Route path="/creator" element={<ProtectedRoute><CreatorHub /></ProtectedRoute>} />
      <Route path="/creator/dashboard" element={<ProtectedRoute><CreatorDashboard /></ProtectedRoute>} />
      <Route path="/creator/wallet" element={<ProtectedRoute><CreatorWallet /></ProtectedRoute>} />
      <Route path="/creator/reports" element={<ProtectedRoute><CreatorReports /></ProtectedRoute>} />
      <Route path="/creator/contact" element={<ProtectedRoute><CreatorContact /></ProtectedRoute>} />
      
      {/* Profile Completion */}
      <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
      
      {/* Local Tournaments */}
      <Route path="/local-tournament" element={<ProtectedRoute><LocalTournament /></ProtectedRoute>} />
      <Route path="/join-local" element={<JoinLocalTournament />} />
      
      {/* Public Routes */}
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/docs" element={<Documentation />} />
      <Route path="/tournament/:id" element={<TournamentDetails />} />
      <Route path="*" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
