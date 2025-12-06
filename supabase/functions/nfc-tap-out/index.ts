import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculate distance between two GPS coordinates (Haversine formula)
function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

    const { card_id, bus_id, location, timestamp, offline_id } = await req.json();

    if (!card_id || !bus_id) {
      return new Response(
        JSON.stringify({ error: "card_id and bus_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[nfc-tap-out] Processing tap-out for card: ${card_id} on bus: ${bus_id}`);

    // Check for duplicate offline_id
    if (offline_id) {
      const { data: existing } = await supabase
        .from("nfc_logs")
        .select("id, fare")
        .eq("offline_id", offline_id)
        .not("tap_out_time", "is", null)
        .maybeSingle();

      if (existing) {
        console.log(`[nfc-tap-out] Duplicate offline_id: ${offline_id}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: "duplicate",
            tap_id: existing.id,
            fare: existing.fare,
            message: "Event already processed" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Find active tap-in for this card on this bus
    const { data: activeTapIn, error: tapError } = await supabase
      .from("nfc_logs")
      .select("id, tap_in_time, tap_in_location, user_id")
      .eq("card_id", card_id)
      .eq("bus_id", bus_id)
      .is("tap_out_time", null)
      .order("tap_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tapError || !activeTapIn) {
      console.log(`[nfc-tap-out] No active journey found for card: ${card_id}`);
      return new Response(
        JSON.stringify({ 
          error: "No active journey found. Please tap in first.",
          code: "NO_ACTIVE_JOURNEY"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get route fare info
    const { data: bus } = await supabase
      .from("buses")
      .select("route_id, routes(base_fare, fare_per_km)")
      .eq("id", bus_id)
      .maybeSingle();

    const baseFare = (bus?.routes as any)?.base_fare || 20;
    const farePerKm = (bus?.routes as any)?.fare_per_km || 1.5;

    // Calculate distance and fare
    let distance = 0;
    const tapInLocation = activeTapIn.tap_in_location as { lat: number; lng: number } | null;
    
    if (tapInLocation && location && tapInLocation.lat && tapInLocation.lng && location.lat && location.lng) {
      distance = calculateDistance(
        tapInLocation.lat, tapInLocation.lng,
        location.lat, location.lng
      );
    } else {
      // Default distance if GPS not available
      distance = 2.5;
    }

    // Round to 2 decimal places
    distance = Math.round(distance * 100) / 100;
    
    // Calculate fare: base + (distance × rate)
    const fare = Math.round((baseFare + (distance * farePerKm)) * 100) / 100;
    
    // Calculate CO₂ saved (0.12 kg per km vs car)
    const co2Saved = Math.round(distance * 0.12 * 100) / 100;
    
    // Calculate points earned (10 points per km)
    const pointsEarned = Math.round(distance * 10);

    const tapOutTime = timestamp ? new Date(timestamp) : new Date();
    const tapInTime = new Date(activeTapIn.tap_in_time);
    const durationMs = tapOutTime.getTime() - tapInTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    // Update the NFC log with tap-out info
    const { error: updateError } = await supabase
      .from("nfc_logs")
      .update({
        tap_out_time: tapOutTime.toISOString(),
        tap_out_location: location || null,
        fare,
        distance,
        co2_saved: co2Saved,
      })
      .eq("id", activeTapIn.id);

    if (updateError) {
      console.error(`[nfc-tap-out] Update error: ${updateError.message}`);
      return new Response(
        JSON.stringify({ error: "Failed to record tap-out" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile and deduct fare
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("card_balance, points, total_co2_saved")
      .eq("user_id", activeTapIn.user_id)
      .single();

    if (!profileError && profile) {
      const newBalance = Math.max(0, Number(profile.card_balance) - fare);
      const newPoints = (profile.points || 0) + pointsEarned;
      const newCo2 = Number(profile.total_co2_saved || 0) + co2Saved;

      await supabase
        .from("profiles")
        .update({
          card_balance: newBalance,
          points: newPoints,
          total_co2_saved: newCo2,
        })
        .eq("user_id", activeTapIn.user_id);

      console.log(`[nfc-tap-out] Tap-out recorded. Fare: ৳${fare}, Distance: ${distance}km`);

      return new Response(
        JSON.stringify({
          success: true,
          status: "created",
          tap_id: activeTapIn.id,
          fare,
          distance_km: distance,
          co2_saved: co2Saved,
          points_earned: pointsEarned,
          new_balance: newBalance,
          journey_duration: `${durationMinutes} minutes`,
          message: `Journey complete. Fare: ৳${fare}. Thank you for riding green!`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "created",
        tap_id: activeTapIn.id,
        fare,
        distance_km: distance,
        co2_saved: co2Saved,
        points_earned: pointsEarned,
        journey_duration: `${durationMinutes} minutes`,
        message: `Journey complete. Fare: ৳${fare}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[nfc-tap-out] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
