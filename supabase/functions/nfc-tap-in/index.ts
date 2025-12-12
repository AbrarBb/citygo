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

    const { card_id, bus_id, location, timestamp, offline_id } = await req.json();

    if (!card_id || !bus_id) {
      return new Response(
        JSON.stringify({ error: "card_id and bus_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[nfc-tap-in] Processing tap-in for card: ${card_id} on bus: ${bus_id}`);

    // Check for duplicate offline_id
    if (offline_id) {
      const { data: existing } = await supabase
        .from("nfc_logs")
        .select("id")
        .eq("offline_id", offline_id)
        .maybeSingle();

      if (existing) {
        console.log(`[nfc-tap-in] Duplicate offline_id: ${offline_id}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: "duplicate",
            tap_id: existing.id,
            message: "Event already processed" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Find user profile by card_id (case-insensitive)
    let profile = null;
    
    // Try exact match first
    const { data: exactProfile } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, card_balance, card_id")
      .eq("card_id", card_id)
      .maybeSingle();
    
    if (exactProfile) {
      profile = exactProfile;
    } else {
      // Try case-insensitive match
      const { data: ilikeProfile } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, card_balance, card_id")
        .ilike("card_id", card_id)
        .maybeSingle();
      
      if (ilikeProfile) {
        profile = ilikeProfile;
        console.log(`[nfc-tap-in] Found card via case-insensitive match: ${ilikeProfile.card_id}`);
      }
    }

    if (!profile) {
      console.log(`[nfc-tap-in] Card not found: ${card_id}`);
      return new Response(
        JSON.stringify({ error: "Card not registered", code: "CARD_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Use the actual card_id from the database for consistency
    const actualCardId = profile.card_id;

    // Check if user already has an active tap-in on this bus (no tap-out yet)
    const { data: activeTapIn } = await supabase
      .from("nfc_logs")
      .select("id")
      .eq("card_id", actualCardId)
      .eq("bus_id", bus_id)
      .is("tap_out_time", null)
      .maybeSingle();

    if (activeTapIn) {
      console.log(`[nfc-tap-in] Card already has active journey: ${actualCardId}`);
      return new Response(
        JSON.stringify({ 
          error: "Card already tapped in. Please tap out first.",
          code: "ALREADY_TAPPED_IN",
          active_tap_id: activeTapIn.id
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check minimum balance (e.g., ৳10 minimum)
    const minBalance = 10;
    if (Number(profile.card_balance) < minBalance) {
      console.log(`[nfc-tap-in] Insufficient balance for card: ${card_id}`);
      return new Response(
        JSON.stringify({ 
          error: "Insufficient balance. Please top up your card.",
          code: "INSUFFICIENT_BALANCE",
          current_balance: profile.card_balance,
          minimum_required: minBalance
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create tap-in record
    const tapInTime = timestamp ? new Date(timestamp) : new Date();
    
    const { data: newLog, error: insertError } = await supabase
      .from("nfc_logs")
      .insert({
        card_id: actualCardId, // Use the normalized card_id from database
        bus_id,
        user_id: profile.user_id,
        supervisor_id: supervisorId,
        tap_in_time: tapInTime.toISOString(),
        tap_in_location: location || null,
        offline_id: offline_id || null,
        synced: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error(`[nfc-tap-in] Insert error: ${insertError.message}`);
      return new Response(
        JSON.stringify({ error: "Failed to record tap-in" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[nfc-tap-in] Tap-in recorded successfully: ${newLog.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: "created",
        tap_id: newLog.id,
        user_name: profile.full_name,
        card_balance: profile.card_balance,
        tap_in_time: tapInTime.toISOString(),
        message: "Journey started. Have a safe trip!",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[nfc-tap-in] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
