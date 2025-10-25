import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MapView from "@/components/map/MapView";
import { Badge } from "@/components/ui/badge";

interface Bus {
  id: string;
  bus_number: string;
  current_location: any;
  status: string;
  routes?: { name: string };
}

const AdminBusMap = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("admin-buses-map")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buses",
        },
        () => {
          fetchBuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_number, current_location, status, routes(name)")
        .not("current_location", "is", null);

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error("Error fetching buses:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary/20 text-primary";
      case "idle":
        return "bg-amber-500/20 text-amber-600";
      case "delayed":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return "✅";
      case "idle":
        return "⚠️";
      case "delayed":
        return "🔴";
      default:
        return "⚪";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[600px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Card>
    );
  }

  // Calculate center based on all bus locations
  const validBuses = buses.filter(
    (bus) => bus.current_location?.lat && bus.current_location?.lng
  );

  const centerLat =
    validBuses.length > 0
      ? validBuses.reduce((sum, bus) => sum + bus.current_location.lat, 0) / validBuses.length
      : 23.8103; // Default: Dhaka

  const centerLng =
    validBuses.length > 0
      ? validBuses.reduce((sum, bus) => sum + bus.current_location.lng, 0) / validBuses.length
      : 90.4125;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Live Bus Tracking</h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              ✅ On Route
            </Badge>
            <Badge variant="outline" className="gap-1">
              🔴 Delayed
            </Badge>
            <Badge variant="outline" className="gap-1">
              ⚠️ Idle
            </Badge>
          </div>
        </div>

        <div className="h-[600px]">
          <MapView
            center={[centerLng, centerLat]}
            zoom={12}
            buses={validBuses.map((bus) => ({
              id: bus.id,
              bus_number: bus.bus_number,
              current_location: {
                lat: bus.current_location.lat,
                lng: bus.current_location.lng,
              },
              route_name: bus.routes?.name,
              status: bus.status,
            }))}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{buses.length}</p>
            <p className="text-sm text-muted-foreground">Total Buses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {buses.filter((b) => b.status === "active").length}
            </p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {buses.filter((b) => b.status === "idle").length}
            </p>
            <p className="text-sm text-muted-foreground">Idle</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">
              {buses.filter((b) => b.status === "delayed").length}
            </p>
            <p className="text-sm text-muted-foreground">Delayed</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AdminBusMap;
