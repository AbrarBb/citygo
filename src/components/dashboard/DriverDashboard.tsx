import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, MapPin, Users, PlayCircle, StopCircle, AlertTriangle, PauseCircle, UserCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGPSTracking } from "@/hooks/useGPSTracking";
import { useRouteProgress } from "@/hooks/useRouteProgress";
import MapView from "@/components/map/MapView";
import RouteProgressBar from "@/components/tracking/RouteProgressBar";
import TripSummary from "./TripSummary";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Supervisor {
  id: string;
  full_name: string;
  user_id: string;
}

const DriverDashboard = () => {
  const [routeActive, setRouteActive] = useState(false);
  const [routePaused, setRoutePaused] = useState(false);
  const [busInfo, setBusInfo] = useState<any>(null);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [todayStats, setTodayStats] = useState({ passengers: 0, distance: 0, trips: 0 });
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [availableSupervisors, setAvailableSupervisors] = useState<Supervisor[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
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
    fetchTodayStats();
    fetchAvailableRoutes();
    fetchAvailableSupervisors();
  }, [user]);

  // Auto-start GPS tracking when bus is assigned
  useEffect(() => {
    if (busInfo?.id && !isTracking) {
      startTracking();
      toast({
        title: "GPS Tracking Active",
        description: "Your bus location is now being tracked",
      });
    }
  }, [busInfo?.id]);

  useEffect(() => {
    if (routeActive && !routePaused) {
      const interval = setInterval(() => {
        updateTripDistance();
      }, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [routeActive, routePaused, location]);

  useEffect(() => {
    if (routeProgress.isOffRoute && routeActive) {
      toast({
        title: "Off Route Alert",
        description: "You are off the designated route",
        variant: "destructive",
      });
    }
  }, [routeProgress.isOffRoute, routeActive]);

  const fetchAvailableRoutes = async () => {
    const { data } = await supabase
      .from("routes")
      .select("*")
      .eq("active", true);
    
    if (data) setAvailableRoutes(data);
  };

  const fetchAvailableSupervisors = async () => {
    // Use database function to get available supervisors (bypasses RLS)
    const { data: supervisors, error } = await supabase
      .rpc('get_available_supervisors' as any);

    if (error) {
      console.error('Error fetching supervisors:', error);
      return;
    }

    if (supervisors && Array.isArray(supervisors)) {
      const available = supervisors.map((s: { user_id: string; full_name: string }) => ({
        id: s.user_id,
        full_name: s.full_name,
        user_id: s.user_id
      }));
      setAvailableSupervisors(available);
    }
  };

  // Real-time subscription for bus updates (supervisor notifications)
  useEffect(() => {
    if (!busInfo?.id) return;

    const channel = supabase
      .channel(`bus-${busInfo.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'buses',
          filter: `id=eq.${busInfo.id}`
        },
        (payload) => {
          const newData = payload.new as any;
          setBusInfo((prev: any) => ({ ...prev, ...newData }));
          
          if (newData.supervisor_id && newData.supervisor_id !== payload.old?.supervisor_id) {
            toast({
              title: "Supervisor Updated",
              description: "Bus supervisor assignment has been updated",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [busInfo?.id]);

  const fetchBusInfo = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("buses")
        .select("*, routes(id, name, stops, distance)")
        .eq("driver_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching bus info:", error);
        toast({
          title: "Error",
          description: "Could not load bus information. Please contact admin.",
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        toast({
          title: "No Bus Assigned",
          description: "You don't have a bus assigned yet. Please contact admin.",
        });
        return;
      }

      setBusInfo(data);
      if (data.routes?.stops && Array.isArray(data.routes.stops)) {
        setRouteStops(data.routes.stops as any[]);
      }
      if (data.route_id) {
        setSelectedRouteId(data.route_id);
      }
      
      // Check for active trip
      const { data: activeTrip } = await supabase
        .from("trips")
        .select("*")
        .eq("driver_id", user.id)
        .eq("status", "active")
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (activeTrip) {
        setCurrentTrip(activeTrip);
        setRouteActive(true);
        startTracking();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const fetchTodayStats = async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: trips } = await supabase
      .from("trips")
      .select("*")
      .eq("driver_id", user.id)
      .gte("start_time", today.toISOString());

    if (trips) {
      const stats = trips.reduce(
        (acc, trip) => ({
          passengers: acc.passengers + (trip.passengers_count || 0),
          distance: acc.distance + (Number(trip.distance_km) || 0),
          trips: acc.trips + (trip.end_time ? 1 : 0),
        }),
        { passengers: 0, distance: 0, trips: 0 }
      );
      setTodayStats(stats);
    }
  };

  const updateTripDistance = async () => {
    if (!currentTrip || !location) return;

    // Calculate distance from trip start
    const startLoc = currentTrip.start_location;
    if (startLoc) {
      const distance = calculateDistance(
        startLoc.lat,
        startLoc.lng,
        location.coords.latitude,
        location.coords.longitude
      );

      await supabase
        .from("trips")
        .update({ distance_km: distance })
        .eq("id", currentTrip.id);
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

  const handleRouteChange = async (routeId: string) => {
    setSelectedRouteId(routeId);
    
    // Update bus with new route
    const { error } = await supabase
      .from("buses")
      .update({ route_id: routeId })
      .eq("id", busInfo?.id);

    if (!error) {
      toast({
        title: "Route Updated",
        description: "Bus route has been changed",
      });
      fetchBusInfo();
    }
  };

  const handleSupervisorChange = async (supervisorId: string) => {
    setSelectedSupervisorId(supervisorId);
    
    // Update bus with selected supervisor
    const { error } = await supabase
      .from("buses")
      .update({ supervisor_id: supervisorId })
      .eq("id", busInfo?.id);

    if (!error) {
      toast({
        title: "Supervisor Assigned",
        description: "Supervisor has been assigned to this bus",
      });
      fetchBusInfo();
    }
  };

  const handleStartRoute = async () => {
    if (!busInfo || !location || !user) return;

    if (!selectedSupervisorId) {
      toast({
        title: "Supervisor Required",
        description: "Please select a supervisor before starting the route",
        variant: "destructive",
      });
      return;
    }

    // Update bus status to active
    await supabase
      .from("buses")
      .update({ 
        status: "active",
        supervisor_id: selectedSupervisorId 
      })
      .eq("id", busInfo.id);

    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        bus_id: busInfo.id,
        driver_id: user.id,
        route_id: busInfo.routes?.id,
        start_location: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        },
        status: "active",
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to start trip",
        variant: "destructive",
      });
      return;
    }

    setCurrentTrip(trip);
    setRouteActive(true);
    setRoutePaused(false);
    startTracking();

    toast({
      title: "Route Started",
      description: "GPS tracking is now active. Supervisor notified.",
    });
  };

  const handlePauseRoute = async () => {
    if (!currentTrip) return;

    setRoutePaused(!routePaused);
    
    await supabase
      .from("trips")
      .update({ status: routePaused ? "active" : "paused" })
      .eq("id", currentTrip.id);

    if (routePaused) {
      startTracking();
      toast({ title: "Route Resumed" });
    } else {
      stopTracking();
      toast({ title: "Route Paused" });
    }
  };

  const handleEndRoute = async () => {
    if (!busInfo || !user || !currentTrip) return;

    try {
      // End any active trip for this bus and driver
      const { error: tripError } = await supabase
        .from("trips")
        .update({
          end_time: new Date().toISOString(),
          end_location: location
            ? {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
              }
            : null,
          status: "completed",
        })
        .eq("bus_id", busInfo.id)
        .eq("driver_id", user.id)
        .eq("status", "active");

      if (tripError) {
        console.error("Error ending trip:", tripError);
        toast({
          title: "Error",
          description: "Failed to end trip",
          variant: "destructive",
        });
        return;
      }

      // Clear all bookings for this bus using the database function
      const { data: clearedCount, error: clearError } = await supabase
        .rpc("complete_journey_bookings", { p_bus_id: busInfo.id });

      if (clearError) {
        console.error("Error clearing bookings:", clearError);
      } else {
        console.log(`Cleared ${clearedCount} bookings`);
      }

      // Update bus status to idle, clear supervisor and last location
      const { error: busError } = await supabase
        .from("buses")
        .update({
          status: "idle",
          supervisor_id: null,
          current_location: null,
        })
        .eq("id", busInfo.id);

      if (busError) {
        console.error("Error updating bus status:", busError);
      }

      await stopTracking();
      setRouteActive(false);
      setRoutePaused(false);
      setCurrentTrip(null);
      setSelectedSupervisorId("");
      fetchTodayStats();
      fetchAvailableSupervisors();

      toast({
        title: "Route Ended",
        description: "Trip completed successfully",
      });
    } catch (err) {
      console.error("Unexpected error ending route:", err);
      toast({
        title: "Error",
        description: "Something went wrong while ending the trip",
        variant: "destructive",
      });
    }
  };

  const handleArrivedAtStop = async (stopName: string) => {
    if (!busInfo?.id) return;

    const { data: releasedCount, error } = await supabase
      .rpc('release_bookings_at_stop', { 
        p_bus_id: busInfo.id, 
        p_stop_name: stopName 
      });

    if (error) {
      console.error('Error releasing bookings:', error);
      toast({
        title: "Error",
        description: "Failed to release bookings at this stop",
        variant: "destructive",
      });
      return;
    }

    if (releasedCount > 0) {
      toast({
        title: `Arrived at ${stopName}`,
        description: `${releasedCount} passenger(s) dropped off, seats now available`,
      });
    } else {
      toast({
        title: `Arrived at ${stopName}`,
        description: "No passengers dropping off at this stop",
      });
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
            <div className="flex gap-3 justify-center">
              {!routeActive ? (
                <Button
                  size="lg"
                  onClick={handleStartRoute}
                  disabled={!busInfo || !location}
                  className="bg-white text-primary hover:bg-white/90 gap-2 px-8"
                >
                  <PlayCircle className="w-5 h-5" />
                  Start Route
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={handlePauseRoute}
                    className="bg-white/20 hover:bg-white/30 gap-2 px-6"
                  >
                    <PauseCircle className="w-5 h-5" />
                    {routePaused ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleEndRoute}
                    className="bg-destructive hover:bg-destructive/90 gap-2 px-8"
                  >
                    <StopCircle className="w-5 h-5" />
                    End Route
                  </Button>
                </>
              )}
            </div>
            {!routeActive && busInfo && (
              <div className="mt-6 p-4 bg-white/10 rounded-lg space-y-3">
                <div>
                  <label className="text-sm text-white/90 mb-2 block">
                    <strong>Select Route</strong>
                  </label>
                  <Select value={selectedRouteId} onValueChange={handleRouteChange}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Choose a route" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoutes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-white/90 mb-2 block flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <strong>Select Supervisor</strong>
                  </label>
                  <Select value={selectedSupervisorId} onValueChange={handleSupervisorChange}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Choose a supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSupervisors.map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableSupervisors.length === 0 && (
                    <p className="text-xs text-yellow-300 mt-1">No supervisors available</p>
                  )}
                </div>
                <p className="text-sm text-white/80">
                  Bus: {busInfo.bus_number}
                </p>
                <p className="text-sm text-white/80">
                  Distance: {busInfo.routes?.distance || 0} km
                </p>
                {!location && (
                  <p className="text-sm text-yellow-300 mt-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Waiting for GPS signal...
                  </p>
                )}
                {!selectedSupervisorId && location && (
                  <p className="text-sm text-yellow-300 mt-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Please select a supervisor to start
                  </p>
                )}
              </div>
            )}
            {routeActive && location && (
              <div className="mt-4 text-white/80 space-y-1">
                <p className="flex items-center justify-center gap-2">
                  {isIdle ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Bus Idle
                    </>
                  ) : routePaused ? (
                    <>
                      <PauseCircle className="w-4 h-4" />
                      Route Paused
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
            {/* Stop Arrival Buttons */}
            <Card className="mt-4 p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Announce Stop Arrival
              </h4>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {routeStops.map((stop, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleArrivedAtStop(stop.name)}
                    className="text-xs justify-start"
                  >
                    {index + 1}. {stop.name}
                  </Button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {currentTrip && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <TripSummary trip={currentTrip} />
        </motion.div>
      )}

      {routeActive && location && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Live Location & Route
            </h3>
            <div className="h-[500px]">
              <MapView
                center={[location.coords.latitude, location.coords.longitude]}
                zoom={14}
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
                routes={
                  busInfo?.routes?.id && routeStops.length > 0
                    ? [{ id: busInfo.routes.id, stops: routeStops }]
                    : []
                }
              />
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Users, label: "Passengers Today", value: todayStats.passengers },
          { icon: MapPin, label: "Distance Covered", value: `${todayStats.distance.toFixed(1)} km` },
          { icon: Bus, label: "Trips Completed", value: todayStats.trips },
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