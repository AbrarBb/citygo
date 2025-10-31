import { Card } from "@/components/ui/card";
import MapView from "@/components/map/MapView";
import { useLiveBuses } from "@/hooks/useLiveBuses";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const LiveBusMap = () => {
  const { buses, loading } = useLiveBuses();
  const [routes, setRoutes] = useState<any[]>([]);

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
    .filter((bus) => bus.current_location?.lat && bus.current_location?.lng)
    .map((bus) => ({
      id: bus.id,
      bus_number: bus.bus_number,
      current_location: bus.current_location!,
      route_name: bus.routes?.name,
    }));

  console.log("Active buses:", activeBuses);
  console.log("Routes to display:", routes);

  // Filter routes to show only those with active buses OR all active routes
  const routesToDisplay = routes.filter(route => {
    // Show route if it's active and has valid stops
    return route.stops && Array.isArray(route.stops) && route.stops.length > 1;
  });

  // Calculate center based on active buses
  const mapCenter: [number, number] = activeBuses.length > 0 && activeBuses[0].current_location
    ? [activeBuses[0].current_location.lat, activeBuses[0].current_location.lng]
    : [23.8103, 90.4125]; // Default to Dhaka

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Live Bus Tracking</h3>
      {activeBuses.length === 0 && !loading && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            No active buses at the moment. Buses will appear here when drivers turn on their location tracking.
          </p>
        </div>
      )}
      <div className="h-[500px]">
        <MapView 
          center={mapCenter}
          zoom={activeBuses.length > 0 ? 13 : 12}
          buses={activeBuses} 
          routes={routesToDisplay} 
        />
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        <div>Tracking {activeBuses.length} active {activeBuses.length === 1 ? "bus" : "buses"}</div>
        <div>Showing {routesToDisplay.length} active {routesToDisplay.length === 1 ? "route" : "routes"}</div>
      </div>
    </Card>
  );
};

export default LiveBusMap;
