-- Create a function to clear bookings when journey ends
-- This function is SECURITY DEFINER so it can update bookings regardless of RLS
CREATE OR REPLACE FUNCTION public.complete_journey_bookings(p_bus_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  UPDATE bookings 
  SET booking_status = 'completed'
  WHERE bus_id = p_bus_id 
  AND booking_status IN ('confirmed', 'booked', 'occupied');

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;