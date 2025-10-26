-- Create trips table for tracking driver trips
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  route_id uuid NOT NULL,
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  end_time timestamp with time zone,
  status text NOT NULL DEFAULT 'active',
  start_location jsonb,
  end_location jsonb,
  distance_km numeric DEFAULT 0,
  passengers_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Drivers can view and manage their own trips
CREATE POLICY "Drivers can view own trips"
ON public.trips
FOR SELECT
USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can create own trips"
ON public.trips
FOR INSERT
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own trips"
ON public.trips
FOR UPDATE
USING (auth.uid() = driver_id);

-- Admins can manage all trips
CREATE POLICY "Admins can manage all trips"
ON public.trips
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));