import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password } = await req.json();

    if (!email || !password) {
      console.log("[supervisor-auth] Missing email or password");
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[supervisor-auth] Attempting login for: ${email}`);

    // Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.log(`[supervisor-auth] Auth failed: ${authError?.message}`);
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    console.log(`[supervisor-auth] User authenticated: ${userId}`);

    // Check if user has supervisor role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "supervisor")
      .maybeSingle();

    if (roleError || !roleData) {
      console.log(`[supervisor-auth] User is not a supervisor: ${userId}`);
      return new Response(
        JSON.stringify({ error: "User is not authorized as supervisor" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, card_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.log(`[supervisor-auth] Profile fetch error: ${profileError.message}`);
    }

    // Get assigned bus for this supervisor
    const { data: bus, error: busError } = await supabase
      .from("buses")
      .select(`
        id,
        bus_number,
        status,
        capacity,
        current_location,
        route_id,
        routes (
          id,
          name,
          stops,
          distance,
          base_fare,
          fare_per_km
        )
      `)
      .eq("supervisor_id", userId)
      .maybeSingle();

    if (busError) {
      console.log(`[supervisor-auth] Bus fetch error: ${busError.message}`);
    }

    console.log(`[supervisor-auth] Login successful for supervisor: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at,
        user: {
          id: userId,
          email: authData.user.email,
          full_name: profile?.full_name || "Supervisor",
        },
        role: "supervisor",
        assigned_bus: bus ? {
          id: bus.id,
          bus_number: bus.bus_number,
          status: bus.status,
          capacity: bus.capacity,
          current_location: bus.current_location,
          route: bus.routes ? {
            id: (bus.routes as any).id,
            name: (bus.routes as any).name,
            stops: (bus.routes as any).stops,
            distance: (bus.routes as any).distance,
            base_fare: (bus.routes as any).base_fare,
            fare_per_km: (bus.routes as any).fare_per_km,
          } : null,
        } : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[supervisor-auth] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
