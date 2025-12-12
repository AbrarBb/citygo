-- Update the complete_journey_bookings function to use correct status values
CREATE OR REPLACE FUNCTION public.complete_journey_bookings(p_bus_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Verify the caller is the driver of this bus
  IF NOT EXISTS (
    SELECT 1 FROM buses 
    WHERE id = p_bus_id 
    AND driver_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Not the driver of this bus';
  END IF;

  -- Update all active bookings for this bus to completed
  -- Only use 'confirmed' since that's what exists in the constraint
  UPDATE bookings 
  SET booking_status = 'completed'
  WHERE bus_id = p_bus_id 
  AND booking_status = 'confirmed';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$function$;

-- Also update the release_bookings_at_stop function
CREATE OR REPLACE FUNCTION public.release_bookings_at_stop(p_bus_id uuid, p_stop_name text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  released_count INTEGER;
BEGIN
  -- Verify the caller is the driver of this bus
  IF NOT EXISTS (
    SELECT 1 FROM buses 
    WHERE id = p_bus_id 
    AND driver_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Not the driver of this bus';
  END IF;

  -- Update all bookings for this bus where drop_stop matches to completed
  -- Only use 'confirmed' since that's what exists in the constraint
  UPDATE bookings 
  SET booking_status = 'completed'
  WHERE bus_id = p_bus_id 
  AND booking_status = 'confirmed'
  AND drop_stop = p_stop_name;

  GET DIAGNOSTICS released_count = ROW_COUNT;
  
  RETURN released_count;
END;
$function$;