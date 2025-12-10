import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify JWT and admin role
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const method = req.method

    console.log(`Admin API: action=${action}, method=${method}, user=${user.id}`)

    // GET actions
    if (method === 'GET') {
      switch (action) {
        case 'passengers': {
          const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) throw error

          // Get travel history count for each user
          const enrichedProfiles = await Promise.all(profiles.map(async (profile) => {
            const { count: tripCount } = await supabaseClient
              .from('nfc_logs')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.user_id)
              .not('tap_out_time', 'is', null)

            return {
              ...profile,
              trip_count: tripCount || 0
            }
          }))

          return new Response(JSON.stringify({ success: true, passengers: enrichedProfiles }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'buses': {
          const { data: buses, error } = await supabaseClient
            .from('buses')
            .select(`
              *,
              routes:route_id (name, stops, distance)
            `)
            .order('created_at', { ascending: false })

          if (error) throw error

          // Get supervisor and driver names
          const enrichedBuses = await Promise.all(buses.map(async (bus) => {
            let supervisorName = null
            let driverName = null

            if (bus.supervisor_id) {
              const { data: supervisor } = await supabaseClient
                .from('profiles')
                .select('full_name')
                .eq('user_id', bus.supervisor_id)
                .single()
              supervisorName = supervisor?.full_name
            }

            if (bus.driver_id) {
              const { data: driver } = await supabaseClient
                .from('profiles')
                .select('full_name')
                .eq('user_id', bus.driver_id)
                .single()
              driverName = driver?.full_name
            }

            return {
              ...bus,
              supervisor_name: supervisorName,
              driver_name: driverName
            }
          }))

          return new Response(JSON.stringify({ success: true, buses: enrichedBuses }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'routes': {
          const { data: routes, error } = await supabaseClient
            .from('routes')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) throw error

          return new Response(JSON.stringify({ success: true, routes }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'nfc-logs': {
          const from = url.searchParams.get('from')
          const to = url.searchParams.get('to')
          const busId = url.searchParams.get('bus_id')

          let query = supabaseClient
            .from('nfc_logs')
            .select(`
              *,
              buses:bus_id (bus_number)
            `)
            .order('tap_in_time', { ascending: false })
            .limit(500)

          if (from) query = query.gte('tap_in_time', from)
          if (to) query = query.lte('tap_in_time', to)
          if (busId) query = query.eq('bus_id', busId)

          const { data: logs, error } = await query

          if (error) throw error

          return new Response(JSON.stringify({ success: true, nfc_logs: logs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'manual-tickets': {
          const from = url.searchParams.get('from')
          const to = url.searchParams.get('to')
          const busId = url.searchParams.get('bus_id')

          let query = supabaseClient
            .from('manual_tickets')
            .select(`
              *,
              buses:bus_id (bus_number)
            `)
            .order('issued_at', { ascending: false })
            .limit(500)

          if (from) query = query.gte('issued_at', from)
          if (to) query = query.lte('issued_at', to)
          if (busId) query = query.eq('bus_id', busId)

          const { data: tickets, error } = await query

          if (error) throw error

          // Get supervisor names
          const enrichedTickets = await Promise.all(tickets.map(async (ticket) => {
            const { data: supervisor } = await supabaseClient
              .from('profiles')
              .select('full_name')
              .eq('user_id', ticket.supervisor_id)
              .single()

            return {
              ...ticket,
              supervisor_name: supervisor?.full_name
            }
          }))

          return new Response(JSON.stringify({ success: true, manual_tickets: enrichedTickets }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'reports': {
          const from = url.searchParams.get('from')
          const to = url.searchParams.get('to')

          let query = supabaseClient
            .from('supervisor_reports')
            .select(`
              *,
              buses:bus_id (bus_number)
            `)
            .order('report_date', { ascending: false })
            .limit(100)

          if (from) query = query.gte('report_date', from)
          if (to) query = query.lte('report_date', to)

          const { data: reports, error } = await query

          if (error) throw error

          // Get supervisor names
          const enrichedReports = await Promise.all(reports.map(async (report) => {
            const { data: supervisor } = await supabaseClient
              .from('profiles')
              .select('full_name')
              .eq('user_id', report.supervisor_id)
              .single()

            return {
              ...report,
              supervisor_name: supervisor?.full_name
            }
          }))

          return new Response(JSON.stringify({ success: true, reports: enrichedReports }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'analytics': {
          // Get aggregate statistics
          const today = new Date().toISOString().split('T')[0]
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

          const [
            { count: totalPassengers },
            { count: activeBuses },
            { data: totalCO2Data },
            { data: totalRevenueData },
            { count: totalTrips }
          ] = await Promise.all([
            supabaseClient.from('profiles').select('*', { count: 'exact', head: true }),
            supabaseClient.from('buses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabaseClient.from('profiles').select('total_co2_saved'),
            supabaseClient.from('nfc_logs').select('fare').gte('tap_in_time', thirtyDaysAgo),
            supabaseClient.from('nfc_logs').select('*', { count: 'exact', head: true }).not('tap_out_time', 'is', null)
          ])

          const totalCO2Saved = totalCO2Data?.reduce((sum, p) => sum + (p.total_co2_saved || 0), 0) || 0
          const totalRevenue = totalRevenueData?.reduce((sum, l) => sum + (l.fare || 0), 0) || 0

          return new Response(JSON.stringify({
            success: true,
            analytics: {
              total_passengers: totalPassengers || 0,
              active_buses: activeBuses || 0,
              total_co2_saved_kg: totalCO2Saved,
              total_revenue_30d: totalRevenue,
              total_trips: totalTrips || 0
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'supervisors': {
          const { data: supervisors, error } = await supabaseClient
            .from('user_roles')
            .select('user_id')
            .eq('role', 'supervisor')

          if (error) throw error

          const supervisorProfiles = await Promise.all(supervisors.map(async (s) => {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('*')
              .eq('user_id', s.user_id)
              .single()

            const { data: bus } = await supabaseClient
              .from('buses')
              .select('id, bus_number, status')
              .eq('supervisor_id', s.user_id)
              .maybeSingle()

            return {
              ...profile,
              assigned_bus: bus
            }
          }))

          return new Response(JSON.stringify({ success: true, supervisors: supervisorProfiles }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        default:
          return new Response(JSON.stringify({ error: 'Unknown action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
      }
    }

    // POST actions
    if (method === 'POST') {
      const body = await req.json()

      switch (action) {
        case 'create-route': {
          const { name, stops, distance, base_fare, fare_per_km, start_time, end_time } = body

          if (!name || !stops || !distance) {
            return new Response(JSON.stringify({ error: 'Missing required fields: name, stops, distance' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          const { data: route, error } = await supabaseClient
            .from('routes')
            .insert({
              name,
              stops,
              distance,
              base_fare: base_fare || 20,
              fare_per_km: fare_per_km || 1.5,
              start_time,
              end_time,
              active: true
            })
            .select()
            .single()

          if (error) throw error

          return new Response(JSON.stringify({ success: true, route }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'update-route': {
          const { id, ...updates } = body

          if (!id) {
            return new Response(JSON.stringify({ error: 'Missing route id' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          const { data: route, error } = await supabaseClient
            .from('routes')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

          if (error) throw error

          return new Response(JSON.stringify({ success: true, route }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'assign-supervisor': {
          const { bus_id, supervisor_id } = body

          if (!bus_id) {
            return new Response(JSON.stringify({ error: 'Missing bus_id' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          const { data: bus, error } = await supabaseClient
            .from('buses')
            .update({ supervisor_id: supervisor_id || null })
            .eq('id', bus_id)
            .select()
            .single()

          if (error) throw error

          return new Response(JSON.stringify({ success: true, bus }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'update-balance': {
          const { user_id, amount, operation } = body

          if (!user_id || amount === undefined) {
            return new Response(JSON.stringify({ error: 'Missing user_id or amount' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          // Get current balance
          const { data: profile, error: fetchError } = await supabaseClient
            .from('profiles')
            .select('card_balance')
            .eq('user_id', user_id)
            .single()

          if (fetchError) throw fetchError

          const currentBalance = profile?.card_balance || 0
          let newBalance: number

          if (operation === 'set') {
            newBalance = amount
          } else if (operation === 'deduct') {
            newBalance = Math.max(0, currentBalance - amount)
          } else {
            // Default: add
            newBalance = currentBalance + amount
          }

          const { data: updatedProfile, error } = await supabaseClient
            .from('profiles')
            .update({ card_balance: newBalance })
            .eq('user_id', user_id)
            .select()
            .single()

          if (error) throw error

          // Log the transaction
          await supabaseClient.from('transactions').insert({
            user_id,
            amount: operation === 'deduct' ? -amount : amount,
            transaction_type: 'admin_adjustment',
            payment_method: 'admin',
            status: 'completed',
            description: `Admin balance ${operation || 'add'}: ${amount}`
          })

          return new Response(JSON.stringify({ 
            success: true, 
            profile: updatedProfile,
            previous_balance: currentBalance,
            new_balance: newBalance
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        case 'update-bus': {
          const { id, ...updates } = body

          if (!id) {
            return new Response(JSON.stringify({ error: 'Missing bus id' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          const { data: bus, error } = await supabaseClient
            .from('buses')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

          if (error) throw error

          return new Response(JSON.stringify({ success: true, bus }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        default:
          return new Response(JSON.stringify({ error: 'Unknown action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Admin API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
