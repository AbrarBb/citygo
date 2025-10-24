import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  buses?: Array<{
    id: string;
    bus_number: string;
    current_location: { lat: number; lng: number };
    route_name?: string;
  }>;
  showTokenInput?: boolean;
}

const MapView = ({ 
  center = [90.4125, 23.8103], // Dhaka, Bangladesh
  zoom = 12, 
  buses = [],
  showTokenInput = false 
}: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapboxToken, setMapboxToken] = useState("");
  const [tokenSet, setTokenSet] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !tokenSet) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: center,
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
    };
  }, [tokenSet, mapboxToken]);

  useEffect(() => {
    if (!map.current || !tokenSet) return;

    // Remove old markers
    Object.keys(markers.current).forEach((id) => {
      if (!buses.find((b) => b.id === id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });

    // Add or update bus markers
    buses.forEach((bus) => {
      if (bus.current_location?.lat && bus.current_location?.lng) {
        if (markers.current[bus.id]) {
          markers.current[bus.id].setLngLat([
            bus.current_location.lng,
            bus.current_location.lat,
          ]);
        } else {
          const el = document.createElement("div");
          el.className = "bus-marker";
          el.innerHTML = `
            <div class="bg-primary text-primary-foreground p-2 rounded-full shadow-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 6v6"/>
                <path d="M15 6v6"/>
                <path d="M2 12h19.6"/>
                <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
                <circle cx="7" cy="18" r="2"/>
                <circle cx="17" cy="18" r="2"/>
              </svg>
            </div>
          `;

          const marker = new mapboxgl.Marker(el)
            .setLngLat([bus.current_location.lng, bus.current_location.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<div class="p-2">
                  <h3 class="font-bold">${bus.bus_number}</h3>
                  ${bus.route_name ? `<p class="text-sm">${bus.route_name}</p>` : ""}
                </div>`
              )
            )
            .addTo(map.current!);

          markers.current[bus.id] = marker;
        }
      }
    });
  }, [buses, tokenSet]);

  if (showTokenInput && !tokenSet) {
    return (
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Mapbox Token Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your Mapbox public token to enable live GPS tracking. Get one free at{" "}
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
        <Input
          type="text"
          placeholder="pk.eyJ1Ijoi..."
          value={mapboxToken}
          onChange={(e) => setMapboxToken(e.target.value)}
        />
        <Button onClick={() => setTokenSet(true)} disabled={!mapboxToken}>
          Enable Map
        </Button>
      </Card>
    );
  }

  return <div ref={mapContainer} className="w-full h-full rounded-lg" />;
};

export default MapView;
