import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { popularSkills, skillCategories } from "@/lib/mock-data";
import { X, GripVertical, Monitor, Wrench, MessageCircle, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const steps = ["Skills I Teach", "Skills I Want to Learn", "Learning Style"];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [teachSkills, setTeachSkills] = useState<{ name: string; level: string; category: string }[]>([]);
  const [learnSkills, setLearnSkills] = useState<string[]>([]);
  const [learningStyle, setLearningStyle] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const filtered = popularSkills.filter(
    (s) => s.toLowerCase().includes(search.toLowerCase()) && !teachSkills.find((t) => t.name === s) && !learnSkills.includes(s)
  );

  const addTeachSkill = (name: string) => {
    setTeachSkills([...teachSkills, { name, level: "Intermediate", category: "Tech" }]);
    setSearch("");
  };

  const removeTeachSkill = (name: string) => setTeachSkills(teachSkills.filter((s) => s.name !== name));

  const addLearnSkill = (name: string) => {
    setLearnSkills([...learnSkills, name]);
    setSearch("");
  };

  const removeLearnSkill = (name: string) => setLearnSkills(learnSkills.filter((s) => s !== name));

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await api.put('/users/me/onboarding', {
        skillsToTeach: teachSkills,
        skillsToLearn: learnSkills.map(name => ({ name })),
        learningStyle
      });
      // Update AuthContext so onboardingComplete:true is reflected immediately
      updateUser(res.data.data);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const styleOptions = [
    { id: "visual", icon: Monitor, label: "Visual", desc: "Learn through demos and visuals", emoji: "🎥" },
    { id: "practical", icon: Wrench, label: "Practical", desc: "Hands-on doing and building", emoji: "🛠" },
    { id: "discussion", icon: MessageCircle, label: "Discussion", desc: "Talking through concepts", emoji: "💬" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <p className={`text-xs mt-1 ${i <= step ? "text-primary" : "text-muted-foreground"}`}>{s}</p>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="glass-card p-6 space-y-4">
                <h2 className="font-display text-2xl font-bold">What can you teach?</h2>
                <p className="text-muted-foreground text-sm">Add skills you're confident teaching others</p>
                <Input placeholder="Search skills..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border" />
                {search && (
                  <div className="flex flex-wrap gap-2">
                    {filtered.slice(0, 8).map((s) => (
                      <button key={s} onClick={() => addTeachSkill(s)} className="skill-tag-teach cursor-pointer hover:scale-105 transition-transform">{s}</button>
                    ))}
                    {!filtered.length && search && (
                      <button onClick={() => addTeachSkill(search)} className="skill-tag-teach cursor-pointer">+ Add "{search}"</button>
                    )}
                  </div>
                )}
                {teachSkills.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-muted-foreground font-medium">Selected:</p>
                    {teachSkills.map((s) => (
                      <div key={s.name} className="flex items-center justify-between p-2 rounded-lg bg-secondary">
                        <span className="text-sm font-medium">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={s.level}
                            onChange={(e) => setTeachSkills(teachSkills.map((t) => (t.name === s.name ? { ...t, level: e.target.value } : t)))}
                            className="text-xs bg-muted border border-border rounded px-2 py-1 text-foreground"
                          >
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Expert</option>
                          </select>
                          <button onClick={() => removeTeachSkill(s.name)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="glass-card p-6 space-y-4">
                <h2 className="font-display text-2xl font-bold">What do you want to learn?</h2>
                <p className="text-muted-foreground text-sm">Add skills you'd love to pick up</p>
                <Input placeholder="Search skills..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border" />
                {search && (
                  <div className="flex flex-wrap gap-2">
                    {filtered.slice(0, 8).map((s) => (
                      <button key={s} onClick={() => addLearnSkill(s)} className="skill-tag-learn cursor-pointer hover:scale-105 transition-transform">{s}</button>
                    ))}
                    {!filtered.length && search && (
                      <button onClick={() => addLearnSkill(search)} className="skill-tag-learn cursor-pointer">+ Add "{search}"</button>
                    )}
                  </div>
                )}
                {learnSkills.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-muted-foreground font-medium">Priority order (drag to reorder):</p>
                    {learnSkills.map((s, i) => (
                      <div key={s} className="flex items-center gap-3 p-2 rounded-lg bg-secondary">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
                        <span className="text-sm font-medium flex-1">{s}</span>
                        <button onClick={() => removeLearnSkill(s)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="glass-card p-6 space-y-4">
                <h2 className="font-display text-2xl font-bold">How do you learn best?</h2>
                <p className="text-muted-foreground text-sm">This helps us match you with compatible peers</p>
                <div className="space-y-3 pt-2">
                  {styleOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setLearningStyle(opt.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                        learningStyle === opt.id
                          ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(163_100%_42%/0.15)]"
                          : "border-border bg-secondary hover:border-muted-foreground/30"
                      }`}
                    >
                      <span className="text-3xl">{opt.emoji}</span>
                      <div>
                        <p className="font-semibold">{opt.label}</p>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0} className="border-border bg-secondary">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 2 ? (
            <Button onClick={() => { setStep(step + 1); setSearch(""); }} className="btn-glow">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} className="btn-glow" disabled={!learningStyle || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Complete Setup <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
