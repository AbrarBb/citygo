# Supervisor Mobile App API Documentation

Base URL: `https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1`

## Authentication

### POST `/supervisor-auth`
Authenticate supervisor and get JWT token.

**Request:**
```json
{
  "email": "supervisor@gmail.com",
  "password": "your_password"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "691cb719-8f26-46ad-b0dd-d73ced5f1f28",
    "email": "supervisor@gmail.com",
    "role": "supervisor"
  },
  "profile": {
    "full_name": "Test Supervisor",
    "phone": "+880123456789"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

## Bus Assignment

### GET `/supervisor-bus`
Get assigned bus details for the authenticated supervisor.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200) - Active Assignment:**
```json
{
  "success": true,
  "is_active": true,
  "message": "You are assigned to bus DHK-BUS-102",
  "bus": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "bus_number": "DHK-BUS-102",
    "status": "active",
    "capacity": 40,
    "current_location": {
      "lat": 23.8103,
      "lng": 90.4125
    },
    "driver_id": "e7821a23-a871-4693-a9a4-39f516a1f897",
    "driverInfo": {
      "full_name": "Driver Bhai",
      "phone": "+880123456789"
    }
  },
  "route": {
    "id": "route-uuid",
    "name": "Dhaka - Uttara Express",
    "stops": [...],
    "distance": 25.5,
    "base_fare": 20,
    "fare_per_km": 1.5
  }
}
```

**Response (200) - Not Assigned:**
```json
{
  "success": true,
  "is_active": false,
  "message": "You are not currently assigned to any bus. Please wait for a driver to select you.",
  "bus": null,
  "route": null
}
```

---

## NFC Operations

### POST `/nfc-tap-in`
Record passenger tap-in event.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "card_id": "RC-47b8dbab",
  "bus_id": "550e8400-e29b-41d4-a716-446655440000",
  "location": {
    "lat": 23.8103,
    "lng": 90.4125
  },
  "offline_id": "local-uuid-12345"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Tap-in recorded successfully",
  "log_id": "nfc-log-uuid",
  "passenger": {
    "name": "John Doe",
    "card_balance": 480.00
  }
}
```

---

### POST `/nfc-tap-out`
Record passenger tap-out and calculate fare.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "card_id": "RC-47b8dbab",
  "bus_id": "550e8400-e29b-41d4-a716-446655440000",
  "location": {
    "lat": 23.7925,
    "lng": 90.4078
  },
  "offline_id": "local-uuid-12346"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Tap-out recorded. Fare: ৳35.00",
  "fare": 35.00,
  "distance": 10.0,
  "co2_saved": 1.5,
  "points_earned": 20,
  "new_balance": 445.00,
  "trip_summary": {
    "tap_in_time": "2024-01-15T08:30:00Z",
    "tap_out_time": "2024-01-15T09:15:00Z",
    "duration_minutes": 45
  }
}
```

**Error - No Active Tap-in:**
```json
{
  "success": false,
  "error": "No active tap-in found for this card"
}
```

**Error - Insufficient Balance:**
```json
{
  "success": false,
  "error": "Insufficient card balance",
  "required": 35.00,
  "available": 20.00
}
```

---

## Manual Tickets

### POST `/manual-ticket`
Issue manual ticket for passengers without Rapid Card.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "bus_id": "550e8400-e29b-41d4-a716-446655440000",
  "passenger_count": 2,
  "fare": 70.00,
  "ticket_type": "single",
  "payment_method": "cash",
  "location": {
    "lat": 23.8103,
    "lng": 90.4125
  },
  "offline_id": "local-uuid-12347"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Manual ticket issued successfully",
  "ticket_id": "ticket-uuid",
  "ticket": {
    "passenger_count": 2,
    "fare": 70.00,
    "issued_at": "2024-01-15T09:30:00Z"
  }
}
```

---

## Offline Sync

