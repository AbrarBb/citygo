import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  buses?: Array<{
    id: string;
    bus_number: string;
    current_location: { lat: number; lng: number };
    route_name?: string;
  }>;
  routes?: Array<{
    id: string;
    stops: Array<{ lat: number; lng: number; name: string }>;
  }>;
}

const STORAGE_KEY = "google_maps_api_key";

const MapView = ({ 
  center = [23.8103, 90.4125], // Dhaka, Bangladesh [lat, lng]
  zoom = 12, 
  buses = [],
  routes = []
}: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<{ [key: string]: any }>({});
  const polylines = useRef<any[]>([]);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });
  const [tempKey, setTempKey] = useState("");
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const loadGoogleMapsScript = (key: string) => {
    return new Promise<void>((resolve, reject) => {
      if ((window as any).google?.maps) {
        resolve();
        return;
      }

      const existingScript = document.getElementById("google-maps-script");
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  };

  const handleSaveApiKey = () => {
    if (tempKey.trim()) {
      localStorage.setItem(STORAGE_KEY, tempKey.trim());
      setApiKey(tempKey.trim());
      setTempKey("");
    }
  };

  useEffect(() => {
    if (!apiKey || !mapContainer.current) return;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript(apiKey);
        
        const google = (window as any).google;
        
        map.current = new google.maps.Map(mapContainer.current!, {
          center: { lat: center[0], lng: center[1] },
          zoom: zoom,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ],
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        setIsMapLoaded(true);
      } catch (error) {
        console.error("Error loading Google Maps:", error);
      }
    };

    initMap();
  }, [apiKey, center, zoom]);

  // Draw route polylines
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const google = (window as any).google;
    if (!google?.maps) return;

    // Clear existing polylines
    polylines.current.forEach(line => line.setMap(null));
    polylines.current = [];

    routes.forEach((route) => {
      if (route.stops && route.stops.length > 1) {
        const path = route.stops.map(stop => ({ lat: stop.lat, lng: stop.lng }));
        
        const polyline = new google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: "#3b82f6",
          strokeOpacity: 0.8,
          strokeWeight: 3,
        });

        polyline.setMap(map.current);
        polylines.current.push(polyline);
      }
    });
  }, [routes, isMapLoaded]);

  // Update bus markers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const google = (window as any).google;
    if (!google?.maps) return;

    // Remove old markers
    Object.keys(markers.current).forEach((id) => {
      if (!buses.find((b) => b.id === id)) {
        markers.current[id].setMap(null);
        delete markers.current[id];
      }
    });

    // Add or update bus markers
    buses.forEach((bus) => {
      if (bus.current_location?.lat && bus.current_location?.lng) {
        const position = { 
          lat: bus.current_location.lat, 
          lng: bus.current_location.lng 
        };

        if (markers.current[bus.id]) {
          // Animate marker movement
          markers.current[bus.id].setPosition(position);
        } else {
          const marker = new google.maps.Marker({
            position: position,
            map: map.current,
            title: bus.bus_number,
            icon: {
              path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
              fillColor: "#22c55e",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 1.5,
              anchor: new google.maps.Point(12, 22),
            },
            animation: google.maps.Animation.DROP,
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="p-2">
                <h3 class="font-bold text-sm">${bus.bus_number}</h3>
                ${bus.route_name ? `<p class="text-xs text-gray-600">${bus.route_name}</p>` : ""}
              </div>
            `,
          });

          marker.addListener("click", () => {
            infoWindow.open(map.current, marker);
          });

          markers.current[bus.id] = marker;
        }
      }
    });
  }, [buses, isMapLoaded]);

  if (!apiKey) {
    return (
      <div className="w-full h-full rounded-lg border bg-card p-6 flex flex-col items-center justify-center gap-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Google Maps API Key Required</h3>
          <p className="text-sm text-muted-foreground">
            Enter your Google Maps API key to enable live tracking
          </p>
          <p className="text-xs text-muted-foreground">
            Get your API key from{" "}
            <a 
              href="https://console.cloud.google.com/google/maps-apis" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google Cloud Console
            </a>
          </p>
        </div>
        <div className="w-full max-w-md space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your Google Maps API key"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
            />
            <Button onClick={handleSaveApiKey}>Save</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {buses.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">{buses.length} bus{buses.length !== 1 ? "es" : ""} active</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
