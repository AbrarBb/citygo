import { useState, useEffect } from "react";

interface ETAResult {
  eta: string;
  distance: number;
  duration: number;
}

export const useETA = (
  busLocation: { lat: number; lng: number } | null,
  userLocation: { lat: number; lng: number } | null,
  averageSpeed: number = 30 // km/h
): ETAResult => {
  const [eta, setEta] = useState<string>("Calculating...");
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (!busLocation || !userLocation) {
      setEta("Unavailable");
      return;
    }

    const dist = calculateDistance(
      busLocation.lat,
      busLocation.lng,
      userLocation.lat,
      userLocation.lng
    );

    setDistance(dist);

    // Calculate duration in minutes based on average speed
    const durationInMinutes = (dist / averageSpeed) * 60;
    setDuration(durationInMinutes);

    // Format ETA
    if (durationInMinutes < 1) {
      setEta("Arriving now");
    } else if (durationInMinutes < 60) {
      setEta(`${Math.round(durationInMinutes)} min`);
    } else {
      const hours = Math.floor(durationInMinutes / 60);
      const minutes = Math.round(durationInMinutes % 60);
      setEta(`${hours}h ${minutes}m`);
    }
  }, [busLocation, userLocation, averageSpeed]);

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

  return { eta, distance, duration };
};
