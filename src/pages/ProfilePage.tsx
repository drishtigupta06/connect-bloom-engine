import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Save, Plus, X, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Profile {
  full_name: string;
  bio: string;
  batch: string;
  department: string;
  passing_year: number | null;
  skills: string[];
  interests: string[];
  company: string;
  designation: string;
  industry: string;
  experience_years: number;
  location: string;
  is_mentor: boolean;
  is_hiring: boolean;
}

function calcCompletion(p: Profile): number {
  const fields = [p.full_name, p.bio, p.batch, p.department, p.company, p.designation, p.industry, p.location];
  const filled = fields.filter((f) => f && f.trim() !== "").length;
  const hasSkills = (p.skills || []).length > 0 ? 1 : 0;
  const hasInterests = (p.interests || []).length > 0 ? 1 : 0;
  const hasYear = p.passing_year ? 1 : 0;
  return Math.round(((filled + hasSkills + hasInterests + hasYear) / 11) * 100);
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({
    full_name: "", bio: "", batch: "", department: "", passing_year: null,
    skills: [], interests: [], company: "", designation: "", industry: "",
    experience_years: 0, location: "", is_mentor: false, is_hiring: false,
  });
  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          bio: data.bio || "",
          batch: data.batch || "",
          department: data.department || "",
          passing_year: data.passing_year,
          skills: data.skills || [],
          interests: data.interests || [],
          company: data.company || "",
          designation: data.designation || "",
          industry: data.industry || "",
          experience_years: data.experience_years || 0,
          location: data.location || "",
          is_mentor: data.is_mentor || false,
          is_hiring: data.is_hiring || false,
        });
      }
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const completion = calcCompletion(profile);
    const { error } = await supabase
      .from("profiles")
      .update({ ...profile, profile_completion: completion })
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profile saved!");
    setSaving(false);
  };

  const addTag = (type: "skills" | "interests", input: string, setInput: (v: string) => void) => {
    const v = input.trim();
    if (v && !profile[type].includes(v)) {
      setProfile((p) => ({ ...p, [type]: [...p[type], v] }));
      setInput("");
    }
  };

  const removeTag = (type: "skills" | "interests", val: string) => {
    setProfile((p) => ({ ...p, [type]: p[type].filter((s) => s !== val) }));
  };

  const completion = calcCompletion(profile);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <User className="h-6 w-6 text-accent" /> My Profile
          </h1>
          <p className="text-muted-foreground text-sm">Manage your alumni profile and visibility</p>
        </div>
        <Button variant="hero" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
      </div>

      {/* Completion Score */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-card-foreground">Profile Completion</span>
          <span className="text-sm font-heading font-bold text-accent">{completion}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="h-3 rounded-full bg-accent"
          />
        </div>
        {completion < 100 && (
          <p className="text-xs text-muted-foreground mt-2">Complete your profile to increase visibility in the alumni directory</p>
        )}
      </motion.div>

      {/* Personal */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <h2 className="font-heading font-semibold text-card-foreground">Personal Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Full Name</Label><Input value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} /></div>
          <div><Label>Location</Label><Input value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} placeholder="City, Country" /></div>
        </div>
        <div><Label>Bio</Label><Textarea value={profile.bio || ""} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." /></div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label>Batch</Label><Input value={profile.batch} onChange={(e) => setProfile((p) => ({ ...p, batch: e.target.value }))} placeholder="2020" /></div>
          <div><Label>Department</Label><Input value={profile.department} onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))} placeholder="Computer Science" /></div>
          <div><Label>Passing Year</Label><Input type="number" value={profile.passing_year || ""} onChange={(e) => setProfile((p) => ({ ...p, passing_year: e.target.value ? parseInt(e.target.value) : null }))} /></div>
        </div>
      </div>

      {/* Professional */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <h2 className="font-heading font-semibold text-card-foreground">Professional Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Company</Label><Input value={profile.company} onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))} /></div>
          <div><Label>Designation</Label><Input value={profile.designation} onChange={(e) => setProfile((p) => ({ ...p, designation: e.target.value }))} /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Industry</Label><Input value={profile.industry} onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))} placeholder="Technology" /></div>
          <div><Label>Years of Experience</Label><Input type="number" value={profile.experience_years} onChange={(e) => setProfile((p) => ({ ...p, experience_years: parseInt(e.target.value) || 0 }))} /></div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={profile.is_mentor} onCheckedChange={(v) => setProfile((p) => ({ ...p, is_mentor: v }))} />
            <Label>Available as Mentor</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={profile.is_hiring} onCheckedChange={(v) => setProfile((p) => ({ ...p, is_hiring: v }))} />
            <Label>Currently Hiring</Label>
          </div>
        </div>
      </div>

      {/* Skills & Interests */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <h2 className="font-heading font-semibold text-card-foreground">Skills & Interests</h2>
        {(["skills", "interests"] as const).map((type) => (
          <div key={type}>
            <Label className="capitalize mb-2 block">{type}</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={type === "skills" ? skillInput : interestInput}
                onChange={(e) => type === "skills" ? setSkillInput(e.target.value) : setInterestInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(type, type === "skills" ? skillInput : interestInput, type === "skills" ? setSkillInput : setInterestInput))}
                placeholder={`Add ${type === "skills" ? "a skill" : "an interest"}...`}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => addTag(type, type === "skills" ? skillInput : interestInput, type === "skills" ? setSkillInput : setInterestInput)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile[type].map((v) => (
                <Badge key={v} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                  {v} <button onClick={() => removeTag(type, v)}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
