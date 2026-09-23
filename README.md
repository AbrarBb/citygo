# CityGo

**A smart city bus platform for Dhaka: seat booking, live tracking, NFC card fares and fleet administration.**

CityGo replaces cash and guesswork with prepaid tap cards, real-time bus tracking and automatic record-keeping. It is made of two applications that share one Supabase backend:

| App | Audience | Stack | Repository |
|-----|----------|-------|------------|
| **CityGo Web** | Passengers, drivers, administrators (and a supervisor dashboard) | React 18, TypeScript, Vite, Tailwind, shadcn/ui | [AbrarBb/citygo](https://github.com/AbrarBb/citygo) |
| **CityGo Supervisor** | On-board bus supervisors | Flutter, Riverpod, SQLite, NFC | [AbrarBb/citygo-supervisor](https://github.com/AbrarBb/citygo-supervisor) |

> **Live web app:** <https://citygo.lovable.app>
> **Video demo:** <https://youtu.be/28DNBCcHyEU>

---

## Table of Contents

1. [Screenshots](#screenshots)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Getting Started](#getting-started)
6. [How the Main Features Work](#how-the-main-features-work)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Configuration & Security](#configuration--security)
10. [Troubleshooting](#troubleshooting)
11. [Error Codes](#error-codes)
12. [Author & License](#author)

---

## Screenshots

> Replace each placeholder path with your own image (for example, save files under `docs/screenshots/`).

### Web application

| Passenger dashboard | Seat booking |
|:---:|:---:|
| ![Passenger dashboard](docs/screenshots/web-passenger-dashboard.png) | ![Seat booking](docs/screenshots/web-seat-booking.png) |
| *Card balance, points, CO₂ saved, recent trips* | *10 × 4 seat map for the selected bus and date* |

| Live bus tracking | Rewards |
|:---:|:---:|
| ![Live tracking](docs/screenshots/web-live-tracking.png) | ![Rewards](docs/screenshots/web-rewards.png) |
| *Real-time bus markers on Google Maps* | *Redeem points for rewards* |

| Admin route editor | Admin analytics |
|:---:|:---:|
| ![Route editor](docs/screenshots/web-admin-route-editor.png) | ![Admin analytics](docs/screenshots/web-admin-analytics.png) |
| *Click the map to add stops and set fares* | *Daily revenue and top routes* |

| Driver dashboard | Login / Sign up |
|:---:|:---:|
| ![Driver dashboard](docs/screenshots/web-driver-dashboard.png) | ![Auth page](docs/screenshots/web-auth.png) |
| *Shares live GPS position of the bus* | *Email and password authentication* |

### Supervisor mobile app

| Login | Dashboard |
|:---:|:---:|
| ![Supervisor login](docs/screenshots/app-login.png) | ![Supervisor dashboard](docs/screenshots/app-dashboard.png) |
| *JWT login for supervisors* | *Assigned bus, route map and stops* |

| NFC reader | Manual ticket |
|:---:|:---:|
| ![NFC reader](docs/screenshots/app-nfc-reader.png) | ![Manual ticket](docs/screenshots/app-manual-ticket.png) |
| *Tap-in / tap-out with a Rapid Card* | *Cash tickets with passenger count* |

| Sync center | Daily reports |
|:---:|:---:|
| ![Sync center](docs/screenshots/app-sync-center.png) | ![Reports](docs/screenshots/app-reports.png) |
| *Offline events waiting to upload* | *Fares, passengers, distance and CO₂* |

---

## Features

### For passengers
- Browse routes and watch buses move on a live map
- Book a specific seat by route, bus and date
- Pay with a prepaid **Rapid Card** (NFC) or online
- Fares are calculated automatically from the distance travelled
- Track card balance, trip history, points and CO₂ saved
- Redeem points for rewards

### For drivers
- Publish the bus's GPS location every few seconds so passengers can see it live

### For supervisors (mobile app)
- Secure login with JWT token storage
- View the assigned bus and route, with stop markers and polyline on Google Maps
- NFC **tap-in / tap-out** for Rapid Cards, with offline support
- Issue **manual tickets** (cash) with a passenger count
- **Offline sync**: events are stored locally and uploaded automatically when connectivity returns
- **Daily reports** with statistics and hourly breakdown

### For administrators
- Create, edit and delete routes visually on a map, and set base fare and per-km fare
- Manage buses, drivers, supervisors, users and rewards
- View analytics: daily revenue, top routes, passenger counts

---

## System Architecture

### High-level view

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   React Web App │  │ Flutter Mobile  │  │    External Integrations    │  │
│  │   (Vite + TS)   │  │  (Supervisor)   │  │  (Google Maps, Air Quality) │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
└───────────┼────────────────────┼─────────────────────────┼──────────────────┘
            ▼                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │    Auth     │  │  Database   │  │   Storage   │  │   Edge Functions    │ │
│  │  (JWT/RLS)  │  │ (PostgreSQL)│  │   (Files)   │  │    (Deno Runtime)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Row Level Security: policies enforce role-based data access         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Realtime Engine: WebSocket subscriptions for live bus tracking      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request flow

```
User action → React component → Supabase client → Auth check → RLS policy
                                     │
                          ┌──────────┴──────────┐
                          │ Direct query        │  simple CRUD
                          │ or Edge Function    │  complex logic
                          └──────────┬──────────┘
                                     ▼
                     PostgreSQL → triggers / functions → response
```

### Technology stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Web frontend | React 18 + TypeScript | UI framework |
| Styling | Tailwind CSS + shadcn/ui | Component library |
| Server state | TanStack Query | Data fetching and caching |
| Routing | React Router v6 | Client-side navigation |
| Maps | Google Maps JS API | Live tracking and route visualization |
| Backend | Supabase (PostgreSQL) | Database and auth |
| Serverless | Deno Edge Functions | NFC, tickets, reports, admin logic |
| Realtime | Supabase Realtime | Live bus locations |
| Mobile | Flutter | Supervisor app |
| Mobile state | Riverpod | State management |
| Mobile storage | SQLite (`sqflite`) | Offline event storage |
| Mobile NFC | `nfc_manager` | Reading Rapid Cards |
| Mobile HTTP | `dio` | REST client |

### Edge functions

`supervisor-auth` · `supervisor-bus` · `nfc-tap-in` · `nfc-tap-out` · `nfc-sync` · `manual-ticket` · `supervisor-reports` · `supervisor-bookings` · `registered-cards` · `admin-api`

### Supervisor app structure

```
lib/
├── constants.dart          # API base URL and configuration
├── main.dart               # App entry point
├── models/                 # auth, bus, nfc, ticket, sync, report
├── providers/              # Riverpod: auth, bus, nfc, sync
├── screens/                # login, dashboard, nfc_reader, manual_ticket,
│                           # sync_center, reports, settings
├── services/
│   ├── api_service.dart    # REST client with JWT authentication
│   ├── local_db.dart       # SQLite offline storage
│   ├── nfc_service.dart    # NFC tag reading and event creation
│   └── sync_service.dart   # Batch synchronization of offline events
├── theme/app_theme.dart
└── widgets/components.dart
```

---

## User Roles & Permissions

Roles are stored in a separate `user_roles` table using a PostgreSQL enum:

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'driver', 'supervisor');
```

| Feature | Admin | Supervisor | Driver | User |
|---------|:-----:|:----------:|:------:|:----:|
| View dashboard | ✅ | ✅ | ✅ | ✅ |
| Manage routes | ✅ Create/Edit/Delete | ❌ | ❌ | View only |
| Manage buses | ✅ Full control | View assigned | ✅ Update location | View only |
| NFC operations | ❌ | ✅ Tap-in / Tap-out | ❌ | ❌ |
| Issue tickets | ❌ | ✅ Manual tickets | ❌ | ❌ |
| View reports | ✅ All | ✅ Own | ❌ | ❌ |
| Manage users | ✅ Full control | ❌ | ❌ | Own profile |
| Book seats | ❌ | ❌ | ❌ | ✅ |
| Track buses | ✅ | ✅ Assigned | ✅ Own | ✅ |
| Redeem rewards | ❌ | ❌ | ❌ | ✅ |

**Role checks** use a `SECURITY DEFINER` function to avoid RLS recursion:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
```

**Registration flow:** sign-up creates a row in `auth.users`, then the `handle_new_user()` trigger creates the passenger's profile (with an auto-generated card ID such as `RC-1a2b3c4d`) and assigns a role. The user is then redirected to their role-specific dashboard.

**Example RLS policies**

```sql
-- Users can update only their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Anyone can view buses (public tracking); admins manage all; drivers update their own bus
CREATE POLICY "Anyone can view buses" ON buses FOR SELECT USING (true);
CREATE POLICY "Admins can manage all buses" ON buses FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can update assigned buses" ON buses FOR UPDATE USING (auth.uid() = driver_id);

-- Supervisors and admins create NFC logs; users read their own journeys
CREATE POLICY "Supervisors can create nfc logs" ON nfc_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own nfc logs" ON nfc_logs
  FOR SELECT USING (auth.uid() = user_id);
```

---

## Getting Started

### Prerequisites

- Node.js (or Bun) for the web app
- Flutter SDK (latest stable), plus Android Studio and/or Xcode for the mobile app
- A Supabase project
- A Google Maps API key (Maps JavaScript API for web; Maps SDK for mobile)
- A physical NFC-capable Android device to test real card taps (emulators do not support NFC)

### Web app

```bash
git clone https://github.com/AbrarBb/citygo.git
cd citygo
npm install
```

Create a `.env` file (do **not** commit it):

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
```

Add your Google Maps API key and restrict it to your site's domain (HTTP referrer restriction). Then start the dev server:

```bash
npm run dev      # http://localhost:5173
```

### Supervisor mobile app

```bash
git clone https://github.com/AbrarBb/citygo-supervisor.git
cd citygo-supervisor
flutter pub get
```

1. Configure `lib/constants.dart`:

   ```dart
   const String API_BASE_URL = 'https://<your-project-ref>.supabase.co/functions/v1';
   const String SUPABASE_API_KEY = 'your-supabase-anon-key';
   // The Google Maps key is loaded from --dart-define
   ```

2. **Android:** edit `android/app/src/main/AndroidManifest.xml`

   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.NFC" />

   <application>
     <meta-data android:name="com.google.android.geo.API_KEY"
                android:value="YOUR_GOOGLE_MAPS_API_KEY"/>
   </application>
   ```

3. **iOS:** edit `ios/Runner/Info.plist` and enable **Near Field Communication Tag Reading** in Xcode.

   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>Location required for route tracking and fare calculations.</string>
   <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
   <string>Location required for route tracking.</string>
   <key>NFCReaderUsageDescription</key>
   <string>Used to read CityGo NFC Rapid Cards for tap-in/tap-out.</string>
   <key>GMSApiKey</key>
   <string>YOUR_GOOGLE_MAPS_API_KEY</string>
   ```

4. Run:

   ```bash
   flutter run -d <device-id> --dart-define=GOOGLE_MAPS_API_KEY=YOUR_KEY
   ```

5. Production build (inject keys with `--dart-define`; never hard-code them):

   ```bash
   flutter build apk --dart-define=GOOGLE_MAPS_API_KEY=YOUR_KEY
   flutter build ios --dart-define=GOOGLE_MAPS_API_KEY=YOUR_KEY
   ```

   In CI (GitHub Actions), store keys as secrets:

   ```yaml
   - name: Build APK
     run: |
       flutter build apk \
         --dart-define=GOOGLE_MAPS_API_KEY=${{ secrets.GOOGLE_MAPS_API_KEY }} \
         --dart-define=SUPABASE_API_KEY=${{ secrets.SUPABASE_API_KEY }}
   ```

### Trying it out

- **Supervisor account:** register as a supervisor from the web app at <https://citygo.lovable.app/auth>, or ask the maintainer for demo credentials.
- **Test NFC cards:** `RC-d4a290fc`, `RC-198b42de`, `RC-47b8dbab`

**Suggested test flow**

1. **Login** with a supervisor account
2. **Assigned bus:** the dashboard shows the bus and route
3. **Map & trip:** the route polyline and stop markers render
4. **NFC scan:** use a real card on a physical device, or the **Simulate Tap-In** button
5. **Manual ticket:** fill in the form and issue a ticket
6. **Offline sync:** turn off the internet, create events, turn it back on, open **Sync Center** and press **Sync Now**
7. **Reports:** view the daily statistics

---

## How the Main Features Work

### Authentication
Supabase Auth issues a JWT on sign-in and refreshes it automatically. `AuthContext` listens for auth state changes and loads the user's role. Edge functions verify the token with `getUser()`, and RLS policies enforce access with `auth.uid()`.

### Real-time bus tracking
The driver's dashboard updates `buses.current_location` (`{lat, lng, timestamp}`) about every 5 seconds. Passenger and admin maps subscribe to `postgres_changes` on the `buses` table through Supabase Realtime and move the markers as updates arrive. Realtime is enabled with:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.buses;
```

### Route management (admin)
Admins click the map to drop stops, drag markers to adjust, and set the base fare, fare per km and operating hours. Total distance is the sum of Haversine distances between consecutive stops. Routes are saved to the `routes` table, with stops stored as a JSONB array:

```json
[
  {"id": "uuid-1", "name": "Motijheel", "lat": 23.7285, "lng": 90.4195, "order": 0},
  {"id": "uuid-2", "name": "Gulistan",  "lat": 23.7245, "lng": 90.4135, "order": 1}
]
```

### NFC tap-in / tap-out

```
Supervisor scans card
        │
        ▼
 Active journey for this card on this bus?
   ├── yes → TAP-OUT
   └── no  → TAP-IN
```

**Tap-in**
1. Validate that the `card_id` exists in `profiles`
2. Reject if a journey is already open on this bus
3. Check that the balance covers the minimum fare (৳20)
4. Insert an `nfc_logs` row with `tap_in_time` and `tap_in_location`; `tap_out_time = NULL` marks the journey as active

**Tap-out**
1. Find the open tap-in record
2. Compute distance with the Haversine formula
3. Compute fare, CO₂ saved and points (formulas below)
4. Close the `nfc_logs` row with tap-out time, location, distance, fare and CO₂
5. Update the passenger's `card_balance`, `points` and `total_co2_saved`
6. Return a journey summary

**Formulas**

```
fare      = base_fare + (distance_km × fare_per_km)     defaults: ৳20 + ৳1.50/km
co2_saved = distance_km × 0.15   kg                     (car ≈ 0.21 kg/km, bus ≈ 0.06 kg/passenger-km)
points    = floor(distance_km × 10)
```

*Example:* 8 km → fare = 20 + 8 × 1.50 = **৳32**, CO₂ saved = **1.2 kg**, points = **80**.

In the interface, CO₂ is also shown as *trees equivalent* (`co2_saved / 21`) and *car km avoided* (`co2_saved / 0.21`).

### Offline sync
The Flutter app stores tap-ins, tap-outs and manual tickets in SQLite with a unique `offline_id`. When connectivity returns, `SyncService` posts them to `nfc-sync` in batches of up to **100 events**. The server checks each `offline_id` against the database, so retries never create duplicates. Each event comes back as `success`, `duplicate` or `error`.

### Bookings
1. The user picks a route, bus and date
2. The app loads booked seats and renders a **10 × 4 seat map** (40 seats, aisle after seat 2)
3. The user selects a seat; availability is re-checked just before booking
4. The fare is calculated and the user chooses a payment method (Rapid Card or online)
5. A `bookings` row is created (`confirmed`; payment `completed` for Rapid Card, otherwise `pending`)

Supervisors can see their bus's bookings through `supervisor-bookings`, including passenger names and card IDs.

### Reports
`supervisor-reports` aggregates a day's NFC logs and manual tickets for a bus and upserts one row per `(supervisor, bus, date)` in `supervisor_reports`:

| Metric | Source |
|--------|--------|
| Tap-ins / tap-outs | `nfc_logs` |
| Manual tickets | `manual_tickets` |
| Total fare collected | NFC fares + manual ticket fares |
| Distance and CO₂ | `nfc_logs` |
| Passenger count | NFC journeys + manual ticket passenger counts |

Admins build revenue charts and top-route lists from these tables.

### Rewards
Active rewards are listed by points required. Redeeming creates a `reward_redemptions` record (`pending` → `approved` → `fulfilled`) and deducts the points.

---

## API Reference

Base URL: `https://<your-project-ref>.supabase.co/functions/v1`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/supervisor-auth` | POST | None | Supervisor login, returns JWT |
| `/supervisor-bus` | GET | JWT | Assigned bus and route |
| `/nfc-tap-in` | POST | JWT | Record NFC tap-in |
| `/nfc-tap-out` | POST | JWT | Record NFC tap-out |
| `/nfc-sync` | POST | JWT | Batch sync offline events |
| `/manual-ticket` | POST | JWT | Issue a manual ticket |
| `/supervisor-reports` | GET / POST | JWT | Get or create daily reports (`?date=YYYY-MM-DD`) |
| `/supervisor-bookings` | GET | JWT | Bookings for the assigned bus |
| `/registered-cards` | GET | JWT | All NFC cards |
| `/admin-api` | * | JWT (admin) | Admin operations |

**Example: tap-in**

```bash
curl -X POST "https://<your-project-ref>.supabase.co/functions/v1/nfc-tap-in" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "apikey: <supabase-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "card_id": "RC-abc12345",
    "bus_id": "uuid-of-bus",
    "location": {"lat": 23.7285, "lng": 90.4195},
    "timestamp": "2024-12-11T10:30:00Z"
  }'
```

**Example: batch sync**

```bash
curl -X POST "https://<your-project-ref>.supabase.co/functions/v1/nfc-sync" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "tap_in",
      "offline_id": "uuid-1",
      "card_id": "RC-abc12345",
      "bus_id": "uuid-of-bus",
      "location": {"lat": 23.7285, "lng": 90.4195},
      "timestamp": "2024-12-11T10:30:00Z"
    }]
  }'
```

---

## Database Schema

Twelve tables:

| Area | Tables |
|------|--------|
| Users | `profiles`, `user_roles` |
| Fleet | `routes`, `buses`, `trips` |
| Rides | `bookings`, `nfc_logs`, `manual_tickets` |
| Money & rewards | `transactions`, `rewards`, `reward_redemptions` |
| Reporting | `supervisor_reports` |

Key relationships: `profiles` and `user_roles` link to `auth.users`; `buses` reference `routes`; `bookings`, `nfc_logs`, `manual_tickets`, `trips` and `supervisor_reports` reference `buses`; `reward_redemptions` reference `rewards`.

<details>
<summary><strong>Full table definitions (click to expand)</strong></summary>

```sql
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
    current_location JSONB,               -- {lat, lng, timestamp}
    status TEXT DEFAULT 'idle',           -- 'idle', 'active', 'maintenance'
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
    payment_method TEXT,                  -- 'rapid_card', 'online', 'cash'
    payment_status TEXT DEFAULT 'pending',-- 'pending', 'completed', 'failed'
    booking_status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
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
    status TEXT DEFAULT 'pending',        -- 'pending', 'approved', 'fulfilled'
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

</details>

---

## Configuration & Security

### Supabase configuration (`supabase/config.toml`)

```toml
[api]
enabled = true
max_rows = 1000

[auth]
enabled = true
site_url = "https://citygo.lovable.app"
additional_redirect_urls = ["http://localhost:5173"]
jwt_expiry = 3600
enable_signup = true
enable_anonymous_sign_ins = false

# Every edge function requires a valid JWT except supervisor-auth (the login endpoint)
[functions.supervisor-auth]
verify_jwt = false
```

**Edge function secrets** (set in Supabase, never in the repository): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_PUBLISHABLE_KEY`.

### Security model

1. Users sign in through Supabase Auth and receive a JWT
2. The token auto-refreshes before it expires
3. Every API call carries the bearer token
4. Edge functions verify the token with `getUser()` and check the caller's role
5. Row Level Security is enabled on every table:
   - **Users:** their own data only
   - **Supervisors:** their own data plus their assigned bus
   - **Admins:** full access through `has_role()`
   - **Public:** read-only on `routes` and `buses`

### Keys and credentials

- Never commit `.env` files, API keys or test passwords
- Restrict the Google Maps key by HTTP referrer (web) and by app signature (Android/iOS)
- The Supabase anon key is designed to be public; the **service role key must never leave the server**
- Rotate any key that has ever appeared in a public repository or its history

### Logging & limits

Edge functions log with a structured prefix, e.g. `[nfc-tap-in] Processing tap-in: {...}`, viewable in the Supabase dashboard under *Edge Functions → Logs*.

| Limit | Value |
|-------|-------|
| Auth requests | 100 per 15 min per IP |
| Rows per query | 1,000 |
| Edge function invocations | 500 per minute |
| Concurrent realtime connections | 200 |
| NFC sync batch | 100 events |
| Report query range | 31 days |

---

## Troubleshooting

| Problem | What to check |
|---------|---------------|
| **Map tiles not showing** | Google Maps key is set correctly; SHA-1 is registered for Android; Maps SDK is enabled on the key |
| **NFC not detected** | NFC is enabled on the device; the app has NFC permission; you are on a physical device |
| **401 authentication errors** | JWT is saved in secure storage; the `apikey` header is sent; test the endpoint with `curl` |
| **403 permission errors (RLS)** | The token belongs to a user with the supervisor role; try a staging supervisor account |
| **Offline events not syncing** | Local `nfc_logs` rows with `synced = false`; `offline_id` uniqueness; sync service logs |

---

## Error Codes

| Code | HTTP | Description |
|------|:----:|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing JWT |
| `FORBIDDEN` | 403 | User lacks the required role |
| `CARD_NOT_FOUND` | 404 | NFC card not registered |
| `NO_ACTIVE_JOURNEY` | 400 | No tap-in found for this tap-out |
| `ACTIVE_JOURNEY_EXISTS` | 400 | Passenger is already tapped in |
| `INSUFFICIENT_BALANCE` | 400 | Card balance is below the minimum fare |
| `SEAT_UNAVAILABLE` | 400 | Seat is already booked |
| `BATCH_TOO_LARGE` | 400 | Sync batch exceeds 100 events |
| `INSERT_FAILED` | 500 | Database insert error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Author

**Maintained by** Abrar Khatib Lajim
