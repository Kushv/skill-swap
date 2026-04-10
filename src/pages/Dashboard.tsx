import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { getXpForLevel } from "@/lib/mock-data";
import { BookOpen, Clock, Award, Zap, Star, ChevronRight, Calendar, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function formatCountdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return "Started";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [sessRes, recRes, connRes] = await Promise.allSettled([
          api.get('/sessions/my-sessions'),
          api.post('/matches/recommend'),
          api.get('/matches/connections'),
        ]);

        if (sessRes.status === 'fulfilled') setSessions(sessRes.value.data.data || []);
        if (recRes.status === 'fulfilled') setRecommended(recRes.value.data.data || []);
        if (connRes.status === 'fulfilled') setPendingCount(connRes.value.data.data?.counts?.received || 0);
      } catch (err) {
        console.error("Dashboard fetch err:", err);
      }
    };
    fetchData();
  }, [user]);

  // Update badge when socket fires new request event
  useEffect(() => {
    const onRequest = () => setPendingCount(p => p + 1);
    window.addEventListener("skillswap:connection-request", onRequest);
    return () => window.removeEventListener("skillswap:connection-request", onRequest);
  }, []);

  if (loading || !user) {
    return <AppLayout><div className="flex h-screen items-center justify-center p-4">Loading dashboard...</div></AppLayout>;
  }

  const currentUser = user as any;
  const xpPoints = currentUser.xpPoints || 0;
  const mentorLevel = currentUser.mentorLevel || 'Novice';
  const badges = currentUser.badges || [];

  const xpRange = getXpForLevel(mentorLevel);
  const xpProgress = ((xpPoints - xpRange.min) / Math.max(xpRange.max - xpRange.min, 1)) * 100;

  return (
    <AppLayout>
      <div className="container px-4 py-8 pb-24 md:pb-8 max-w-6xl">
        {/* Pending Requests Banner */}
        {pendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20"
          >
            <div className="flex items-center gap-2 text-sm">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">
                You have <span className="text-primary font-bold">{pendingCount}</span> pending connection request{pendingCount > 1 ? 's' : ''}
              </span>
            </div>
            <Link
              to="/connections?tab=received"
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              Review →
            </Link>
          </motion.div>
        )}

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-1">
            Welcome back, <span className="gradient-text">{currentUser.name.split(" ")[0]}</span>
          </h1>
          <p className="text-muted-foreground">Here's your learning snapshot</p>
        </div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          {/* Stats */}
          <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: BookOpen, label: "Sessions", value: currentUser.totalSessionsCompleted || 0 },
              { icon: Clock, label: "Hours Taught", value: currentUser.totalHoursTaught || 0 },
              { icon: Star, label: "Avg Rating", value: currentUser.averageRating || 0 },
              { icon: Award, label: "Badges", value: badges.length },
            ].map((stat) => (
              <div key={stat.label} className="stat-card">
                <stat.icon className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold font-display">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* XP Bar */}
          <motion.div variants={item} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">{mentorLevel}</span>
              </div>
              <span className="text-sm text-muted-foreground">{xpPoints} / {xpRange.max} XP</span>
            </div>
            <div className="xp-bar">
              <motion.div
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upcoming Sessions */}
            <motion.div variants={item} className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg">Upcoming Sessions</h2>
                <Link to="/schedule" className="text-primary text-sm hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
                ) : (
                  sessions.slice(0, 3).map((s: any) => {
                    const partner = s.participants.find((p: any) => p._id !== currentUser._id) || { name: 'Unknown' };
                    return (
                      <div key={s._id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                          {partner.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{s.skillFocus}</p>
                          <p className="text-xs text-muted-foreground">with {partner.name} · {s.duration}min</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono text-primary">{formatCountdown(s.scheduledAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* Activity Feed */}
            <motion.div variants={item} className="glass-card p-5">
              <h2 className="font-display font-bold text-lg mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground w-full py-4 text-center">No recent activity right now.</p>
              </div>
            </motion.div>
          </div>

          {/* Recommended Matches */}
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">Recommended Matches</h2>
              <Link to="/match" className="text-primary text-sm hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {recommended.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-3">No matches found right now.</p>
              ) : (
                recommended.slice(0, 3).map((m: any) => (
                  <div key={m._id || m.userId} className="glass-card-hover p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.mentorLevel}</p>
                      </div>
                      <span className="match-score ml-auto">{m.matchScore}%</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(m.skillsToTeach || []).map((t: string) => <span key={`t-${t}`} className="skill-tag-teach text-[11px]">{t}</span>)}
                      {(m.skillsToLearn || []).map((l: string) => <span key={`l-${l}`} className="skill-tag-learn text-[11px]">{l}</span>)}
                    </div>
                    <Link to="/match">
                      <Button size="sm" className="w-full btn-glow text-xs">Discover</Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
