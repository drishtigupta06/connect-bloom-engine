import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Search, Loader2, Shield, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UserEntry {
  user_id: string;
  full_name: string;
  company: string | null;
  department: string | null;
  batch: string | null;
  role: string;
}

const roleBadgeColors: Record<string, string> = {
  alumni: "bg-info/10 text-info border-info/20",
  student: "bg-success/10 text-success border-success/20",
};

export default function ManageUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "alumni", batch: "", department: "" });

  // Check authorization
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (roleData || []).map(r => r.role);
      const authorized = roles.includes("institution_admin") || roles.includes("super_admin");
      setIsAuthorized(authorized);

      if (authorized) {
        const { data: profile } = await supabase.from("profiles").select("institution_id").eq("user_id", user.id).maybeSingle();
        setInstitutionId(profile?.institution_id || null);
      }
    })();
  }, [user]);

  // Fetch users from same institution
  const fetchUsers = async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, company, department, batch")
      .eq("institution_id", institutionId)
      .order("full_name");

    if (profiles) {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
      const merged: UserEntry[] = profiles.map(p => ({
        ...p,
        role: roleMap.get(p.user_id) || "alumni",
      }));
      setUsers(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthorized && institutionId) fetchUsers();
    else if (isAuthorized && !institutionId) setLoading(false);
  }, [isAuthorized, institutionId]);

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error("सभी required fields भरें");
      return;
    }
    if (newUser.password.length < 6) {
      toast.error("Password कम से कम 6 characters होना चाहिए");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user-admin", {
        body: {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
          institution_id: institutionId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${newUser.full_name} को ${newUser.role} के रूप में जोड़ दिया गया`);
      setCreateOpen(false);
      setNewUser({ email: "", password: "", full_name: "", role: "alumni", batch: "", department: "" });
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "User बनाने में error आया");
    }
    setCreating(false);
  };

  if (isAuthorized === null) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  if (!isAuthorized) return (
    <div className="text-center py-20">
      <Shield className="h-12 w-12 text-destructive/30 mx-auto mb-4" />
      <h2 className="text-lg font-heading font-semibold text-foreground">Access Denied</h2>
      <p className="text-sm text-muted-foreground mt-1">आपको Institution Admin privileges चाहिए।</p>
    </div>
  );

  const filteredUsers = users.filter(u => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.department || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.batch || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const alumniCount = users.filter(u => u.role === "alumni").length;
  const studentCount = users.filter(u => u.role === "student").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-accent" /> Manage Users
          </h1>
          <p className="text-muted-foreground text-sm">अपने institution में alumni और students जोड़ें</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>नया User जोड़ें</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Full Name *</Label>
                <Input value={newUser.full_name} onChange={(e) => setNewUser(p => ({ ...p, full_name: e.target.value }))} placeholder="Rahul Sharma" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="rahul@example.com" />
              </div>
              <div>
                <Label>Password *</Label>
                <Input type="password" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(val) => setNewUser(p => ({ ...p, role: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alumni">Alumni</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={createUser} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                {creating ? "Adding..." : "Add User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-heading font-bold text-card-foreground">{users.length}</p>
          <p className="text-xs text-muted-foreground">Total Users</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-heading font-bold text-info">{alumniCount}</p>
          <p className="text-xs text-muted-foreground">Alumni</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-heading font-bold text-success">{studentCount}</p>
          <p className="text-xs text-muted-foreground">Students</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="alumni">Alumni</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">{filteredUsers.length} users</Badge>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : !institutionId ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">कोई institution assign नहीं है। कृपया पहले अपनी profile में institution set करें।</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">कोई user नहीं मिला</p>
            </div>
          )}
          {filteredUsers.map((u, i) => (
            <motion.div
              key={u.user_id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.015 }}
              className="bg-card border border-border rounded-xl p-4 shadow-card flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <span className="font-heading font-bold text-muted-foreground text-sm">
                  {u.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-heading font-semibold text-card-foreground">{u.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {[u.department, u.batch, u.company].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${roleBadgeColors[u.role] || ""}`}>
                {u.role === "alumni" ? "Alumni" : u.role === "student" ? "Student" : u.role.replace(/_/g, " ")}
              </Badge>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
