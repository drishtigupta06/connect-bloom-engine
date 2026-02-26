import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Plus, Loader2, Tag, ThumbsUp, ArrowLeft, Send } from "lucide-react";
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

interface ForumPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  is_pinned: boolean;
  likes_count: number;
  replies_count: number;
  created_at: string;
  profile?: { full_name: string; designation: string | null; company: string | null };
}

interface ForumReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { full_name: string; designation: string | null };
}

const categories = ["general", "career-advice", "tech", "entrepreneurship", "higher-education", "personality-dev"];

export default function CareerForumPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", tags: "", category: "general" });
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("forum_posts")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      const uids = [...new Set(data.map((p: any) => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, designation, company").in("user_id", uids);
      const pMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      setPosts(data.map((p: any) => ({ ...p, profile: pMap[p.user_id] })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const createPost = async () => {
    if (!user || !form.title || !form.content) return;
    setSubmitting(true);
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("forum_posts").insert({
      user_id: user.id, title: form.title, content: form.content, tags, category: form.category,
    });
    if (error) toast.error(error.message);
    else { toast.success("Posted!"); setOpen(false); setForm({ title: "", content: "", tags: "", category: "general" }); fetchPosts(); }
    setSubmitting(false);
  };

  const openThread = async (post: ForumPost) => {
    setSelectedPost(post);
    const { data } = await supabase.from("forum_replies").select("*").eq("post_id", post.id).order("created_at");
    if (data) {
      const uids = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, designation").in("user_id", uids.length > 0 ? uids : ["none"]);
      const pMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      setReplies(data.map((r: any) => ({ ...r, profile: pMap[r.user_id] })));
    }
  };

  const sendReply = async () => {
    if (!user || !selectedPost || !replyText.trim()) return;
    setReplying(true);
    const { error } = await supabase.from("forum_replies").insert({ post_id: selectedPost.id, user_id: user.id, content: replyText });
    if (error) toast.error(error.message);
    else { setReplyText(""); openThread(selectedPost); fetchPosts(); }
    setReplying(false);
  };

  const filtered = catFilter === "all" ? posts : posts.filter((p) => p.category === catFilter);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  if (selectedPost) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedPost(null)}><ArrowLeft className="h-4 w-4" /> Back to Forum</Button>
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">{selectedPost.category}</Badge>
            {selectedPost.is_pinned && <Badge className="bg-accent/10 text-accent text-[10px]">📌 Pinned</Badge>}
          </div>
          <h2 className="text-xl font-heading font-bold text-card-foreground mb-2">{selectedPost.title}</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{selectedPost.content}</p>
          {selectedPost.tags.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{selectedPost.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-card-foreground">{selectedPost.profile?.full_name}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(selectedPost.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-sm text-foreground">{replies.length} Replies</h3>
          {replies.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-lg p-4 shadow-card">
              <p className="text-sm text-card-foreground mb-2">{r.content}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-card-foreground">{r.profile?.full_name || "Alumni"}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Input placeholder="Write a reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()} className="flex-1" />
            <Button onClick={sendReply} disabled={replying || !replyText.trim()} size="icon">
              {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-accent" /> Career Forum
          </h1>
          <p className="text-muted-foreground text-sm">Discuss careers, skills, and professional growth</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm"><Plus className="h-4 w-4" /> New Discussion</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Start a Discussion</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Discussion title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="Share your thoughts..." rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              <Button onClick={createPost} disabled={submitting || !form.title || !form.content} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className={`cursor-pointer ${catFilter === "all" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`} onClick={() => setCatFilter("all")}>All</Badge>
        {categories.map((c) => (
          <Badge key={c} className={`cursor-pointer ${catFilter === c ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`} onClick={() => setCatFilter(c)}>
            {c.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </Badge>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center shadow-card">
            <MessageCircle className="h-12 w-12 text-accent/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No discussions yet. Start one!</p>
          </div>
        ) : (
          filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-md transition-all cursor-pointer"
              onClick={() => openThread(p)}>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-xs font-heading font-bold">{p.likes_count}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {p.is_pinned && <Badge className="bg-accent/10 text-accent text-[10px]">📌</Badge>}
                    <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                  </div>
                  <h3 className="font-heading font-semibold text-card-foreground mb-1 truncate">{p.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{p.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{p.profile?.full_name}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                    <span>•</span>
                    <span>{p.replies_count} replies</span>
                  </div>
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
