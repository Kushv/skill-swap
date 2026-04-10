import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { Trophy, Zap, Star, Medal } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm text-muted-foreground font-mono w-5 text-center">{rank}</span>;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get("/users/leaderboard");
        setLeaderboard(res.data.data.leaderboard || []);
        setCurrentUserRank(res.data.data.currentUserRank || null);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const currentUserId = (user as any)?._id;

  return (
    <AppLayout>
      <div className="container px-4 py-8 pb-24 md:pb-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground text-sm">Top learners and teachers ranked by XP</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card p-4 flex items-center gap-4 animate-pulse">
                <div className="w-8 h-5 rounded bg-secondary" />
                <div className="w-10 h-10 rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-secondary" />
                  <div className="h-2 w-20 rounded bg-secondary" />
                </div>
                <div className="h-3 w-16 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-display font-bold text-lg mb-2">No rankings yet</p>
            <p className="text-sm text-muted-foreground">Complete sessions to earn XP and appear on the leaderboard!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((l: any, i: number) => {
              const isYou = l._id === currentUserId;
              return (
                <motion.div
                  key={l._id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`glass-card-hover p-4 flex items-center gap-4 ${isYou ? "ring-1 ring-primary/50 bg-primary/5" : ""}`}
                >
                  <div className="w-8 flex justify-center">{getRankIcon(l.rank)}</div>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                    {l.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {l.name} {isYou && <span className="text-xs text-primary">(You)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{l.mentorLevel}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm shrink-0">
                    <Star className="w-3 h-3 text-yellow-400" />
                    <span className="text-muted-foreground">{l.averageRating?.toFixed(1) || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold text-primary shrink-0">
                    <Zap className="w-4 h-4" />
                    {l.xpPoints} XP
                  </div>
                </motion.div>
              );
            })}

            {/* Current user rank if outside top 20 */}
            {currentUserRank && !leaderboard.find((l: any) => l._id === currentUserId) && (
              <>
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">Your position</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="glass-card p-4 flex items-center gap-4 ring-1 ring-primary/50 bg-primary/5">
                  <div className="w-8 flex justify-center">
                    <span className="text-sm text-muted-foreground font-mono">{currentUserRank}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                    {(user as any)?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {(user as any)?.name} <span className="text-xs text-primary">(You)</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Keep going — earn XP to climb the ranks!</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
