import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Plus, Loader2, Target, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  goal_amount: number;
  raised_amount: number;
  start_date: string;
  end_date: string | null;
  image_url: string | null;
  is_active: boolean;
  created_by: string;
}

export default function FundraisingPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [donateOpen, setDonateOpen] = useState<string | null>(null);
  const [donateAmount, setDonateAmount] = useState("");
  const [donateMsg, setDonateMsg] = useState("");
  const [donating, setDonating] = useState(false);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (data) setCampaigns(data);
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const donate = async (campaignId: string) => {
    if (!user || !donateAmount) return;
    const amt = parseFloat(donateAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setDonating(true);
    const { error } = await supabase.from("donations").insert({
      campaign_id: campaignId,
      user_id: user.id,
      amount: amt,
      message: donateMsg || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Thank you for your contribution! 🎉");
      setDonateOpen(null);
      setDonateAmount("");
      setDonateMsg("");
      fetchCampaigns();
    }
    setDonating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Heart className="h-6 w-6 text-accent" /> Fundraising Campaigns
        </h1>
        <p className="text-muted-foreground text-sm">Support your institution and fellow alumni through contributions</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-card">
          <Heart className="h-12 w-12 text-accent/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No active campaigns right now</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c, i) => {
            const pct = c.goal_amount > 0 ? Math.min((Number(c.raised_amount) / Number(c.goal_amount)) * 100, 100) : 0;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
                {c.image_url && (
                  <div className="aspect-video bg-secondary overflow-hidden">
                    <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-heading font-semibold text-card-foreground mb-1">{c.title}</h3>
                    {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-heading font-bold text-accent">₹{Number(c.raised_amount).toLocaleString()}</span>
                      <span className="text-muted-foreground">of ₹{Number(c.goal_amount).toLocaleString()}</span>
                    </div>
                    <Progress value={pct} className="h-2.5" />
                    <p className="text-xs text-muted-foreground mt-1">{Math.round(pct)}% funded</p>
                  </div>

                  {c.end_date && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Ends {format(new Date(c.end_date), "MMM d, yyyy")}</span>
                    </div>
                  )}

                  <Dialog open={donateOpen === c.id} onOpenChange={(o) => setDonateOpen(o ? c.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="hero" size="sm" className="w-full"><DollarSign className="h-4 w-4" /> Contribute</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Contribute to {c.title}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          {[500, 1000, 5000, 10000].map((a) => (
                            <Button key={a} variant={donateAmount === String(a) ? "default" : "outline"} size="sm"
                              onClick={() => setDonateAmount(String(a))}>₹{a.toLocaleString()}</Button>
                          ))}
                        </div>
                        <Input type="number" placeholder="Custom amount (₹)" value={donateAmount}
                          onChange={(e) => setDonateAmount(e.target.value)} />
                        <Textarea placeholder="Leave a message (optional)" value={donateMsg}
                          onChange={(e) => setDonateMsg(e.target.value)} rows={2} />
                        <Button onClick={() => donate(c.id)} disabled={donating || !donateAmount} className="w-full">
                          {donating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                          Donate ₹{donateAmount || "0"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
