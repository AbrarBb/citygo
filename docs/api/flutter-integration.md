# CityGo Supervisor - Flutter Integration Guide

## Overview

This guide provides Flutter/Dart code examples for integrating with the CityGo Supervisor API.

---

## 1. Setup

### Dependencies (pubspec.yaml)
```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.3.0
  dio: ^5.4.0
  uuid: ^4.2.1
  connectivity_plus: ^5.0.2
  sqflite: ^2.3.0
  path: ^1.8.3
```

### Initialize Supabase
```dart
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> initSupabase() async {
  await Supabase.initialize(
    url: 'https://ziouzevpbnigvwcacpqw.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8',
  );
}

final supabase = Supabase.instance.client;
```

---

## 2. API Service

```dart
import 'package:dio/dio.dart';

class SupervisorApiService {
  static const String baseUrl = 
    'https://ziouzevpbnigvwcacpqw.supabase.co/functions/v1';
  static const String apiKey = 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppb3V6ZXZwYm5pZ3Z3Y2FjcHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODIsImV4cCI6MjA3NjgxNjc4Mn0.b01QNzxi1PyURNYZysjlLL6lc2WJniz7WFlA9ozB9L8';

  final Dio _dio;
  String? _authToken;

  SupervisorApiService() : _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
  ));

  void setAuthToken(String token) {
    _authToken = token;
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  // Login
  Future<AuthResponse> login(String email, String password) async {
    final response = await _dio.post('/supervisor-auth', data: {
      'email': email,
      'password': password,
    });
    
    final data = response.data;
    if (data['success'] == true) {
      setAuthToken(data['token']);
      return AuthResponse.fromJson(data);
    }
    throw ApiException(data['error'] ?? 'Login failed');
  }

  // Get Assigned Bus
  Future<BusResponse> getAssignedBus() async {
    final response = await _dio.get('/supervisor-bus');
    return BusResponse.fromJson(response.data);
  }

  // NFC Tap-In
  Future<TapInResponse> tapIn({
    required String cardId,
    required String busId,
    LatLng? location,
    String? offlineId,
  }) async {
    final response = await _dio.post('/nfc-tap-in', data: {
      'card_id': cardId,
      'bus_id': busId,
      if (location != null) 'location': {
        'lat': location.latitude,
        'lng': location.longitude,
      },
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      if (offlineId != null) 'offline_id': offlineId,
    });
    return TapInResponse.fromJson(response.data);
  }

  // NFC Tap-Out
  Future<TapOutResponse> tapOut({
    required String cardId,
    required String busId,
    LatLng? location,
    String? offlineId,
  }) async {
    final response = await _dio.post('/nfc-tap-out', data: {
      'card_id': cardId,
      'bus_id': busId,
      if (location != null) 'location': {
        'lat': location.latitude,
        'lng': location.longitude,
      },
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      if (offlineId != null) 'offline_id': offlineId,
    });
    return TapOutResponse.fromJson(response.data);
  }

  // Manual Ticket
  Future<TicketResponse> issueManualTicket({
    required String busId,
    required int passengerCount,
    required double fare,
    String paymentMethod = 'cash',
    LatLng? location,
    String? offlineId,
  }) async {
    final response = await _dio.post('/manual-ticket', data: {
      'bus_id': busId,
      'passenger_count': passengerCount,
      'fare': fare,
      'payment_method': paymentMethod,
      if (location != null) 'location': {
        'lat': location.latitude,
        'lng': location.longitude,
      },
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      if (offlineId != null) 'offline_id': offlineId,
    });
    return TicketResponse.fromJson(response.data);
  }

  // Batch Sync
  Future<SyncResponse> syncEvents(List<SyncEvent> events) async {
    final response = await _dio.post('/nfc-sync', data: {
      'events': events.map((e) => e.toJson()).toList(),
    });
    return SyncResponse.fromJson(response.data);
  }

  // Get Reports
  Future<ReportResponse> getReport({
    String? date,
    String? fromDate,
    String? toDate,
  }) async {
    final queryParams = <String, String>{};
    if (date != null) queryParams['date'] = date;
    if (fromDate != null) queryParams['from'] = fromDate;
    if (toDate != null) queryParams['to'] = toDate;

    final response = await _dio.get(
      '/supervisor-reports',
      queryParameters: queryParams,
    );
    return ReportResponse.fromJson(response.data);
  }
}
```

---

## 3. Data Models

