import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Calendar, Clock, Video, Loader2, Plus, X, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ---- Session Creation Modal ----
function NewSessionModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [matches, setMatches] = useState<any[]>([]);
  const [matchId, setMatchId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState<30 | 60>(60);
  const [skillFocus, setSkillFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    // Reset form each time modal opens
    setScheduledAt("");
    setSkillFocus("");
    setDuration(60);
    api.get("/matches/my-matches")
      .then((res) => {
        const connected = (res.data.data || []).filter((m: any) => m.status === "connected");
        setMatches(connected);
        if (connected.length > 0) setMatchId(connected[0]._id);
        else setMatchId("");
      })
      .catch(() => toast.error("Could not load connections"));
  }, [open]);

  const myId = (user as any)?._id?.toString();

  const getPartner = (match: any) =>
    match.users?.find((u: any) => u._id?.toString() !== myId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId || !scheduledAt || !skillFocus) {
      toast.error("Please fill in all fields");
      return;
    }
    // Validate the date before sending
    const parsedDate = new Date(scheduledAt);
    if (isNaN(parsedDate.getTime())) {
      toast.error("Invalid date/time selected. Please pick a valid date.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/sessions", {
        matchId,
        scheduledAt: parsedDate.toISOString(),
        duration,
        skillFocus,
      });
      toast.success("Session request sent!");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass-card w-full max-w-md p-6 relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl font-bold mb-5">New Session</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Match selector */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Session with
                </label>
                {matches.length === 0 ? (
                  <p className="text-sm text-yellow-400 bg-yellow-400/10 rounded-lg p-3">
                    You have no connected matches yet. Connect with someone first.
                  </p>
                ) : (
                  <select
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {matches.map((m) => {
                      const partner = getPartner(m);
                      return (
                        <option key={m._id} value={m._id}>
                          {partner?.name || "Partner"}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Skill focus */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Skill Focus
                </label>
                <input
                  type="text"
                  value={skillFocus}
                  onChange={(e) => setSkillFocus(e.target.value)}
                  placeholder="e.g. Python basics, Music Theory"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Duration
                </label>
                <div className="flex gap-2">
                  {([30, 60] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        duration === d
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || matches.length === 0}
                className="btn-glow w-full mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {loading ? "Sending…" : "Send Session Request"}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---- Main Schedule Page ----
export default function Schedule() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSessions = async () => {
    try {
      const res = await api.get("/sessions/my-sessions");
      setSessions(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchSessions();
  }, [user]);

  const myId = (user as any)?._id?.toString();

  const handleAction = async (
    sessionId: string,
    status: string,
    counterProposal?: { newTime: string }
  ) => {
    setActioning(sessionId);
    try {
      await api.put(`/sessions/${sessionId}`, { status, counterProposal });
      toast.success(
        status === "confirmed"
          ? "Session confirmed! Meeting room created."
          : status === "cancelled"
          ? "Session cancelled."
          : "Reschedule proposed."
      );
      fetchSessions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setActioning(null);
    }
  };

  const grouped = {
    confirmed: sessions.filter((s) => s.status === "confirmed"),
    pending: sessions.filter((s) => s.status === "pending"),
    past: sessions.filter((s) =>
      ["completed", "cancelled", "rescheduled"].includes(s.status)
    ),
  };

  const getPartner = (s: any) =>
    s.participants?.find((p: any) => (p._id || p).toString() !== myId) || { name: "Partner" };

  const renderSession = (s: any, i: number) => {
    const partner = getPartner(s);
    const isActioning = actioning === s._id;

    return (
      <motion.div
        key={s._id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="glass-card-hover p-5"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
            {partner.name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{s.skillFocus || "Skill Session"}</h3>
            <p className="text-sm text-muted-foreground">with {partner.name}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDate(s.scheduledAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {s.duration}min
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                s.status === "confirmed"
                  ? "bg-primary/15 text-primary"
                  : s.status === "pending"
                  ? "bg-yellow-500/15 text-yellow-400"
                  : s.status === "completed"
                  ? "bg-green-500/15 text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s.status}
            </span>

            {/* Join Call — only for confirmed sessions with a room */}
            {s.status === "confirmed" && s.meetingRoomId && (
              <Link to={`/session/${s._id}`}>
                <Button size="sm" className="btn-glow gap-1 text-xs">
                  <Video className="w-3 h-3" /> Join
                </Button>
              </Link>
            )}

            {/* Accept / Cancel for PENDING sessions where I am NOT the initiator */}
            {s.status === "pending" &&
              s.initiatedBy?.toString() !== myId && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAction(s._id, "confirmed")}
                    disabled={isActioning}
                    title="Accept"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-green-500/15 text-green-400 hover:bg-green-500/30 transition-colors"
                  >
                    {isActioning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleAction(s._id, "cancelled")}
                    disabled={isActioning}
                    title="Decline"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-destructive/15 text-destructive hover:bg-destructive/30 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

            {/* Leave Review for completed sessions */}
            {s.status === "completed" && (
              <Link to={`/review/${s._id}`}>
                <Button size="sm" variant="outline" className="text-xs">
                  Leave Review
                </Button>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <NewSessionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={fetchSessions}
      />

      <div className="container px-4 py-8 pb-24 md:pb-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">My Schedule</h1>
            <p className="text-muted-foreground text-sm">Upcoming skill sessions</p>
          </div>
          <Button className="btn-glow gap-2" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> New Session
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            No sessions yet. Create one with a connected match!
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.confirmed.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Upcoming (Confirmed)
                </h2>
                <div className="space-y-3">
                  {grouped.confirmed.map((s, i) => renderSession(s, i))}
                </div>
              </section>
            )}
            {grouped.pending.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Pending
                </h2>
                <div className="space-y-3">
                  {grouped.pending.map((s, i) => renderSession(s, i))}
                </div>
              </section>
            )}
            {grouped.past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Past
                </h2>
                <div className="space-y-3">
                  {grouped.past.map((s, i) => renderSession(s, i))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
