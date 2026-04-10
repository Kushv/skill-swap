import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { getXpForLevel } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { Star, Zap, BookOpen, Clock, Edit2, Check, X, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

type TeachSkill = { name: string; category: string; level: string };
type LearnSkill = { name: string; priority?: number };

export default function Profile() {
  const { user, updateUser } = useAuth();

  // Local copy of profile (so we can update optimistically without full re-fetch)
  const [profileUser, setProfileUser] = useState<any>(null);

  // Bio state
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  // Skills state
  const [isEditingTeach, setIsEditingTeach] = useState(false);
  const [isEditingLearn, setIsEditingLearn] = useState(false);
  const [teachSkills, setTeachSkills] = useState<TeachSkill[]>([]);
  const [learnSkills, setLearnSkills] = useState<LearnSkill[]>([]);
  const [newTeachSkill, setNewTeachSkill] = useState({ name: "", category: "", level: "Intermediate" });
  const [newLearnSkill, setNewLearnSkill] = useState({ name: "" });
  const [savingSkills, setSavingSkills] = useState(false);

  // Sync from auth on load
  useEffect(() => {
    if (user) {
      const u = user as any;
      setProfileUser(u);
      setBioValue(u.bio || "");
      setTeachSkills(u.skillsToTeach || []);
      setLearnSkills(u.skillsToLearn || []);
    }
  }, [user]);

  if (!user || !profileUser) return null;
  const u = profileUser as any;

  const xpRange = getXpForLevel(u.mentorLevel || "Novice");
  const xpPoints = u.xpPoints || 0;
  const xpProgress = Math.min(((xpPoints - xpRange.min) / Math.max(xpRange.max - xpRange.min, 1)) * 100, 100);

  // ── Bio ──────────────────────────────────────────────
  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      const res = await api.put("/users/me", { bio: bioValue });
      const updated = res.data.data;
      setProfileUser((prev: any) => ({ ...prev, bio: updated.bio }));
      updateUser({ bio: updated.bio } as any);
      setIsEditingBio(false);
      toast.success("Bio updated!");
    } catch { toast.error("Failed to save bio"); }
    finally { setSavingBio(false); }
  };

  // ── Teach skills ─────────────────────────────────────
  const addTeachSkill = () => {
    if (!newTeachSkill.name.trim()) return;
    setTeachSkills(prev => [...prev, { ...newTeachSkill, name: newTeachSkill.name.trim() }]);
    setNewTeachSkill({ name: "", category: "", level: "Intermediate" });
  };
  const removeTeachSkill = (i: number) => setTeachSkills(prev => prev.filter((_, idx) => idx !== i));

  const saveTeachSkills = async () => {
    setSavingSkills(true);
    try {
      const res = await api.put("/users/me", { skillsToTeach: teachSkills });
      const updated = res.data.data;
      setProfileUser((prev: any) => ({ ...prev, skillsToTeach: updated.skillsToTeach }));
      updateUser({ skillsToTeach: updated.skillsToTeach } as any);
      setIsEditingTeach(false);
      toast.success("Teaching skills saved!");
    } catch { toast.error("Failed to save skills"); }
    finally { setSavingSkills(false); }
  };

  // ── Learn skills ──────────────────────────────────────
  const addLearnSkill = () => {
    if (!newLearnSkill.name.trim()) return;
    setLearnSkills(prev => [...prev, { name: newLearnSkill.name.trim(), priority: prev.length + 1 }]);
    setNewLearnSkill({ name: "" });
  };
  const removeLearnSkill = (i: number) => setLearnSkills(prev => prev.filter((_, idx) => idx !== i));

  const saveLearnSkills = async () => {
    setSavingSkills(true);
    try {
      const res = await api.put("/users/me", { skillsToLearn: learnSkills });
      const updated = res.data.data;
      setProfileUser((prev: any) => ({ ...prev, skillsToLearn: updated.skillsToLearn }));
      updateUser({ skillsToLearn: updated.skillsToLearn } as any);
      setIsEditingLearn(false);
      toast.success("Learning skills saved!");
    } catch { toast.error("Failed to save skills"); }
    finally { setSavingSkills(false); }
  };

  // ── Learning style ────────────────────────────────────
  const handleSetLearningStyle = async (style: string) => {
    try {
      await api.put("/users/me", { learningStyle: style });
      setProfileUser((prev: any) => ({ ...prev, learningStyle: style }));
      updateUser({ learningStyle: style } as any);
      toast.success("Learning style updated!");
    } catch { toast.error("Failed to update learning style"); }
  };

  return (
    <AppLayout>
      <div className="container px-4 py-8 pb-24 md:pb-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Header card */}
          <div className="glass-card p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary text-4xl font-bold mx-auto mb-4">
              {u.name?.charAt(0)}
            </div>
            <h1 className="font-display text-2xl font-bold">{u.name}</h1>
            <p className="text-primary font-medium text-sm mt-1">{u.mentorLevel || "Novice"}</p>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /> {u.averageRating?.toFixed(1) || "0.0"}</span>
              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {u.totalSessionsCompleted || 0} sessions</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {u.totalHoursTaught || 0}h taught</span>
            </div>
            <div className="mt-4 max-w-xs mx-auto">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" />{xpPoints} XP</span>
                <span>{xpRange.max} XP</span>
              </div>
              <div className="xp-bar"><div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} /></div>
            </div>
          </div>

          {/* Bio */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold">About Me</h2>
              {!isEditingBio && (
                <button onClick={() => { setBioValue(u.bio || ""); setIsEditingBio(true); }}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> {u.bio ? "Edit Bio" : "Add Bio"}
                </button>
              )}
            </div>
            {isEditingBio ? (
              <div className="space-y-3">
                <textarea value={bioValue} onChange={e => setBioValue(e.target.value)} maxLength={500} rows={4}
                  placeholder="Tell others about yourself..."
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{bioValue.length}/500</span>
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingBio(false)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-secondary border border-border hover:bg-secondary/80 transition-colors">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                    <button onClick={handleSaveBio} disabled={savingBio}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                      <Check className="w-3 h-3" /> {savingBio ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {u.bio || "No bio yet. Click 'Add Bio' to tell others about yourself."}
              </p>
            )}
          </div>

          {/* Skills I Teach */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold">Skills I Teach</h2>
              {!isEditingTeach && (
                <button onClick={() => { setTeachSkills(u.skillsToTeach || []); setIsEditingTeach(true); }}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            {isEditingTeach ? (
              <div className="space-y-3">
                {/* Existing skills list with remove */}
                <div className="flex flex-wrap gap-2">
                  {teachSkills.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
                  {teachSkills.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm">
                      <span>{s.name}</span>
                      {s.level && <span className="text-xs text-primary/70 border border-primary/30 px-1.5 rounded">{s.level}</span>}
                      <button onClick={() => removeTeachSkill(i)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new skill row */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                  <input value={newTeachSkill.name} onChange={e => setNewTeachSkill(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && addTeachSkill()}
                    placeholder="Skill name (e.g. Python)"
                    className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  <select value={newTeachSkill.level} onChange={e => setNewTeachSkill(p => ({ ...p, level: e.target.value }))}
                    className="px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm">
                    <option>Beginner</option><option>Intermediate</option><option>Expert</option>
                  </select>
                  <input value={newTeachSkill.category} onChange={e => setNewTeachSkill(p => ({ ...p, category: e.target.value }))}
                    placeholder="Category (opt)"
                    className="min-w-[110px] px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={addTeachSkill}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary border border-primary/40 text-primary text-sm hover:bg-primary/10 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setTeachSkills(u.skillsToTeach || []); setIsEditingTeach(false); }}
                    className="px-3 py-1.5 rounded-lg text-xs bg-secondary border border-border hover:bg-secondary/80 transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveTeachSkills} disabled={savingSkills}
                    className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                    {savingSkills ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(u.skillsToTeach || []).length === 0
                  ? <p className="text-sm text-muted-foreground">No skills added yet. Click Edit to add skills you can teach.</p>
                  : (u.skillsToTeach || []).map((s: TeachSkill) => (
                    <div key={s.name} className="skill-tag-teach">
                      {s.name}{s.level ? ` · ${s.level}` : ""}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Skills I'm Learning */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold">Skills I'm Learning</h2>
              {!isEditingLearn && (
                <button onClick={() => { setLearnSkills(u.skillsToLearn || []); setIsEditingLearn(true); }}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            {isEditingLearn ? (
              <div className="space-y-3">
                {/* Existing list */}
                <div className="flex flex-wrap gap-2">
                  {learnSkills.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
                  {learnSkills.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm">
                      <span className="text-xs font-bold text-primary w-4">{i + 1}</span>
                      <span>{s.name}</span>
                      <button onClick={() => removeLearnSkill(i)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new */}
                <div className="flex gap-2 pt-1 border-t border-border">
                  <input value={newLearnSkill.name} onChange={e => setNewLearnSkill({ name: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && addLearnSkill()}
                    placeholder="Skill name (e.g. Guitar)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={addLearnSkill}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary border border-primary/40 text-primary text-sm hover:bg-primary/10 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setLearnSkills(u.skillsToLearn || []); setIsEditingLearn(false); }}
                    className="px-3 py-1.5 rounded-lg text-xs bg-secondary border border-border hover:bg-secondary/80 transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveLearnSkills} disabled={savingSkills}
                    className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                    {savingSkills ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(u.skillsToLearn || []).length === 0
                  ? <p className="text-sm text-muted-foreground">No skills added yet. Click Edit to add skills you want to learn.</p>
                  : (u.skillsToLearn || []).map((s: LearnSkill) => (
                    <span key={s.name} className="skill-tag-learn">{s.name}</span>
                  ))}
              </div>
            )}
          </div>

          {/* Learning Style */}
          <div className="glass-card p-5">
            <h2 className="font-display font-bold mb-3">Learning Style</h2>
            <div className="flex gap-3 flex-wrap">
              {(["visual", "practical", "discussion"] as const).map(style => (
                <button key={style}
                  onClick={() => handleSetLearningStyle(style)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    u.learningStyle === style
                      ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_hsl(163_100%_42%/0.15)]"
                      : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground/30"
                  }`}>
                  {style === "visual" ? "🎥 Visual" : style === "practical" ? "🛠 Practical" : "💬 Discussion"}
                </button>
              ))}
            </div>
          </div>

          {/* Badges */}
          <div className="glass-card p-5">
            <h2 className="font-display font-bold mb-3">Badges</h2>
            <div className="flex flex-wrap gap-3">
              {(u.badges || []).length === 0
                ? <p className="text-sm text-muted-foreground">No badges yet. Keep learning and teaching!</p>
                : (u.badges || []).map((b: any) => (
                  <div key={b.name} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border">
                    <span className="text-2xl">{b.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(b.earnedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </motion.div>
      </div>
    </AppLayout>
  );
}
