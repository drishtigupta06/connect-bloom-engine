import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardOverview from "./pages/DashboardOverview";
import AlumniDirectory from "./pages/AlumniDirectory";
import SocialFeed from "./pages/SocialFeed";
import EventsPage from "./pages/EventsPage";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import AIAssistant from "./pages/AIAssistant";
import SkillGapAnalyzer from "./pages/SkillGapAnalyzer";
import ProfilePage from "./pages/ProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import NetworkGraph from "./pages/NetworkGraph";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function DashPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/dashboard" element={<DashPage><DashboardOverview /></DashPage>} />
    <Route path="/dashboard/directory" element={<DashPage><AlumniDirectory /></DashPage>} />
    <Route path="/dashboard/feed" element={<DashPage><SocialFeed /></DashPage>} />
    <Route path="/dashboard/events" element={<DashPage><EventsPage /></DashPage>} />
    <Route path="/dashboard/opportunities" element={<DashPage><OpportunitiesPage /></DashPage>} />
    <Route path="/dashboard/ai" element={<DashPage><AIAssistant /></DashPage>} />
    <Route path="/dashboard/skill-gap" element={<DashPage><SkillGapAnalyzer /></DashPage>} />
    <Route path="/dashboard/profile" element={<DashPage><ProfilePage /></DashPage>} />
    <Route path="/dashboard/leaderboard" element={<DashPage><LeaderboardPage /></DashPage>} />
    <Route path="/dashboard/network" element={<DashPage><NetworkGraph /></DashPage>} />
    <Route path="/dashboard/analytics" element={<DashPage><div className="text-foreground font-heading text-2xl font-bold">Analytics — Coming Soon</div></DashPage>} />
    <Route path="/dashboard/settings" element={<DashPage><div className="text-foreground font-heading text-2xl font-bold">Settings — Coming Soon</div></DashPage>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
