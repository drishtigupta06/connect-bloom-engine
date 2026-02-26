import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Palette, Upload, Save, Loader2, Globe, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BrandingSettings {
  name: string;
  description: string;
  tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  white_label_enabled: boolean;
  custom_domain: string;
}

export default function InstitutionBranding() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BrandingSettings>({
    name: "", description: "", tagline: "", logo_url: null, favicon_url: null,
    primary_color: "#6366f1", secondary_color: "#8b5cf6", accent_color: "#f59e0b",
    white_label_enabled: false, custom_domain: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("institution_id").eq("user_id", user.id).single();
      if (profile?.institution_id) {
        setInstitutionId(profile.institution_id);
        const { data } = await supabase.from("institutions").select("*").eq("id", profile.institution_id).single();
        if (data) {
          setSettings({
            name: data.name || "",
            description: data.description || "",
            tagline: (data as any).tagline || "",
            logo_url: data.logo_url,
            favicon_url: (data as any).favicon_url,
            primary_color: (data as any).primary_color || "#6366f1",
            secondary_color: (data as any).secondary_color || "#8b5cf6",
            accent_color: (data as any).accent_color || "#f59e0b",
            white_label_enabled: (data as any).white_label_enabled || false,
            custom_domain: (data as any).custom_domain || "",
          });
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const uploadLogo = async (file: File) => {
    if (!institutionId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${institutionId}/logo.${ext}`;
    const { error } = await supabase.storage.from("institution-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("institution-assets").getPublicUrl(path);
    setSettings((s) => ({ ...s, logo_url: publicUrl }));
    setUploading(false);
    toast.success("Logo uploaded!");
  };

  const save = async () => {
    if (!institutionId) return;
    setSaving(true);
    const { error } = await supabase.from("institutions").update({
      name: settings.name,
      description: settings.description,
      logo_url: settings.logo_url,
    } as any).eq("id", institutionId);
    if (error) toast.error(error.message);
    else toast.success("Branding saved!");
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  if (!institutionId) return (
    <div className="text-center py-20">
      <Palette className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
      <h2 className="text-lg font-heading font-semibold text-foreground">No Institution Linked</h2>
      <p className="text-sm text-muted-foreground mt-1">Your profile must be linked to an institution to manage branding.</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Palette className="h-6 w-6 text-accent" /> Institution Branding
          </h1>
          <p className="text-muted-foreground text-sm">Customize your institution's appearance and white-label settings</p>
        </div>
        <Button variant="hero" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
      </div>

      {/* Logo upload */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6 shadow-card">
        <h2 className="font-heading font-semibold text-card-foreground mb-4">Logo & Identity</h2>
        <div className="flex items-center gap-6">
          <div
            onClick={() => fileRef.current?.click()}
            className="h-24 w-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent transition-colors overflow-hidden bg-secondary"
          >
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-full w-full object-contain" />
            ) : uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); }} />
          <div className="flex-1 space-y-3">
            <div><Label>Institution Name</Label><Input value={settings.name} onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))} /></div>
            <div><Label>Tagline</Label><Input value={settings.tagline} onChange={(e) => setSettings((s) => ({ ...s, tagline: e.target.value }))} placeholder="Building leaders for tomorrow" /></div>
          </div>
        </div>
        <div className="mt-4"><Label>Description</Label><Textarea value={settings.description} onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))} /></div>
      </motion.div>

      {/* Colors */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl p-6 shadow-card">
        <h2 className="font-heading font-semibold text-card-foreground mb-4">Brand Colors</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Primary Color", key: "primary_color" as const },
            { label: "Secondary Color", key: "secondary_color" as const },
            { label: "Accent Color", key: "accent_color" as const },
          ].map((c) => (
            <div key={c.key}>
              <Label>{c.label}</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={settings[c.key]}
                  onChange={(e) => setSettings((s) => ({ ...s, [c.key]: e.target.value }))}
                  className="h-10 w-10 rounded-lg border border-border cursor-pointer"
                />
                <Input value={settings[c.key]} onChange={(e) => setSettings((s) => ({ ...s, [c.key]: e.target.value }))} className="flex-1 font-mono text-sm" />
              </div>
            </div>
          ))}
        </div>
        {/* Preview */}
        <div className="mt-4 p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: settings.primary_color }} />
            <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: settings.secondary_color }} />
            <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: settings.accent_color }} />
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: settings.primary_color }}>
              Sample Button
            </button>
          </div>
        </div>
      </motion.div>

      {/* White Label */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-xl p-6 shadow-card">
        <h2 className="font-heading font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent" /> White-Label Settings
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">Enable White-Label Mode</p>
              <p className="text-xs text-muted-foreground">Remove AlumniOS branding and use your institution's branding</p>
            </div>
            <Switch checked={settings.white_label_enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, white_label_enabled: v }))} />
          </div>
          <div>
            <Label>Custom Domain</Label>
            <Input value={settings.custom_domain} onChange={(e) => setSettings((s) => ({ ...s, custom_domain: e.target.value }))} placeholder="alumni.youruniversity.edu" />
            <p className="text-xs text-muted-foreground mt-1">Point your CNAME record to platform.alumnios.app</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
