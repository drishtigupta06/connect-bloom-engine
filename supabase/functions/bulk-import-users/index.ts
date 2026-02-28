import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UserRow {
  email: string;
  full_name: string;
  role: string;
  password?: string;
  department?: string;
  batch?: string;
  company?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check caller roles
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles || []).map((r: any) => r.role);
    const isSuperAdmin = roles.includes("super_admin");
    const isInstitutionAdmin = roles.includes("institution_admin");

    if (!isSuperAdmin && !isInstitutionAdmin) {
      throw new Error("Only super admins and institution admins can bulk import users");
    }

    const { users, institution_id } = await req.json() as { users: UserRow[]; institution_id: string | null };

    if (!Array.isArray(users) || users.length === 0) {
      throw new Error("No users provided");
    }

    if (users.length > 100) {
      throw new Error("Maximum 100 users per batch");
    }

    const validRoles = ["alumni", "student"];
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const row of users) {
      try {
        // Validate
        if (!row.email || !row.full_name) {
          results.push({ email: row.email || "unknown", success: false, error: "Email and full_name are required" });
          continue;
        }

        const email = row.email.trim().toLowerCase();
        const fullName = row.full_name.trim();
        const role = validRoles.includes(row.role?.trim().toLowerCase()) ? row.role.trim().toLowerCase() : "alumni";
        const password = row.password?.trim() || "Welcome@2026";

        if (password.length < 6) {
          results.push({ email, success: false, error: "Password must be at least 6 characters" });
          continue;
        }

        // Institution admins can only create alumni/student
        if (isInstitutionAdmin && !isSuperAdmin && !validRoles.includes(role)) {
          results.push({ email, success: false, error: "Can only create alumni or student accounts" });
          continue;
        }

        // Create user
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

        if (createError) {
          results.push({ email, success: false, error: createError.message });
          continue;
        }

        if (!newUser.user) {
          results.push({ email, success: false, error: "Failed to create user" });
          continue;
        }

        const userId = newUser.user.id;

        // Update profile
        const profileUpdate: Record<string, any> = { full_name: fullName };
        if (institution_id) profileUpdate.institution_id = institution_id;
        if (row.department?.trim()) profileUpdate.department = row.department.trim();
        if (row.batch?.trim()) profileUpdate.batch = row.batch.trim();
        if (row.company?.trim()) profileUpdate.company = row.company.trim();

        await adminClient.from("profiles").update(profileUpdate).eq("user_id", userId);

        // Set role
        if (role !== "alumni") {
          await adminClient.from("user_roles").update({ role }).eq("user_id", userId);
        }

        results.push({ email, success: true });
      } catch (e: any) {
        results.push({ email: row.email || "unknown", success: false, error: e.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ success: true, total: users.length, created: successCount, failed: failCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