```dart
// Auth Response
class AuthResponse {
  final bool success;
  final String token;
  final String refreshToken;
  final int expiresAt;
  final User user;
  final String role;
  final Bus? assignedBus;

  AuthResponse.fromJson(Map<String, dynamic> json)
      : success = json['success'],
        token = json['token'],
        refreshToken = json['refresh_token'],
        expiresAt = json['expires_at'],
        user = User.fromJson(json['user']),
        role = json['role'],
        assignedBus = json['assigned_bus'] != null
            ? Bus.fromJson(json['assigned_bus'])
            : null;
}

// User
class User {
  final String id;
  final String email;
  final String fullName;

  User.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        email = json['email'],
        fullName = json['full_name'];
}

// Bus
class Bus {
  final String id;
  final String busNumber;
  final String status;
  final int capacity;
  final LatLng? currentLocation;
  final Route? route;

  Bus.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        busNumber = json['bus_number'],
        status = json['status'],
        capacity = json['capacity'],
        currentLocation = json['current_location'] != null
            ? LatLng(
                json['current_location']['lat'],
                json['current_location']['lng'],
              )
            : null,
        route = json['route'] != null ? Route.fromJson(json['route']) : null;
}

// Route
class Route {
  final String id;
  final String name;
  final List<RouteStop> stops;
  final double distance;
  final double baseFare;
  final double farePerKm;

  Route.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        name = json['name'],
        stops = (json['stops'] as List)
            .map((s) => RouteStop.fromJson(s))
            .toList(),
        distance = (json['distance'] as num).toDouble(),
        baseFare = (json['base_fare'] as num).toDouble(),
        farePerKm = (json['fare_per_km'] as num).toDouble();
}

// Route Stop
class RouteStop {
  final String name;
  final double lat;
  final double lng;

  RouteStop.fromJson(Map<String, dynamic> json)
      : name = json['name'],
        lat = (json['lat'] as num).toDouble(),
        lng = (json['lng'] as num).toDouble();
}

// Tap-In Response
class TapInResponse {
  final bool success;
  final String status;
  final String tapId;
  final String userName;
  final double cardBalance;
  final String tapInTime;
  final String message;

  TapInResponse.fromJson(Map<String, dynamic> json)
      : success = json['success'],
        status = json['status'],
        tapId = json['tap_id'],
        userName = json['user_name'],
        cardBalance = (json['card_balance'] as num).toDouble(),
        tapInTime = json['tap_in_time'],
        message = json['message'];
}

// Tap-Out Response
class TapOutResponse {
  final bool success;
  final String status;
  final String tapId;
  final double fare;
  final double distanceKm;
  final double co2Saved;
  final int pointsEarned;
  final double newBalance;
  final String journeyDuration;
  final String message;

  TapOutResponse.fromJson(Map<String, dynamic> json)
      : success = json['success'],
        status = json['status'],
        tapId = json['tap_id'],
        fare = (json['fare'] as num).toDouble(),
        distanceKm = (json['distance_km'] as num).toDouble(),
        co2Saved = (json['co2_saved'] as num).toDouble(),
        pointsEarned = json['points_earned'],
        newBalance = (json['new_balance'] as num).toDouble(),
        journeyDuration = json['journey_duration'],
        message = json['message'];
}

// Sync Event
class SyncEvent {
  final String type; // tap_in, tap_out, manual_ticket
  final String offlineId;
  final String? cardId;
  final String busId;
  final LatLng? location;
  final DateTime timestamp;
  final int? passengerCount;
  final double? fare;
  final String? paymentMethod;

  SyncEvent({
    required this.type,
    required this.offlineId,
    this.cardId,
    required this.busId,
    this.location,
    required this.timestamp,
    this.passengerCount,
    this.fare,
    this.paymentMethod,
  });

  Map<String, dynamic> toJson() => {
    'type': type,
    'offline_id': offlineId,
    if (cardId != null) 'card_id': cardId,
    'bus_id': busId,
    if (location != null) 'location': {
      'lat': location!.latitude,
      'lng': location!.longitude,
    },
    'timestamp': timestamp.toUtc().toIso8601String(),
    if (passengerCount != null) 'passenger_count': passengerCount,
    if (fare != null) 'fare': fare,
    if (paymentMethod != null) 'payment_method': paymentMethod,
  };
}

// Sync Response
class SyncResponse {
  final bool success;
  final int processed;
  final SyncSummary summary;
  final List<SyncResult> results;

  SyncResponse.fromJson(Map<String, dynamic> json)
      : success = json['success'],
        processed = json['processed'],
        summary = SyncSummary.fromJson(json['summary']),
        results = (json['results'] as List)
            .map((r) => SyncResult.fromJson(r))
            .toList();
}

class SyncSummary {
  final int success;
  final int duplicate;
  final int error;

  SyncSummary.fromJson(Map<String, dynamic> json)
      : success = json['success'],
        duplicate = json['duplicate'],
        error = json['error'];
}

class SyncResult {
  final String offlineId;
  final String status;
  final String? message;
  final Map<String, dynamic>? data;

  SyncResult.fromJson(Map<String, dynamic> json)
      : offlineId = json['offline_id'],
        status = json['status'],
        message = json['message'],
        data = json['data'];
}
```

