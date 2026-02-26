import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardOverview from "./pages/DashboardOverview";
import AlumniDirectory from "./pages/AlumniDirectory";
import SocialFeed from "./pages/SocialFeed";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardLayout><DashboardOverview /></DashboardLayout>} />
          <Route path="/dashboard/directory" element={<DashboardLayout><AlumniDirectory /></DashboardLayout>} />
          <Route path="/dashboard/feed" element={<DashboardLayout><SocialFeed /></DashboardLayout>} />
          <Route path="/dashboard/events" element={<DashboardLayout><div className="text-foreground font-heading text-2xl font-bold">Events — Coming Soon</div></DashboardLayout>} />
          <Route path="/dashboard/opportunities" element={<DashboardLayout><div className="text-foreground font-heading text-2xl font-bold">Opportunities — Coming Soon</div></DashboardLayout>} />
          <Route path="/dashboard/ai" element={<DashboardLayout><div className="text-foreground font-heading text-2xl font-bold">AI Assistant — Coming Soon</div></DashboardLayout>} />
          <Route path="/dashboard/analytics" element={<DashboardLayout><div className="text-foreground font-heading text-2xl font-bold">Analytics — Coming Soon</div></DashboardLayout>} />
          <Route path="/dashboard/settings" element={<DashboardLayout><div className="text-foreground font-heading text-2xl font-bold">Settings — Coming Soon</div></DashboardLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
