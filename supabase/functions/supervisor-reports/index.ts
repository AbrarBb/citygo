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

    // Parse query params
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    // Get supervisor's assigned bus
    const { data: bus } = await supabase
      .from("buses")
      .select("id, bus_number")
      .eq("supervisor_id", supervisorId)
      .maybeSingle();

    if (!bus) {
      return new Response(
        JSON.stringify({ error: "No bus assigned to supervisor" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let startDate: string;
    let endDate: string;

    if (dateParam) {
      // Single day report
      startDate = dateParam;
      endDate = dateParam;
    } else if (fromParam && toParam) {
      // Date range report
      startDate = fromParam;
      endDate = toParam;
    } else {
      // Default to today
      startDate = new Date().toISOString().split("T")[0];
      endDate = startDate;
    }

    console.log(`[supervisor-reports] Generating report for ${startDate} to ${endDate}, bus: ${bus.id}`);

    // Fetch NFC logs for the period
    const { data: nfcLogs, error: nfcError } = await supabase
      .from("nfc_logs")
      .select("id, tap_in_time, tap_out_time, fare, distance, co2_saved")
      .eq("bus_id", bus.id)
      .gte("tap_in_time", `${startDate}T00:00:00Z`)
      .lte("tap_in_time", `${endDate}T23:59:59Z`);

    if (nfcError) {
      console.error(`[supervisor-reports] NFC logs error: ${nfcError.message}`);
    }

    // Fetch manual tickets for the period
    const { data: manualTickets, error: ticketError } = await supabase
      .from("manual_tickets")
      .select("id, fare, passenger_count, issued_at")
      .eq("bus_id", bus.id)
      .gte("issued_at", `${startDate}T00:00:00Z`)
      .lte("issued_at", `${endDate}T23:59:59Z`);

    if (ticketError) {
      console.error(`[supervisor-reports] Tickets error: ${ticketError.message}`);
    }

    // Calculate summary
    const tapIns = nfcLogs?.filter(l => l.tap_in_time).length || 0;
    const tapOuts = nfcLogs?.filter(l => l.tap_out_time).length || 0;
    const nfcFare = nfcLogs?.reduce((sum, l) => sum + (Number(l.fare) || 0), 0) || 0;
    const nfcDistance = nfcLogs?.reduce((sum, l) => sum + (Number(l.distance) || 0), 0) || 0;
    const nfcCo2 = nfcLogs?.reduce((sum, l) => sum + (Number(l.co2_saved) || 0), 0) || 0;

    const ticketCount = manualTickets?.length || 0;
    const ticketPassengers = manualTickets?.reduce((sum, t) => sum + (t.passenger_count || 1), 0) || 0;
    const ticketFare = manualTickets?.reduce((sum, t) => sum + (Number(t.fare) || 0), 0) || 0;

    const totalFare = nfcFare + ticketFare;
    const totalPassengers = tapIns + ticketPassengers;

    // Generate hourly breakdown for single day reports
    let hourlyBreakdown: any[] = [];
    if (startDate === endDate) {
      const hourlyData: Record<string, { passengers: number; fare: number }> = {};
      
      // Initialize hours
      for (let h = 6; h <= 22; h++) {
        const hourStr = `${h.toString().padStart(2, "0")}:00`;
        hourlyData[hourStr] = { passengers: 0, fare: 0 };
      }

      // Count NFC tap-ins by hour
      nfcLogs?.forEach(log => {
        if (log.tap_in_time) {
          const hour = new Date(log.tap_in_time).getHours();
          const hourStr = `${hour.toString().padStart(2, "0")}:00`;
          if (hourlyData[hourStr]) {
            hourlyData[hourStr].passengers += 1;
            hourlyData[hourStr].fare += Number(log.fare) || 0;
          }
        }
      });

      // Count manual tickets by hour
      manualTickets?.forEach(ticket => {
        if (ticket.issued_at) {
          const hour = new Date(ticket.issued_at).getHours();
          const hourStr = `${hour.toString().padStart(2, "0")}:00`;
          if (hourlyData[hourStr]) {
            hourlyData[hourStr].passengers += ticket.passenger_count || 1;
            hourlyData[hourStr].fare += Number(ticket.fare) || 0;
          }
        }
      });

      hourlyBreakdown = Object.entries(hourlyData)
        .map(([hour, data]) => ({
          hour,
          passengers: data.passengers,
          fare: Math.round(data.fare * 100) / 100,
        }))
        .filter(h => h.passengers > 0 || h.fare > 0);
    }

    const report = {
      success: true,
      report_date: startDate === endDate ? startDate : `${startDate} to ${endDate}`,
      bus: {
        id: bus.id,
        bus_number: bus.bus_number,
      },
      summary: {
        total_tap_ins: tapIns,
        total_tap_outs: tapOuts,
        manual_tickets: ticketCount,
        total_passengers: totalPassengers,
        total_fare_collected: Math.round(totalFare * 100) / 100,
        total_distance_km: Math.round(nfcDistance * 100) / 100,
        total_co2_saved: Math.round(nfcCo2 * 100) / 100,
      },
      breakdown: {
        nfc: {
          tap_ins: tapIns,
          tap_outs: tapOuts,
          fare: Math.round(nfcFare * 100) / 100,
          distance_km: Math.round(nfcDistance * 100) / 100,
        },
        manual: {
          tickets: ticketCount,
          passengers: ticketPassengers,
          fare: Math.round(ticketFare * 100) / 100,
        },
      },
      hourly_breakdown: hourlyBreakdown.length > 0 ? hourlyBreakdown : undefined,
    };

    console.log(`[supervisor-reports] Report generated: ${totalPassengers} passengers, ৳${totalFare}`);

    return new Response(
      JSON.stringify(report),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[supervisor-reports] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
