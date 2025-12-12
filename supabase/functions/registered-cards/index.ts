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

    // Check if requesting a single card (path parameter or query parameter)
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPathPart = pathParts[pathParts.length - 1];
    
    // Check for card_id in path (e.g., /registered-cards/RC-d4a290fc)
    const pathCardId = lastPathPart && lastPathPart.startsWith('RC-') ? lastPathPart : null;
    // Check for card_id in query params
    const queryCardId = url.searchParams.get('card_id') || url.searchParams.get('nfc_id');
    
    const requestedCardId = pathCardId || queryCardId;

    // If requesting a single card
    if (requestedCardId) {
      console.log(`Looking up single card: ${requestedCardId}`);
      
      // Normalize card ID (handle case sensitivity)
      const normalizedCardId = requestedCardId.toUpperCase().replace('RC-', 'RC-');
      
      // Try exact match first, then case-insensitive
      let profile = null;
      const { data: exactMatch } = await supabaseAdmin
        .from('profiles')
        .select('card_id, full_name, card_balance, created_at, updated_at, user_id')
        .eq('card_id', requestedCardId)
        .maybeSingle();
      
      if (exactMatch) {
        profile = exactMatch;
      } else {
        // Try case-insensitive match using ilike
        const { data: ilikeMatch } = await supabaseAdmin
          .from('profiles')
          .select('card_id, full_name, card_balance, created_at, updated_at, user_id')
          .ilike('card_id', requestedCardId)
          .maybeSingle();
        profile = ilikeMatch;
      }

      if (!profile) {
        console.log(`Card not found: ${requestedCardId}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Card not registered',
            message: 'Card not registered. Please register your card first.'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get last used time for this card
      const { data: lastLog } = await supabaseAdmin
        .from('nfc_logs')
        .select('tap_in_time, tap_out_time')
        .eq('card_id', profile.card_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastUsed = lastLog ? (lastLog.tap_out_time || lastLog.tap_in_time) : null;

      console.log(`Found card: ${profile.card_id}, passenger: ${profile.full_name}`);

      return new Response(
        JSON.stringify({
          success: true,
          card_id: profile.card_id,
          nfc_id: profile.card_id, // Alternative field name
          passenger_name: profile.full_name,
          balance: profile.card_balance || 0,
          status: 'active',
          registered_at: profile.created_at,
          last_used: lastUsed
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all registered cards
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
      nfc_id: profile.card_id, // Alternative field name
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
