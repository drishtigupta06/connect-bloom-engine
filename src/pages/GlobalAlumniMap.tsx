import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Globe, MapPin, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

// Simple world regions with approximate positions (percentage-based)
const regionPositions: Record<string, { x: number; y: number }> = {
  "Mumbai": { x: 64, y: 52 }, "Delhi": { x: 63, y: 42 }, "Bangalore": { x: 63, y: 58 },
  "Hyderabad": { x: 63, y: 54 }, "Chennai": { x: 64, y: 58 }, "Pune": { x: 62, y: 52 },
  "Kolkata": { x: 67, y: 46 }, "Ahmedabad": { x: 61, y: 48 }, "Jaipur": { x: 62, y: 44 },
  "New York": { x: 28, y: 38 }, "San Francisco": { x: 15, y: 40 }, "London": { x: 47, y: 30 },
  "Singapore": { x: 73, y: 56 }, "Dubai": { x: 57, y: 44 }, "Sydney": { x: 85, y: 72 },
  "Toronto": { x: 26, y: 34 }, "Berlin": { x: 50, y: 30 }, "Tokyo": { x: 83, y: 40 },
  "Seattle": { x: 16, y: 34 }, "Boston": { x: 29, y: 36 }, "Chicago": { x: 24, y: 36 },
  "Los Angeles": { x: 16, y: 42 }, "Austin": { x: 21, y: 44 }, "Paris": { x: 48, y: 32 },
  "Amsterdam": { x: 48, y: 29 }, "Remote": { x: 50, y: 65 },
};

interface LocationData {
  city: string;
  count: number;
  x: number;
  y: number;
}

export default function GlobalAlumniMap() {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [totalAlumni, setTotalAlumni] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("location");
      if (!data) { setLoading(false); return; }

      const counts: Record<string, number> = {};
      data.forEach((p) => {
        if (!p.location) return;
        const city = p.location.split(",")[0].trim();
        if (city) counts[city] = (counts[city] || 0) + 1;
      });

      const locs: LocationData[] = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 30)
        .map(([city, count]) => {
          const pos = regionPositions[city] || { x: 50 + Math.random() * 20 - 10, y: 40 + Math.random() * 20 - 10 };
          return { city, count, ...pos };
        });

      setLocations(locs);
      setTotalAlumni(data.filter((p) => p.location).length);
      setLoading(false);
    };
    fetch();
  }, []);

  const maxCount = useMemo(() => Math.max(...locations.map((l) => l.count), 1), [locations]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-accent" /> Global Alumni Map
          </h1>
          <p className="text-muted-foreground text-sm">{totalAlumni} alumni across {locations.length} cities worldwide</p>
        </div>
      </div>

      {/* Map Visualization */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl shadow-card overflow-hidden relative" style={{ aspectRatio: "2/1" }}>
        {/* World background */}
        <div className="absolute inset-0 bg-hero opacity-90" />
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25% 40%, hsl(var(--accent) / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 75% 50%, hsl(var(--info) / 0.05) 0%, transparent 50%)
          `
        }} />

        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          {[20, 40, 60, 80].map((y) => <line key={`h${y}`} x1="0%" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" />)}
          {[20, 40, 60, 80].map((x) => <line key={`v${x}`} x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" />)}
        </svg>

        {/* Location dots */}
        {locations.map((loc, i) => {
          const size = 8 + (loc.count / maxCount) * 24;
          const isHovered = hovered === loc.city;
          return (
            <motion.div
              key={loc.city}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 200 }}
              className="absolute cursor-pointer"
              style={{ left: `${loc.x}%`, top: `${loc.y}%`, transform: "translate(-50%, -50%)" }}
              onMouseEnter={() => setHovered(loc.city)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full bg-accent/30 animate-ping" style={{ width: size, height: size }} />
              {/* Dot */}
              <div
                className="relative rounded-full bg-accent shadow-accent-glow transition-transform"
                style={{ width: size, height: size, transform: isHovered ? "scale(1.5)" : "scale(1)" }}
              />
              {/* Tooltip */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-border rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap"
                >
                  <p className="text-xs font-heading font-semibold text-card-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-accent" /> {loc.city}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{loc.count} alumni</p>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Top locations list */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {locations.slice(0, 12).map((loc, i) => (
          <motion.div key={loc.city} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.03 }}
            className="bg-card border border-border rounded-lg p-3 shadow-card text-center">
            <MapPin className="h-4 w-4 text-accent mx-auto mb-1" />
            <p className="text-xs font-heading font-semibold text-card-foreground truncate">{loc.city}</p>
            <p className="text-lg font-heading font-bold text-accent">{loc.count}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
