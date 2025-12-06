# CityGo Supervisor - Offline Sync Contract

## Overview

The CityGo Supervisor app supports offline operation for NFC tap events and manual ticket issuance. Events are stored locally and synchronized when connectivity is restored.

---

## Offline Storage Requirements

### Required Local Storage (SQLite/Hive/Isar)

```dart
// Event Queue Table
class OfflineEvent {
  String offlineId;       // UUID v4, generated locally
  String type;            // "tap_in" | "tap_out" | "manual_ticket"
  String? cardId;         // Required for NFC events
  String busId;           // Assigned bus ID
  Map<String, double>? location;  // {lat, lng, accuracy?}
  DateTime timestamp;     // Event time
  int? passengerCount;    // For manual tickets
  double? fare;           // For manual tickets
  String? paymentMethod;  // For manual tickets
  bool synced;            // false until confirmed
  DateTime createdAt;     // Local creation time
}

// Cached Data
class CachedBusInfo {
  String busId;
  String busNumber;
  String routeId;
  String routeName;
  List<RouteStop> stops;
  double baseFare;
  double farePerKm;
  DateTime cachedAt;
}
```

---

## Sync Request Format

### Endpoint
```
POST /functions/v1/nfc-sync
```

### Request Body
```json
{
  "events": [
    {
      "type": "tap_in",
      "offline_id": "550e8400-e29b-41d4-a716-446655440001",
      "card_id": "RC-d4a290fc",
      "bus_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "location": {
        "lat": 23.7806,
        "lng": 90.4263,
        "accuracy": 10
      },
      "timestamp": "2025-12-06T08:30:00.000Z"
    },
    {
      "type": "tap_out",
      "offline_id": "550e8400-e29b-41d4-a716-446655440002",
      "card_id": "RC-d4a290fc",
      "bus_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "location": {
        "lat": 23.7525,
        "lng": 90.4152,
        "accuracy": 15
      },
      "timestamp": "2025-12-06T09:00:00.000Z"
    },
    {
      "type": "manual_ticket",
      "offline_id": "550e8400-e29b-41d4-a716-446655440003",
      "bus_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "passenger_count": 2,
      "fare": 50.00,
      "payment_method": "cash",
      "ticket_type": "single",
      "location": {
        "lat": 23.7749,
        "lng": 90.4194
      },
      "timestamp": "2025-12-06T09:15:00.000Z"
    }
  ]
}
```

---

## Sync Response Format

### Success Response (HTTP 200)
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
      "data": {
        "tap_id": "uuid-of-created-record",
        "user_name": "Mashiur Rahman"
      }
    },
    {
      "offline_id": "550e8400-e29b-41d4-a716-446655440002",
      "status": "duplicate",
      "message": "Event already processed"
    },
    {
      "offline_id": "550e8400-e29b-41d4-a716-446655440003",
      "status": "success",
      "data": {
        "ticket_id": "uuid-of-created-ticket"
      }
    }
  ]
}
```

### Per-Event Status Values

| Status | Meaning | Action |
|--------|---------|--------|
| `success` | Event created successfully | Mark as synced, delete from queue |
| `duplicate` | Event already exists (by offline_id) | Mark as synced, delete from queue |
| `error` | Processing failed | Keep in queue, retry later |

---

## Duplicate Prevention

### Server-Side Logic
1. Check if `offline_id` exists in database
2. If exists → return `status: "duplicate"`
3. If not exists → create record with `offline_id`

### Client-Side Logic
```dart
Future<void> processResults(List<SyncResult> results) async {
  for (final result in results) {
    if (result.status == 'success' || result.status == 'duplicate') {
      // Safe to remove from local queue
      await localDb.deleteEvent(result.offlineId);
    } else {
      // Keep for retry - increment retry count
      await localDb.incrementRetryCount(result.offlineId);
    }
  }
}
```

---

## Batch Size Limits

| Parameter | Value |
|-----------|-------|
| Maximum events per request | **100** |
| Recommended batch size | **50-100** |
| Minimum batch size | 1 |

### Error Response for Oversized Batch (HTTP 400)
```json
{
  "error": "Batch size exceeds maximum of 100 events",
  "max_batch_size": 100
}
```

---

## Sync Strategy

### Recommended Implementation

```dart
class SyncService {
  static const int BATCH_SIZE = 50;
  static const Duration SYNC_INTERVAL = Duration(minutes: 5);
  static const int MAX_RETRIES = 3;

