import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, MapPin, Building2, GraduationCap, CheckCircle2, Briefcase, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const alumni = [
  { name: "Priya Sharma", batch: "2018", dept: "Computer Science", company: "Google", role: "Senior Engineer", location: "Bangalore", skills: ["ML", "Python", "System Design"], verified: true, hiring: true, mentor: true, initials: "PS" },
  { name: "Arjun Mehta", batch: "2016", dept: "Electrical Eng.", company: "Microsoft", role: "Product Manager", location: "Seattle", skills: ["Product", "Strategy", "Data"], verified: true, hiring: false, mentor: true, initials: "AM" },
  { name: "Sarah Chen", batch: "2020", dept: "Data Science", company: "OpenAI", role: "Research Scientist", location: "San Francisco", skills: ["AI", "NLP", "Research"], verified: true, hiring: true, mentor: false, initials: "SC" },
  { name: "Rahul Verma", batch: "2015", dept: "Mechanical Eng.", company: "Tesla", role: "Lead Engineer", location: "Austin", skills: ["CAD", "Robotics", "Manufacturing"], verified: false, hiring: false, mentor: true, initials: "RV" },
  { name: "Maya Patel", batch: "2019", dept: "Business Admin", company: "Razorpay", role: "VP Growth", location: "Mumbai", skills: ["Growth", "Marketing", "Fintech"], verified: true, hiring: true, mentor: true, initials: "MP" },
  { name: "Vikram Singh", batch: "2014", dept: "Computer Science", company: "Flipkart", role: "CTO", location: "Bangalore", skills: ["Architecture", "Leadership", "Cloud"], verified: true, hiring: false, mentor: true, initials: "VS" },
  { name: "Lisa Wang", batch: "2017", dept: "Electronics", company: "Apple", role: "VP Engineering", location: "Cupertino", skills: ["Hardware", "iOS", "Management"], verified: true, hiring: true, mentor: false, initials: "LW" },
  { name: "Amit Joshi", batch: "2021", dept: "Information Tech.", company: "Stripe", role: "Software Engineer", location: "Dublin", skills: ["Payments", "TypeScript", "APIs"], verified: true, hiring: false, mentor: false, initials: "AJ" },
];

const filters = ["All", "Hiring", "Mentors", "Verified"];

export default function AlumniDirectory() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = alumni.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.company.toLowerCase().includes(search.toLowerCase()) ||
      a.skills.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = activeFilter === "All" ||
      (activeFilter === "Hiring" && a.hiring) ||
      (activeFilter === "Mentors" && a.mentor) ||
      (activeFilter === "Verified" && a.verified);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Alumni Directory</h1>
        <p className="text-muted-foreground text-sm">Discover and connect with {alumni.length.toLocaleString()} alumni</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2.5 shadow-card">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, or skill..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <Button
              key={f}
              variant={activeFilter === f ? "hero" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-md transition-all group hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-accent">{a.initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-heading font-semibold text-card-foreground text-sm truncate">{a.name}</h3>
                  {a.verified && <CheckCircle2 className="h-3.5 w-3.5 text-info shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{a.role} at {a.company}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {a.location}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GraduationCap className="h-3 w-3" /> {a.dept} • Batch {a.batch}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {a.skills.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px] px-2 py-0.5">{s}</Badge>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {a.hiring && (
                <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                  <Briefcase className="h-3 w-3 mr-1" /> Hiring
                </Badge>
              )}
              {a.mentor && (
                <Badge className="bg-info/10 text-info border-info/20 text-[10px]">
                  <Heart className="h-3 w-3 mr-1" /> Mentor
                </Badge>
              )}
            </div>

            <Button variant="outline" size="sm" className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              Connect
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
