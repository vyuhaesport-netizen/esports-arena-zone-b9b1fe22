import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Creator from "./pages/Creator";
import MyMatch from "./pages/MyMatch";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import Team from "./pages/Team";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminTournaments from "./pages/admin/AdminTournaments";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminOrganizers from "./pages/admin/AdminOrganizers";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import AboutUs from "./pages/AboutUs";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
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
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/team" element={<ProtectedRoute><AdminTeam /></ProtectedRoute>} />
      <Route path="/admin/tournaments" element={<ProtectedRoute><AdminTournaments /></ProtectedRoute>} />
      <Route path="/admin/transactions" element={<ProtectedRoute><AdminTransactions /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute><AdminWithdrawals /></ProtectedRoute>} />
      <Route path="/admin/deposits" element={<ProtectedRoute><AdminDeposits /></ProtectedRoute>} />
      <Route path="/admin/organizers" element={<ProtectedRoute><AdminOrganizers /></ProtectedRoute>} />
      
      {/* Organizer Routes */}
      <Route path="/organizer" element={<ProtectedRoute><OrganizerDashboard /></ProtectedRoute>} />
      
      <Route path="/terms" element={<Terms />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/about" element={<AboutUs />} />
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
