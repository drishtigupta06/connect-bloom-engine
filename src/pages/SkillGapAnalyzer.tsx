import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Sparkles, Plus, X, Target, Loader2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function SkillGapAnalyzer() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [interests, setInterests] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".txt")) {
      toast.error("Please upload a PDF, DOCX, or TXT file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setResumeFile(file);
    setUploading(true);

    try {
      // For text files, read directly
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setResumeText(text);
        toast.success("Resume loaded!");
        setUploading(false);
        return;
      }

      // Upload to storage for processing, then read as text
      if (!user) { toast.error("Please sign in"); setUploading(false); return; }
      
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file);
      if (uploadError) throw uploadError;

      // For PDF/DOCX, we'll send the raw text content we can extract client-side
      // Read as ArrayBuffer and extract basic text
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Simple text extraction - decode as UTF-8 and filter readable chars
      let rawText = "";
      try {
        const decoder = new TextDecoder("utf-8", { fatal: false });
        rawText = decoder.decode(uint8Array);
        // Filter to printable characters and common whitespace
        rawText = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
      } catch {
        rawText = "";
      }

      if (rawText.length < 50) {
        // If text extraction failed, use filename as hint and let AI work with skills
        toast.info("Could not extract text from file. Please add your skills manually.");
        setResumeText("");
      } else {
        setResumeText(rawText.slice(0, 15000));
        toast.success("Resume uploaded and text extracted!");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setResumeFile(null);
    } finally {
      setUploading(false);
    }
  };

  const analyze = async () => {
    if (skills.length === 0 && !resumeText) {
      toast.error("Add skills or upload a resume");
      return;
    }
    setIsLoading(true);
    setAnalysis("");
    setExtractedSkills([]);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/skill-gap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          skills,
          interests,
          target_role: targetRole,
          resume_text: resumeText || undefined,
        }),
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
        <p className="text-muted-foreground text-sm">Upload your resume or enter skills to compare against successful alumni profiles</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
        {/* Resume Upload */}
        <div>
          <label className="text-sm font-medium text-card-foreground mb-2 block">Resume Upload</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          {!resumeFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-border rounded-lg p-6 hover:border-accent/50 hover:bg-accent/5 transition-colors text-center"
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-card-foreground">Click to upload resume</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or TXT • Max 10MB</p>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <FileText className="h-8 w-8 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">{resumeFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {uploading ? "Extracting text..." : (
                    resumeText ? (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3 w-3" /> Text extracted ({resumeText.length} chars)
                      </span>
                    ) : "Upload complete — add skills manually"
                  )}
                </p>
              </div>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setResumeFile(null); setResumeText(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">AND / OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

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
            {skills.length === 0 && !resumeText && <span className="text-xs text-muted-foreground">No skills added yet</span>}
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

        <Button variant="hero" size="lg" className="w-full" onClick={analyze} disabled={isLoading || (skills.length === 0 && !resumeText)}>
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
