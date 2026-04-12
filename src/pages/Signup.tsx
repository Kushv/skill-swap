import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [slowNetwork, setSlowNetwork] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSlowNetwork(false);

    // Show "waking up" message after 5 seconds
    const slowTimer = setTimeout(() => setSlowNetwork(true), 5000);

    try {
      const res = await api.post('/auth/signup', { name, email, password });
      toast.success("Account created!");
      login(res.data.data, res.data.data.accessToken);
      navigate("/onboarding");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlowNetwork(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Join SkillSwap</h1>
          <p className="text-muted-foreground">Start teaching and learning with peers worldwide</p>
        </div>

        <div className="glass-card p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Alex Chen" className="pl-10 bg-secondary border-border" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="you@example.com" className="pl-10 bg-secondary border-border" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="Min. 8 characters" className="pl-10 bg-secondary border-border" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full btn-glow" disabled={loading}>Create Account</Button>
            {slowNetwork && (
              <p className="text-yellow-500 text-xs text-center mt-2 font-medium">
                ⏳ Server is waking up — this may take up to 30 seconds on first load...
              </p>
            )}
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-2 bg-card text-muted-foreground">or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="bg-secondary border-border">Google</Button>
            <Button variant="outline" className="bg-secondary border-border">LinkedIn</Button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
