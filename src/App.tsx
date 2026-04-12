import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Verify from "./pages/Verify";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import MatchDiscovery from "./pages/MatchDiscovery";
import Schedule from "./pages/Schedule";
import SessionRoom from "./pages/SessionRoom";
import Messages from "./pages/Messages";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Connections from "./pages/Connections";
import Review from "./pages/Review";
import NotFound from "./pages/NotFound";

import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

const AppContent = () => {
  useEffect(() => {
    // Ping backend every 10 minutes to prevent cold start on Render free tier
    const ping = () => {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
      fetch(`${baseUrl}/api/health`)
        .then(() => console.log('Backend pinged'))
        .catch(() => {});
    };
    ping(); // ping on load
    const interval = setInterval(ping, 10 * 60 * 1000); // every 10 min
    return () => clearInterval(interval);
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/match" element={<MatchDiscovery />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/session/:sessionId" element={<SessionRoom />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/review/:sessionId" element={<Review />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
