# CityGo - Complete Technical Documentation

> **Version**: 1.0.0  
> **Last Updated**: December 2024  
> **Platform**: React + Supabase (Lovable Cloud)

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Technical Execution of Each Feature](#3-technical-execution-of-each-feature)
4. [NFC Backend Logic](#4-nfc-backend-logic)
5. [Bookings Logic](#5-bookings-logic)
6. [Reports Logic](#6-reports-logic)
7. [Environment & Infrastructure](#7-environment--infrastructure)
8. [Database Schema Reference](#8-database-schema-reference)

---

## 1. System Architecture

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   React Web App │  │ Flutter Mobile  │  │    External Integrations    │  │
│  │   (Vite + TS)   │  │  (Supervisor)   │  │  (Google Maps, Air Quality) │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                         │                   │
└───────────┼────────────────────┼─────────────────────────┼───────────────────┘
            │                    │                         │
            ▼                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │    Auth     │  │  Database   │  │   Storage   │  │   Edge Functions    │ │
│  │  (JWT/RLS)  │  │ (PostgreSQL)│  │   (Files)   │  │    (Deno Runtime)   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                    │            │
│         ▼                ▼                ▼                    ▼            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Row Level Security (RLS)                       │   │
│  │              Policies enforce role-based data access                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Realtime Engine                               │   │
│  │         WebSocket subscriptions for live bus tracking                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Interaction Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW DIAGRAM                               │
└──────────────────────────────────────────────────────────────────────────┘

User Action → React Component → Supabase Client → Auth Check → RLS Policy
                                      │
                                      ▼
                              ┌───────────────┐
                              │ Direct Query  │ (Simple CRUD)
                              │      OR       │
                              │ Edge Function │ (Complex Logic)
                              └───────┬───────┘
                                      │
                                      ▼
                              PostgreSQL Database
                                      │
                                      ▼
                              Triggers/Functions
                                      │
                                      ▼
                              Response → Client
```

### 1.3 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI Framework |
| Styling | Tailwind CSS + shadcn/ui | Component Library |
| State | TanStack Query | Server State Management |
| Routing | React Router v6 | Client-side Navigation |
| Maps | Google Maps JS API | Live Tracking & Route Visualization |
| Backend | Supabase (PostgreSQL) | Database & Auth |
| Functions | Deno Edge Functions | Serverless Backend Logic |
| Realtime | Supabase Realtime | WebSocket Subscriptions |

### 1.4 Supabase Components Used

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │    AUTH     │   │   DATABASE  │   │   EDGE FUNCTIONS    │   │
│  ├─────────────┤   ├─────────────┤   ├─────────────────────┤   │
│  │ • Email/Pwd │   │ • 11 Tables │   │ • supervisor-auth   │   │
│  │ • JWT Token │   │ • RLS Rules │   │ • supervisor-bus    │   │
│  │ • Session   │   │ • Triggers  │   │ • nfc-tap-in        │   │
│  │ • Auto-     │   │ • Functions │   │ • nfc-tap-out       │   │
│  │   refresh   │   │ • Realtime  │   │ • nfc-sync          │   │
│  └─────────────┘   └─────────────┘   │ • manual-ticket     │   │
│                                      │ • supervisor-reports│   │
│                                      │ • supervisor-bookings│  │
│                                      │ • registered-cards  │   │
│                                      │ • admin-api         │   │
│                                      └─────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. User Roles & Permissions

### 2.1 Role Definition

CityGo implements a custom role system using a PostgreSQL enum and separate `user_roles` table:

```sql
-- Role enum definition
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'driver', 'supervisor');

-- Role storage table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);
```

### 2.2 Role Capabilities Matrix

| Feature | Admin | Supervisor | Driver | User |
|---------|-------|------------|--------|------|
| View Dashboard | ✅ Admin | ✅ Supervisor | ✅ Driver | ✅ User |
| Manage Routes | ✅ Create/Edit/Delete | ❌ | ❌ | ❌ View Only |
| Manage Buses | ✅ Full Control | ❌ View Assigned | ✅ Update Location | ❌ View Only |
| NFC Operations | ❌ | ✅ Tap-in/Tap-out | ❌ | ❌ |
| Issue Tickets | ❌ | ✅ Manual Tickets | ❌ | ❌ |
| View Reports | ✅ All Reports | ✅ Own Reports | ❌ | ❌ |
| Manage Users | ✅ Full Control | ❌ | ❌ | ✅ Own Profile |
| Book Seats | ❌ | ❌ | ❌ | ✅ |
| Track Buses | ✅ | ✅ Assigned | ✅ Own | ✅ |
| Redeem Rewards | ❌ | ❌ | ❌ | ✅ |

### 2.3 Security Definer Function

To prevent RLS recursion when checking roles:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 2.4 RLS Policies by Table

#### profiles Table
```sql
-- Anyone can view profiles (for passenger names in bookings)
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile (via trigger)
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### buses Table
```sql
-- Public read access for tracking
CREATE POLICY "Anyone can view buses" ON buses FOR SELECT USING (true);

-- Admin full control
CREATE POLICY "Admins can manage all buses" ON buses FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Drivers can update their assigned bus location
CREATE POLICY "Drivers can update assigned buses" ON buses FOR UPDATE USING (auth.uid() = driver_id);
```

#### nfc_logs Table
```sql
-- Supervisors/Admins can create NFC logs
CREATE POLICY "Supervisors can create nfc logs" ON nfc_logs 
FOR INSERT WITH CHECK (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- Supervisors can update their own logs
CREATE POLICY "Supervisors can update nfc logs" ON nfc_logs 
FOR UPDATE USING (auth.uid() = supervisor_id OR has_role(auth.uid(), 'admin'));

-- Users can view their own journey logs
CREATE POLICY "Users can view own nfc logs" ON nfc_logs 
FOR SELECT USING (auth.uid() = user_id);
```

### 2.5 Role Assignment Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                         │
└──────────────────────────────────────────────────────────────────┘

1. User signs up via Auth page
         │
         ▼
2. Supabase Auth creates user in auth.users
         │
         ▼
3. Trigger: handle_new_user() fires
         │
         ├──► Creates profile in public.profiles
         │    (full_name, card_id auto-generated)
         │
         └──► Creates role in public.user_roles
              (role from metadata OR default 'user')
         │
         ▼
4. User redirected to role-specific dashboard
```

**Trigger Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, full_name, card_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'RC-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)
  );
  
  -- Assign role from metadata, default to 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'::app_role)
  );
  
  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 3. Technical Execution of Each Feature

### 3.1 Authentication System

#### A. Frontend Logic

**Component**: `src/pages/Auth.tsx`

```typescript
// State management
const [isLogin, setIsLogin] = useState(true);
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [fullName, setFullName] = useState('');
const [selectedRole, setSelectedRole] = useState<string>('user');

// Sign Up Handler
const handleSignUp = async () => {
  const { error } = await signUp(email, password, fullName, selectedRole);
  if (error) {
    // Handle specific errors
    if (error.message.includes('already registered')) {
      toast.error('Email already registered');
    }
  }
};

// Sign In Handler
const handleSignIn = async () => {
  const { error } = await signIn(email, password);
  if (!error) {
    navigate('/dashboard');
  }
};
```

**Context**: `src/contexts/AuthContext.tsx`

```typescript
// Auth state listener setup
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Defer role fetch to prevent deadlock
        setTimeout(() => fetchUserRole(session.user.id), 0);
      }
    }
  );

  // Check existing session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, []);
```

#### B. Backend Logic

**Sign Up Flow:**
1. `supabase.auth.signUp()` creates user in `auth.users`
2. Trigger `handle_new_user()` fires automatically
3. Profile created in `profiles` table
4. Role assigned in `user_roles` table
5. JWT token returned to client

**Sign In Flow:**
1. `supabase.auth.signInWithPassword()` validates credentials
2. JWT token generated with user claims
3. Session stored in localStorage
4. Auto-refresh enabled for token renewal

#### C. Database Behavior

**Tables Involved:**
- `auth.users` (Supabase managed)
- `public.profiles`
- `public.user_roles`

**Constraints:**
- Email must be unique in `auth.users`
- `user_id` in profiles references `auth.users(id)` with CASCADE delete
- Role must be valid enum value

---

### 3.2 Real-time Bus Tracking

#### A. Frontend Logic

**Component**: `src/components/dashboard/LiveBusMap.tsx`

```typescript
// Initialize Google Maps
useEffect(() => {
  const loader = new Loader({
    apiKey: 'AIzaSyANU6LkHDgyHNjIIYfQV3YsnQ9Do_5uMGE',
    version: 'weekly',
    libraries: ['places', 'geometry']
  });

  loader.load().then((google) => {
    map = new google.maps.Map(mapRef.current, {
      center: { lat: 23.8103, lng: 90.4125 }, // Dhaka
      zoom: 13
    });
  });
}, []);

// Realtime subscription for bus updates
useEffect(() => {
  const channel = supabase
    .channel('buses-location')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'buses'
    }, (payload) => {
      updateBusMarker(payload.new);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

**Hook**: `src/hooks/useLiveBuses.ts`

```typescript
export const useLiveBuses = () => {
  const [buses, setBuses] = useState<Bus[]>([]);

  useEffect(() => {
    // Initial fetch
    const fetchBuses = async () => {
      const { data } = await supabase
        .from('buses')
        .select('*, routes(name, stops)')
        .eq('status', 'active');
      setBuses(data || []);
    };

    fetchBuses();

    // Realtime subscription
    const channel = supabase
      .channel('live-buses')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'buses'
      }, fetchBuses)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return { buses };
};
```

#### B. Backend Logic

**Driver Location Update:**
```typescript
// Driver dashboard sends location every 5 seconds
const updateLocation = async (lat: number, lng: number) => {
  await supabase
    .from('buses')
    .update({
      current_location: { lat, lng, timestamp: new Date().toISOString() },
      updated_at: new Date().toISOString()
    })
    .eq('driver_id', userId);
};
```

**RLS allows:**
- Drivers to update only their assigned bus
- Anyone to read bus locations (public tracking)

#### C. Database Behavior

**buses Table Schema:**
```sql
CREATE TABLE public.buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_number TEXT NOT NULL,
    route_id UUID REFERENCES routes(id),
    driver_id UUID,
    supervisor_id UUID,
    capacity INTEGER DEFAULT 40,
    current_location JSONB, -- {lat, lng, timestamp}
    status TEXT DEFAULT 'idle', -- 'idle', 'active', 'maintenance'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_buses_updated_at
    BEFORE UPDATE ON buses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Realtime enabled:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.buses;
```

---

### 3.3 Route Management (Admin)

#### A. Frontend Logic

**Component**: `src/components/admin/RouteMapEditor.tsx`

```typescript
// Click handler for adding stops
const handleMapClick = (event: google.maps.MapMouseEvent) => {
  const newStop = {
    id: crypto.randomUUID(),
    name: `Stop ${stops.length + 1}`,
    lat: event.latLng.lat(),
    lng: event.latLng.lng(),
    order: stops.length
  };
  
  setStops([...stops, newStop]);
  
  // Add marker to map
  const marker = new google.maps.Marker({
    position: { lat: newStop.lat, lng: newStop.lng },
    map: map,
    draggable: true,
    label: String(stops.length + 1)
  });
  
  // Update polyline
  updatePolyline();
};

// Save route to database
const saveRoute = async () => {
  const { error } = await supabase
    .from('routes')
    .upsert({
      id: routeId,
      name: routeName,
      stops: stops, // JSONB array
      distance: calculateTotalDistance(),
      base_fare: baseFare,
      fare_per_km: farePerKm,
      start_time: startTime,
      end_time: endTime,
      active: true
    });
};
```

#### B. Backend Logic

**Distance Calculation (Frontend):**
```typescript
const calculateTotalDistance = () => {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversineDistance(
      stops[i].lat, stops[i].lng,
      stops[i + 1].lat, stops[i + 1].lng
    );
  }
  return total; // in kilometers
};

// Haversine formula
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
```

#### C. Database Behavior

**routes Table:**
```sql
CREATE TABLE public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stops JSONB NOT NULL, -- Array of {id, name, lat, lng, order}
    distance NUMERIC NOT NULL,
    base_fare NUMERIC DEFAULT 20.00,
    fare_per_km NUMERIC DEFAULT 1.50,
    start_time TIME,
    end_time TIME,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**stops JSONB Structure:**
```json
[
  {"id": "uuid-1", "name": "Motijheel", "lat": 23.7285, "lng": 90.4195, "order": 0},
  {"id": "uuid-2", "name": "Gulistan", "lat": 23.7245, "lng": 90.4135, "order": 1},
  {"id": "uuid-3", "name": "Shahbag", "lat": 23.7392, "lng": 90.3962, "order": 2}
]
```

---

### 3.4 Supervisor Dashboard

#### A. Frontend Logic

**Component**: `src/components/dashboard/SupervisorDashboard.tsx`

```typescript
// Fetch assigned bus
useEffect(() => {
  const fetchAssignedBus = async () => {
    const { data, error } = await supabase.functions.invoke('supervisor-bus');
    if (data?.success) {
      setAssignedBus(data.bus);
      setRouteStops(data.route_stops);
    }
  };
  fetchAssignedBus();
}, []);

// NFC Scanner component integration
<NFCScanner
  busId={assignedBus?.id}
  onTapIn={handleTapIn}
  onTapOut={handleTapOut}
/>
```

**Component**: `src/components/dashboard/NFCScanner.tsx`

```typescript
const handleNFCScan = async (cardId: string) => {
  // Check if card has active journey
  const { data: activeJourney } = await supabase
    .from('nfc_logs')
    .select('*')
    .eq('card_id', cardId)
    .eq('bus_id', busId)
    .is('tap_out_time', null)
    .single();

  if (activeJourney) {
    // Process tap-out
    await supabase.functions.invoke('nfc-tap-out', {
      body: {
        card_id: cardId,
        bus_id: busId,
        location: currentLocation,
        timestamp: new Date().toISOString()
      }
    });
  } else {
    // Process tap-in
    await supabase.functions.invoke('nfc-tap-in', {
      body: {
        card_id: cardId,
        bus_id: busId,
        location: currentLocation,
        timestamp: new Date().toISOString()
      }
    });
  }
};
```

#### B. Backend Logic

**Edge Function**: `supervisor-bus`

```typescript
// Verify supervisor role
const { data: roleData } = await supabaseClient
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (roleData?.role !== 'supervisor' && roleData?.role !== 'admin') {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
}

// Fetch assigned bus with route
const { data: bus } = await supabaseClient
  .from('buses')
  .select(`
    id, bus_number, capacity, status, current_location,
    routes (id, name, stops, distance, base_fare, fare_per_km)
  `)
  .eq('supervisor_id', user.id)
  .eq('status', 'active')
  .single();
```

#### C. Database Behavior

**Supervisor Assignment:**
- Stored in `buses.supervisor_id`
- One supervisor per active bus
- Cleared when route ends

---

### 3.5 User Dashboard

#### A. Frontend Logic

**Component**: `src/components/dashboard/UserDashboard.tsx`

```typescript
// Fetch user profile with stats
const { data: profile } = useQuery({
  queryKey: ['profile', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  }
});

// Fetch trip history
const { data: tripHistory } = useQuery({
  queryKey: ['trips', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('nfc_logs')
      .select('*, buses(bus_number, routes(name))')
      .eq('user_id', userId)
      .not('tap_out_time', 'is', null)
      .order('tap_in_time', { ascending: false })
      .limit(10);
    return data;
  }
});
```

**Displayed Metrics:**
- Card Balance: `profile.card_balance`
- Total Points: `profile.points`
- CO₂ Saved: `profile.total_co2_saved`
- Recent Trips: From `nfc_logs`

#### B. Backend Logic

All data fetched via direct Supabase queries with RLS enforcement.

**RLS ensures:**
- Users see only their own profile
- Users see only their own trip history
- Users see only their own transactions

---

### 3.6 Rewards System

#### A. Frontend Logic

**Component**: `src/pages/Rewards.tsx`

```typescript
// Fetch available rewards
const { data: rewards } = useQuery({
  queryKey: ['rewards'],
  queryFn: async () => {
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('active', true)
      .order('points_required', { ascending: true });
    return data;
  }
});

// Redeem reward
const redeemReward = async (rewardId: string, pointsRequired: number) => {
  if (userPoints < pointsRequired) {
    toast.error('Insufficient points');
    return;
  }

  // Create redemption record
  const { error: redemptionError } = await supabase
    .from('reward_redemptions')
    .insert({
      user_id: userId,
      reward_id: rewardId,
      points_spent: pointsRequired,
      status: 'pending'
    });

  // Deduct points from profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ points: userPoints - pointsRequired })
    .eq('user_id', userId);

  if (!redemptionError && !profileError) {
    toast.success('Reward redeemed successfully!');
  }
};
```

#### B. Backend Logic

**Rewards are managed by admin:**
```sql
CREATE POLICY "Admins can manage rewards" ON rewards 
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active rewards" ON rewards 
FOR SELECT USING (active = true);
```

#### C. Database Behavior

**rewards Table:**
```sql
CREATE TABLE public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    category TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**reward_redemptions Table:**
```sql
CREATE TABLE public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reward_id UUID REFERENCES rewards(id) NOT NULL,
    points_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'fulfilled'
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. NFC Backend Logic

### 4.1 System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NFC TAP PROCESSING FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

Supervisor scans card
        │
        ▼
┌───────────────────┐
│ Check active      │──► Active journey found ──► PROCESS TAP-OUT
│ journey for card  │
└───────────────────┘
        │
        ▼ No active journey
        │
┌───────────────────┐
│ PROCESS TAP-IN   │
└───────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            TAP-IN FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

1. Validate card_id exists in profiles
2. Check card_balance >= minimum_fare
3. Create nfc_logs entry:
   - tap_in_time = NOW
   - tap_in_location = {lat, lng}
   - tap_out_time = NULL (marks active journey)
4. Return success response

┌─────────────────────────────────────────────────────────────────────────┐
│                           TAP-OUT FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

1. Find active tap-in record
2. Calculate distance (Haversine formula)
3. Calculate fare = base_fare + (distance × fare_per_km)
4. Calculate CO₂ saved = distance × 0.15 kg
5. Calculate points = distance × 10
6. Update nfc_logs:
   - tap_out_time = NOW
   - tap_out_location = {lat, lng}
   - fare, distance, co2_saved
7. Update user profile:
   - card_balance -= fare
   - points += earned_points
   - total_co2_saved += co2_saved
8. Return journey summary
```

### 4.2 Tap-In Edge Function

**File**: `supabase/functions/nfc-tap-in/index.ts`

```typescript
serve(async (req) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Verify authorization
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Verify supervisor/admin role
  const { data: roleData } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleData?.role !== 'supervisor' && roleData?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Parse request
  const { card_id, bus_id, location, timestamp, offline_id } = await req.json();

  // Check for duplicate offline_id (idempotency)
  if (offline_id) {
    const { data: existing } = await supabaseClient
      .from('nfc_logs')
      .select('id')
      .eq('offline_id', offline_id)
      .single();
    
    if (existing) {
      return new Response(JSON.stringify({
        success: true,
        duplicate: true,
        message: 'Event already processed'
      }));
    }
  }

  // Find user by card_id
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('user_id, full_name, card_balance')
    .eq('card_id', card_id)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({
      success: false,
      error: 'CARD_NOT_FOUND',
      message: 'Card not registered'
    }), { status: 404 });
  }

  // Check for existing active journey
  const { data: activeJourney } = await supabaseClient
    .from('nfc_logs')
    .select('id')
    .eq('card_id', card_id)
    .eq('bus_id', bus_id)
    .is('tap_out_time', null)
    .single();

  if (activeJourney) {
    return new Response(JSON.stringify({
      success: false,
      error: 'ACTIVE_JOURNEY_EXISTS',
      message: 'Passenger already tapped in on this bus'
    }), { status: 400 });
  }

  // Check minimum balance
  const MINIMUM_BALANCE = 20; // Minimum fare
  if (profile.card_balance < MINIMUM_BALANCE) {
    return new Response(JSON.stringify({
      success: false,
      error: 'INSUFFICIENT_BALANCE',
      message: `Balance too low. Minimum required: ৳${MINIMUM_BALANCE}`,
      current_balance: profile.card_balance
    }), { status: 400 });
  }

  // Create tap-in record
  const { data: nfcLog, error: insertError } = await supabaseClient
    .from('nfc_logs')
    .insert({
      card_id,
      bus_id,
      user_id: profile.user_id,
      supervisor_id: user.id,
      tap_in_time: timestamp || new Date().toISOString(),
      tap_in_location: location,
      offline_id,
      synced: true
    })
    .select()
    .single();

  if (insertError) {
    return new Response(JSON.stringify({
      success: false,
      error: 'INSERT_FAILED',
      message: insertError.message
    }), { status: 500 });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Tap-in recorded',
    data: {
      log_id: nfcLog.id,
      passenger_name: profile.full_name,
      card_balance: profile.card_balance,
      tap_in_time: nfcLog.tap_in_time
    }
  }));
});
```

### 4.3 Tap-Out Edge Function

**File**: `supabase/functions/nfc-tap-out/index.ts`

```typescript
// Distance calculation using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

serve(async (req) => {
  // ... auth verification same as tap-in ...

  const { card_id, bus_id, location, timestamp, offline_id } = await req.json();

  // Find active tap-in
  const { data: activeJourney, error: journeyError } = await supabaseClient
    .from('nfc_logs')
    .select('*')
    .eq('card_id', card_id)
    .eq('bus_id', bus_id)
    .is('tap_out_time', null)
    .order('tap_in_time', { ascending: false })
    .limit(1)
    .single();

  if (journeyError || !activeJourney) {
    return new Response(JSON.stringify({
      success: false,
      error: 'NO_ACTIVE_JOURNEY',
      message: 'No active tap-in found for this card'
    }), { status: 400 });
  }

  // Get route fare info
  const { data: bus } = await supabaseClient
    .from('buses')
    .select('routes(base_fare, fare_per_km)')
    .eq('id', bus_id)
    .single();

  const baseFare = bus?.routes?.base_fare || 20;
  const farePerKm = bus?.routes?.fare_per_km || 1.5;

  // Calculate journey metrics
  const tapInLocation = activeJourney.tap_in_location;
  const distance = calculateDistance(
    tapInLocation.lat, tapInLocation.lng,
    location.lat, location.lng
  );

  const fare = Math.max(baseFare, baseFare + (distance * farePerKm));
  const co2Saved = distance * 0.15; // kg per km
  const pointsEarned = Math.floor(distance * 10);

  // Update nfc_logs with tap-out
  const { error: updateLogError } = await supabaseClient
    .from('nfc_logs')
    .update({
      tap_out_time: timestamp || new Date().toISOString(),
      tap_out_location: location,
      distance: Math.round(distance * 100) / 100,
      fare: Math.round(fare * 100) / 100,
      co2_saved: Math.round(co2Saved * 100) / 100
    })
    .eq('id', activeJourney.id);

  // Get current profile
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('card_balance, points, total_co2_saved')
    .eq('user_id', activeJourney.user_id)
    .single();

  // Update user profile
  const { error: updateProfileError } = await supabaseClient
    .from('profiles')
    .update({
      card_balance: (profile.card_balance || 0) - fare,
      points: (profile.points || 0) + pointsEarned,
      total_co2_saved: (profile.total_co2_saved || 0) + co2Saved
    })
    .eq('user_id', activeJourney.user_id);

  return new Response(JSON.stringify({
    success: true,
    message: 'Tap-out recorded',
    data: {
      distance_km: Math.round(distance * 100) / 100,
      fare: Math.round(fare * 100) / 100,
      co2_saved: Math.round(co2Saved * 100) / 100,
      points_earned: pointsEarned,
      new_balance: Math.round((profile.card_balance - fare) * 100) / 100
    }
  }));
});
```

### 4.4 Offline Sync Logic

**File**: `supabase/functions/nfc-sync/index.ts`

```typescript
interface SyncEvent {
  type: 'tap_in' | 'tap_out' | 'manual_ticket';
  offline_id: string;
  card_id?: string;
  bus_id: string;
  location: { lat: number; lng: number };
  timestamp: string;
  // Additional fields for manual_ticket
  passenger_count?: number;
  fare?: number;
  payment_method?: string;
}

interface SyncResult {
  offline_id: string;
  status: 'success' | 'duplicate' | 'error';
  message?: string;
  data?: any;
}

serve(async (req) => {
  // ... auth verification ...

  const { events }: { events: SyncEvent[] } = await req.json();

  // Validate batch size
  if (events.length > 100) {
    return new Response(JSON.stringify({
      success: false,
      error: 'BATCH_TOO_LARGE',
      message: 'Maximum 100 events per sync request'
    }), { status: 400 });
  }

  const results: SyncResult[] = [];

  for (const event of events) {
    try {
      // Check for duplicate offline_id
      let tableName: string;
      switch (event.type) {
        case 'tap_in':
        case 'tap_out':
          tableName = 'nfc_logs';
          break;
        case 'manual_ticket':
          tableName = 'manual_tickets';
          break;
        default:
          results.push({
            offline_id: event.offline_id,
            status: 'error',
            message: 'Unknown event type'
          });
          continue;
      }

      const { data: existing } = await supabaseClient
        .from(tableName)
        .select('id')
        .eq('offline_id', event.offline_id)
        .single();

      if (existing) {
        results.push({
          offline_id: event.offline_id,
          status: 'duplicate',
          message: 'Already processed'
        });
        continue;
      }

      // Process event based on type
      if (event.type === 'tap_in') {
        // ... tap-in logic (same as nfc-tap-in) ...
        results.push({ offline_id: event.offline_id, status: 'success' });
      } else if (event.type === 'tap_out') {
        // ... tap-out logic (same as nfc-tap-out) ...
        results.push({ offline_id: event.offline_id, status: 'success' });
      } else if (event.type === 'manual_ticket') {
        // Insert manual ticket
        await supabaseClient.from('manual_tickets').insert({
          bus_id: event.bus_id,
          supervisor_id: user.id,
          passenger_count: event.passenger_count || 1,
          fare: event.fare,
          payment_method: event.payment_method || 'cash',
          location: event.location,
          issued_at: event.timestamp,
          offline_id: event.offline_id,
          synced: true
        });
        results.push({ offline_id: event.offline_id, status: 'success' });
      }
    } catch (error) {
      results.push({
        offline_id: event.offline_id,
        status: 'error',
        message: error.message
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    total: events.length,
    processed: results.filter(r => r.status === 'success').length,
    duplicates: results.filter(r => r.status === 'duplicate').length,
    errors: results.filter(r => r.status === 'error').length,
    results
  }));
});
```

### 4.5 Fare Calculation Formula

```
┌─────────────────────────────────────────────────────────────────┐
│                    FARE CALCULATION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   fare = MAX(base_fare, base_fare + (distance × fare_per_km))  │
│                                                                 │
│   Where:                                                        │
│   • base_fare = Route's minimum fare (default: ৳20)            │
│   • fare_per_km = Rate per kilometer (default: ৳1.50)          │
│   • distance = Haversine distance between tap-in and tap-out   │
│                                                                 │
│   Example:                                                      │
│   • base_fare = ৳20                                            │
│   • fare_per_km = ৳1.50                                        │
│   • distance = 8 km                                             │
│   • fare = MAX(20, 20 + (8 × 1.50)) = MAX(20, 32) = ৳32        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.6 CO₂ Calculation

```
┌─────────────────────────────────────────────────────────────────┐
│                    CO₂ SAVINGS CALCULATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   co2_saved (kg) = distance (km) × 0.15                        │
│                                                                 │
│   Based on:                                                     │
│   • Average car emits ~0.21 kg CO₂ per km                      │
│   • Bus emits ~0.06 kg CO₂ per passenger-km                    │
│   • Net savings = 0.21 - 0.06 = 0.15 kg per km                 │
│                                                                 │
│   User Interface Display:                                       │
│   • Trees equivalent = co2_saved / 21 (kg CO₂ per tree/year)   │
│   • Car km avoided = co2_saved / 0.21                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Bookings Logic

### 5.1 Booking Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BOOKING FLOW                                      │
└─────────────────────────────────────────────────────────────────────────┘

User selects route
        │
        ▼
User selects bus & date
        │
        ▼
┌───────────────────┐
│ Fetch available   │
│ seats for bus     │
└───────────────────┘
        │
        ▼
Display seat map (40 seats grid)
        │
        ▼
User selects seat
        │
        ▼
┌───────────────────┐
│ Validate seat     │
│ still available   │
└───────────────────┘
        │
        ▼
Calculate fare
        │
        ▼
User selects payment method
        │
        ├──► Online Payment ──► Payment Gateway ──► Callback
        │
        └──► Rapid Card ──► Check balance ──► Deduct
        │
        ▼
Create booking record
        │
        ▼
Booking confirmed
```

### 5.2 Seat Map Generation

**Component**: `src/pages/Book.tsx`

```typescript
// Generate seat grid (10 rows × 4 seats)
const generateSeatMap = (bookedSeats: number[]) => {
  const seats = [];
  for (let row = 1; row <= 10; row++) {
    const rowSeats = [];
    for (let col = 1; col <= 4; col++) {
      const seatNo = (row - 1) * 4 + col;
      rowSeats.push({
        number: seatNo,
        status: bookedSeats.includes(seatNo) ? 'booked' : 'available',
        isAisle: col === 2 // Aisle after seat 2
      });
    }
    seats.push(rowSeats);
  }
  return seats;
};

// Fetch booked seats
const fetchBookedSeats = async (busId: string, travelDate: string) => {
  const { data } = await supabase
    .from('bookings')
    .select('seat_no')
    .eq('bus_id', busId)
    .eq('travel_date', travelDate)
    .in('booking_status', ['confirmed', 'booked']);
  
  return data?.map(b => b.seat_no) || [];
};
```

### 5.3 Seat Availability Check

```typescript
// Real-time availability check before booking
const checkSeatAvailability = async (busId: string, seatNo: number, travelDate: string) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('bus_id', busId)
    .eq('seat_no', seatNo)
    .eq('travel_date', travelDate)
    .in('booking_status', ['confirmed', 'booked'])
    .single();

  return !data; // true if available
};
```

### 5.4 Booking Creation

```typescript
const createBooking = async (bookingData: {
  busId: string;
  routeId: string;
  seatNo: number;
  travelDate: string;
  fare: number;
  paymentMethod: string;
}) => {
  // Double-check availability
  const isAvailable = await checkSeatAvailability(
    bookingData.busId,
    bookingData.seatNo,
    bookingData.travelDate
  );

  if (!isAvailable) {
    throw new Error('Seat no longer available');
  }

  // Calculate CO₂ savings for the journey
  const { data: route } = await supabase
    .from('routes')
    .select('distance')
    .eq('id', bookingData.routeId)
    .single();

  const co2Saved = (route?.distance || 0) * 0.15;

  // Create booking
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: userId,
      bus_id: bookingData.busId,
      route_id: bookingData.routeId,
      seat_no: bookingData.seatNo,
      travel_date: bookingData.travelDate,
      fare: bookingData.fare,
      co2_saved: co2Saved,
      payment_method: bookingData.paymentMethod,
      payment_status: bookingData.paymentMethod === 'rapid_card' ? 'completed' : 'pending',
      booking_status: 'confirmed'
    })
    .select()
    .single();

  return data;
};
```

### 5.5 Database Schema

```sql
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    bus_id UUID NOT NULL REFERENCES buses(id),
    route_id UUID NOT NULL REFERENCES routes(id),
    seat_no INTEGER,
    fare NUMERIC NOT NULL,
    co2_saved NUMERIC DEFAULT 0,
    booking_date TIMESTAMPTZ DEFAULT now(),
    travel_date TIMESTAMPTZ,
    payment_method TEXT, -- 'rapid_card', 'online', 'cash'
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    booking_status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast seat availability lookup
CREATE INDEX idx_bookings_bus_date_seat 
ON bookings(bus_id, travel_date, seat_no);
```

### 5.6 Supervisor Bookings Endpoint

**File**: `supabase/functions/supervisor-bookings/index.ts`

```typescript
// Returns bookings for supervisor's assigned bus
serve(async (req) => {
  // ... auth verification ...

  // Get assigned bus
  const { data: assignedBus } = await supabaseClient
    .from('buses')
    .select('id, bus_number, capacity')
    .eq('supervisor_id', user.id)
    .eq('status', 'active')
    .single();

  // Fetch today's bookings
  const today = new Date().toISOString().split('T')[0];
  const { data: bookings } = await supabaseClient
    .from('bookings')
    .select('id, seat_no, booking_status, booking_date, travel_date, payment_method, fare, user_id')
    .eq('bus_id', assignedBus.id)
    .gte('travel_date', today)
    .in('booking_status', ['confirmed', 'booked']);

  // Fetch profiles separately
  const userIds = [...new Set(bookings.map(b => b.user_id))];
  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('user_id, full_name, card_id')
    .in('user_id', userIds);

  // Format response
  const formattedBookings = bookings.map(booking => {
    const profile = profiles.find(p => p.user_id === booking.user_id);
    return {
      id: booking.id,
      seat_number: booking.seat_no,
      passenger_name: profile?.full_name || 'Unknown',
      card_id: profile?.card_id,
      status: booking.booking_status,
      booked_at: booking.booking_date,
      travel_date: booking.travel_date,
      fare: booking.fare
    };
  });

  return new Response(JSON.stringify({
    success: true,
    bus_id: assignedBus.id,
    bus_number: assignedBus.bus_number,
    total_seats: assignedBus.capacity,
    booked_seats: formattedBookings.length,
    available_seats: assignedBus.capacity - formattedBookings.length,
    bookings: formattedBookings
  }));
});
```

---

## 6. Reports Logic

### 6.1 Daily Report Generation

**Edge Function**: `supervisor-reports`

```typescript
serve(async (req) => {
  const { bus_id, report_date } = await req.json();

  // Aggregate NFC logs
  const { data: nfcStats } = await supabaseClient
    .from('nfc_logs')
    .select('fare, distance, co2_saved')
    .eq('bus_id', bus_id)
    .gte('tap_in_time', `${report_date}T00:00:00`)
    .lt('tap_in_time', `${report_date}T23:59:59`)
    .not('tap_out_time', 'is', null);

  // Aggregate manual tickets
  const { data: ticketStats } = await supabaseClient
    .from('manual_tickets')
    .select('fare, passenger_count')
    .eq('bus_id', bus_id)
    .gte('issued_at', `${report_date}T00:00:00`)
    .lt('issued_at', `${report_date}T23:59:59`);

  // Calculate totals
  const report = {
    total_tap_ins: nfcStats?.length || 0,
    total_tap_outs: nfcStats?.filter(n => n.fare).length || 0,
    total_manual_tickets: ticketStats?.length || 0,
    total_fare_collected: 
      (nfcStats?.reduce((sum, n) => sum + (n.fare || 0), 0) || 0) +
      (ticketStats?.reduce((sum, t) => sum + (t.fare || 0), 0) || 0),
    total_distance_km: nfcStats?.reduce((sum, n) => sum + (n.distance || 0), 0) || 0,
    total_co2_saved: nfcStats?.reduce((sum, n) => sum + (n.co2_saved || 0), 0) || 0,
    passenger_count: 
      (nfcStats?.length || 0) + 
      (ticketStats?.reduce((sum, t) => sum + (t.passenger_count || 0), 0) || 0)
  };

  // Upsert report
  await supabaseClient
    .from('supervisor_reports')
    .upsert({
      supervisor_id: user.id,
      bus_id,
      report_date,
      ...report
    }, { onConflict: 'supervisor_id,bus_id,report_date' });

  return new Response(JSON.stringify({ success: true, report }));
});
```

### 6.2 Admin Analytics Queries

**Component**: `src/components/admin/AdminAnalytics.tsx`

```typescript
// Daily revenue aggregation
const fetchDailyRevenue = async (startDate: string, endDate: string) => {
  const { data } = await supabase
    .from('supervisor_reports')
    .select('report_date, total_fare_collected')
    .gte('report_date', startDate)
    .lte('report_date', endDate)
    .order('report_date');

  // Group by date
  const grouped = data?.reduce((acc, row) => {
    acc[row.report_date] = (acc[row.report_date] || 0) + row.total_fare_collected;
    return acc;
  }, {});

  return Object.entries(grouped || {}).map(([date, revenue]) => ({
    date,
    revenue
  }));
};

