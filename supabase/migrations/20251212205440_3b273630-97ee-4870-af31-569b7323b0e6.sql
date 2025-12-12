-- Allow drivers to update booking status to completed when ending a journey
CREATE POLICY "Drivers can complete bookings for their bus"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM buses 
    WHERE buses.id = bookings.bus_id 
    AND buses.driver_id = auth.uid()
  )
)
WITH CHECK (
  booking_status = 'completed'
);