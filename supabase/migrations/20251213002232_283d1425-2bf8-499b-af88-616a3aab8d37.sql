-- Function to auto-complete bookings when bus route changes
CREATE OR REPLACE FUNCTION public.auto_complete_bookings_on_route_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If route_id changed and old route exists, mark all confirmed bookings for old route as completed
  IF OLD.route_id IS DISTINCT FROM NEW.route_id AND OLD.route_id IS NOT NULL THEN
    UPDATE public.bookings
    SET booking_status = 'completed'
    WHERE bus_id = NEW.id
    AND booking_status = 'confirmed'
    AND route_id = OLD.route_id;
    
    RAISE LOG 'Auto-completed bookings for bus % when route changed from % to %', NEW.id, OLD.route_id, NEW.route_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for route changes
DROP TRIGGER IF EXISTS on_bus_route_change ON public.buses;
CREATE TRIGGER on_bus_route_change
  AFTER UPDATE OF route_id ON public.buses
  FOR EACH ROW
  WHEN (OLD.route_id IS DISTINCT FROM NEW.route_id)
  EXECUTE FUNCTION public.auto_complete_bookings_on_route_change();

-- Function to auto-complete bookings when bus status changes to idle
CREATE OR REPLACE FUNCTION public.auto_complete_bookings_on_status_idle()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to 'idle' from 'active', mark all confirmed bookings as completed
  IF OLD.status = 'active' AND NEW.status = 'idle' THEN
    UPDATE public.bookings
    SET booking_status = 'completed'
    WHERE bus_id = NEW.id
    AND booking_status = 'confirmed';
    
    RAISE LOG 'Auto-completed bookings for bus % when status changed to idle', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for status changes
DROP TRIGGER IF EXISTS on_bus_status_idle ON public.buses;
CREATE TRIGGER on_bus_status_idle
  AFTER UPDATE OF status ON public.buses
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'idle')
  EXECUTE FUNCTION public.auto_complete_bookings_on_status_idle();