import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify supervisor role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'supervisor') {
      return new Response(JSON.stringify({ error: 'Supervisor access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse query params
    const url = new URL(req.url);
    const busId = url.searchParams.get('bus_id');
    const date = url.searchParams.get('date');

    console.log(`Fetching bookings for supervisor ${user.id}, bus_id: ${busId}, date: ${date}`);

    // Get supervisor's assigned bus
    const { data: assignedBus } = await supabaseClient
      .from('buses')
      .select('id, bus_number, capacity')
      .eq('supervisor_id', user.id)
      .single();

    if (!assignedBus) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No bus assigned to supervisor'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If bus_id provided, verify it matches assigned bus
    if (busId && busId !== assignedBus.id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Bus not assigned to supervisor'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch bookings - filter by valid statuses only (no join to avoid FK issues)
    let query = supabaseClient
      .from('bookings')
      .select(`
        id,
        bus_id,
        seat_no,
        booking_status,
        booking_date,
        travel_date,
        payment_method,
        payment_status,
        fare,
        user_id,
        drop_stop
      `)
      .eq('bus_id', assignedBus.id)
      .in('booking_status', ['confirmed', 'booked', 'occupied'])
      .order('seat_no', { ascending: true });

    // Only filter by travel_date if explicitly provided by app
    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte('travel_date', startOfDay).lte('travel_date', endOfDay);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }

    console.log(`Found ${bookings?.length || 0} bookings for bus ${assignedBus.bus_number}`);

    // Fetch profiles separately for all user_ids
    const userIds = [...new Set((bookings || []).map(b => b.user_id).filter(Boolean))];
    let profilesMap: Record<string, { full_name: string; card_id: string | null }> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('user_id, full_name, card_id')
        .in('user_id', userIds);
      
      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => {
          acc[p.user_id] = { full_name: p.full_name, card_id: p.card_id };
          return acc;
        }, {} as Record<string, { full_name: string; card_id: string | null }>);
      }
    }

    // Calculate stats - only count valid seat numbers (1-40)
    const totalSeats = assignedBus.capacity || 40;
    const validBookings = (bookings || []).filter(b => 
      b.seat_no !== null && b.seat_no >= 1 && b.seat_no <= totalSeats
    );
    const bookedSeats = validBookings.length;
    const availableSeats = totalSeats - bookedSeats;

    console.log(`Valid bookings with seats 1-${totalSeats}: ${bookedSeats}`);

    // Transform to expected format - only include valid seat numbers
    const formattedBookings = validBookings.map(booking => {
      const profile = profilesMap[booking.user_id] || { full_name: 'Unknown', card_id: null };
      return {
        id: booking.id,
        bus_id: booking.bus_id,
        seat_number: booking.seat_no,
        passenger_name: profile.full_name,
        card_id: profile.card_id,
        status: booking.booking_status || 'confirmed',
        booked_at: booking.booking_date,
        travel_date: booking.travel_date,
        booking_type: booking.payment_method === 'rapid_card' ? 'rapid_card' : 'online',
        fare: booking.fare,
        payment_status: booking.payment_status,
        drop_stop: booking.drop_stop,
      };
    });

    return new Response(JSON.stringify({
      success: true,
      bus_id: assignedBus.id,
      bus_number: assignedBus.bus_number,
      total_seats: totalSeats,
      available_seats: availableSeats,
      booked_seats: bookedSeats,
      bookings: formattedBookings,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error in supervisor-bookings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
