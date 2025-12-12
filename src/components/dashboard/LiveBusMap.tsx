import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MapView from "@/components/map/MapView";
import { useLiveBuses } from "@/hooks/useLiveBuses";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Bus, MapPin, X } from "lucide-react";

export const LiveBusMap = () => {
  const navigate = useNavigate();
  const { buses, loading } = useLiveBuses();
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<any>(null);

  useEffect(() => {
    fetchRoutes();
    
    // Subscribe to route changes
    const channel = supabase
      .channel("routes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "routes",
        },
        () => {
          fetchRoutes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRoutes = async () => {
    const { data, error } = await supabase
      .from("routes")
      .select("id, name, stops, active")
      .eq("active", true);
    
    if (error) {
      console.error("Error fetching routes:", error);
      return;
    }
    
    if (data) {
      console.log("Fetched routes:", data);
      setRoutes(data);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-[500px] w-full" />
      </Card>
    );
  }

  const activeBuses = buses
    .map((bus) => {
      const loc: any = bus.current_location;
      const latRaw = loc?.lat ?? loc?.latitude;
      const lngRaw = loc?.lng ?? loc?.longitude;
      const lat = typeof latRaw === 'string' ? parseFloat(latRaw) : latRaw;
      const lng = typeof lngRaw === 'string' ? parseFloat(lngRaw) : lngRaw;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: bus.id,
        bus_number: bus.bus_number,
        current_location: { lat, lng },
        route_name: bus.routes?.name,
        route_id: bus.route_id,
        status: bus.status,
      };
    })
    .filter((b) => b !== null) as any[];

  const handleBusClick = (bus: any) => {
    setSelectedBus(bus);
  };

  const handleBookNow = () => {
    if (selectedBus?.route_id) {
      navigate(`/book/${selectedBus.route_id}`);
    }
  };

  console.log("Active buses:", activeBuses);
  console.log("Routes to display:", routes);

  // Normalize and filter routes to show only those with valid stop coordinates
  const routesToDisplay = routes
    .map((route) => {
      const stops = Array.isArray(route.stops)
        ? route.stops
            .map((stop: any) => {
              const latRaw = stop?.lat ?? stop?.latitude;
              const lngRaw = stop?.lng ?? stop?.longitude;
              const lat = typeof latRaw === 'string' ? parseFloat(latRaw) : latRaw;
              const lng = typeof lngRaw === 'string' ? parseFloat(lngRaw) : lngRaw;
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                return { lat, lng, name: stop?.name ?? '' };
              }
              return null;
            })
            .filter((s: any) => s !== null)
        : [];
      return { ...route, stops };
    })
    .filter((route) => route.stops.length > 1);

  // Get stops for the selected bus's route
  const selectedStops = selectedBus?.route_id
    ? routesToDisplay.find(r => r.id === selectedBus.route_id)?.stops || []
    : [];

  // Calculate center based on active buses
  const mapCenter: [number, number] = activeBuses.length > 0 && activeBuses[0].current_location
    ? [activeBuses[0].current_location.lat, activeBuses[0].current_location.lng]
    : [23.8103, 90.4125]; // Default to Dhaka

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Bus Tracking</h3>
        {activeBuses.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {activeBuses.length} bus{activeBuses.length !== 1 ? "es" : ""} online
          </div>
        )}
      </div>
      {activeBuses.length === 0 && !loading && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            No active buses at the moment. Buses will appear here when drivers turn on their location tracking.
          </p>
        </div>
      )}
      <div className="relative h-[500px] rounded-lg overflow-hidden border">
        <MapView 
          center={mapCenter}
          zoom={activeBuses.length > 0 ? 14 : 12}
          buses={activeBuses} 
          routes={routesToDisplay}
          selectedStops={selectedStops}
          onBusClick={handleBusClick}
        />
        
        {/* Booking Panel */}
        {selectedBus && (
          <div className="absolute top-4 right-4 w-72 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border p-4 animate-in slide-in-from-right-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Bus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">{selectedBus.bus_number}</h4>
                  <p className="text-xs text-muted-foreground capitalize">{selectedBus.status || 'Unknown'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedBus(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {selectedBus.route_name && (
              <div className="flex items-center gap-2 mb-4 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{selectedBus.route_name}</span>
              </div>
            )}
            
            <Button 
              className="w-full bg-gradient-primary"
              onClick={handleBookNow}
              disabled={!selectedBus.route_id}
            >
              Book This Bus
            </Button>
            
            {!selectedBus.route_id && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                No route assigned to this bus
              </p>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span>{activeBuses.length} bus{activeBuses.length !== 1 ? "es" : ""} tracked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span>{routesToDisplay.length} route{routesToDisplay.length !== 1 ? "s" : ""} shown</span>
        </div>
        <p className="text-xs">Click on a bus to book a seat</p>
      </div>
    </Card>
  );
};

export default LiveBusMap;
