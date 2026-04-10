import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Trophy, User, MessageSquare, UserCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending connection count once on mount / user change
  useEffect(() => {
    if (!user) return;
    api.get("/matches/connections")
      .then(res => setPendingCount(res.data.data?.counts?.received || 0))
      .catch(() => {});
  }, [user]);

  // Listen for real-time connection events from AuthContext socket
  useEffect(() => {
    const onRequest = () => setPendingCount(p => p + 1);
    window.addEventListener("skillswap:connection-request", onRequest);
    return () => window.removeEventListener("skillswap:connection-request", onRequest);
  }, []);

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/match", label: "Discover", icon: Users },
    { path: "/connections", label: "Connections", icon: UserCheck, badge: pendingCount > 0 ? pendingCount : null },
    { path: "/schedule", label: "Schedule", icon: Calendar },
    { path: "/messages", label: "Messages", icon: MessageSquare },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border backdrop-blur-xl bg-background/80">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">SkillSwap</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {(item as any).badge && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold -mt-3 -ml-1">
                      {(item as any).badge}
                    </span>
                  )}
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-primary/10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border backdrop-blur-xl bg-background/90">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 5).map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors relative",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {(item as any).badge && (
                  <span className="absolute top-0 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                    {(item as any).badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
