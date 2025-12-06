# CityGo Supervisor API - Integration Guide

## Overview

This document provides complete integration information for the CityGo Supervisor mobile application backend API.

---

## 1. URLs & Access

### Base URL (Staging & Production)
```
https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1
```

### Available Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/supervisor-auth` | POST | Public | Login, returns JWT |
| `/supervisor-bus` | GET | JWT | Get assigned bus & route |
| `/nfc-tap-in` | POST | JWT | Process tap-in event |
| `/nfc-tap-out` | POST | JWT | Process tap-out + fare |
| `/manual-ticket` | POST | JWT | Issue cash ticket |
| `/nfc-sync` | POST | JWT | Batch sync offline events |
| `/supervisor-reports` | GET | JWT | Daily/weekly reports |

---

## 2. Authentication

### Login Flow
1. POST to `/supervisor-auth` with `{ email, password }`
2. Receive JWT token (valid 1 hour), refresh token, and assigned bus info
3. Include JWT in all subsequent requests via `Authorization: Bearer <token>`

### Required Headers
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8
```

### Token Refresh Strategy
- JWT expires after **1 hour**
- Store `refresh_token` from login response
- Before token expires, use Supabase SDK to refresh:
  ```dart
  final response = await supabase.auth.refreshSession();
  final newToken = response.session?.accessToken;
  ```
- Or re-authenticate via `/supervisor-auth`

---

## 3. Test Credentials (Staging)

### Supervisor Account
| Field | Value |
|-------|-------|
| Email | `supervisor@citygo.app` |
| Password | `Test123!` |
| User ID | `691cb719-8f26-46ad-b0dd-d73ced5f1f28` |
| Role | `supervisor` |

### Assigned Bus
| Field | Value |
|-------|-------|
| Bus Number | `DHK-BUS-102` |
| Route | Badda - Malibag |
| Capacity | 45 seats |

### Sample NFC Card IDs
| Card ID | User Name | Balance |
|---------|-----------|---------|
| `RC-d4a290fc` | Mashiur Rahman | ৳2000 |
| `RC-198b42de` | Fatima Akter | ৳1500 |
| `RC-7c3e91a0` | Karim Hassan | ৳800 |
| `RC-5f2d84bc` | Nadia Islam | ৳1200 |
| `RC-8a1c67ef` | Rafiq Ahmed | ৳500 |

---

## 4. Database Schema

### Tables Used

#### `nfc_logs`
```sql
id UUID PRIMARY KEY
card_id TEXT NOT NULL
bus_id UUID REFERENCES buses(id)
user_id UUID
supervisor_id UUID
tap_in_time TIMESTAMPTZ
tap_in_location JSONB
tap_out_time TIMESTAMPTZ
tap_out_location JSONB
fare NUMERIC
distance NUMERIC
co2_saved NUMERIC
offline_id TEXT UNIQUE
synced BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT now()
```

#### `manual_tickets`
```sql
id UUID PRIMARY KEY
bus_id UUID REFERENCES buses(id)
supervisor_id UUID
passenger_count INTEGER DEFAULT 1
fare NUMERIC NOT NULL
ticket_type TEXT DEFAULT 'single'
issued_at TIMESTAMPTZ DEFAULT now()
location JSONB
payment_method TEXT DEFAULT 'cash'
offline_id TEXT UNIQUE
synced BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT now()
```

#### `buses`
```sql
id UUID PRIMARY KEY
bus_number TEXT NOT NULL
route_id UUID REFERENCES routes(id)
driver_id UUID
supervisor_id UUID
capacity INTEGER DEFAULT 40
current_location JSONB
status TEXT DEFAULT 'idle'
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

