import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Image, Smile, TrendingUp, Calendar, Briefcase, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const posts = [
  {
    id: 1,
    author: "Priya Sharma",
    initials: "PS",
    role: "Senior Engineer at Google",
    time: "2h ago",
    content: "Thrilled to announce that our team at Google just launched a new AI-powered accessibility feature that helps visually impaired users navigate the web! 🚀 Grateful to my alma mater for sparking my passion in AI. #AlumniPride #GoogleAI",
    likes: 234,
    comments: 18,
    liked: false,
  },
  {
    id: 2,
    author: "Arjun Mehta",
    initials: "AM",
    role: "Product Manager at Microsoft",
    time: "5h ago",
    content: "Looking for talented fresh graduates interested in Product Management. We have 3 open positions at Microsoft India. DM me or drop your resume — happy to refer alumni from our institution! 💼",
    likes: 189,
    comments: 42,
    liked: true,
  },
  {
    id: 3,
    author: "Maya Patel",
    initials: "MP",
    role: "VP Growth at Razorpay",
    time: "1d ago",
    content: "Just completed my 50th mentoring session through AlumniOS! The skill gap analyzer really helped me understand what students need. If you're a fintech enthusiast looking for guidance, my calendar is open. 🎯",
    likes: 312,
    comments: 28,
    liked: false,
  },
];

const trendingTopics = [
  { tag: "#AIinTech", count: "2.4k posts" },
  { tag: "#AlumniHiring", count: "1.8k posts" },
  { tag: "#StartupLife", count: "1.2k posts" },
  { tag: "#MentorshipMatters", count: "980 posts" },
];

const upcomingEvents = [
  { title: "AI/ML Alumni Meetup", date: "Mar 5", attendees: 145 },
  { title: "Annual Reunion 2026", date: "Apr 12", attendees: 520 },
  { title: "Startup Pitch Night", date: "Mar 18", attendees: 89 },
];

export default function SocialFeed() {
  const [postContent, setPostContent] = useState("");
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>(
    Object.fromEntries(posts.map(p => [p.id, p.liked]))
  );

  const toggleLike = (id: number) => {
    setLikedPosts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* Main Feed */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Community Feed</h1>
          <p className="text-muted-foreground text-sm">Stay connected with your alumni network</p>
        </div>

        {/* Composer */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-accent text-accent-foreground font-heading text-sm">JD</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share an update, achievement, or opportunity..."
                className="w-full bg-secondary rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[80px]"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm"><Image className="h-4 w-4 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="sm"><Smile className="h-4 w-4 text-muted-foreground" /></Button>
                </div>
                <Button variant="hero" size="sm" disabled={!postContent.trim()}>
                  <Send className="h-4 w-4" /> Post
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="bg-card border border-border rounded-xl p-5 shadow-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-accent/10 text-accent font-heading text-sm">{post.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{post.author}</p>
                  <p className="text-xs text-muted-foreground">{post.role} • {post.time}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            <p className="text-sm text-card-foreground leading-relaxed mb-4">{post.content}</p>

            <div className="flex items-center gap-1 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleLike(post.id)}
                className={likedPosts[post.id] ? "text-destructive" : "text-muted-foreground"}
              >
                <Heart className={`h-4 w-4 ${likedPosts[post.id] ? "fill-current" : ""}`} />
                {post.likes + (likedPosts[post.id] && !post.liked ? 1 : (!likedPosts[post.id] && post.liked ? -1 : 0))}
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <MessageCircle className="h-4 w-4" /> {post.comments}
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sidebar */}
      <div className="space-y-4 hidden lg:block">
        {/* Trending */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h3 className="font-heading font-semibold text-card-foreground text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" /> Trending
          </h3>
          <div className="space-y-3">
            {trendingTopics.map((t) => (
              <div key={t.tag} className="flex items-center justify-between">
                <span className="text-sm font-medium text-info">{t.tag}</span>
                <span className="text-xs text-muted-foreground">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Events */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h3 className="font-heading font-semibold text-card-foreground text-sm mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" /> Upcoming Events
          </h3>
          <div className="space-y-3">
            {upcomingEvents.map((e) => (
              <div key={e.title} className="p-3 bg-secondary rounded-lg">
                <p className="text-sm font-medium text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{e.date} • {e.attendees} attending</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
