import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Verify the user is authenticated and is a supervisor
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is supervisor or admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || !['supervisor', 'admin'].includes(roleData.role)) {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - supervisor or admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all registered cards from profiles table using service role
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('card_id, full_name, card_balance, created_at, updated_at')
      .not('card_id', 'is', null)
      .order('full_name', { ascending: true });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch registered cards' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get last used timestamps from nfc_logs
    const cardIds = profiles?.map(p => p.card_id) || [];
    
    let lastUsedMap: Record<string, string> = {};
    
    if (cardIds.length > 0) {
      const { data: nfcLogs } = await supabaseAdmin
        .from('nfc_logs')
        .select('card_id, tap_in_time, tap_out_time')
        .in('card_id', cardIds)
        .order('created_at', { ascending: false });

      // Build map of card_id to last used time
      if (nfcLogs) {
        for (const log of nfcLogs) {
          if (!lastUsedMap[log.card_id]) {
            const lastTime = log.tap_out_time || log.tap_in_time;
            if (lastTime) {
              lastUsedMap[log.card_id] = lastTime;
            }
          }
        }
      }
    }

    // Transform to expected format
    const cards = (profiles || []).map(profile => ({
      card_id: profile.card_id,
      passenger_name: profile.full_name,
      balance: profile.card_balance || 0,
      status: 'active',
      registered_at: profile.created_at,
      last_used: lastUsedMap[profile.card_id] || null
    }));

    console.log(`Returning ${cards.length} registered cards`);

    // Return in Option C format (with success flag)
    return new Response(
      JSON.stringify({
        success: true,
        cards: cards
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