#### `routes`
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
stops JSONB NOT NULL
distance NUMERIC NOT NULL
base_fare NUMERIC DEFAULT 20.00
fare_per_km NUMERIC DEFAULT 1.50
start_time TIME
end_time TIME
active BOOLEAN DEFAULT true
```

#### `profiles`
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
full_name TEXT NOT NULL
card_id TEXT
card_balance NUMERIC DEFAULT 0
points INTEGER DEFAULT 0
total_co2_saved NUMERIC DEFAULT 0
```

---

## 5. Realtime Subscriptions

### Enabled Tables
- `buses` - Location updates
- `trips` - Trip status changes
- `nfc_logs` - Passenger tap events

### Flutter/Dart Example
```dart
final channel = supabase
  .channel('bus-updates')
  .onPostgresChanges(
    event: PostgresChangeEvent.update,
    schema: 'public',
    table: 'buses',
    filter: PostgresChangeFilter(
      type: PostgresChangeFilterType.eq,
      column: 'id',
      value: busId,
    ),
    callback: (payload) {
      final newLocation = payload.newRecord['current_location'];
      updateBusLocation(newLocation);
    },
  )
  .subscribe();
```

---

## 6. Offline Sync

### Max Batch Size
**100 events** per `/nfc-sync` request

### Recommended Batch Size
**50-100 events** for optimal performance

### Sync Contract
See [offline-sync.md](./offline-sync.md) for detailed sync specifications.

---

## 7. Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `CARD_NOT_FOUND` | 404 | NFC card not registered in system |
| `ALREADY_TAPPED_IN` | 400 | Card has active journey |
| `INSUFFICIENT_BALANCE` | 402 | Card balance below minimum (৳10) |
| `NO_ACTIVE_JOURNEY` | 404 | No tap-in found for tap-out |
| `UNAUTHORIZED` | 401 | Invalid or expired JWT |
| `FORBIDDEN` | 403 | User is not a supervisor |

---

## 8. Observability

### Function Logs
Access via Lovable Cloud dashboard or use the presentation action:
```
<presentation-open-backend>View Backend</presentation-open-backend>
```

### Log Format
```
[function-name] message
```

Example:
```
[nfc-tap-in] Processing tap-in for card: RC-d4a290fc on bus: uuid
[nfc-tap-in] Tap-in recorded successfully: uuid
```

---

## 9. Documentation Files

| File | Description |
|------|-------------|
| [supervisor-api.yaml](./supervisor-api.yaml) | OpenAPI 3.0 specification |
| [curl-examples.md](./curl-examples.md) | Ready-to-run cURL commands |
| [offline-sync.md](./offline-sync.md) | Offline sync contract details |

---

## 10. Integration Checklist

### Setup
- [ ] Configure base URL: `https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1`
- [ ] Store API key in secure storage
- [ ] Implement token refresh logic

### Core Features
- [ ] Login flow with `/supervisor-auth`
- [ ] Fetch assigned bus via `/supervisor-bus`
- [ ] NFC tap-in via `/nfc-tap-in`
- [ ] NFC tap-out via `/nfc-tap-out`
- [ ] Manual tickets via `/manual-ticket`
- [ ] Offline queue with local storage
- [ ] Batch sync via `/nfc-sync`
- [ ] Daily reports via `/supervisor-reports`

### Offline Support
- [ ] Generate UUID v4 for `offline_id`
- [ ] Store events locally when offline
- [ ] Implement sync on connectivity restore
- [ ] Handle duplicate responses correctly

### Error Handling
- [ ] Display user-friendly messages for error codes
- [ ] Implement retry logic for network failures
- [ ] Log errors for debugging

---

## 11. Support

For integration questions or issues, contact the development team through the Lovable platform.

---

## Quick Start

1. **Test Login**
```bash
curl -X POST "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/supervisor-auth" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8" \
  -d '{"email":"supervisor@citygo.app","password":"Test123!"}'
```

2. **Save the JWT token from response**

3. **Test Get Bus**
```bash
curl -X GET "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/supervisor-bus" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "apikey: ..."
```

4. **You're ready to integrate!**
