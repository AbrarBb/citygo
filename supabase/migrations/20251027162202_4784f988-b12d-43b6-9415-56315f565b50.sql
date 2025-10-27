-- Insert sample routes with real Dhaka coordinates
INSERT INTO public.routes (id, name, distance, base_fare, fare_per_km, stops, start_time, end_time, active) VALUES
(
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'::uuid,
  'Mirpur 10 - Motijheel',
  15.5,
  25.00,
  2.00,
  '[
    {"lat": 23.8068, "lng": 90.3684, "name": "Mirpur 10 Circle", "order": 1},
    {"lat": 23.7919, "lng": 90.4028, "name": "Farmgate", "order": 2},
    {"lat": 23.7509, "lng": 90.3883, "name": "Shahbag", "order": 3},
    {"lat": 23.7342, "lng": 90.4088, "name": "Motijheel", "order": 4}
  ]'::jsonb,
  '06:00:00',
  '22:00:00',
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.routes (id, name, distance, base_fare, fare_per_km, stops, start_time, end_time, active) VALUES
(
  'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e'::uuid,
  'Uttara - Gulshan',
  12.3,
  20.00,
  1.80,
  '[
    {"lat": 23.8759, "lng": 90.3795, "name": "Uttara Sector 10", "order": 1},
    {"lat": 23.8103, "lng": 90.4125, "name": "Airport", "order": 2},
    {"lat": 23.7808, "lng": 90.4217, "name": "Gulshan 1", "order": 3}
  ]'::jsonb,
  '06:00:00',
  '22:00:00',
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert sample buses and assign to drivers
INSERT INTO public.buses (id, bus_number, route_id, driver_id, capacity, status, current_location) VALUES
(
  'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a'::uuid,
  'DHK-BUS-101',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'::uuid,
  '2d8ddc71-86ab-4202-a585-bb140f5f3f3a'::uuid,
  40,
  'idle',
  '{"lat": 23.8068, "lng": 90.3684, "accuracy": 10, "timestamp": "2025-10-27T16:00:00Z"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buses (id, bus_number, route_id, driver_id, capacity, status, current_location) VALUES
(
  'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b'::uuid,
  'DHK-BUS-102',
  'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e'::uuid,
  'e7821a23-a871-4693-a9a4-39f516a1f897'::uuid,
  45,
  'idle',
  '{"lat": 23.8759, "lng": 90.3795, "accuracy": 10, "timestamp": "2025-10-27T16:00:00Z"}'::jsonb
) ON CONFLICT (id) DO NOTHING;