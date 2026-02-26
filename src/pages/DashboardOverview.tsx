import { motion } from "framer-motion";
import { Users, Briefcase, TrendingUp, Award, ArrowUp, ArrowDown } from "lucide-react";

const statsCards = [
  { icon: Users, label: "Total Alumni", value: "12,847", change: "+3.2%", up: true },
  { icon: Briefcase, label: "Active Mentors", value: "1,234", change: "+12%", up: true },
  { icon: TrendingUp, label: "Placement Rate", value: "87%", change: "+5.1%", up: true },
  { icon: Award, label: "Engagement Score", value: "8.4/10", change: "-0.2", up: false },
];

const recentActivity = [
  { name: "Priya Sharma", action: "accepted a mentorship request", time: "2m ago", initials: "PS" },
  { name: "Arjun Mehta", action: "posted a job at Google", time: "15m ago", initials: "AM" },
  { name: "Sarah Chen", action: "joined the AI/ML community", time: "1h ago", initials: "SC" },
  { name: "Rahul Verma", action: "referred a student for internship", time: "2h ago", initials: "RV" },
  { name: "Maya Patel", action: "completed profile verification", time: "3h ago", initials: "MP" },
];

const topContributors = [
  { name: "Dr. Anita Desai", role: "Professor & Mentor", score: 980, initials: "AD" },
  { name: "Vikram Singh", role: "CTO at Flipkart", score: 920, initials: "VS" },
  { name: "Lisa Wang", role: "VP Engineering", score: 870, initials: "LW" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

export default function DashboardOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back! Here's your institution overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s, i) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={i}
            className="bg-card border border-border rounded-xl p-5 shadow-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-accent" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${s.up ? "text-success" : "text-destructive"}`}>
                {s.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {s.change}
              </span>
            </div>
            <div className="text-2xl font-heading font-bold text-card-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-card"
        >
          <h2 className="font-heading font-semibold text-card-foreground mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((a) => (
              <div key={a.name + a.time} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-accent">{a.initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-card-foreground">
                    <span className="font-medium">{a.name}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Contributors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-xl p-6 shadow-card"
        >
          <h2 className="font-heading font-semibold text-card-foreground mb-4">Top Contributors</h2>
          <div className="space-y-4">
            {topContributors.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent">{c.initials}</span>
                  </div>
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.role}</p>
                </div>
                <span className="text-sm font-heading font-bold text-accent">{c.score}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