// Top routes by passengers
const fetchTopRoutes = async () => {
  const { data } = await supabase
    .from('nfc_logs')
    .select('buses!inner(routes!inner(name))')
    .not('tap_out_time', 'is', null)
    .gte('tap_in_time', thirtyDaysAgo);

  // Count by route
  const routeCounts = data?.reduce((acc, log) => {
    const routeName = log.buses?.routes?.name;
    if (routeName) {
      acc[routeName] = (acc[routeName] || 0) + 1;
    }
    return acc;
  }, {});

  return Object.entries(routeCounts || {})
    .map(([name, count]) => ({ name, passengers: count }))
    .sort((a, b) => b.passengers - a.passengers)
    .slice(0, 5);
};
```

### 6.3 Report Database Schema

```sql
CREATE TABLE public.supervisor_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_id UUID NOT NULL,
    bus_id UUID NOT NULL REFERENCES buses(id),
    report_date DATE NOT NULL,
    total_tap_ins INTEGER DEFAULT 0,
    total_tap_outs INTEGER DEFAULT 0,
    total_manual_tickets INTEGER DEFAULT 0,
    total_fare_collected NUMERIC DEFAULT 0,
    total_distance_km NUMERIC DEFAULT 0,
    total_co2_saved NUMERIC DEFAULT 0,
    passenger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(supervisor_id, bus_id, report_date)
);