---

## 4. Offline Queue Manager

```dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:uuid/uuid.dart';

class OfflineQueueManager {
  static Database? _database;
  final _uuid = Uuid();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final path = join(await getDatabasesPath(), 'citygo_offline.db');
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE offline_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            offline_id TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
            card_id TEXT,
            bus_id TEXT NOT NULL,
            location_lat REAL,
            location_lng REAL,
            timestamp TEXT NOT NULL,
            passenger_count INTEGER,
            fare REAL,
            payment_method TEXT,
            synced INTEGER DEFAULT 0,
            retry_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
          )
        ''');
      },
    );
  }

  String generateOfflineId() => _uuid.v4();

  Future<void> addTapIn({
    required String cardId,
    required String busId,
    double? lat,
    double? lng,
  }) async {
    final db = await database;
    await db.insert('offline_events', {
      'offline_id': generateOfflineId(),
      'type': 'tap_in',
      'card_id': cardId,
      'bus_id': busId,
      'location_lat': lat,
      'location_lng': lng,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'synced': 0,
      'created_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Future<void> addTapOut({
    required String cardId,
    required String busId,
    double? lat,
    double? lng,
  }) async {
    final db = await database;
    await db.insert('offline_events', {
      'offline_id': generateOfflineId(),
      'type': 'tap_out',
      'card_id': cardId,
      'bus_id': busId,
      'location_lat': lat,
      'location_lng': lng,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'synced': 0,
      'created_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Future<void> addManualTicket({
    required String busId,
    required int passengerCount,
    required double fare,
    String paymentMethod = 'cash',
    double? lat,
    double? lng,
  }) async {
    final db = await database;
    await db.insert('offline_events', {
      'offline_id': generateOfflineId(),
      'type': 'manual_ticket',
      'bus_id': busId,
      'location_lat': lat,
      'location_lng': lng,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'passenger_count': passengerCount,
      'fare': fare,
      'payment_method': paymentMethod,
      'synced': 0,
      'created_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Future<List<SyncEvent>> getUnsyncedEvents({int limit = 50}) async {
    final db = await database;
    final rows = await db.query(
      'offline_events',
      where: 'synced = 0',
      orderBy: 'created_at ASC',
      limit: limit,
    );

    return rows.map((row) => SyncEvent(
      type: row['type'] as String,
      offlineId: row['offline_id'] as String,
      cardId: row['card_id'] as String?,
      busId: row['bus_id'] as String,
      location: row['location_lat'] != null
          ? LatLng(
              row['location_lat'] as double,
              row['location_lng'] as double,
            )
          : null,
      timestamp: DateTime.parse(row['timestamp'] as String),
      passengerCount: row['passenger_count'] as int?,
      fare: row['fare'] as double?,
      paymentMethod: row['payment_method'] as String?,
    )).toList();
  }

  Future<void> markAsSynced(List<String> offlineIds) async {
    final db = await database;
    await db.update(
      'offline_events',
      {'synced': 1},
      where: 'offline_id IN (${offlineIds.map((_) => '?').join(',')})',
      whereArgs: offlineIds,
    );
  }

  Future<void> deleteEvent(String offlineId) async {
    final db = await database;
    await db.delete(
      'offline_events',
      where: 'offline_id = ?',
      whereArgs: [offlineId],
    );
  }

  Future<int> getUnsyncedCount() async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM offline_events WHERE synced = 0'
    );
    return result.first['count'] as int;
  }
}
```

---

## 5. Sync Service

