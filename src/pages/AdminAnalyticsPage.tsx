import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Activity, Loader2, Calendar } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState<{ month: string; users: number; cumulative: number }[]>([]);
  const [engagementHeatmap, setEngagementHeatmap] = useState<{ day: string; hour: number; count: number }[]>([]);
  const [retentionData, setRetentionData] = useState<{ month: string; active: number; total: number; rate: number }[]>([]);
  const [actionBreakdown, setActionBreakdown] = useState<{ action: string; count: number }[]>([]);
  const [totals, setTotals] = useState({ users: 0, events: 0, posts: 0, mentorships: 0 });

  useEffect(() => {
    const fetchAll = async () => {
      // Profiles for growth
      const { data: profiles } = await supabase.from("profiles").select("created_at, last_login, user_id");
      const pList = profiles || [];

      // Growth over time
      const monthMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthMap[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
      }
      pList.forEach((p) => {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key in monthMap) monthMap[key]++;
      });
      let cum = 0;
      const growth = Object.entries(monthMap).map(([month, users]) => {
        cum += users;
        const d = new Date(month + "-01");
        return { month: d.toLocaleString("default", { month: "short", year: "2-digit" }), users, cumulative: cum };
      });
      setGrowthData(growth);

      // Engagement heatmap from engagement_logs
      const { data: logs } = await supabase.from("engagement_logs").select("created_at, action").limit(1000);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const heatData: { day: string; hour: number; count: number }[] = [];
      const heatMap: Record<string, number> = {};
      (logs || []).forEach((l) => {
        const d = new Date(l.created_at);
        const key = `${days[d.getDay()]}-${d.getHours()}`;
        heatMap[key] = (heatMap[key] || 0) + 1;
      });
      days.forEach((day) => {
        for (let h = 0; h < 24; h += 3) {
          heatData.push({ day, hour: h, count: heatMap[`${day}-${h}`] || 0 });
        }
      });
      setEngagementHeatmap(heatData);

      // Retention: users who logged in this month vs total
      const retArr: { month: string; active: number; total: number; rate: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthKey = d.toLocaleString("default", { month: "short" });
        const totalByMonth = pList.filter((p) => new Date(p.created_at) <= end).length;
        const activeByMonth = pList.filter((p) => p.last_login && new Date(p.last_login) >= d && new Date(p.last_login) <= end).length;
        retArr.push({ month: monthKey, active: activeByMonth, total: totalByMonth, rate: totalByMonth > 0 ? Math.round((activeByMonth / totalByMonth) * 100) : 0 });
      }
      setRetentionData(retArr);

      // Action breakdown
      const actionCounts: Record<string, number> = {};
      (logs || []).forEach((l) => { actionCounts[l.action] = (actionCounts[l.action] || 0) + 1; });
      setActionBreakdown(
        Object.entries(actionCounts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([action, count]) => ({ action: action.replace(/_/g, " "), count }))
      );

      // Totals
      const { count: evtCount } = await supabase.from("events").select("id", { count: "exact", head: true });
      const { count: postCount } = await supabase.from("posts").select("id", { count: "exact", head: true });
      const { count: mentorCount } = await supabase.from("connections").select("id", { count: "exact", head: true }).eq("relation_type", "mentorship");
      setTotals({ users: pList.length, events: evtCount || 0, posts: postCount || 0, mentorships: mentorCount || 0 });

      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  const statCards = [
    { label: "Total Users", value: totals.users, icon: Users },
    { label: "Events Created", value: totals.events, icon: Calendar },
    { label: "Posts Published", value: totals.posts, icon: Activity },
    { label: "Mentorships", value: totals.mentorships, icon: TrendingUp },
  ];

  const maxHeat = Math.max(...engagementHeatmap.map((h) => h.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent" /> Admin Analytics
        </h1>
        <p className="text-muted-foreground text-sm">User growth, engagement patterns, and retention metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-card border border-border rounded-xl p-4 shadow-card">
            <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center mb-3"><s.icon className="h-4 w-4 text-accent" /></div>
            <div className="text-2xl font-heading font-bold text-card-foreground">{s.value.toLocaleString()}</div>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h2 className="font-heading font-semibold text-card-foreground text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" /> User Growth (12 Months)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="cumulative" name="Total Users" stroke="hsl(38, 92%, 50%)" fill="url(#growthGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="users" name="New Users" stroke="hsl(210, 80%, 55%)" fill="hsl(210, 80%, 55%)" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Retention */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h2 className="font-heading font-semibold text-card-foreground text-sm mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" /> Monthly Retention Rate
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => name === "rate" ? [`${value}%`, "Retention"] : [value, name]} />
              <Line type="monotone" dataKey="rate" name="Retention %" stroke="hsl(152, 60%, 42%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(152, 60%, 42%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Engagement Heatmap */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h2 className="font-heading font-semibold text-card-foreground text-sm mb-4">Engagement Heatmap (Day × Hour)</h2>
          <div className="overflow-x-auto">
            <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(8, 1fr)` }}>
              <div />
              {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                <div key={h} className="text-[10px] text-muted-foreground text-center">{h}:00</div>
              ))}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <>
                  <div key={`label-${day}`} className="text-xs text-muted-foreground flex items-center">{day}</div>
                  {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
                    const cell = engagementHeatmap.find((c) => c.day === day && c.hour === h);
                    const intensity = cell ? cell.count / maxHeat : 0;
                    return (
                      <div
                        key={`${day}-${h}`}
                        className="rounded-sm h-7 transition-colors"
                        style={{ backgroundColor: `hsl(38, 92%, 50%, ${0.05 + intensity * 0.85})` }}
                        title={`${day} ${h}:00 — ${cell?.count || 0} actions`}
                      />
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Action Breakdown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h2 className="font-heading font-semibold text-card-foreground text-sm mb-4">Top Engagement Actions</h2>
          {actionBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={actionBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="action" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={100} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">No engagement data yet</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
