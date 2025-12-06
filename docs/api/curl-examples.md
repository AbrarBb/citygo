# CityGo Supervisor API - cURL Examples

## Base URL
```
https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1
```

## Required Headers
```bash
-H "Content-Type: application/json"
-H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8"
```

---

## 1. Supervisor Authentication

### Login
```bash
curl -X POST "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/supervisor-auth" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8" \
  -d '{
    "email": "supervisor@citygo.app",
    "password": "Test123!"
  }'
```

### Expected Response (Success)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "abc123...",
  "expires_at": 1733493600,
  "user": {
    "id": "691cb719-8f26-46ad-b0dd-d73ced5f1f28",
    "email": "supervisor@citygo.app",
    "full_name": "Test Supervisor"
  },
  "role": "supervisor",
  "assigned_bus": {
    "id": "bus-uuid-here",
    "bus_number": "DHK-BUS-102",
    "status": "active",
    "capacity": 45,
    "current_location": null,
    "route": {
      "id": "route-uuid",
      "name": "Badda - Malibag",
      "stops": [...],
      "base_fare": 20,
      "fare_per_km": 1.5
    }
  }
}
```

### Error Response (Invalid Credentials)
```json
{
  "error": "Invalid credentials"
}
```

---

## 2. Get Assigned Bus

```bash
curl -X GET "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/supervisor-bus" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response
```json
{
  "success": true,
  "bus": {
    "id": "uuid",
    "bus_number": "DHK-BUS-102",
    "status": "active",
    "capacity": 45,
    "current_location": { "lat": 23.7749, "lng": 90.4194 }
  },
  "route": {
    "id": "uuid",
    "name": "Badda - Malibag",
    "stops": [
      { "name": "Badda", "lat": 23.7806, "lng": 90.4263 },
      { "name": "Malibag", "lat": 23.7525, "lng": 90.4152 }
    ],
    "distance": 12.5,
    "base_fare": 20,
    "fare_per_km": 1.5
  },
  "current_trip": null,
  "today_stats": {
    "tap_ins": 45,
    "tap_outs": 42,
    "manual_tickets": 8,
    "total_passengers": 53,
    "total_fare": 1250.50
  }
}
```

---

## 3. NFC Tap-In

```bash
curl -X POST "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/nfc-tap-in" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "card_id": "RC-d4a290fc",
    "bus_id": "BUS_UUID_HERE",
    "location": {
      "lat": 23.7806,
      "lng": 90.4263,
      "accuracy": 10
    },
    "timestamp": "2025-12-06T08:30:00Z",
    "offline_id": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

### Success Response
```json
{
  "success": true,
  "status": "created",
  "tap_id": "uuid",
  "user_name": "Mashiur Rahman",
  "card_balance": 1980.00,
  "tap_in_time": "2025-12-06T08:30:00Z",
  "message": "Journey started. Have a safe trip!"
}
```

### Error: Card Not Found (404)
```json
{
  "error": "Card not registered",
  "code": "CARD_NOT_FOUND"
}
```

### Error: Already Tapped In (400)
```json
{
  "error": "Card already tapped in. Please tap out first.",
  "code": "ALREADY_TAPPED_IN",
  "active_tap_id": "uuid"
}
```

### Error: Insufficient Balance (402)
```json
{
  "error": "Insufficient balance. Please top up your card.",
  "code": "INSUFFICIENT_BALANCE",
  "current_balance": 5.00,
  "minimum_required": 10.00
}
```

---

## 4. NFC Tap-Out

```bash
curl -X POST "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/nfc-tap-out" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "card_id": "RC-d4a290fc",
    "bus_id": "BUS_UUID_HERE",
    "location": {
      "lat": 23.7525,
      "lng": 90.4152,
      "accuracy": 10
    },
    "timestamp": "2025-12-06T09:00:00Z",
    "offline_id": "550e8400-e29b-41d4-a716-446655440002"
  }'
```

### Success Response
```json
{
  "success": true,
  "status": "created",
  "tap_id": "uuid",
  "fare": 25.50,
  "distance_km": 3.67,
  "co2_saved": 0.44,
  "points_earned": 36,
  "new_balance": 1954.50,
  "journey_duration": "30 minutes",
  "message": "Journey complete. Fare: ৳25.50. Thank you for riding green!"
}
```

### Error: No Active Journey (404)
```json
{
  "error": "No active journey found. Please tap in first.",
  "code": "NO_ACTIVE_JOURNEY"
}
```

---

## 5. Manual Ticket

```bash
curl -X POST "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/manual-ticket" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "bus_id": "BUS_UUID_HERE",
    "passenger_count": 2,
    "fare": 50.00,
    "payment_method": "cash",
    "ticket_type": "single",
    "location": {
      "lat": 23.7749,
      "lng": 90.4194
    },
    "timestamp": "2025-12-06T09:15:00Z",
    "offline_id": "550e8400-e29b-41d4-a716-446655440003"
  }'
