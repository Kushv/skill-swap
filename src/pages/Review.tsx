import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";
import AppLayout from "@/components/layout/AppLayout";

// ---- Star Rating Component ----
function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-muted-foreground mb-2">
        {label}
      </label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className="w-8 h-8"
              fill={(hover || value) >= star ? "#FFD700" : "transparent"}
              stroke={(hover || value) >= star ? "#FFD700" : "currentColor"}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Main Review Page ----
export default function Review() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState<any>(null);
  const [reviewee, setReviewee] = useState<any>(null);
  const [ratings, setRatings] = useState({
    teachingQuality: 0,
    communication: 0,
    helpfulness: 0,
  });
  const [reviewText, setReviewText] = useState("");
  const [endorsed, setEndorsed] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const res = await api.get(`/sessions/${sessionId}`);
        const sess = res.data.data;
        setSession(sess);

        // Find the other participant
        const myId = (user as any)?._id?.toString();
        const other = sess.participants?.find(
          (p: any) => (p._id || p).toString() !== myId
        );

        if (other) {
          try {
            const uRes = await api.get(`/users/${other._id || other}`);
            setReviewee(uRes.data.data);
          } catch {
            // fallback: use embedded participant data
            setReviewee(other);
          }
        }
      } catch (err) {
        console.error("Failed to load session for review", err);
        toast.error("Could not load session data");
      }
    };
    load();
  }, [sessionId, user]);

  const handleEndorse = (skillName: string) => {
    setEndorsed((prev) =>
      prev.includes(skillName)
        ? prev.filter((x) => x !== skillName)
        : [...prev, skillName]
    );
  };

  const handleSubmit = async () => {
    if (!ratings.teachingQuality || !ratings.communication || !ratings.helpfulness) {
      toast.error("Please rate all three categories before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/reviews", {
        sessionId,
        ratings,
        reviewText,
        skillsEndorsed: endorsed,
      });
      setSubmitted(true);
      toast.success("Review submitted! Thank you.");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to submit review";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Submitted state ----
  if (submitted) {
    return (
      <AppLayout>
        <div className="container max-w-lg mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-10"
          >
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display text-2xl font-bold mb-2">
              Review Submitted!
            </h2>
            <p className="text-muted-foreground text-sm">
              Returning to dashboard…
            </p>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // ---- Loading state ----
  if (!session || !reviewee) {
    return (
      <AppLayout>
        <div className="container max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground animate-pulse">
            Loading session…
          </p>
        </div>
      </AppLayout>
    );
  }

  const revieweeName = reviewee?.name || "Your partner";
  const skillsToTeach: { name: string }[] = reviewee?.skillsToTeach || [];

  return (
    <AppLayout>
      <div className="container max-w-lg mx-auto px-4 py-10 pb-24 md:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {revieweeName.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Rate Your Session</h1>
              <p className="text-muted-foreground text-sm">
                How was your session with{" "}
                <span className="text-foreground font-medium">{revieweeName}</span>?
              </p>
            </div>
          </div>

          {/* Star ratings */}
          <StarRating
            label="Teaching Quality"
            value={ratings.teachingQuality}
            onChange={(v) => setRatings((p) => ({ ...p, teachingQuality: v }))}
          />
          <StarRating
            label="Communication"
            value={ratings.communication}
            onChange={(v) => setRatings((p) => ({ ...p, communication: v }))}
          />
          <StarRating
            label="Helpfulness"
            value={ratings.helpfulness}
            onChange={(v) => setRatings((p) => ({ ...p, helpfulness: v }))}
          />

          {/* Written review */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Written Review{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Share your experience…"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">
              {reviewText.length}/300
            </span>
          </div>

          {/* Skill endorsements */}
          {skillsToTeach.length > 0 && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Endorse Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {skillsToTeach.map((s: any) => {
                  const name = s.name || s;
                  const active = endorsed.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleEndorse(name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-glow w-full text-base py-6 mb-3"
          >
            {submitting ? "Submitting…" : "Submit Review"}
            {!submitting && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