-- Index for date range queries
CREATE INDEX idx_reports_date ON supervisor_reports(report_date);
```

---

## 7. Environment & Infrastructure

### 7.1 API Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/supervisor-auth` | POST | No | Supervisor login, returns JWT |
| `/supervisor-bus` | GET | JWT | Get assigned bus & route |
| `/nfc-tap-in` | POST | JWT | Record NFC tap-in |
| `/nfc-tap-out` | POST | JWT | Record NFC tap-out |
| `/nfc-sync` | POST | JWT | Batch sync offline events |
| `/manual-ticket` | POST | JWT | Issue manual ticket |
| `/supervisor-reports` | GET/POST | JWT | Get/create daily reports |
| `/supervisor-bookings` | GET | JWT | Get bus bookings |
| `/registered-cards` | GET | JWT | Get all NFC cards |
| `/admin-api` | * | JWT (Admin) | Admin operations |

### 7.2 Supabase Configuration

**File**: `supabase/config.toml`

```toml
project_id = "ziouzevpbnigvwcacpqw"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[auth]
enabled = true
site_url = "https://citygo.lovable.app"
additional_redirect_urls = ["http://localhost:5173"]
jwt_expiry = 3600
enable_signup = true
enable_anonymous_sign_ins = false

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

[functions.supervisor-auth]
verify_jwt = false

[functions.supervisor-bus]
verify_jwt = true

[functions.nfc-tap-in]
verify_jwt = true

[functions.nfc-tap-out]
verify_jwt = true

[functions.nfc-sync]
verify_jwt = true

[functions.manual-ticket]
verify_jwt = true

[functions.supervisor-reports]
verify_jwt = true

[functions.supervisor-bookings]
verify_jwt = true

[functions.registered-cards]
verify_jwt = true

[functions.admin-api]
verify_jwt = true
```

