import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, MapPin, Users, PlayCircle, StopCircle, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGPSTracking } from "@/hooks/useGPSTracking";
import { useRouteProgress } from "@/hooks/useRouteProgress";
import MapView from "@/components/map/MapView";
import RouteProgressBar from "@/components/tracking/RouteProgressBar";
import { useToast } from "@/hooks/use-toast";

const DriverDashboard = () => {
  const [routeActive, setRouteActive] = useState(false);
  const [busInfo, setBusInfo] = useState<any>(null);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { location, isTracking, isIdle, startTracking, stopTracking } = useGPSTracking(
    busInfo?.id,
    3000
  );

  const currentLocation = location
    ? { lat: location.coords.latitude, lng: location.coords.longitude }
    : null;

  const routeProgress = useRouteProgress(currentLocation, routeStops);

  useEffect(() => {
    fetchBusInfo();
  }, [user]);

  useEffect(() => {
    if (routeProgress.isOffRoute && routeActive) {
      toast({
        title: "Off Route Alert",
        description: "You are off the designated route",
        variant: "destructive",
      });
    }
  }, [routeProgress.isOffRoute, routeActive]);

  useEffect(() => {
    if (isIdle && routeActive) {
      toast({
        title: "Idle Detected",
        description: "Bus has been stationary for 3+ minutes",
      });
    }
  }, [isIdle, routeActive]);

  const fetchBusInfo = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("buses")
      .select("*, routes(id, name, stops)")
      .eq("driver_id", user.id)
      .single();

    if (data) {
      setBusInfo(data);
      if (data.routes?.stops && Array.isArray(data.routes.stops)) {
        setRouteStops(data.routes.stops as any[]);
      }
    }
  };

  const handleRouteToggle = () => {
    if (!routeActive) {
      startTracking();
      setRouteActive(true);
    } else {
      stopTracking();
      setRouteActive(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold mb-2">Driver Dashboard</h1>
        <p className="text-muted-foreground">
          {busInfo ? `Bus #${busInfo.bus_number} • ${busInfo.routes?.name || "No Route"}` : "Loading..."}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="p-8 text-center bg-gradient-hero text-white">
            <Bus className="w-20 h-20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Route Status</h2>
            <Button
              size="lg"
              onClick={handleRouteToggle}
              disabled={!busInfo}
              className={`${
                routeActive
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-white text-primary hover:bg-white/90"
              } gap-2 px-8`}
            >
              {routeActive ? (
                <>
                  <StopCircle className="w-5 h-5" />
                  End Route
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  Start Route
                </>
              )}
            </Button>
            {routeActive && location && (
              <div className="mt-4 text-white/80 space-y-1">
                <p className="flex items-center justify-center gap-2">
                  {isIdle ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Bus Idle
                    </>
                  ) : (
                    "Route active • GPS tracking"
                  )}
                </p>
                <p className="text-sm">
                  Location: {location.coords.latitude.toFixed(6)},{" "}
                  {location.coords.longitude.toFixed(6)}
                </p>
                <p className="text-sm">Accuracy: ±{Math.round(location.coords.accuracy)}m</p>
                {location.coords.speed && location.coords.speed > 0 && (
                  <p className="text-sm">Speed: {(location.coords.speed * 3.6).toFixed(1)} km/h</p>
                )}
              </div>
            )}
          </Card>
        </motion.div>

        {routeActive && routeStops.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <RouteProgressBar
              currentStop={routeProgress.currentStop}
              totalStops={routeProgress.totalStops}
              stopsRemaining={routeProgress.stopsRemaining}
              progress={routeProgress.progress}
              nextStop={routeProgress.nextStop}
              isOffRoute={routeProgress.isOffRoute}
              distanceToNextStop={routeProgress.distanceToNextStop}
            />
          </motion.div>
        )}
      </div>

      {routeActive && location && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Live Location</h3>
            <div className="h-[500px]">
              <MapView
                center={[location.coords.longitude, location.coords.latitude]}
                zoom={16}
                buses={
                  busInfo
                    ? [
                        {
                          id: busInfo.id,
                          bus_number: busInfo.bus_number,
                          current_location: {
                            lat: location.coords.latitude,
                            lng: location.coords.longitude,
                          },
                          route_name: busInfo.routes?.name,
                        },
                      ]
                    : []
                }
              />
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Users, label: "Passengers Today", value: "127" },
          { icon: MapPin, label: "Distance Covered", value: "45 km" },
          { icon: Bus, label: "Trips Completed", value: "8" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Card className="p-6 text-center">
              <stat.icon className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DriverDashboard;