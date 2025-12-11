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

    // Get JWT from header
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
      console.log("[supervisor-bus] Invalid token");
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    console.log(`[supervisor-bus] Fetching bus for supervisor: ${userId}`);

    // Verify supervisor role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "supervisor")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "User is not authorized as supervisor" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get assigned bus with route and driver details
    const { data: bus, error: busError } = await supabase
      .from("buses")
      .select(`
        id,
        bus_number,
        status,
        capacity,
        current_location,
        route_id,
        driver_id,
        routes (
          id,
          name,
          stops,
          distance,
          base_fare,
          fare_per_km,
          start_time,
          end_time
        )
      `)
      .eq("supervisor_id", userId)
      .maybeSingle();

    if (busError) {
      console.log(`[supervisor-bus] Error fetching bus: ${busError.message}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch bus data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bus) {
      console.log(`[supervisor-bus] No bus assigned to supervisor: ${userId}`);
      return new Response(
        JSON.stringify({ 
          error: "No bus assigned to this supervisor",
          is_active: false,
          message: "Waiting for driver to assign you to a bus"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get driver profile if assigned
    let driverInfo = null;
    if (bus.driver_id) {
      const { data: driver } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", bus.driver_id)
        .maybeSingle();
      
      if (driver) {
        driverInfo = {
          id: bus.driver_id,
          name: driver.full_name,
          phone: driver.phone
        };
      }
    }

    // Get current active trip for this bus
    const { data: currentTrip } = await supabase
      .from("trips")
      .select("id, start_time, passengers_count, status, distance_km")
      .eq("bus_id", bus.id)
      .eq("status", "active")
      .maybeSingle();

    // Get today's stats
    const today = new Date().toISOString().split("T")[0];
    const { data: todayLogs } = await supabase
      .from("nfc_logs")
      .select("id, fare, tap_in_time, tap_out_time")
      .eq("bus_id", bus.id)
      .gte("created_at", `${today}T00:00:00Z`);

    const { data: todayTickets } = await supabase
      .from("manual_tickets")
      .select("id, fare, passenger_count")
      .eq("bus_id", bus.id)
      .gte("created_at", `${today}T00:00:00Z`);

    const todayStats = {
      tap_ins: todayLogs?.filter(l => l.tap_in_time).length || 0,
      tap_outs: todayLogs?.filter(l => l.tap_out_time).length || 0,
      manual_tickets: todayTickets?.length || 0,
      total_passengers: (todayLogs?.filter(l => l.tap_in_time).length || 0) + 
                        (todayTickets?.reduce((sum, t) => sum + (t.passenger_count || 1), 0) || 0),
      total_fare: (todayLogs?.reduce((sum, l) => sum + (Number(l.fare) || 0), 0) || 0) +
                  (todayTickets?.reduce((sum, t) => sum + (Number(t.fare) || 0), 0) || 0),
    };

    const isActive = bus.status === "active" && currentTrip !== null;
    console.log(`[supervisor-bus] Successfully fetched bus: ${bus.bus_number}, active: ${isActive}`);

    // Transform stops to ensure proper format with id, name, latitude, longitude, order
    // Skip stops with missing/invalid coordinates instead of defaulting to 0
    let formattedStops: any[] = [];
    if (bus.routes && (bus.routes as any).stops) {
      const rawStops = (bus.routes as any).stops;
      if (Array.isArray(rawStops)) {
        formattedStops = rawStops
          .map((stop: any, index: number) => {
            const lat = stop.latitude || stop.lat;
            const lng = stop.longitude || stop.lng;
            
            // Skip stops without valid coordinates
            if (!lat || !lng || lat === 0 || lng === 0) {
              console.log(`[supervisor-bus] Skipping stop with invalid coordinates: ${stop.name || `Stop ${index + 1}`}`);
              return null;
            }
            
            return {
              id: stop.id || `stop-${index + 1}`,
              name: stop.name || `Stop ${index + 1}`,
              latitude: lat,
              longitude: lng,
              order: stop.order ?? index + 1,
            };
          })
          .filter((stop: any) => stop !== null)
          .sort((a: any, b: any) => a.order - b.order);
        
        console.log(`[supervisor-bus] Formatted ${formattedStops.length} valid stops out of ${rawStops.length} total`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_active: isActive,
        bus: {
          id: bus.id,
          bus_number: bus.bus_number,
          status: bus.status,
          capacity: bus.capacity,
          current_location: bus.current_location,
        },
        driver: driverInfo,
        route: bus.routes ? {
          id: (bus.routes as any).id,
          name: (bus.routes as any).name,
          stops: formattedStops,
          distance: (bus.routes as any).distance,
          base_fare: (bus.routes as any).base_fare,
          fare_per_km: (bus.routes as any).fare_per_km,
          start_time: (bus.routes as any).start_time,
          end_time: (bus.routes as any).end_time,
        } : null,
        current_trip: currentTrip,
        today_stats: todayStats,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[supervisor-bus] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
