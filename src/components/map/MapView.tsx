import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import { fetchAirQuality } from "@/services/airQuality";

interface BusData {
  id: string;
  bus_number: string;
  current_location: { lat: number; lng: number };
  route_name?: string;
  route_id?: string;
  status?: string;
}

interface StopData {
  lat: number;
  lng: number;
  name: string;
  order?: number;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  buses?: BusData[];
  routes?: Array<{
    id: string;
    stops: Array<{ lat: number; lng: number; name: string }>;
  }>;
  selectedStops?: StopData[];
  onBusClick?: (bus: BusData) => void;
  showHeatmapToggle?: boolean;
}

const GOOGLE_MAPS_API_KEY = "AIzaSyANU6LkHDgyHNjIIYfQV3YsnQ9Do_5uMGE";

const MapView = ({ 
  center = [23.8103, 90.4125], // Dhaka, Bangladesh [lat, lng]
  zoom = 12, 
  buses = [],
  routes = [],
  selectedStops = [],
  onBusClick,
  showHeatmapToggle = false
}: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<{ [key: string]: any }>({});
  const stopMarkers = useRef<any[]>([]);
  const polylines = useRef<any[]>([]);
  const heatmapLayer = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [airQualityData, setAirQualityData] = useState<{ aqi: number; category: string } | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  const loadGoogleMapsScript = () => {
    return new Promise<void>((resolve, reject) => {
      // Check if Google Maps is already loaded
      if ((window as any).google?.maps) {
        resolve();
        return;
      }

      // Handle authentication failures
      (window as any).gm_authFailure = () => {
        console.error("Google Maps authentication failed");
        setMapError(true);
        reject(new Error("Google Maps authentication failed"));
      };

      // Check if script is already being loaded
      const existingScript = document.getElementById("google-maps-script");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
        return;
      }

      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,places,visualization&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript();
        
        const google = (window as any).google;
        
        if (!map.current) {
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
        }
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        setMapError(true);
      }
    };

    initMap();
  }, []);

  // Recenter map when center/zoom props change
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    const google = (window as any).google;
    if (!google?.maps) return;
    map.current.setCenter({ lat: center[0], lng: center[1] });
    if (typeof zoom === 'number') {
      map.current.setZoom(zoom);
    }
  }, [center, zoom, isMapLoaded]);

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
        const normalized = route.stops
          .map((stop: any) => {
            const latRaw = stop?.lat ?? stop?.latitude;
            const lngRaw = stop?.lng ?? stop?.longitude;
            const lat = typeof latRaw === 'string' ? parseFloat(latRaw) : latRaw;
            const lng = typeof lngRaw === 'string' ? parseFloat(lngRaw) : lngRaw;
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              return { lat, lng };
            }
            return null;
          })
          .filter((s: any) => s !== null);

        if (normalized.length > 1) {
          const path = normalized as Array<{ lat: number; lng: number }>;
          
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
      }
    });
  }, [routes, isMapLoaded]);

  // Update bus markers with smooth transitions
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
      const loc: any = bus.current_location;
      const latRaw = loc?.lat ?? loc?.latitude;
      const lngRaw = loc?.lng ?? loc?.longitude;
      const hasLatLng = latRaw != null && lngRaw != null;
      if (hasLatLng) {
        const lat = typeof latRaw === 'string' ? parseFloat(latRaw) : latRaw;
        const lng = typeof lngRaw === 'string' ? parseFloat(lngRaw) : lngRaw;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const position = { lat, lng };
        
        // Choose color based on status
        const getStatusColor = (status?: string) => {
          switch (status) {
            case 'active': return '#22c55e'; // green
            case 'idle': return '#f59e0b'; // amber
            case 'delayed': return '#ef4444'; // red
            default: return '#6b7280'; // gray
          }
        };
        const statusColor = getStatusColor(bus.status);
        
        const iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="11" fill="${statusColor}" stroke="#ffffff" stroke-width="2"/>
            <rect x="6" y="6" width="12" height="10" rx="2" fill="#ffffff"/>
            <rect x="7" y="7" width="4" height="3" fill="${statusColor}"/>
            <rect x="13" y="7" width="4" height="3" fill="${statusColor}"/>
            <circle cx="8" cy="15" r="1.5" fill="#333"/>
            <circle cx="16" cy="15" r="1.5" fill="#333"/>
          </svg>
        `;
        
        if (markers.current[bus.id]) {
          markers.current[bus.id].setPosition(position);
          // Update icon if status changed
          markers.current[bus.id].setIcon({
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(iconSvg),
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(24, 24),
          });
        } else {
          const marker = new google.maps.Marker({
            position: position,
            map: map.current,
            title: bus.bus_number,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(iconSvg),
              scaledSize: new google.maps.Size(48, 48),
              anchor: new google.maps.Point(24, 24),
            },
            optimized: true,
            zIndex: 1000,
          });

          const statusLabel = bus.status === 'active' ? 'On Route' : bus.status === 'idle' ? 'Idle' : bus.status === 'delayed' ? 'Delayed' : 'Unknown';
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="p-2">
                <h3 class="font-bold text-sm">${bus.bus_number}</h3>
                ${bus.route_name ? `<p class="text-xs text-gray-600">${bus.route_name}</p>` : ""}
                <p class="text-xs mt-1" style="color: ${statusColor}">${statusLabel}</p>
              </div>
            `,
          });

          marker.addListener("click", () => {
            infoWindow.open(map.current, marker);
            if (onBusClick) {
              onBusClick(bus);
            }
          });

          markers.current[bus.id] = marker;
        }
      }
    });
  }, [buses, isMapLoaded]);

  // Draw stop markers for selected bus route
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const google = (window as any).google;
    if (!google?.maps) return;

    // Clear existing stop markers
    stopMarkers.current.forEach(marker => marker.setMap(null));
    stopMarkers.current = [];

    if (selectedStops.length === 0) return;

    selectedStops.forEach((stop, index) => {
      const stopIconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
          <text x="12" y="16" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="bold">${index + 1}</text>
        </svg>
      `;

      const marker = new google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: map.current,
        title: stop.name || `Stop ${index + 1}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(stopIconSvg),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
        zIndex: 500,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-bold text-sm">Stop ${index + 1}</h3>
            <p class="text-xs text-gray-600">${stop.name || 'Unnamed Stop'}</p>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(map.current, marker);
      });

      stopMarkers.current.push(marker);
    });
  }, [selectedStops, isMapLoaded]);

  // Handle heatmap toggle
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const google = (window as any).google;
    if (!google?.maps?.visualization) return;

    const toggleHeatmap = async () => {
      if (heatmapEnabled) {
        setLoadingHeatmap(true);
        try {
          // Fetch air quality data for the current center
          const aqData = await fetchAirQuality(center[0], center[1]);
          setAirQualityData(aqData);

          // Generate heatmap points based on AQI (higher AQI = more intense)
          const generateHeatmapPoints = () => {
            const points: any[] = [];
            const intensity = aqData?.aqi ? Math.min(aqData.aqi / 100, 1) : 0.5;
            
            // Create a grid of points around the center
            for (let i = -5; i <= 5; i++) {
              for (let j = -5; j <= 5; j++) {
                const lat = center[0] + (i * 0.005) + (Math.random() - 0.5) * 0.002;
                const lng = center[1] + (j * 0.005) + (Math.random() - 0.5) * 0.002;
                const weight = intensity * (0.5 + Math.random() * 0.5);
                points.push({
                  location: new google.maps.LatLng(lat, lng),
                  weight: weight
                });
              }
            }
            return points;
          };

          const heatmapData = generateHeatmapPoints();

          if (heatmapLayer.current) {
            heatmapLayer.current.setMap(null);
          }

          heatmapLayer.current = new google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: map.current,
            radius: 50,
            opacity: 0.6,
            gradient: [
              'rgba(0, 255, 0, 0)',
              'rgba(0, 255, 0, 1)',
              'rgba(255, 255, 0, 1)',
              'rgba(255, 165, 0, 1)',
              'rgba(255, 0, 0, 1)',
            ]
          });
        } catch (error) {
          console.error("Error loading air quality data:", error);
        } finally {
          setLoadingHeatmap(false);
        }
      } else {
        if (heatmapLayer.current) {
          heatmapLayer.current.setMap(null);
          heatmapLayer.current = null;
        }
        setAirQualityData(null);
      }
    };

    toggleHeatmap();
  }, [heatmapEnabled, isMapLoaded, center]);

  const getAqiColor = (aqi: number) => {
    if (aqi >= 80) return "text-green-500";
    if (aqi >= 60) return "text-yellow-500";
    if (aqi >= 40) return "text-orange-500";
    return "text-red-500";
  };

  if (mapError) {
    return (
      <div className="w-full h-full rounded-lg border bg-card p-6 flex flex-col items-center justify-center gap-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-destructive">Map Loading Error</h3>
          <p className="text-sm text-muted-foreground">
            Unable to load Google Maps. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {/* Heatmap Toggle Button */}
      {showHeatmapToggle && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button
            variant={heatmapEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setHeatmapEnabled(!heatmapEnabled)}
            disabled={loadingHeatmap}
            className="shadow-lg"
          >
            <Flame className={`w-4 h-4 mr-2 ${heatmapEnabled ? "text-orange-300" : ""}`} />
            {loadingHeatmap ? "Loading..." : heatmapEnabled ? "Hide AQI" : "Show AQI"}
          </Button>
          
          {/* AQI Info Card */}
          {heatmapEnabled && airQualityData && (
            <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Air Quality Index</span>
                <span className={`font-bold text-lg ${getAqiColor(airQualityData.aqi)}`}>
                  {airQualityData.aqi}
                </span>
                <span className="text-xs text-muted-foreground">{airQualityData.category}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
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