### 7.3 Environment Variables

**Client-side** (`.env`):
```env
VITE_SUPABASE_URL=https://ziouzevpbnigvwcacpqw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=ziouzevpbnigvwcacpqw
```

**Edge Functions** (Supabase Secrets):
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
SUPABASE_PUBLISHABLE_KEY
```

### 7.4 Security Setup

#### Authentication Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION SECURITY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User signs in via Supabase Auth                            │
│  2. JWT token generated with user claims                        │
│  3. Token stored in localStorage (encrypted)                    │
│  4. Token auto-refreshes before expiry                          │
│  5. All API calls include Bearer token                          │
│  6. Edge functions verify token via getUser()                   │
│  7. RLS policies enforce data access based on auth.uid()        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### RLS Security Model
```
┌─────────────────────────────────────────────────────────────────┐
│                    ROW LEVEL SECURITY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Every table has RLS enabled                                    │
│                                                                 │
│  Access patterns:                                               │
│  • Users: Own data only (WHERE user_id = auth.uid())           │
│  • Supervisors: Own data + assigned bus data                    │
│  • Admins: Full access via has_role() function                  │
│  • Public: Read-only on specific tables (routes, buses)         │
│                                                                 │
│  Security definer functions prevent:                            │
│  • RLS recursion loops                                          │
│  • Privilege escalation                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.5 Logging & Monitoring

