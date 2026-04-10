import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Users, Video, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Sparkles, title: "AI Matching", desc: "Smart algorithm pairs you with the perfect skill partner" },
  { icon: Video, title: "Live Sessions", desc: "Video calls with screen share and collaborative whiteboard" },
  { icon: Trophy, title: "Gamification", desc: "Earn XP, badges, and climb the leaderboard" },
  { icon: Users, title: "Community", desc: "Join skill communities and grow together" },
];

export default function Index() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border backdrop-blur-xl bg-background/80">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">SkillSwap</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="btn-glow">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Skill Matching
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
              Teach what you know.<br />
              <span className="gradient-text">Learn what you love.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              SkillSwap connects you with peers worldwide for live, scheduled video sessions.
              Trade skills, grow together, and level up — no money needed.
            </p>
            <div className="flex items-center gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="btn-glow gap-2 text-base px-8">
                  Start Swapping <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-border bg-secondary text-base px-8">
                  Log In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container max-w-5xl">
          <div className="grid md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="glass-card-hover p-6 flex gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="glass-card max-w-2xl mx-auto p-10 animate-glow-pulse">
          <h2 className="font-display text-3xl font-bold mb-3">Ready to swap skills?</h2>
          <p className="text-muted-foreground mb-6">Join thousands of learners and teachers on SkillSwap</p>
          <Link to="/signup">
            <Button size="lg" className="btn-glow gap-2 px-8">
              Join Free <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center text-sm text-muted-foreground">
        <p>© 2026 SkillSwap. Learn, teach, grow.</p>
      </footer>
    </div>
  );
}
