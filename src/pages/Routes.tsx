import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MapPin, Bus, ArrowRight, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Route {
  id: string;
  name: string;
  stops: string[];
  distance: number;
  base_fare: number;
  fare_per_km: number;
  start_time: string | null;
  end_time: string | null;
}

const Routes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchRoutes();
  }, [user, navigate]);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("active", true);

      if (error) throw error;
      setRoutes((data || []).map(route => ({
        ...route,
        stops: (route.stops as any) as string[]
      })) as Route[]);
    } catch (error) {
      console.error("Error fetching routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFare = (route: Route) => {
    return (route.base_fare + (route.distance * route.fare_per_km)).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            CityGo Routes
          </h1>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold mb-2">Available Routes</h2>
          <p className="text-muted-foreground">
            Choose your route and book your seat
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-muted rounded mb-4" />
                <div className="h-20 bg-muted rounded mb-4" />
                <div className="h-10 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route, index) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 bg-gradient-card backdrop-blur-sm border-primary/20 shadow-card hover:shadow-glow transition-all hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{route.name}</h3>
                    <Bus className="w-6 h-6 text-primary" />
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Stops:</p>
                        <div className="flex flex-wrap gap-2">
                          {route.stops.map((stop, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-primary/10 text-primary rounded"
                            >
                              {stop}
                              {idx < route.stops.length - 1 && (
                                <ArrowRight className="inline w-3 h-3 ml-1" />
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{route.distance} km</span>
                      </div>
                      {route.start_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{route.start_time}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        ৳{calculateFare(route)}
                      </p>
                      <p className="text-xs text-muted-foreground">Estimated fare</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/track/${route.id}`)}
                        className="gap-1"
                      >
                        <MapPin className="w-4 h-4" />
                        Track
                      </Button>
                      <Button
                        onClick={() => navigate(`/book/${route.id}`)}
                        className="bg-gradient-primary"
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Routes;