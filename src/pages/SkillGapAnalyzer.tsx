import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Sparkles, Plus, X, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function SkillGapAnalyzer() {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [interests, setInterests] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (analysis) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [analysis]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills((prev) => [...prev, s]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const analyze = async () => {
    if (skills.length === 0) { toast.error("Add at least one skill"); return; }
    setIsLoading(true);
    setAnalysis("");

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/skill-gap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ skills, interests, target_role: targetRole }),
      });

      if (resp.status === 429) { toast.error("Rate limited. Try again shortly."); setIsLoading(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); setIsLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { content += delta; setAnalysis(content); }
          } catch { /* partial */ }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Target className="h-6 w-6 text-accent" /> Skill Gap Analyzer
        </h1>
        <p className="text-muted-foreground text-sm">Enter your skills and get compared against successful alumni profiles</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
        {/* Skills input */}
        <div>
          <label className="text-sm font-medium text-card-foreground mb-2 block">Your Skills</label>
          <div className="flex gap-2 mb-3">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder="e.g. Python, React, Machine Learning..."
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addSkill}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Badge key={s} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                {s}
                <button onClick={() => removeSkill(s)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {skills.length === 0 && <span className="text-xs text-muted-foreground">No skills added yet</span>}
          </div>
        </div>

        {/* Interests & Target */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-card-foreground mb-2 block">Interests</label>
            <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. AI, Fintech, Healthcare..." />
          </div>
          <div>
            <label className="text-sm font-medium text-card-foreground mb-2 block">Target Role</label>
            <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Data Scientist, PM..." />
          </div>
        </div>

        <Button variant="hero" size="lg" className="w-full" onClick={analyze} disabled={isLoading || skills.length === 0}>
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Analyze Skill Gaps</>}
        </Button>
      </div>

      {/* Results */}
      {analysis && (
        <motion.div
          ref={resultRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 shadow-card"
        >
          <div className="prose prose-sm max-w-none text-card-foreground prose-headings:font-heading prose-headings:text-card-foreground prose-strong:text-card-foreground prose-a:text-info">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}
