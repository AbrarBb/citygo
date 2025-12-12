-- Add drop_stop column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN drop_stop TEXT;

-- Create a function to release bookings when bus arrives at a stop
CREATE OR REPLACE FUNCTION public.release_bookings_at_stop(p_bus_id UUID, p_stop_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  UPDATE bookings 
  SET booking_status = 'completed'
  WHERE bus_id = p_bus_id 
  AND booking_status IN ('confirmed', 'booked', 'occupied')
  AND drop_stop = p_stop_name;

  GET DIAGNOSTICS released_count = ROW_COUNT;
  
  RETURN released_count;
END;
$$;