**Edge Function Logging:**
```typescript
// All edge functions include structured logging
console.log(`[${functionName}] ${action}: ${JSON.stringify(data)}`);

// Example output:
// [nfc-tap-in] Processing tap-in: {"card_id": "RC-abc123", "bus_id": "uuid"}
// [nfc-tap-in] Success: {"log_id": "uuid", "passenger": "John Doe"}
```

**Available in:**
- Supabase Dashboard → Edge Functions → Logs
- Lovable Cloud → Backend → Function Logs

### 7.6 Rate Limiting

**Supabase Default Limits:**
- Auth: 100 requests/15 min per IP
- Database: 1000 rows per query
- Edge Functions: 500 invocations/minute
- Realtime: 200 concurrent connections

**Application Limits:**
- NFC Sync: Max 100 events per batch
- Reports: Max 31 days per query

---

## 8. Database Schema Reference

### 8.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   auth.     │       │  profiles   │       │ user_roles  │
│   users     │       │             │       │             │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ user_id(FK) │──────►│ user_id(FK) │
│ email       │       │ full_name   │       │ role (enum) │
│ created_at  │       │ card_id     │       │ created_at  │
└─────────────┘       │ card_balance│       └─────────────┘
                      │ points      │
                      │ total_co2   │
                      └──────┬──────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  bookings   │       │  nfc_logs   │       │transactions │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ user_id(FK) │       │ user_id(FK) │       │ user_id(FK) │
