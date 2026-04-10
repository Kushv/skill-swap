import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Star, UserPlus, Bookmark, SkipForward, SlidersHorizontal, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function MatchDiscovery() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fetchMatches = async () => {
      try {
        const res = await api.post('/matches/recommend');
        setMatches(res.data.data);
      } catch (err) {
        console.error("Failed to fetch recommended matches", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, [user]);

  const handleConnect = async (targetUserId: string, cardId: string) => {
    setConnectingId(targetUserId);
    try {
      await api.post('/matches/connect', { targetUserId });
      toast.success("Connection request sent!");
      // Mark this card as sent (don't remove — show "Request Sent" instead)
      setSentIds(prev => new Set(prev).add(cardId));
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to connect";
      if (msg.toLowerCase().includes('already')) {
        // Already sent — just mark as sent
        setSentIds(prev => new Set(prev).add(cardId));
      } else {
        toast.error(msg);
      }
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="container px-4 py-8 pb-24 md:pb-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Discover Matches</h1>
            <p className="text-muted-foreground text-sm">AI-powered recommendations based on your skills</p>
          </div>
          <Button variant="outline" size="sm" className="border-border bg-secondary gap-2">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No matches found right now. Check back later!
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="grid md:grid-cols-2 gap-5">
            {matches.map((m) => {
              const cardId = m._id?.toString() || m.userId;
              const isSent = sentIds.has(cardId);
              const isConnecting = connectingId === (m.userId || m._id?.toString());

              return (
                <motion.div key={cardId} variants={item} className="glass-card-hover p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-lg">{m.name}</h3>
                        <span className="match-score">{m.matchScore}%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{m.mentorLevel} · <Star className="w-3 h-3 inline text-yellow-400" /> {m.averageRating?.toFixed(1) || "0.0"}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">Teaches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(m.skillsToTeach || []).map((t: string) => <span key={`t-${t}`} className="skill-tag-teach">{t}</span>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">Wants to learn</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(m.skillsToLearn || []).map((l: string) => <span key={`l-${l}`} className="skill-tag-learn">{l}</span>)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(m.matchReasons || []).map((r: string) => (
                      <span key={r} className="px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground border border-border">{r}</span>
                    ))}
                  </div>

                  {/* Match score bar */}
                  <div className="xp-bar">
                    <div className="xp-bar-fill" style={{ width: `${m.matchScore}%` }} />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className={`flex-1 gap-2 ${isSent ? "bg-secondary border border-border text-muted-foreground" : "btn-glow"}`}
                      variant={isSent ? "outline" : "default"}
                      size="sm"
                      onClick={() => !isSent && handleConnect(m.userId || m._id?.toString(), cardId)}
                      disabled={isSent || isConnecting}
                    >
                      {isConnecting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : isSent
                          ? <><CheckCircle2 className="w-4 h-4 text-primary" /> Request Sent</>
                          : <><UserPlus className="w-4 h-4" /> Connect</>
                      }
                    </Button>
                    <Button variant="outline" size="sm" className="border-border bg-secondary">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="border-border bg-secondary">
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
