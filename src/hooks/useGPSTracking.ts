import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useGPSTracking = (busId?: string, updateInterval: number = 5000) => {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastMoveTime, setLastMoveTime] = useState<number>(Date.now());
  const [isIdle, setIsIdle] = useState(false);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isTracking || !busId) return;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    let updateTimeoutId: NodeJS.Timeout;

    const updateLocation = async (position: GeolocationPosition) => {
      setLocation(position);
      setError(null);

      const currentLat = position.coords.latitude;
      const currentLng = position.coords.longitude;

      // Check if bus has moved (more than 10 meters)
      if (lastLocationRef.current) {
        const distance = calculateDistance(
          lastLocationRef.current.lat,
          lastLocationRef.current.lng,
          currentLat,
          currentLng
        );

        // If moved more than 10m, update last move time
        if (distance > 0.01) {
          setLastMoveTime(Date.now());
          setIsIdle(false);
        } else {
          // Check if idle for more than 3 minutes
          const idleTime = Date.now() - lastMoveTime;
          if (idleTime > 180000) {
            setIsIdle(true);
          }
        }
      }

      lastLocationRef.current = { lat: currentLat, lng: currentLng };

      // Update bus location in database
      try {
        const { error } = await supabase
          .from("buses")
          .update({
            current_location: {
              lat: currentLat,
              lng: currentLng,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString(),
              speed: position.coords.speed || 0,
              heading: position.coords.heading || 0,
            },
            status: isIdle ? "idle" : "active",
          })
          .eq("id", busId);

        if (error) throw error;
      } catch (err) {
        console.error("Error updating location:", err);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        updateLocation(position);
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
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (updateTimeoutId) clearTimeout(updateTimeoutId);
    };
  }, [isTracking, busId, toast, lastMoveTime, isIdle, updateInterval]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startTracking = () => {
    setIsTracking(true);
    setLastMoveTime(Date.now());
    setIsIdle(false);
  };

  const stopTracking = async () => {
    setIsTracking(false);
    setIsIdle(false);
    
    // Update bus status to idle when stopping
    if (busId) {
      try {
        await supabase.from("buses").update({ status: "idle" }).eq("id", busId);
      } catch (err) {
        console.error("Error updating bus status:", err);
      }
    }
  };

  return { 
    location, 
    error, 
    isTracking, 
    isIdle,
    startTracking, 
    stopTracking 
  };
};