```dart
import 'package:connectivity_plus/connectivity_plus.dart';

class SyncService {
  final SupervisorApiService _api;
  final OfflineQueueManager _queue;
  final Connectivity _connectivity;

  static const int BATCH_SIZE = 50;

  SyncService(this._api, this._queue)
      : _connectivity = Connectivity();

  Future<bool> get isOnline async {
    final result = await _connectivity.checkConnectivity();
    return result != ConnectivityResult.none;
  }

  Future<SyncResult> syncPendingEvents() async {
    if (!await isOnline) {
      return SyncResult(synced: 0, failed: 0, message: 'Offline');
    }

    final events = await _queue.getUnsyncedEvents(limit: BATCH_SIZE);
    if (events.isEmpty) {
      return SyncResult(synced: 0, failed: 0, message: 'Nothing to sync');
    }

    try {
      final response = await _api.syncEvents(events);
      
      // Mark successful and duplicate events as synced
      final syncedIds = response.results
          .where((r) => r.status == 'success' || r.status == 'duplicate')
          .map((r) => r.offlineId)
          .toList();
      
      if (syncedIds.isNotEmpty) {
        await _queue.markAsSynced(syncedIds);
      }

      return SyncResult(
        synced: response.summary.success + response.summary.duplicate,
        failed: response.summary.error,
        message: 'Sync complete',
      );
    } catch (e) {
      return SyncResult(synced: 0, failed: events.length, message: e.toString());
    }
  }

  void startPeriodicSync() {
    // Sync every 5 minutes
    Timer.periodic(Duration(minutes: 5), (_) => syncPendingEvents());
    
    // Also sync when connectivity changes
    _connectivity.onConnectivityChanged.listen((result) {
      if (result != ConnectivityResult.none) {
        syncPendingEvents();
      }
    });
  }
}

class SyncResult {
  final int synced;
  final int failed;
  final String message;

  SyncResult({
    required this.synced,
    required this.failed,
    required this.message,
  });
}
```

---

## 6. Realtime Subscriptions

```dart
class RealtimeService {
  final SupabaseClient _supabase;
  RealtimeChannel? _busChannel;

  RealtimeService(this._supabase);

  void subscribeToBusUpdates(String busId, Function(LatLng) onLocationUpdate) {
    _busChannel = _supabase
        .channel('bus-$busId')
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
            final location = payload.newRecord['current_location'];
            if (location != null) {
              onLocationUpdate(LatLng(
                location['lat'] as double,
                location['lng'] as double,
              ));
            }
          },
        )
        .subscribe();
  }

  void unsubscribe() {
    _busChannel?.unsubscribe();
  }
}
```

---

## 7. Usage Example

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initSupabase();
  
  final api = SupervisorApiService();
  final queue = OfflineQueueManager();
  final syncService = SyncService(api, queue);
  
  // Start periodic sync
  syncService.startPeriodicSync();
  
  runApp(MyApp(api: api, queue: queue, syncService: syncService));
}

class NFCTapScreen extends StatelessWidget {
  final SupervisorApiService api;
  final OfflineQueueManager queue;
  final String busId;

  Future<void> handleTapIn(String cardId) async {
    final location = await getCurrentLocation();
    
    try {
      // Try online first
      final response = await api.tapIn(
        cardId: cardId,
        busId: busId,
        location: location,
      );
      showSuccess(response.message);
    } catch (e) {
      // Fallback to offline queue
      await queue.addTapIn(
        cardId: cardId,
        busId: busId,
        lat: location?.latitude,
        lng: location?.longitude,
      );
      showSuccess('Tap-in saved offline. Will sync when connected.');
    }
  }
}
```

---

## 8. UI Style Guide

### Colors
```dart
class CityGoColors {
  static const primary = Color(0xFF16A34A);      // Eco Green
  static const secondary = Color(0xFF0284C7);    // Tech Blue
  static const accent = Color(0xFF00FFFF);       // Cyan
  static const background = Color(0xFFFFFFFF);
  static const foreground = Color(0xFF0A0F14);
  static const destructive = Color(0xFFDC2626);
  static const muted = Color(0xFF64748B);
}
```

### Theme
```dart
ThemeData get cityGoTheme => ThemeData(
  primaryColor: CityGoColors.primary,
  scaffoldBackgroundColor: CityGoColors.background,
  appBarTheme: AppBarTheme(
    backgroundColor: CityGoColors.primary,
    foregroundColor: Colors.white,
    elevation: 0,
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: CityGoColors.primary,
      foregroundColor: Colors.white,
      padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
    ),
  ),
  cardTheme: CardTheme(
    elevation: 2,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
    ),
    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
  ),
);
```