### POST `/nfc-sync`
Batch sync offline events when connection is restored.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "events": [
    {
      "type": "tap_in",
      "offline_id": "local-uuid-001",
      "card_id": "RC-47b8dbab",
      "bus_id": "550e8400-e29b-41d4-a716-446655440000",
      "location": { "lat": 23.8103, "lng": 90.4125 },
      "timestamp": "2024-01-15T08:30:00Z"
    },
    {
      "type": "tap_out",
      "offline_id": "local-uuid-002",
      "card_id": "RC-47b8dbab",
      "bus_id": "550e8400-e29b-41d4-a716-446655440000",
      "location": { "lat": 23.7925, "lng": 90.4078 },
      "timestamp": "2024-01-15T09:15:00Z"
    },
    {
      "type": "manual_ticket",
      "offline_id": "local-uuid-003",
      "bus_id": "550e8400-e29b-41d4-a716-446655440000",
      "passenger_count": 1,
      "fare": 35.00,
      "payment_method": "cash",
      "location": { "lat": 23.8050, "lng": 90.4100 },
      "timestamp": "2024-01-15T08:45:00Z"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Sync completed",
  "results": [
    { "offline_id": "local-uuid-001", "status": "success", "server_id": "uuid-1" },
    { "offline_id": "local-uuid-002", "status": "success", "server_id": "uuid-2" },
    { "offline_id": "local-uuid-003", "status": "duplicate", "message": "Already synced" }
  ],
  "summary": {
    "total": 3,
    "success": 2,
    "duplicate": 1,
    "error": 0
  }
}
```

---

## Reports

### GET `/supervisor-reports?date=2024-01-15`
Get daily report for a specific date.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "report": {
    "id": "report-uuid",
    "report_date": "2024-01-15",
    "bus_number": "DHK-BUS-102",
    "total_tap_ins": 45,
    "total_tap_outs": 43,
    "total_manual_tickets": 12,
    "total_fare_collected": 2850.00,
    "total_distance_km": 125.5,
    "total_co2_saved": 18.83,
    "passenger_count": 57
  }
}
```

### POST `/supervisor-reports`
Generate/update daily report.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "bus_id": "550e8400-e29b-41d4-a716-446655440000",
  "report_date": "2024-01-15"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Report generated successfully",
  "report": {
    "total_tap_ins": 45,
    "total_tap_outs": 43,
    "total_manual_tickets": 12,
    "total_fare_collected": 2850.00,
    "total_distance_km": 125.5,
    "total_co2_saved": 18.83,
    "passenger_count": 57
  }
}
```

---

## Real-time Updates

The mobile app should subscribe to real-time updates on the `buses` table to receive notifications when:
- Driver assigns the supervisor to a bus
- Bus status changes
- Location updates

**Supabase Realtime Channel:**
```javascript
const channel = supabase
  .channel('supervisor-bus')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'buses',
      filter: `supervisor_id=eq.${supervisorId}`
    },
    (payload) => {
      // Handle bus assignment/update
      console.log('Bus updated:', payload.new);
    }
  )
  .subscribe();
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Not a supervisor |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate offline_id |
| 500 | Server Error |

---

## Offline-First Architecture

The mobile app should implement:

1. **Local SQLite Queue** - Store events locally when offline
2. **Unique offline_id** - Generate UUID for each event to prevent duplicates
3. **Sync on Reconnect** - Use `/nfc-sync` endpoint to batch sync
4. **Conflict Resolution** - Server returns "duplicate" status for already-synced events

```dart
// Example Flutter offline storage
class OfflineQueue {
  Future<void> addEvent(NFCEvent event) async {
    event.offlineId = Uuid().v4();
    event.synced = false;
    await localDb.insert(event);
  }
  
  Future<void> syncPendingEvents() async {
    final pending = await localDb.getPendingEvents();
    final response = await api.syncEvents(pending);
    
    for (final result in response.results) {
      if (result.status == 'success' || result.status == 'duplicate') {
        await localDb.markAsSynced(result.offlineId);
      }
    }
  }
}
```
