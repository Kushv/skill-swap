import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Verify() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const { login } = useAuth();

  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      const el = document.getElementById(`otp-${index + 1}`);
      el?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
       return toast.error("Please enter a 6-digit OTP");
    }
    
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: otpString });
      toast.success("Email verified successfully!");
      login(res.data.data, res.data.data.accessToken);
      navigate("/onboarding");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold mb-2">Verify your email</h1>
        <p className="text-muted-foreground mb-8">Enter the 6-digit code sent to your email</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-3 justify-center">
            {otp.map((digit, i) => (
              <Input
                key={i}
                id={`otp-${i}`}
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                className="w-12 h-14 text-center text-xl font-bold bg-secondary border-border"
              />
            ))}
          </div>
          <Button type="submit" className="w-full btn-glow">Verify</Button>
        </form>

        <p className="text-sm text-muted-foreground mt-4">
          Didn't receive the code? <button className="text-primary hover:underline">Resend</button>
        </p>
      </motion.div>
    </div>
  );
}
