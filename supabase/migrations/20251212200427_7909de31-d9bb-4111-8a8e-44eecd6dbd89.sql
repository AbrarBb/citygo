-- Drop the restrictive SELECT policy and add one that allows seeing booked seats
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

-- Users can view their own full booking details
CREATE POLICY "Users can view own bookings"
ON public.bookings
FOR SELECT
USING (auth.uid() = user_id);

-- All authenticated users can see seat availability (which seats are booked)
-- This allows the seat selection UI to show booked seats to everyone
CREATE POLICY "Authenticated users can view seat availability"
ON public.bookings
FOR SELECT
USING (auth.uid() IS NOT NULL AND booking_status IN ('confirmed', 'booked', 'occupied'));