│ bus_id(FK)  │       │ bus_id(FK)  │       │ amount      │
│ route_id(FK)│       │ card_id     │       │ type        │
│ seat_no     │       │ tap_in_time │       │ status      │
│ fare        │       │ tap_out_time│       └─────────────┘
│ travel_date │       │ fare        │
└──────┬──────┘       │ distance    │
       │              │ co2_saved   │
       │              └──────┬──────┘
       │                     │
       ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   buses     │◄──────│   trips     │       │manual_tix   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ bus_id(FK)  │       │ bus_id(FK)  │
│ bus_number  │       │ driver_id   │       │supervisor_id│
│ route_id(FK)│       │ route_id(FK)│       │ fare        │
│ driver_id   │       │ start_time  │       │pass_count   │
│supervisor_id│       │ end_time    │       │ location    │
│ capacity    │       │ status      │       └─────────────┘
│curr_location│       └─────────────┘
│ status      │
└──────┬──────┘
       │
       ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   routes    │       │  rewards    │       │redemptions  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │◄──────│ reward_id   │
│ name        │       │ name        │       │ user_id(FK) │
│ stops(JSONB)│       │ points_req  │       │ points_spent│
│ distance    │       │ category    │       │ status      │
│ base_fare   │       │ active      │       └─────────────┘
│ fare_per_km │       └─────────────┘
└─────────────┘

