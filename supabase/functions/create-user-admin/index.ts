import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the calling user
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
      throw new Error("Only super admins and institution admins can create users");
    }

    const { email, password, full_name, role, institution_id } = await req.json();

    if (!email || !password || !full_name) throw new Error("Email, password, and full name are required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");

    const validRoles = ["super_admin", "institution_admin", "alumni", "student", "moderator"];
    if (!validRoles.includes(role)) throw new Error("Invalid role");

    // Institution admins can only create alumni and student roles
    if (isInstitutionAdmin && !isSuperAdmin) {
      if (!["alumni", "student"].includes(role)) {
        throw new Error("Institution admins can only create alumni and student accounts");
      }
    }

    // Create the user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error("Failed to create user");

    const userId = newUser.user.id;

    // Update profile with institution_id if provided
    const profileUpdate: any = { full_name };
    if (institution_id) {
      profileUpdate.institution_id = institution_id;
    }
    await adminClient.from("profiles").update(profileUpdate).eq("user_id", userId);

    // Set role (the trigger creates a default "alumni" role, so update it)
    if (role !== "alumni") {
      await adminClient.from("user_roles").update({ role }).eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email, role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