  Future<void> syncPendingEvents() async {
    // Check connectivity
    if (!await hasConnectivity()) return;
    
    // Get unsynced events, oldest first
    final events = await localDb.getUnsyncedEvents(limit: BATCH_SIZE);
    if (events.isEmpty) return;
    
    try {
      final response = await api.syncEvents(events);
      await processResults(response.results);
      
      // If there are more events, schedule next batch
      final remaining = await localDb.getUnsyncedCount();
      if (remaining > 0) {
        scheduleSyncAfter(Duration(seconds: 5));
      }
    } catch (e) {
      // Network error - will retry on next interval
      logError('Sync failed', e);
    }
  }
  
  void startPeriodicSync() {
    Timer.periodic(SYNC_INTERVAL, (_) => syncPendingEvents());
  }
}
```

### Sync Triggers
1. **Periodic**: Every 5 minutes when online
2. **Connectivity restored**: Immediate sync when reconnected
3. **App foreground**: Sync when app comes to foreground
4. **Manual**: User-triggered sync button

---

## Offline ID Generation

### Format
UUID v4 (RFC 4122 compliant)

### Dart Implementation
```dart
import 'package:uuid/uuid.dart';

final uuid = Uuid();
String generateOfflineId() => uuid.v4();
```

### Example Values
```
550e8400-e29b-41d4-a716-446655440001
550e8400-e29b-41d4-a716-446655440002
6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

---

## Error Handling

### Network Errors
- Store event locally with `synced: false`
- Retry on next sync cycle
- Increment retry counter

### API Errors by Event

| Error | Code | Action |
|-------|------|--------|
| Card not registered | CARD_NOT_FOUND | Show error, keep for review |
| Already tapped in | ALREADY_TAPPED_IN | Delete duplicate tap-in |
| No active journey | NO_ACTIVE_JOURNEY | Show error, keep for review |
| Server error | 500 | Retry later |

### Retry Logic
```dart
Future<bool> shouldRetry(OfflineEvent event) async {
  if (event.retryCount >= MAX_RETRIES) {
    // Move to failed queue for manual review
    await localDb.moveToFailedQueue(event);
    return false;
  }
  return true;
}
```

---

## Data Integrity

### Timestamp Handling
- Store timestamps in ISO 8601 format with timezone
- Use device time at event creation
- Server accepts historical timestamps

### Location Accuracy
- Include GPS accuracy when available
- Fallback to last known location if GPS unavailable
- Mark location as null if completely unavailable

### Event Ordering
- Process events in timestamp order
- Tap-out must follow tap-in for same card
- Server validates event sequence

---

## Example Flutter Implementation

```dart
class OfflineEventQueue {
  final Database db;
  
  Future<void> addTapIn({
    required String cardId,
    required String busId,
    LatLng? location,
  }) async {
    final event = OfflineEvent(
      offlineId: Uuid().v4(),
      type: 'tap_in',
      cardId: cardId,
      busId: busId,
      location: location != null ? {
        'lat': location.latitude,
        'lng': location.longitude,
        'accuracy': location.accuracy,
      } : null,
      timestamp: DateTime.now(),
      synced: false,
      createdAt: DateTime.now(),
    );
    
    await db.insert(event);
  }
  
  Future<void> addTapOut({
    required String cardId,
    required String busId,
    LatLng? location,
  }) async {
    final event = OfflineEvent(
      offlineId: Uuid().v4(),
      type: 'tap_out',
      cardId: cardId,
      busId: busId,
      location: location != null ? {
        'lat': location.latitude,
        'lng': location.longitude,
        'accuracy': location.accuracy,
      } : null,
      timestamp: DateTime.now(),
      synced: false,
      createdAt: DateTime.now(),
    );
    
    await db.insert(event);
  }
  
  Future<void> addManualTicket({
    required String busId,
    required int passengerCount,
    required double fare,
    required String paymentMethod,
    LatLng? location,
  }) async {
    final event = OfflineEvent(
      offlineId: Uuid().v4(),
      type: 'manual_ticket',
      busId: busId,
      passengerCount: passengerCount,
      fare: fare,
      paymentMethod: paymentMethod,
      location: location != null ? {
        'lat': location.latitude,
        'lng': location.longitude,
      } : null,
      timestamp: DateTime.now(),
      synced: false,
      createdAt: DateTime.now(),
    );
    
    await db.insert(event);
  }
}
```
