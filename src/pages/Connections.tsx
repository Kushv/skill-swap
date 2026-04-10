import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Clock, CheckCircle2, XCircle, MessageSquare, User, Loader2, Bell } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Skill = { name: string; level?: string };
type MatchUser = {
  _id: string; name: string; avatar: string; mentorLevel: string;
  skillsToTeach: Skill[]; skillsToLearn: Skill[]; averageRating: number; xpPoints: number;
};
type MatchDoc = {
  _id: string; users: MatchUser[]; status: string;
  initiatedBy: { _id: string; name: string; avatar: string };
  connectedAt?: string; createdAt: string;
};

type ConnectionData = {
  received: MatchDoc[]; sent: MatchDoc[]; connected: MatchDoc[];
  counts: { received: number; sent: number; connected: number; pendingTotal: number };
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function Connections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Read ?tab= from URL
  const urlTab = new URLSearchParams(location.search).get("tab");
  const validTab = (t: string | null) => ["received", "sent", "connected"].includes(t || "") ? t! : "received";
  const [activeTab, setActiveTab] = useState<"received" | "sent" | "connected">(validTab(urlTab) as any);

  const [data, setData] = useState<ConnectionData>({
    received: [], sent: [], connected: [],
    counts: { received: 0, sent: 0, connected: 0, pendingTotal: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetch = async () => {
    try {
      setLoading(true);
      const res = await api.get("/matches/connections");
      setData(res.data.data);
    } catch { toast.error("Failed to load connections"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) fetch(); }, [user]);

  // Sync URL tab param changes
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t && ["received", "sent", "connected"].includes(t)) setActiveTab(t as any);
  }, [location.search]);

  const handleRespond = async (matchId: string, action: "accept" | "reject") => {
    setActionId(matchId);
    try {
      await api.put(`/matches/${matchId}/respond`, { action });
      toast.success(action === "accept" ? "Connection accepted!" : "Request declined");
      await fetch();
      if (action === "accept") setActiveTab("connected");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally { setActionId(null); }
  };

  const getOther = (match: MatchDoc): MatchUser => {
    const me = (user as any)?._id;
    return match.users.find(u => u._id !== me) || match.users[0];
  };

  // ── Card component ──────────────────────────────────
  const UserCard = ({ u }: { u: MatchUser }) => (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
        {u.name?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{u.name}</p>
        <p className="text-xs text-muted-foreground">{u.mentorLevel}</p>
      </div>
    </div>
  );

  const SkillChips = ({ user }: { user: MatchUser }) => (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {(user.skillsToTeach || []).slice(0, 2).map((s, i) => (
        <span key={i} className="skill-tag-teach">{s.name}</span>
      ))}
      {(user.skillsToLearn || []).slice(0, 2).map((s, i) => (
        <span key={i} className="skill-tag-learn">{s.name}</span>
      ))}
    </div>
  );

  // ── Render helpers ──────────────────────────────────
  const EmptyState = ({ icon: Icon, title, msg }: { icon: any; title: string; msg: string }) => (
    <div className="glass-card p-10 text-center">
      <Icon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <p className="font-display font-bold mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );

  const Skeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-card p-4 flex items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-secondary" />
            <div className="h-2 w-20 rounded bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  );

  // ── Tab content ──────────────────────────────────────
  const renderReceived = () => {
    if (data.received.length === 0)
      return <EmptyState icon={Bell} title="No pending requests" msg="When someone sends you a connection request, it will appear here." />;
    return (
      <div className="space-y-3">
        {data.received.map(match => {
          const other = getOther(match);
          return (
            <motion.div key={match._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <UserCard u={other} />
              <SkillChips user={other} />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">{timeAgo(match.createdAt)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(match._id, "reject")}
                    disabled={actionId === match._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Decline
                  </button>
                  <button
                    onClick={() => handleRespond(match._id, "accept")}
                    disabled={actionId === match._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {actionId === match._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Accept
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderSent = () => {
    if (data.sent.length === 0)
      return <EmptyState icon={UserPlus} title="No sent requests" msg="Requests you send will appear here while they're pending." />;
    return (
      <div className="space-y-3">
        {data.sent.map(match => {
          const other = getOther(match);
          return (
            <motion.div key={match._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <UserCard u={other} />
              <SkillChips user={other} />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">{timeAgo(match.createdAt)}</span>
                <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5" /> Pending
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderConnected = () => {
    if (data.connected.length === 0)
      return <EmptyState icon={CheckCircle2} title="No connections yet" msg="When your requests are accepted, your connections appear here." />;
    return (
      <div className="space-y-3">
        {data.connected.map(match => {
          const other = getOther(match);
          return (
            <motion.div key={match._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <UserCard u={other} />
              <SkillChips user={other} />
              <div className="flex items-center justify-between mt-3">
                {match.connectedAt && (
                  <span className="text-xs text-muted-foreground">
                    Connected {new Date(match.connectedAt).toLocaleDateString()}
                  </span>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => navigate(`/messages?matchId=${match._id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Message
                  </button>
                  <Link
                    to={`/profile/${other._id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-secondary border border-border hover:bg-secondary/80 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" /> Profile
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const Tab = ({ id, label, count }: { id: "received" | "sent" | "connected"; label: string; count: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {count > 0 && (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <AppLayout>
      <div className="container px-4 py-8 pb-24 md:pb-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">Connections</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your skill-swap network</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 glass-card rounded-xl">
          <Tab id="received" label="Received" count={data.counts.received} />
          <Tab id="sent" label="Sent" count={data.counts.sent} />
          <Tab id="connected" label="Connected" count={data.counts.connected} />
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <Skeleton key="skeleton" />
          ) : (
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {activeTab === "received" && renderReceived()}
              {activeTab === "sent" && renderSent()}
              {activeTab === "connected" && renderConnected()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
