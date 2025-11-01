import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Bell } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useETA } from "@/hooks/useETA";
import MapView from "@/components/map/MapView";
import ETADisplay from "@/components/tracking/ETADisplay";
import RouteProgressBar from "@/components/tracking/RouteProgressBar";
import { useRouteProgress } from "@/hooks/useRouteProgress";
import { useToast } from "@/hooks/use-toast";

const TrackBus = () => {
  const navigate = useNavigate();
  const { busId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bus, setBus] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const busLocation = bus?.current_location
    ? { lat: bus.current_location.lat, lng: bus.current_location.lng }
    : null;

  const { eta, distance } = useETA(busLocation, userLocation);
  const routeProgress = useRouteProgress(busLocation, route?.stops || []);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
    getUserLocation();

    // Subscribe to real-time bus updates
    const channel = supabase
      .channel(`bus-${busId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "buses",
          filter: `id=eq.${busId}`,
        },
        (payload) => {
          setBus(payload.new);
          checkProximityAlert(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, busId, navigate]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const fetchData = async () => {
    try {
      const { data: busData, error: busError } = await supabase
        .from("buses")
        .select("*, routes(id, name, stops, distance)")
        .eq("id", busId)
        .maybeSingle();

      if (busError) throw busError;
      
      if (!busData) {
        toast({
          title: "Bus Not Found",
          description: "This bus does not exist or is no longer available",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      setBus(busData);
      setRoute(busData.routes);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load bus information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkProximityAlert = (busData: any) => {
    if (!userLocation || !busData.current_location || !notificationsEnabled) return;

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      busData.current_location.lat,
      busData.current_location.lng
    );

    // Alert if bus is within 500m
    if (distance < 0.5) {
      toast({
        title: "Bus Approaching!",
        description: `Bus #${busData.bus_number} is nearby`,
      });
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
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

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast({
      title: notificationsEnabled ? "Notifications Disabled" : "Notifications Enabled",
      description: notificationsEnabled
        ? "You won't receive arrival alerts"
        : "You'll be notified when bus is nearby",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!bus) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate("/routes")} className="gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Bus Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This bus does not exist or is no longer available for tracking.
            </p>
            <Button onClick={() => navigate("/routes")}>
              View Available Routes
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate("/routes")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            variant={notificationsEnabled ? "default" : "outline"}
            onClick={toggleNotifications}
            className="gap-2"
          >
            <Bell className="w-4 h-4" />
            {notificationsEnabled ? "Alerts On" : "Enable Alerts"}
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Track Bus</h1>
          <p className="text-muted-foreground">Live location and arrival information</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-6">
            {busLocation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Live Map</h3>
                  <div className="h-[500px]">
                    <MapView
                      center={[busLocation.lat, busLocation.lng]}
                      zoom={14}
                      buses={[
                        {
                          id: bus.id,
                          bus_number: bus.bus_number,
                          current_location: busLocation,
                          route_name: route?.name,
                        },
                      ]}
                      routes={route ? [{
                        id: route.id,
                        stops: route.stops
                      }] : []}
                    />
                  </div>
                </Card>
              </motion.div>
            )}

            {route && route.stops && (
              <RouteProgressBar
                currentStop={routeProgress.currentStop}
                totalStops={routeProgress.totalStops}
                stopsRemaining={routeProgress.stopsRemaining}
                progress={routeProgress.progress}
                nextStop={routeProgress.nextStop}
                isOffRoute={routeProgress.isOffRoute}
                distanceToNextStop={routeProgress.distanceToNextStop}
              />
            )}
          </div>

          <div className="space-y-6">
            {busLocation && (
              <ETADisplay
                eta={eta}
                distance={distance}
                busNumber={bus.bus_number}
                status={bus.status === "active" ? "on_time" : bus.status === "delayed" ? "delayed" : "on_time"}
              />
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Route Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Route</p>
                    <p className="font-medium">{route?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bus Number</p>
                    <p className="font-medium">#{bus.bus_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{bus.status || "Unknown"}</p>
                  </div>
                  {route?.distance && (
                    <div>
                      <p className="text-sm text-muted-foreground">Route Distance</p>
                      <p className="font-medium">{route.distance} km</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackBus;
