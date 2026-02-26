import { motion } from "framer-motion";
import { Trophy, Flame, Award, TrendingUp, Star, MessageSquare, Users, Calendar, Briefcase, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const leaderboard = [
  { rank: 1, name: "Dr. Anita Desai", role: "Professor & Mentor", score: 2450, avatar: "AD", streak: 45, badges: ["Top Mentor", "Event Champion"] },
  { rank: 2, name: "Vikram Singh", role: "CTO at Flipkart", score: 2280, avatar: "VS", streak: 32, badges: ["Hiring Hero", "Top Contributor"] },
  { rank: 3, name: "Priya Sharma", role: "Senior Engineer at Google", score: 2150, avatar: "PS", streak: 28, badges: ["AI Pioneer", "Referral Star"] },
  { rank: 4, name: "Maya Patel", role: "VP Growth at Razorpay", score: 1980, avatar: "MP", streak: 21, badges: ["Mentor Maven"] },
  { rank: 5, name: "Arjun Mehta", role: "PM at Microsoft", score: 1850, avatar: "AM", streak: 18, badges: ["Community Builder"] },
  { rank: 6, name: "Sarah Chen", role: "Research Scientist at OpenAI", score: 1720, avatar: "SC", streak: 15, badges: ["Knowledge Sharer"] },
  { rank: 7, name: "Lisa Wang", role: "VP Engineering at Apple", score: 1650, avatar: "LW", streak: 12, badges: ["Industry Leader"] },
  { rank: 8, name: "Rahul Verma", role: "Lead Engineer at Tesla", score: 1580, avatar: "RV", streak: 10, badges: ["Innovator"] },
];

const scoringRules = [
  { icon: MessageSquare, action: "Post in community", points: "+10" },
  { icon: Heart, action: "Mentor a student", points: "+50" },
  { icon: Calendar, action: "Attend an event", points: "+25" },
  { icon: Briefcase, action: "Post a job opportunity", points: "+30" },
  { icon: Users, action: "Successful referral", points: "+75" },
  { icon: Star, action: "Daily login streak", points: "+5/day" },
];

const rankColors = ["text-accent", "text-muted-foreground", "text-amber-700"];

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-accent" /> Engagement Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm">Top alumni contributors driving community impact</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Leaderboard */}
        <div className="space-y-3">
          {/* Top 3 podium */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 0, 2].map((idx) => {
              const person = leaderboard[idx];
              return (
                <motion.div
                  key={person.rank}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15 }}
                  className={`bg-card border border-border rounded-xl p-4 text-center shadow-card ${idx === 0 ? "ring-2 ring-accent/30" : ""}`}
                >
                  <div className="relative inline-block mb-2">
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center mx-auto ${idx === 0 ? "bg-accent/20" : "bg-secondary"}`}>
                      <span className={`font-heading font-bold ${idx === 0 ? "text-accent text-lg" : "text-foreground"}`}>{person.avatar}</span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      person.rank === 1 ? "bg-accent text-accent-foreground" : person.rank === 2 ? "bg-secondary text-foreground" : "bg-secondary text-foreground"
                    }`}>
                      #{person.rank}
                    </div>
                  </div>
                  <p className="font-heading font-semibold text-sm text-card-foreground truncate">{person.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                  <p className="text-lg font-heading font-bold text-accent mt-1">{person.score.toLocaleString()}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Flame className="h-3 w-3 text-destructive" />
                    <span className="text-[10px] text-muted-foreground">{person.streak} day streak</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Rest of leaderboard */}
          {leaderboard.slice(3).map((person, i) => (
            <motion.div
              key={person.rank}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className="bg-card border border-border rounded-xl p-4 shadow-card flex items-center gap-4"
            >
              <span className="text-lg font-heading font-bold text-muted-foreground w-8 text-center">#{person.rank}</span>
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-accent">{person.avatar}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm text-card-foreground truncate">{person.name}</p>
                <p className="text-xs text-muted-foreground truncate">{person.role}</p>
              </div>
              <div className="flex items-center gap-2">
                {person.badges.slice(0, 1).map((b) => (
                  <Badge key={b} variant="secondary" className="text-[10px] hidden sm:inline-flex">{b}</Badge>
                ))}
                <div className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-destructive" />
                  <span className="text-xs text-muted-foreground">{person.streak}d</span>
                </div>
                <span className="text-lg font-heading font-bold text-accent">{person.score.toLocaleString()}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sidebar: Scoring rules */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h3 className="font-heading font-semibold text-sm text-card-foreground mb-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-accent" /> How Points Work
            </h3>
            <div className="space-y-3">
              {scoringRules.map((rule) => (
                <div key={rule.action} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <rule.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-card-foreground">{rule.action}</span>
                  </div>
                  <Badge className="bg-success/10 text-success border-success/20 text-xs">{rule.points}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h3 className="font-heading font-semibold text-sm text-card-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Your Stats
            </h3>
            <div className="text-center py-4">
              <p className="text-3xl font-heading font-bold text-accent">0</p>
              <p className="text-xs text-muted-foreground mt-1">Engagement Score</p>
              <p className="text-xs text-muted-foreground mt-3">Start engaging to climb the leaderboard!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
