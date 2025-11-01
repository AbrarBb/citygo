import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2, Save } from "lucide-react";
import RouteMapEditor from "@/components/admin/RouteMapEditor";
import DashboardNav from "@/components/dashboard/DashboardNav";

interface Route {
  id: string;
  name: string;
  stops: any;
  distance: number;
  base_fare: number;
  fare_per_km: number;
  active: boolean;
}

const AdminRoutes = () => {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [baseFare, setBaseFare] = useState("20");
  const [farePerKm, setFarePerKm] = useState("1.5");
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [fetchingRoutes, setFetchingRoutes] = useState(true);

  useEffect(() => {
    if (!loading && role !== "admin") {
      navigate("/dashboard");
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRoutes((data || []) as Route[]);
    } catch (error) {
      console.error("Error fetching routes:", error);
      toast.error("Failed to load routes");
    } finally {
      setFetchingRoutes(false);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedRoute(null);
    setRouteName("");
    setBaseFare("20");
    setFarePerKm("1.5");
    setRouteStops([]);
  };

  const handleEditRoute = (route: Route) => {
    setSelectedRoute(route);
    setIsCreating(true);
    setRouteName(route.name);
    setBaseFare(route.base_fare.toString());
    setFarePerKm(route.fare_per_km.toString());
    setRouteStops(Array.isArray(route.stops) ? route.stops : []);
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;

    try {
      const { error } = await supabase.from("routes").delete().eq("id", routeId);

      if (error) throw error;
      toast.success("Route deleted successfully");
      fetchRoutes();
    } catch (error) {
      console.error("Error deleting route:", error);
      toast.error("Failed to delete route");
    }
  };

  const calculateDistance = (stops: any[]) => {
    if (stops.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const lat1 = stops[i].lat;
      const lng1 = stops[i].lng;
      const lat2 = stops[i + 1].lat;
      const lng2 = stops[i + 1].lng;

      // Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }

    return parseFloat(totalDistance.toFixed(2));
  };

  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      toast.error("Please enter a route name");
      return;
    }

    if (routeStops.length < 2) {
      toast.error("Please add at least 2 stops to the route");
      return;
    }

    try {
      const distance = calculateDistance(routeStops);
      const routeData = {
        name: routeName,
        stops: routeStops,
        distance,
        base_fare: parseFloat(baseFare),
        fare_per_km: parseFloat(farePerKm),
        active: true,
      };

      if (selectedRoute) {
        const { error } = await supabase
          .from("routes")
          .update(routeData)
          .eq("id", selectedRoute.id);

        if (error) throw error;
        toast.success("Route updated successfully");
      } else {
        const { error } = await supabase.from("routes").insert([routeData]);

        if (error) throw error;
        toast.success("Route created successfully");
      }

      setIsCreating(false);
      setSelectedRoute(null);
      fetchRoutes();
    } catch (error) {
      console.error("Error saving route:", error);
      toast.error("Failed to save route");
    }
  };

  if (loading || fetchingRoutes) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Route Management</h1>
          </div>
          {!isCreating && (
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Create New Route
            </Button>
          )}
        </div>

        {isCreating ? (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {selectedRoute ? "Edit Route" : "Create New Route"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="routeName">Route Name</Label>
                  <Input
                    id="routeName"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="e.g., Mirpur 10 - Motijheel"
                  />
                </div>
                <div>
                  <Label htmlFor="baseFare">Base Fare (৳)</Label>
                  <Input
                    id="baseFare"
                    type="number"
                    value={baseFare}
                    onChange={(e) => setBaseFare(e.target.value)}
                    placeholder="20"
                  />
                </div>
                <div>
                  <Label htmlFor="farePerKm">Fare per KM (৳)</Label>
                  <Input
                    id="farePerKm"
                    type="number"
                    step="0.1"
                    value={farePerKm}
                    onChange={(e) => setFarePerKm(e.target.value)}
                    placeholder="1.5"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveRoute} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Route
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedRoute(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Card>

            <RouteMapEditor
              initialStops={routeStops}
              onStopsChange={setRouteStops}
            />
          </div>
        ) : (
          <div className="grid gap-4">
            {routes.map((route) => (
              <Card key={route.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{route.name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Distance</p>
                        <p className="font-medium">{route.distance} km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Base Fare</p>
                        <p className="font-medium">৳{route.base_fare}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fare/KM</p>
                        <p className="font-medium">৳{route.fare_per_km}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stops</p>
                        <p className="font-medium">{Array.isArray(route.stops) ? route.stops.length : 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditRoute(route)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteRoute(route.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {routes.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  No routes created yet. Click "Create New Route" to get started.
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRoutes;
