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
import TournamentDetails from "./pages/TournamentDetails";
import NotFound from "./pages/NotFound";
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

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/creator" element={<ProtectedRoute><Creator /></ProtectedRoute>} />
      <Route path="/my-match" element={<ProtectedRoute><MyMatch /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="/broadcast" element={<ProtectedRoute><BroadcastChannel /></ProtectedRoute>} />
      <Route path="/help-support" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
      <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      
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
      
      {/* Organizer Routes */}
      <Route path="/organizer" element={<ProtectedRoute><OrganizerHub /></ProtectedRoute>} />
      <Route path="/organizer/dashboard" element={<ProtectedRoute><OrganizerDashboard /></ProtectedRoute>} />
      <Route path="/organizer/wallet" element={<ProtectedRoute><OrganizerWallet /></ProtectedRoute>} />
      <Route path="/organizer/reports" element={<ProtectedRoute><OrganizerReports /></ProtectedRoute>} />
      <Route path="/organizer/contact" element={<ProtectedRoute><OrganizerContact /></ProtectedRoute>} />
      
      {/* Creator Routes */}
      <Route path="/creator" element={<ProtectedRoute><CreatorHub /></ProtectedRoute>} />
      <Route path="/creator-dashboard" element={<ProtectedRoute><CreatorDashboard /></ProtectedRoute>} />
      <Route path="/creator/wallet" element={<ProtectedRoute><CreatorWallet /></ProtectedRoute>} />
      <Route path="/creator/reports" element={<ProtectedRoute><CreatorReports /></ProtectedRoute>} />
      <Route path="/creator/contact" element={<ProtectedRoute><CreatorContact /></ProtectedRoute>} />
      
      {/* Profile Completion */}
      <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
      
      {/* Public Routes */}
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/tournament/:id" element={<TournamentDetails />} />
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
