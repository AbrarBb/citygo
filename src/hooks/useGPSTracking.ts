import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useGPSTracking = (busId?: string) => {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isTracking || !busId) return;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        setLocation(position);
        setError(null);

        // Update bus location in database
        try {
          const { error } = await supabase
            .from("buses")
            .update({
              current_location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString(),
              },
            })
            .eq("id", busId);

          if (error) throw error;
        } catch (err) {
          console.error("Error updating location:", err);
        }
      },
      (err) => {
        setError(err.message);
        toast({
          title: "GPS Error",
          description: err.message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, busId, toast]);

  const startTracking = () => setIsTracking(true);
  const stopTracking = () => setIsTracking(false);

  return { location, error, isTracking, startTracking, stopTracking };
};
