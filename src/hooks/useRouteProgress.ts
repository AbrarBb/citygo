import { useState, useEffect } from "react";

interface Stop {
  name: string;
  lat: number;
  lng: number;
}

interface RouteProgressResult {
  currentStop: number;
  totalStops: number;
  stopsRemaining: number;
  progress: number;
  nextStop: Stop | null;
  isOffRoute: boolean;
  distanceToNextStop: number;
}

export const useRouteProgress = (
  currentLocation: { lat: number; lng: number } | null,
  stops: Stop[]
): RouteProgressResult => {
  const [currentStop, setCurrentStop] = useState(0);
  const [isOffRoute, setIsOffRoute] = useState(false);

  useEffect(() => {
    if (!currentLocation || stops.length === 0) return;

    // Find closest stop
    let closestStopIndex = 0;
    let minDistance = Infinity;

    stops.forEach((stop, index) => {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        stop.lat,
        stop.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestStopIndex = index;
      }
    });

    // Consider off-route if more than 500m from any stop
    setIsOffRoute(minDistance > 0.5);

    // Only update current stop if we're close to it (within 100m) and moving forward
    if (minDistance < 0.1 && closestStopIndex >= currentStop) {
      setCurrentStop(closestStopIndex);
    }
  }, [currentLocation, stops, currentStop]);

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

  const totalStops = stops.length;
  const stopsRemaining = Math.max(0, totalStops - currentStop - 1);
  const progress = totalStops > 0 ? ((currentStop + 1) / totalStops) * 100 : 0;
  const nextStop = currentStop < totalStops - 1 ? stops[currentStop + 1] : null;
  const distanceToNextStop = nextStop && currentLocation
    ? calculateDistance(currentLocation.lat, currentLocation.lng, nextStop.lat, nextStop.lng)
    : 0;

  return {
    currentStop,
    totalStops,
    stopsRemaining,
    progress,
    nextStop,
    isOffRoute,
    distanceToNextStop,
  };
};
