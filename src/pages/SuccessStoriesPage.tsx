import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Plus, Loader2, Tag, Image, Video, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Story {
  id: string;
  user_id: string;
  title: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  tags: string[];
  is_featured: boolean;
  is_approved: boolean;
  created_at: string;
  profile?: { full_name: string; company: string | null; designation: string | null; avatar_url: string | null };
}

export default function SuccessStoriesPage() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", content: "", image_url: "", video_url: "", tags: "" });

  const fetchStories = async () => {
    const { data } = await supabase
      .from("success_stories")
      .select("*")
      .eq("is_approved", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) {
      const userIds = [...new Set(data.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, company, designation, avatar_url")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      setStories(data.map((s: any) => ({ ...s, profile: profileMap[s.user_id] })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchStories(); }, []);

  const submit = async () => {
    if (!user || !form.title || !form.content) return;
    setSubmitting(true);
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("success_stories").insert({
      user_id: user.id,
      title: form.title,
      content: form.content,
      image_url: form.image_url || null,
      video_url: form.video_url || null,
      tags,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Story submitted for review!");
      setForm({ title: "", content: "", image_url: "", video_url: "", tags: "" });
      setOpen(false);
      fetchStories();
    }
    setSubmitting(false);
  };

  const allTags = [...new Set(stories.flatMap((s) => s.tags))];
  const filtered = filter === "all" ? stories : filter === "featured" ? stories.filter((s) => s.is_featured) : stories.filter((s) => s.tags.includes(filter));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-accent" /> Success Stories
          </h1>
          <p className="text-muted-foreground text-sm">Inspiring journeys from our alumni community</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm"><Plus className="h-4 w-4" /> Share Your Story</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Share Your Success Story</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Story title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Tell your story..." rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <Input placeholder="Image URL (optional)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <Input placeholder="Video URL (optional)" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
              <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              <Button onClick={submit} disabled={submitting || !form.title || !form.content} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit for Review
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Badge className={`cursor-pointer ${filter === "all" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`} onClick={() => setFilter("all")}>All</Badge>
        <Badge className={`cursor-pointer ${filter === "featured" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`} onClick={() => setFilter("featured")}>⭐ Featured</Badge>
        {allTags.slice(0, 8).map((t) => (
          <Badge key={t} className={`cursor-pointer ${filter === t ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`} onClick={() => setFilter(t)}>{t}</Badge>
        ))}
      </div>

      {/* Stories Grid */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-card">
          <Award className="h-12 w-12 text-accent/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No stories yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((story, i) => (
            <motion.div key={story.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-card border rounded-xl overflow-hidden shadow-card hover:shadow-md transition-all ${story.is_featured ? "border-accent/40 ring-1 ring-accent/20" : "border-border"}`}>
              {story.image_url && (
                <div className="aspect-video bg-secondary overflow-hidden">
                  <img src={story.image_url} alt={story.title} className="w-full h-full object-cover" />
                </div>
              )}
              {story.video_url && !story.image_url && (
                <div className="aspect-video bg-secondary flex items-center justify-center">
                  <Video className="h-10 w-10 text-accent" />
                </div>
              )}
              <div className="p-5">
                {story.is_featured && <Badge className="bg-accent/10 text-accent border-accent/20 mb-2 text-xs">⭐ Featured</Badge>}
                <h3 className="font-heading font-semibold text-card-foreground mb-2">{story.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{story.content}</p>
                {story.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {story.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                )}
                {story.profile && (
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                      {story.profile.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-card-foreground">{story.profile.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{story.profile.designation} {story.profile.company ? `at ${story.profile.company}` : ""}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
