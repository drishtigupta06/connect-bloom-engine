import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Plus, Loader2, Send, Users, Filter, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Campaign {
  id: string;
  title: string;
  message: string;
  segment_filters: { batch?: string; industry?: string; skill?: string };
  status: string;
  sent_count: number;
  created_by: string;
  created_at: string;
  sent_at: string | null;
}

export default function MailingCampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", message: "", batch: "", industry: "", skill: "" });
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("mailing_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCampaigns(data as Campaign[]);
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  // Preview audience size
  const previewAudience = async () => {
    let query = supabase.from("profiles").select("user_id", { count: "exact", head: true });
    if (form.batch) query = query.eq("batch", form.batch);
    if (form.industry) query = query.eq("industry", form.industry);
    if (form.skill) query = query.contains("skills", [form.skill]);
    const { count } = await query;
    setPreviewCount(count || 0);
  };

  useEffect(() => {
    if (form.batch || form.industry || form.skill) {
      const t = setTimeout(previewAudience, 300);
      return () => clearTimeout(t);
    } else {
      setPreviewCount(null);
    }
  }, [form.batch, form.industry, form.skill]);

  const createCampaign = async () => {
    if (!user || !form.title || !form.message) return;
    setSubmitting(true);
    const filters: Record<string, string> = {};
    if (form.batch) filters.batch = form.batch;
    if (form.industry) filters.industry = form.industry;
    if (form.skill) filters.skill = form.skill;

    const { error } = await supabase.from("mailing_campaigns").insert({
      title: form.title,
      message: form.message,
      segment_filters: filters,
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Campaign created as draft");
      setOpen(false);
      setForm({ title: "", message: "", batch: "", industry: "", skill: "" });
      fetchCampaigns();
    }
    setSubmitting(false);
  };

  const sendCampaign = async (campaign: Campaign) => {
    if (!user) return;
    setSending(campaign.id);
    try {
      // Build query for matching profiles
      let query = supabase.from("profiles").select("user_id");
      const f = campaign.segment_filters;
      if (f.batch) query = query.eq("batch", f.batch);
      if (f.industry) query = query.eq("industry", f.industry);
      if (f.skill) query = query.contains("skills", [f.skill]);
      const { data: profiles } = await query;

      if (!profiles || profiles.length === 0) {
        toast.error("No matching alumni found");
        setSending(null);
        return;
      }

      // Create notifications in batches
      const notifications = profiles.map((p) => ({
        user_id: p.user_id,
        type: "campaign",
        title: campaign.title,
        message: campaign.message,
        link: "/dashboard/notifications",
      }));

      // Insert in chunks of 50
      for (let i = 0; i < notifications.length; i += 50) {
        const chunk = notifications.slice(i, i + 50);
        await supabase.from("notifications").insert(chunk);
      }

      // Update campaign status
      await supabase.from("mailing_campaigns").update({
        status: "sent",
        sent_count: profiles.length,
        sent_at: new Date().toISOString(),
      }).eq("id", campaign.id);

      toast.success(`Campaign sent to ${profiles.length} alumni!`);
      fetchCampaigns();
    } catch (e: any) {
      toast.error(e.message || "Failed to send campaign");
    }
    setSending(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-accent" /> Mailing Campaigns
          </h1>
          <p className="text-muted-foreground text-sm">Send targeted in-app notifications to alumni segments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm"><Plus className="h-4 w-4" /> New Campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Campaign title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Message content..." rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />

              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Audience Filters (optional)</p>
                <Input placeholder="Batch (e.g. 2020)" value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
                <Input placeholder="Industry (e.g. Technology)" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                <Input placeholder="Skill (e.g. React)" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} />
                {previewCount !== null && (
                  <Badge className="bg-info/10 text-info border-info/20">
                    <Users className="h-3 w-3 mr-1" /> {previewCount} alumni match
                  </Badge>
                )}
              </div>

              <Button onClick={createCampaign} disabled={submitting || !form.title || !form.message} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Draft
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-card">
          <Mail className="h-12 w-12 text-accent/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No campaigns yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c, i) => {
            const filters = c.segment_filters;
            const hasFilters = Object.keys(filters).length > 0;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-xl p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-semibold text-card-foreground">{c.title}</h3>
                      <Badge className={c.status === "sent"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                      }>
                        {c.status === "sent" ? <><CheckCircle className="h-3 w-3 mr-1" /> Sent</> : <><Clock className="h-3 w-3 mr-1" /> Draft</>}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{c.message}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {hasFilters && (
                        <span className="flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                        </span>
                      )}
                      {c.sent_count > 0 && <span><Users className="h-3 w-3 inline" /> {c.sent_count} recipients</span>}
                      <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {c.status === "draft" && (
                    <Button variant="hero" size="sm" onClick={() => sendCampaign(c)} disabled={sending === c.id}>
                      {sending === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
