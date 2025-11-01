import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Navigation } from "lucide-react";

interface Stop {
  lat: number;
  lng: number;
  name: string;
  order: number;
}

interface RouteMapEditorProps {
  initialStops: Stop[];
  onStopsChange: (stops: Stop[]) => void;
}

const RouteMapEditor = ({ initialStops, onStopsChange }: RouteMapEditorProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [stops, setStops] = useState<Stop[]>(initialStops);
  const [editingStop, setEditingStop] = useState<number | null>(null);
  const [stopName, setStopName] = useState("");

  // Sync local stops with initialStops when they change
  useEffect(() => {
    setStops(initialStops);
  }, [initialStops]);

  useEffect(() => {
    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMapMarkers();
      updatePolyline();
    }
  }, [stops]);

  const loadGoogleMapsScript = () => {
    if (window.google?.maps) {
      initializeMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB1WcM9u-UGXD41v3c6u0j8d6dNmqCSf0M&libraries=geometry,places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = initializeMap;
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const defaultCenter = stops.length > 0
      ? { lat: stops[0].lat, lng: stops[0].lng }
      : { lat: 23.8103, lng: 90.4125 }; // Dhaka

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    // Add click listener to add new stops
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        handleMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });

    // Initialize with existing stops
    if (stops.length > 0) {
      updateMapMarkers();
      updatePolyline();
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    const newStop: Stop = {
      lat,
      lng,
      name: `Stop ${stops.length + 1}`,
      order: stops.length + 1,
    };

    const updatedStops = [...stops, newStop];
    setStops(updatedStops);
    onStopsChange(updatedStops);
    toast.success("Stop added! Click on the marker to edit name.");
  };

  const updateMapMarkers = () => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    stops.forEach((stop, index) => {
      const marker = new google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: mapInstanceRef.current,
        label: {
          text: (index + 1).toString(),
          color: "white",
          fontSize: "14px",
          fontWeight: "bold",
        },
        draggable: true,
        title: stop.name,
      });

      // Handle marker drag
      marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          handleStopMove(index, e.latLng.lat(), e.latLng.lng());
        }
      });

      // Handle marker click to edit name
      marker.addListener("click", () => {
        setEditingStop(index);
        setStopName(stop.name);
      });

      markersRef.current.push(marker);
    });
  };

  const updatePolyline = () => {
    if (!mapInstanceRef.current) return;

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    if (stops.length < 2) return;

    // Create new polyline
    const path = stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }));
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#3b82f6",
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map: mapInstanceRef.current,
    });

    polylineRef.current = polyline;
  };

  const handleStopMove = (index: number, lat: number, lng: number) => {
    const updatedStops = [...stops];
    updatedStops[index] = { ...updatedStops[index], lat, lng };
    setStops(updatedStops);
    onStopsChange(updatedStops);
  };

  const handleStopNameUpdate = () => {
    if (editingStop === null) return;

    const updatedStops = [...stops];
    updatedStops[editingStop] = { ...updatedStops[editingStop], name: stopName };
    setStops(updatedStops);
    onStopsChange(updatedStops);
    setEditingStop(null);
    setStopName("");
    toast.success("Stop name updated");

    // Update marker title
    if (markersRef.current[editingStop]) {
      markersRef.current[editingStop].setTitle(stopName);
    }
  };

  const handleDeleteStop = (index: number) => {
    const updatedStops = stops.filter((_, i) => i !== index);
    // Reorder stops
    const reorderedStops = updatedStops.map((stop, i) => ({ ...stop, order: i + 1 }));
    setStops(reorderedStops);
    onStopsChange(reorderedStops);
    toast.success("Stop deleted");
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Route Map Editor</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Click on the map to add stops. Drag markers to adjust positions. Click markers to edit names.
        </p>

        <div
          ref={mapRef}
          className="w-full h-[500px] rounded-lg border border-border overflow-hidden"
        />

        {editingStop !== null && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <Label htmlFor="stopName">Stop {editingStop + 1} Name</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="stopName"
                value={stopName}
                onChange={(e) => setStopName(e.target.value)}
                placeholder="Enter stop name"
                onKeyPress={(e) => e.key === "Enter" && handleStopNameUpdate()}
              />
              <Button onClick={handleStopNameUpdate}>Save</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingStop(null);
                  setStopName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {stops.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Route Stops ({stops.length})</h3>
          <div className="space-y-2">
            {stops.map((stop, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{stop.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {stop.lat?.toFixed(6) || '0.000000'}, {stop.lng?.toFixed(6) || '0.000000'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteStop(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RouteMapEditor;
