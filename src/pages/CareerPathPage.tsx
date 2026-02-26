import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, Sparkles, ArrowRight, BookOpen, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CareerStep {
  role: string;
  years: string;
  company_type?: string;
}

interface CareerPrediction {
  current_role: string;
  next_role: string;
  timeline: string;
  skills_needed: string[];
  suggested_mentors?: string[];
  career_trajectory: CareerStep[];
}

export default function CareerPathPage() {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<CareerPrediction | null>(null);
  const [loading, setLoading] = useState(false);

  const predict = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("embed-profile", {
        body: { action: "career_path", user_id: user.id },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setLoading(false); return; }
      setPrediction(data.prediction);
    } catch (e: any) {
      toast.error(e.message || "Failed to predict career path");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-accent" /> Career Path Prediction
          </h1>
          <p className="text-muted-foreground text-sm">AI predicts your next career move based on senior alumni trajectories</p>
        </div>
        <Button variant="hero" size="sm" onClick={predict} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {prediction ? "Re-predict" : "Predict My Path"}
        </Button>
      </div>

      {!prediction && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-8 text-center shadow-card">
          <TrendingUp className="h-12 w-12 text-accent mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-lg text-card-foreground mb-2">Discover Your Next Career Move</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            AI analyzes career progressions of senior alumni in similar roles to predict your optimal next step.
          </p>
          <Button variant="hero" onClick={predict}><Sparkles className="h-4 w-4" /> Predict My Path</Button>
        </motion.div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Analyzing alumni career trajectories...</p>
          </div>
        </div>
      )}

      {prediction && !loading && (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            {/* Current → Next */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="bg-secondary rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current Role</p>
                  <p className="font-heading font-semibold text-card-foreground">{prediction.current_role}</p>
                </div>
                <ArrowRight className="h-6 w-6 text-accent shrink-0" />
                <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-accent mb-1">Predicted Next</p>
                  <p className="font-heading font-semibold text-accent">{prediction.next_role}</p>
                </div>
                <Badge className="bg-info/10 text-info border-info/20 ml-auto">{prediction.timeline}</Badge>
              </div>
            </motion.div>

            {/* Trajectory */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-6 shadow-card">
              <h3 className="font-heading font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" /> Career Trajectory
              </h3>
              <div className="space-y-0">
                {prediction.career_trajectory.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
                      }`}>{i + 1}</div>
                      {i < prediction.career_trajectory.length - 1 && <div className="w-px h-8 bg-border" />}
                    </div>
                    <div className="pb-4">
                      <p className="font-heading font-semibold text-sm text-card-foreground">{step.role}</p>
                      <p className="text-xs text-muted-foreground">{step.years}{step.company_type ? ` • ${step.company_type}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-xl p-5 shadow-card">
              <h3 className="font-heading font-semibold text-sm text-card-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" /> Skills to Develop
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {prediction.skills_needed.map((s) => (
                  <Badge key={s} className="bg-accent/10 text-accent border-accent/20 text-xs">{s}</Badge>
                ))}
              </div>
            </motion.div>

            {prediction.suggested_mentors && prediction.suggested_mentors.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-xl p-5 shadow-card">
                <h3 className="font-heading font-semibold text-sm text-card-foreground mb-3">Suggested Mentors</h3>
                <div className="space-y-2">
                  {prediction.suggested_mentors.map((m) => (
                    <p key={m} className="text-sm text-muted-foreground">• {m}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