```

### Success Response
```json
{
  "success": true,
  "status": "created",
  "ticket_id": "uuid",
  "bus_number": "DHK-BUS-102",
  "passenger_count": 2,
  "total_fare": 50.00,
  "payment_method": "cash",
  "issued_at": "2025-12-06T09:15:00Z",
  "message": "Ticket issued for 2 passenger(s). Total: ৳50"
}
```

---

## 6. Offline Sync (Batch)

```bash
curl -X POST "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/nfc-sync" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "events": [
      {
        "type": "tap_in",
        "offline_id": "550e8400-e29b-41d4-a716-446655440001",
        "card_id": "RC-d4a290fc",
        "bus_id": "BUS_UUID_HERE",
        "location": { "lat": 23.7806, "lng": 90.4263 },
        "timestamp": "2025-12-06T08:30:00Z"
      },
      {
        "type": "tap_out",
        "offline_id": "550e8400-e29b-41d4-a716-446655440002",
        "card_id": "RC-d4a290fc",
        "bus_id": "BUS_UUID_HERE",
        "location": { "lat": 23.7525, "lng": 90.4152 },
        "timestamp": "2025-12-06T09:00:00Z"
      },
      {
        "type": "manual_ticket",
        "offline_id": "550e8400-e29b-41d4-a716-446655440003",
        "bus_id": "BUS_UUID_HERE",
        "passenger_count": 2,
        "fare": 50,
        "payment_method": "cash",
        "timestamp": "2025-12-06T09:15:00Z"
      }
    ]
  }'
```

### Success Response
```json
{
  "success": true,
  "processed": 3,
  "summary": {
    "success": 2,
    "duplicate": 1,
    "error": 0
  },
  "results": [
    {
      "offline_id": "550e8400-e29b-41d4-a716-446655440001",
      "status": "success",
      "data": { "tap_id": "uuid", "user_name": "Mashiur Rahman" }
    },
    {
      "offline_id": "550e8400-e29b-41d4-a716-446655440002",
      "status": "duplicate",
      "message": "Event already processed"
    },
    {
      "offline_id": "550e8400-e29b-41d4-a716-446655440003",
      "status": "success",
      "data": { "ticket_id": "uuid" }
    }
  ]
}
```

---

## 7. Supervisor Reports

### Single Day Report
```bash
curl -X GET "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/supervisor-reports?date=2025-12-06" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Date Range Report
```bash
curl -X GET "https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1/supervisor-reports?from=2025-12-01&to=2025-12-06" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Success Response
```json
{
  "success": true,
  "report_date": "2025-12-06",
  "bus": {
    "id": "uuid",
    "bus_number": "DHK-BUS-102"
  },
  "summary": {
    "total_tap_ins": 45,
    "total_tap_outs": 42,
    "manual_tickets": 8,
    "total_passengers": 53,
    "total_fare_collected": 1250.50,
    "total_distance_km": 156.80,
    "total_co2_saved": 18.82
  },
  "breakdown": {
    "nfc": {
      "tap_ins": 45,
      "tap_outs": 42,
      "fare": 1050.50,
      "distance_km": 156.80
    },
    "manual": {
      "tickets": 8,
      "passengers": 11,
      "fare": 200.00
    }
  },
  "hourly_breakdown": [
    { "hour": "08:00", "passengers": 12, "fare": 280.00 },
    { "hour": "09:00", "passengers": 8, "fare": 195.50 },
    { "hour": "17:00", "passengers": 15, "fare": 360.00 },
    { "hour": "18:00", "passengers": 10, "fare": 245.00 }
  ]
}
```

---

## Notes

### JWT Token Refresh
- JWT tokens expire after **1 hour**
- Use `supabase.auth.refreshSession()` or call `/supervisor-auth` again
- Store the `refresh_token` for automatic refresh

### Offline Sync Best Practices
- Generate `offline_id` as UUID v4 on the client
- Store events locally with `synced: false`
- Batch sync when online (recommended: 50-100 events per batch)
- Mark events as `synced: true` when status is "success" or "duplicate"

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| CARD_NOT_FOUND | 404 | NFC card not registered |
| ALREADY_TAPPED_IN | 400 | Card has active journey |
| INSUFFICIENT_BALANCE | 402 | Card balance too low |
| NO_ACTIVE_JOURNEY | 404 | No tap-in to tap-out from |
