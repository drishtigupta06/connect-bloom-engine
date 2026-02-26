import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, Clock, Video, Plus, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const typeColors: Record<string, string> = {
  meetup: "bg-info/10 text-info border-info/20",
  reunion: "bg-accent/10 text-accent border-accent/20",
  workshop: "bg-success/10 text-success border-success/20",
  mentorship: "bg-primary/10 text-primary border-primary/20",
};

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  is_virtual: boolean | null;
  max_attendees: number | null;
  rsvp_count: number;
  user_rsvped: boolean;
}

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchEvents = async () => {
    const { data: eventsData } = await supabase
      .from("events")
      .select("id, title, description, event_type, start_date, end_date, location, is_virtual, max_attendees")
      .gte("start_date", new Date().toISOString())
      .order("start_date");

    if (!eventsData) { setLoading(false); return; }

    const { data: rsvps } = await supabase.from("event_rsvps").select("event_id, user_id");

    const mapped = eventsData.map((e) => ({
      ...e,
      rsvp_count: rsvps?.filter((r) => r.event_id === e.id).length || 0,
      user_rsvped: rsvps?.some((r) => r.event_id === e.id && r.user_id === user?.id) || false,
    }));
    setEvents(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [user]);

  const toggleRsvp = async (eventId: string, currentlyRsvped: boolean) => {
    if (!user) { toast.error("Please sign in to RSVP"); return; }
    if (currentlyRsvped) {
      await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id);
      toast.success("RSVP cancelled");
    } else {
      await supabase.from("event_rsvps").insert({ event_id: eventId, user_id: user.id });
      toast.success("RSVP confirmed!");
    }
    fetchEvents();
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("events").insert({
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      start_date: new Date(fd.get("start_date") as string).toISOString(),
      end_date: fd.get("end_date") ? new Date(fd.get("end_date") as string).toISOString() : null,
      location: fd.get("location") as string || null,
      max_attendees: fd.get("max_attendees") ? Number(fd.get("max_attendees")) : null,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Event created!");
    setCreateOpen(false);
    fetchEvents();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground text-sm">Reunions, workshops, webinars, and mentorship sessions</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm"><Plus className="h-4 w-4" /> Create Event</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">Create New Event</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input name="title" placeholder="Event title" required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" placeholder="What's this event about?" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Start Date</Label><Input name="start_date" type="datetime-local" required /></div>
                <div className="space-y-2"><Label>End Date</Label><Input name="end_date" type="datetime-local" /></div>
              </div>
              <div className="space-y-2"><Label>Location</Label><Input name="location" placeholder="Venue or virtual link" /></div>
              <div className="space-y-2"><Label>Max Attendees</Label><Input name="max_attendees" type="number" placeholder="100" /></div>
              <Button variant="hero" className="w-full" type="submit">Create Event</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 && <p className="text-center py-12 text-muted-foreground">No upcoming events. Create one!</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {events.map((event, i) => (
          <motion.div key={event.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-md transition-all">
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <Badge className={typeColors[event.event_type] || typeColors.meetup}>{event.event_type}</Badge>
                {event.user_rsvped && <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Going</Badge>}
              </div>
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-2">{event.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{event.description}</p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {formatDate(event.start_date)} • {formatTime(event.start_date)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {event.is_virtual ? <Video className="h-4 w-4 shrink-0" /> : <MapPin className="h-4 w-4 shrink-0" />}
                  {event.is_virtual ? "Virtual Event" : event.location || "TBD"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  {event.rsvp_count}{event.max_attendees ? ` / ${event.max_attendees}` : ""} attending
                </div>
              </div>
              <Button variant={event.user_rsvped ? "outline" : "hero"} size="sm" className="w-full" onClick={() => toggleRsvp(event.id, event.user_rsvped)}>
                {event.user_rsvped ? <><X className="h-4 w-4" /> Cancel RSVP</> : <><CheckCircle2 className="h-4 w-4" /> RSVP</>}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
