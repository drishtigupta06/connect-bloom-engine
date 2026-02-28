import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Search, Loader2, Shield, Upload, FileSpreadsheet, CheckCircle2, XCircle, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
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

interface CsvRow {
  email: string;
  full_name: string;
  role: string;
  password?: string;
  department?: string;
  batch?: string;
  company?: string;
}

interface ImportResult {
  email: string;
  success: boolean;
  error?: string;
}

const roleBadgeColors: Record<string, string> = {
  alumni: "bg-info/10 text-info border-info/20",
  student: "bg-success/10 text-success border-success/20",
};

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    if (values.length < 2) continue;

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { if (values[idx]) obj[h] = values[idx]; });

    if (obj.email && obj.full_name) {
      rows.push({
        email: obj.email,
        full_name: obj.full_name,
        role: obj.role || "alumni",
        password: obj.password || "",
        department: obj.department || "",
        batch: obj.batch || "",
        company: obj.company || "",
      });
    }
  }
  return rows;
}

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

  // Bulk import state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchUsers = async () => {
    if (!institutionId) { setLoading(false); return; }
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
        body: { email: newUser.email, password: newUser.password, full_name: newUser.full_name, role: newUser.role, institution_id: institutionId },
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

  // CSV file handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("कृपया सिर्फ CSV file upload करें");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File 2MB से छोटी होनी चाहिए");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      const errors: string[] = [];

      if (rows.length === 0) {
        errors.push("CSV में कोई valid row नहीं मिली। Headers: email, full_name, role");
      }
      if (rows.length > 100) {
        errors.push("एक बार में maximum 100 users import कर सकते हैं");
      }

      const emails = rows.map(r => r.email.toLowerCase());
      const duplicates = emails.filter((e, i) => emails.indexOf(e) !== i);
      if (duplicates.length > 0) {
        errors.push(`Duplicate emails: ${[...new Set(duplicates)].slice(0, 3).join(", ")}${duplicates.length > 3 ? "..." : ""}`);
      }

      const invalidRoles = rows.filter(r => !["alumni", "student"].includes(r.role.toLowerCase()));
      if (invalidRoles.length > 0) {
        errors.push(`Invalid roles detected. सिर्फ "alumni" या "student" allowed हैं`);
      }

      setCsvRows(rows.slice(0, 100));
      setCsvErrors(errors);
      setImportResults(null);
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (csvRows.length === 0 || csvErrors.length > 0) return;

    setImporting(true);
    setImportProgress(10);

    try {
      setImportProgress(30);
      const { data, error } = await supabase.functions.invoke("bulk-import-users", {
        body: { users: csvRows, institution_id: institutionId },
      });

      setImportProgress(90);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setImportResults(data.results || []);
      setImportProgress(100);

      const created = data.created || 0;
      const failed = data.failed || 0;
      if (created > 0) toast.success(`${created} users successfully import हो गए`);
      if (failed > 0) toast.error(`${failed} users import नहीं हो पाए`);

      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Bulk import failed");
    }
    setImporting(false);
  };

  const downloadSampleCsv = () => {
    const csv = "email,full_name,role,password,department,batch,company\nrahul@example.com,Rahul Sharma,alumni,Welcome@2026,Computer Science,2020,Google\npriya@example.com,Priya Patel,student,,Electrical Eng.,2025,";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetBulkState = () => {
    setCsvRows([]);
    setCsvErrors([]);
    setImportResults(null);
    setImportProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-accent" /> Manage Users
          </h1>
          <p className="text-muted-foreground text-sm">अपने institution में alumni और students जोड़ें</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Import Button */}
          <Dialog open={bulkOpen} onOpenChange={(open) => { setBulkOpen(open); if (!open) resetBulkState(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" /> Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-accent" /> CSV से Bulk Import
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Instructions */}
                <div className="bg-secondary/50 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-medium text-foreground">CSV Format:</p>
                  <p className="text-muted-foreground">
                    Required columns: <code className="bg-secondary px-1 py-0.5 rounded text-xs">email</code>, <code className="bg-secondary px-1 py-0.5 rounded text-xs">full_name</code>, <code className="bg-secondary px-1 py-0.5 rounded text-xs">role</code>
                  </p>
                  <p className="text-muted-foreground">
                    Optional: <code className="bg-secondary px-1 py-0.5 rounded text-xs">password</code>, <code className="bg-secondary px-1 py-0.5 rounded text-xs">department</code>, <code className="bg-secondary px-1 py-0.5 rounded text-xs">batch</code>, <code className="bg-secondary px-1 py-0.5 rounded text-xs">company</code>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Role सिर्फ <strong>alumni</strong> या <strong>student</strong> हो सकती है। Default password: <code className="bg-secondary px-1 py-0.5 rounded text-xs">Welcome@2026</code>
                  </p>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 mt-1" onClick={downloadSampleCsv}>
                    <Download className="h-3 w-3" /> Sample CSV Download करें
                  </Button>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">CSV file यहाँ drag करें या <span className="text-accent underline">browse</span> करें</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Maximum 100 users, 2MB file limit</p>
                  </label>
                </div>

                {/* Errors */}
                {csvErrors.length > 0 && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                    {csvErrors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {err}
                      </p>
                    ))}
                  </div>
                )}

                {/* Preview */}
                {csvRows.length > 0 && csvErrors.length === 0 && !importResults && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{csvRows.length} users ready to import</p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs bg-info/10 text-info">
                          {csvRows.filter(r => r.role === "alumni").length} Alumni
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-success/10 text-success">
                          {csvRows.filter(r => r.role === "student").length} Students
                        </Badge>
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-secondary sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-muted-foreground font-medium">#</th>
                            <th className="px-3 py-2 text-left text-muted-foreground font-medium">Name</th>
                            <th className="px-3 py-2 text-left text-muted-foreground font-medium">Email</th>
                            <th className="px-3 py-2 text-left text-muted-foreground font-medium">Role</th>
                            <th className="px-3 py-2 text-left text-muted-foreground font-medium">Dept</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.slice(0, 20).map((row, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-1.5 text-foreground">{row.full_name}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{row.email}</td>
                              <td className="px-3 py-1.5">
                                <Badge variant="outline" className={`text-[9px] ${roleBadgeColors[row.role] || ""}`}>{row.role}</Badge>
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground">{row.department || "-"}</td>
                            </tr>
                          ))}
                          {csvRows.length > 20 && (
                            <tr className="border-t border-border">
                              <td colSpan={5} className="px-3 py-2 text-center text-muted-foreground">
                                ...और {csvRows.length - 20} users
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {importing && (
                      <div className="space-y-2">
                        <Progress value={importProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">Importing users... कृपया wait करें</p>
                      </div>
                    )}

                    <Button className="w-full gap-2" onClick={handleBulkImport} disabled={importing}>
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {importing ? "Importing..." : `${csvRows.length} Users Import करें`}
                    </Button>
                  </div>
                )}

                {/* Results */}
                {importResults && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-success/10 text-success border-success/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {importResults.filter(r => r.success).length} Success
                      </Badge>
                      {importResults.filter(r => !r.success).length > 0 && (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                          <XCircle className="h-3 w-3 mr-1" /> {importResults.filter(r => !r.success).length} Failed
                        </Badge>
                      )}
                    </div>

                    {importResults.filter(r => !r.success).length > 0 && (
                      <div className="max-h-32 overflow-y-auto border border-border rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-destructive/5 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-destructive font-medium">Email</th>
                              <th className="px-3 py-2 text-left text-destructive font-medium">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResults.filter(r => !r.success).map((r, i) => (
                              <tr key={i} className="border-t border-border">
                                <td className="px-3 py-1.5 text-foreground">{r.email}</td>
                                <td className="px-3 py-1.5 text-destructive">{r.error}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <Button variant="outline" className="w-full" onClick={() => { resetBulkState(); }}>
                      नई File Upload करें
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Single User Add */}
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
