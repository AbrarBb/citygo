import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supervisorId = userData.user.id;

    // Verify supervisor role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", supervisorId)
      .in("role", ["supervisor", "admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "User is not authorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      bus_id, 
      passenger_count = 1, 
      fare, 
      payment_method = "cash",
      ticket_type = "single",
      location,
      timestamp,
      offline_id 
    } = await req.json();

    if (!bus_id || !fare) {
      return new Response(
        JSON.stringify({ error: "bus_id and fare are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[manual-ticket] Creating ticket for bus: ${bus_id}, passengers: ${passenger_count}`);

    // Check for duplicate offline_id
    if (offline_id) {
      const { data: existing } = await supabase
        .from("manual_tickets")
        .select("id, fare")
        .eq("offline_id", offline_id)
        .maybeSingle();

      if (existing) {
        console.log(`[manual-ticket] Duplicate offline_id: ${offline_id}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: "duplicate",
            ticket_id: existing.id,
            total_fare: existing.fare,
            message: "Ticket already created" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verify bus exists
    const { data: bus, error: busError } = await supabase
      .from("buses")
      .select("id, bus_number")
      .eq("id", bus_id)
      .maybeSingle();

    if (busError || !bus) {
      return new Response(
        JSON.stringify({ error: "Bus not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const issuedAt = timestamp ? new Date(timestamp) : new Date();

    // Create manual ticket
    const { data: ticket, error: insertError } = await supabase
      .from("manual_tickets")
      .insert({
        bus_id,
        supervisor_id: supervisorId,
        passenger_count,
        fare,
        ticket_type,
        payment_method,
        location: location || null,
        issued_at: issuedAt.toISOString(),
        offline_id: offline_id || null,
        synced: true,
      })
      .select("id, fare, passenger_count")
      .single();

    if (insertError) {
      console.error(`[manual-ticket] Insert error: ${insertError.message}`);
      return new Response(
        JSON.stringify({ error: "Failed to create ticket" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[manual-ticket] Ticket created: ${ticket.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: "created",
        ticket_id: ticket.id,
        bus_number: bus.bus_number,
        passenger_count: ticket.passenger_count,
        total_fare: ticket.fare,
        payment_method,
        issued_at: issuedAt.toISOString(),
        message: `Ticket issued for ${passenger_count} passenger(s). Total: ৳${fare}`,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[manual-ticket] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
