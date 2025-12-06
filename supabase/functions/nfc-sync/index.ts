import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculate distance between two GPS coordinates
function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface SyncEvent {
  type: "tap_in" | "tap_out" | "manual_ticket";
  offline_id: string;
  card_id?: string;
  bus_id: string;
  location?: { lat: number; lng: number; accuracy?: number };
  timestamp: string;
  passenger_count?: number;
  fare?: number;
  payment_method?: string;
  ticket_type?: string;
}

interface SyncResult {
  offline_id: string;
  status: "success" | "duplicate" | "error";
  message?: string;
  data?: any;
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

    const { events }: { events: SyncEvent[] } = await req.json();

    if (!events || !Array.isArray(events)) {
      return new Response(
        JSON.stringify({ error: "events array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit batch size
    const MAX_BATCH_SIZE = 100;
    if (events.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} events`,
          max_batch_size: MAX_BATCH_SIZE
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[nfc-sync] Processing ${events.length} events for supervisor: ${supervisorId}`);

    const results: SyncResult[] = [];

    for (const event of events) {
      try {
        if (!event.offline_id) {
          results.push({
            offline_id: event.offline_id || "unknown",
            status: "error",
            message: "offline_id is required",
          });
          continue;
        }

        if (event.type === "tap_in") {
          // Check for duplicate
          const { data: existing } = await supabase
            .from("nfc_logs")
            .select("id")
            .eq("offline_id", event.offline_id)
            .maybeSingle();

          if (existing) {
            results.push({
              offline_id: event.offline_id,
              status: "duplicate",
              message: "Event already processed",
              data: { tap_id: existing.id },
            });
            continue;
          }

          // Find user by card_id
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, full_name, card_balance")
            .eq("card_id", event.card_id)
            .maybeSingle();

          if (!profile) {
            results.push({
              offline_id: event.offline_id,
              status: "error",
              message: "Card not registered",
            });
            continue;
          }

          // Create tap-in
          const { data: newLog, error: insertError } = await supabase
            .from("nfc_logs")
            .insert({
              card_id: event.card_id,
              bus_id: event.bus_id,
              user_id: profile.user_id,
              supervisor_id: supervisorId,
              tap_in_time: event.timestamp,
              tap_in_location: event.location || null,
              offline_id: event.offline_id,
              synced: true,
            })
            .select("id")
            .single();

          if (insertError) {
            results.push({
              offline_id: event.offline_id,
              status: "error",
              message: insertError.message,
            });
          } else {
            results.push({
              offline_id: event.offline_id,
              status: "success",
              data: { tap_id: newLog.id, user_name: profile.full_name },
            });
          }

        } else if (event.type === "tap_out") {
          // Check for duplicate
          const { data: existing } = await supabase
            .from("nfc_logs")
            .select("id")
            .eq("offline_id", event.offline_id)
            .not("tap_out_time", "is", null)
            .maybeSingle();

          if (existing) {
            results.push({
              offline_id: event.offline_id,
              status: "duplicate",
              message: "Event already processed",
            });
            continue;
          }

          // Find active tap-in
          const { data: activeTapIn } = await supabase
            .from("nfc_logs")
            .select("id, tap_in_time, tap_in_location, user_id")
            .eq("card_id", event.card_id)
            .eq("bus_id", event.bus_id)
            .is("tap_out_time", null)
            .order("tap_in_time", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!activeTapIn) {
            results.push({
              offline_id: event.offline_id,
              status: "error",
              message: "No active journey found",
            });
            continue;
          }

          // Get route fare info
          const { data: bus } = await supabase
            .from("buses")
            .select("routes(base_fare, fare_per_km)")
            .eq("id", event.bus_id)
            .maybeSingle();

          const baseFare = (bus?.routes as any)?.base_fare || 20;
          const farePerKm = (bus?.routes as any)?.fare_per_km || 1.5;

          // Calculate distance
          let distance = 2.5;
          const tapInLoc = activeTapIn.tap_in_location as { lat: number; lng: number } | null;
          if (tapInLoc && event.location) {
            distance = calculateDistance(
              tapInLoc.lat, tapInLoc.lng,
              event.location.lat, event.location.lng
            );
          }
          distance = Math.round(distance * 100) / 100;

          const fare = Math.round((baseFare + (distance * farePerKm)) * 100) / 100;
          const co2Saved = Math.round(distance * 0.12 * 100) / 100;
          const pointsEarned = Math.round(distance * 10);

          // Update NFC log
          await supabase
            .from("nfc_logs")
            .update({
              tap_out_time: event.timestamp,
              tap_out_location: event.location || null,
              fare,
              distance,
              co2_saved: co2Saved,
            })
            .eq("id", activeTapIn.id);

          // Update user profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("card_balance, points, total_co2_saved")
            .eq("user_id", activeTapIn.user_id)
            .single();

          if (profile) {
            await supabase
              .from("profiles")
              .update({
                card_balance: Math.max(0, Number(profile.card_balance) - fare),
                points: (profile.points || 0) + pointsEarned,
                total_co2_saved: Number(profile.total_co2_saved || 0) + co2Saved,
              })
              .eq("user_id", activeTapIn.user_id);
          }

          results.push({
            offline_id: event.offline_id,
            status: "success",
            data: { tap_id: activeTapIn.id, fare, distance_km: distance },
          });

        } else if (event.type === "manual_ticket") {
          // Check for duplicate
          const { data: existing } = await supabase
            .from("manual_tickets")
            .select("id")
            .eq("offline_id", event.offline_id)
            .maybeSingle();

          if (existing) {
            results.push({
              offline_id: event.offline_id,
              status: "duplicate",
              message: "Ticket already created",
            });
            continue;
          }

          // Create manual ticket
          const { data: ticket, error: insertError } = await supabase
            .from("manual_tickets")
            .insert({
              bus_id: event.bus_id,
              supervisor_id: supervisorId,
              passenger_count: event.passenger_count || 1,
              fare: event.fare,
              ticket_type: event.ticket_type || "single",
              payment_method: event.payment_method || "cash",
              location: event.location || null,
              issued_at: event.timestamp,
              offline_id: event.offline_id,
              synced: true,
            })
            .select("id")
            .single();

          if (insertError) {
            results.push({
              offline_id: event.offline_id,
              status: "error",
              message: insertError.message,
            });
          } else {
            results.push({
              offline_id: event.offline_id,
              status: "success",
              data: { ticket_id: ticket.id },
            });
          }
        } else {
          results.push({
            offline_id: event.offline_id,
            status: "error",
            message: `Unknown event type: ${event.type}`,
          });
        }
      } catch (eventError) {
        console.error(`[nfc-sync] Error processing event ${event.offline_id}:`, eventError);
        results.push({
          offline_id: event.offline_id,
          status: "error",
          message: "Processing failed",
        });
      }
    }

    const successCount = results.filter(r => r.status === "success").length;
    const duplicateCount = results.filter(r => r.status === "duplicate").length;
    const errorCount = results.filter(r => r.status === "error").length;

    console.log(`[nfc-sync] Completed: ${successCount} success, ${duplicateCount} duplicates, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: events.length,
        summary: {
          success: successCount,
          duplicate: duplicateCount,
          error: errorCount,
        },
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[nfc-sync] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