┌─────────────┐
│ supervisor  │
│  _reports   │
├─────────────┤
│supervisor_id│
│ bus_id(FK)  │
│ report_date │
│ total_fare  │
│ total_co2   │
└─────────────┘
```

### 8.2 Complete Table Definitions

```sql
-- All tables with constraints, defaults, and indexes

-- 1. profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    card_id TEXT UNIQUE,
    card_balance NUMERIC DEFAULT 0,
    points INTEGER DEFAULT 0,
    total_co2_saved NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_profiles_card_id ON profiles(card_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- 2. user_roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- 3. routes
CREATE TABLE public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stops JSONB NOT NULL,
    distance NUMERIC NOT NULL,
    base_fare NUMERIC DEFAULT 20.00,
    fare_per_km NUMERIC DEFAULT 1.50,
    start_time TIME,
    end_time TIME,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_routes_active ON routes(active);

-- 4. buses
CREATE TABLE public.buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_number TEXT NOT NULL UNIQUE,
    route_id UUID REFERENCES routes(id),
    driver_id UUID,
    supervisor_id UUID,
    capacity INTEGER DEFAULT 40,
    current_location JSONB,
    status TEXT DEFAULT 'idle',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_buses_status ON buses(status);
CREATE INDEX idx_buses_driver_id ON buses(driver_id);
CREATE INDEX idx_buses_supervisor_id ON buses(supervisor_id);

-- 5. trips
CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID NOT NULL REFERENCES buses(id),
    driver_id UUID NOT NULL,
    route_id UUID NOT NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    start_location JSONB,
    end_location JSONB,
    distance_km NUMERIC DEFAULT 0,
    passengers_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_trips_bus_id ON trips(bus_id);
CREATE INDEX idx_trips_status ON trips(status);

-- 6. bookings
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    bus_id UUID NOT NULL REFERENCES buses(id),
    route_id UUID NOT NULL REFERENCES routes(id),
    seat_no INTEGER,
    fare NUMERIC NOT NULL,
    co2_saved NUMERIC DEFAULT 0,
    booking_date TIMESTAMPTZ DEFAULT now(),
    travel_date TIMESTAMPTZ,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    booking_status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_bus_date ON bookings(bus_id, travel_date);

-- 7. nfc_logs
CREATE TABLE public.nfc_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id TEXT NOT NULL,
    bus_id UUID NOT NULL REFERENCES buses(id),
    user_id UUID,
    supervisor_id UUID,
    tap_in_time TIMESTAMPTZ,
    tap_in_location JSONB,
    tap_out_time TIMESTAMPTZ,
    tap_out_location JSONB,
    fare NUMERIC,
    distance NUMERIC,
    co2_saved NUMERIC,
    offline_id TEXT UNIQUE,
    synced BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_nfc_logs_card_id ON nfc_logs(card_id);
CREATE INDEX idx_nfc_logs_bus_id ON nfc_logs(bus_id);
CREATE INDEX idx_nfc_logs_active ON nfc_logs(card_id, bus_id) WHERE tap_out_time IS NULL;

-- 8. manual_tickets
CREATE TABLE public.manual_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID NOT NULL REFERENCES buses(id),
    supervisor_id UUID NOT NULL,
    passenger_count INTEGER DEFAULT 1,
    fare NUMERIC NOT NULL,
    ticket_type TEXT DEFAULT 'single',
    payment_method TEXT DEFAULT 'cash',
    issued_at TIMESTAMPTZ DEFAULT now(),
    location JSONB,
    offline_id TEXT UNIQUE,
    synced BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_manual_tickets_bus_id ON manual_tickets(bus_id);
CREATE INDEX idx_manual_tickets_supervisor ON manual_tickets(supervisor_id);

-- 9. transactions
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    transaction_type TEXT,
    payment_method TEXT,
    reference_id TEXT,
    description TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- 10. rewards
CREATE TABLE public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    category TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_rewards_active ON rewards(active);

-- 11. reward_redemptions
CREATE TABLE public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reward_id UUID NOT NULL REFERENCES rewards(id),
    points_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_redemptions_user ON reward_redemptions(user_id);

-- 12. supervisor_reports
CREATE TABLE public.supervisor_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_id UUID NOT NULL,
    bus_id UUID NOT NULL REFERENCES buses(id),
    report_date DATE NOT NULL,
    total_tap_ins INTEGER DEFAULT 0,
    total_tap_outs INTEGER DEFAULT 0,
    total_manual_tickets INTEGER DEFAULT 0,
    total_fare_collected NUMERIC DEFAULT 0,
    total_distance_km NUMERIC DEFAULT 0,
    total_co2_saved NUMERIC DEFAULT 0,
    passenger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(supervisor_id, bus_id, report_date)
);
CREATE INDEX idx_reports_date ON supervisor_reports(report_date);
CREATE INDEX idx_reports_supervisor ON supervisor_reports(supervisor_id);
```

---

## Appendix A: Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing JWT token |
| `FORBIDDEN` | 403 | User lacks required role |
| `CARD_NOT_FOUND` | 404 | NFC card not registered |
| `NO_ACTIVE_JOURNEY` | 400 | No tap-in found for tap-out |
| `ACTIVE_JOURNEY_EXISTS` | 400 | Already tapped in |
| `INSUFFICIENT_BALANCE` | 400 | Card balance below minimum |
| `SEAT_UNAVAILABLE` | 400 | Seat already booked |
| `BATCH_TOO_LARGE` | 400 | Sync batch exceeds 100 events |
| `INSERT_FAILED` | 500 | Database insert error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Appendix B: API Request Examples

### Supervisor Login
```bash
curl -X POST \
  "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/supervisor-auth" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"email": "supervisor@citygo.com", "password": "secure123"}'
```

### NFC Tap-In
```bash
curl -X POST \
  "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/nfc-tap-in" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "card_id": "RC-abc12345",
    "bus_id": "uuid-of-bus",
    "location": {"lat": 23.7285, "lng": 90.4195},
    "timestamp": "2024-12-11T10:30:00Z"
  }'
```

### Batch Sync
```bash
curl -X POST \
  "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/nfc-sync" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "type": "tap_in",
        "offline_id": "uuid-1",
        "card_id": "RC-abc12345",
        "bus_id": "uuid-of-bus",
        "location": {"lat": 23.7285, "lng": 90.4195},
        "timestamp": "2024-12-11T10:30:00Z"
      }
    ]
  }'
```

---

**Document Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintained by**: CityGo Development Team
